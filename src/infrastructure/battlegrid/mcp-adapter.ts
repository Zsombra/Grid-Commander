import type { AuditWriter } from '@/domain/audit/audit-repository.js';
import type { ConfirmationStore } from '@/domain/capability/confirmation.js';
import type { DiscoveredTool } from '@/domain/capability/tool-class.js';
import type { HeldScopes } from '@/domain/connection/held-scopes.js';
import type { Scope } from '@/domain/connection/scope.js';
import { isScope } from '@/domain/connection/scope.js';
import type { Remedy } from '@/domain/connection/remedy.js';
import { ConnectionRevokedError } from '@/domain/errors.js';
import type {
  BattleGridPort,
  TokenGrant,
  ToolCallRequest,
  ToolCallResult,
} from '@/ports/battlegrid.js';
import { beginGuardedCall, toDomainError } from './call-path.js';
import { CapabilityCache } from './capability-cache.js';

/**
 * The only place in this codebase that talks to BattleGrid.
 *
 * Architecture policy P6 — every guarantee the product makes about scope,
 * classification and audit lives here, which is why an ESLint rule and a test
 * both forbid importing the MCP SDK anywhere else.
 *
 * Note this file uses fetch and the documented HTTP surface rather than the MCP
 * SDK client: the server speaks Streamable HTTP with plain JSON-RPC, the calls
 * we make are few, and a direct implementation keeps the transport visible at
 * the one boundary where it matters.
 */

export interface BattleGridConfig {
  /** Registered out of band and pinned. Never obtained at runtime — see DL-4. */
  readonly clientId: string;
  readonly mcpUrl: string;
  readonly authorizeUrl: string;
  readonly tokenUrl: string;
  readonly revokeUrl: string;
  readonly redirectUri: string;
}

export interface AdapterDeps {
  readonly config: BattleGridConfig;
  readonly audit: AuditWriter;
  readonly confirmations: ConfirmationStore;
  /**
   * What the credential this request acts with carries. Never assumed — see
   * PG-004.
   *
   * A seam rather than a repository read, because a delegated grant and an
   * operator-supplied credential answer it from different places. The default
   * still reads the connection row; a personal deployment has no row and
   * declares instead. See `HeldScopes`.
   */
  readonly heldScopes: HeldScopes;
  /**
   * What to tell the user when BattleGrid refuses this deployment's credential.
   *
   * The only construction site of `ConnectionRevokedError` a personal
   * deployment can reach — every other one is behind a session or a callback.
   * So the choice is made here, from a value the composition root already holds,
   * and the six render sites that print `err.message` need to know nothing.
   */
  readonly remedy: Remedy;
  readonly fetch: typeof globalThis.fetch;
}

interface JsonRpcResponse {
  result?: unknown;
  error?: { code: number; message: string };
}

export class McpBattleGridAdapter implements BattleGridPort {
  private readonly capabilities: CapabilityCache;

  constructor(private readonly deps: AdapterDeps) {
    this.capabilities = new CapabilityCache({
      discoverTools: (token) => this.rawDiscoverTools(token),
    });
  }

  buildAuthorizationUrl(params: {
    state: string;
    codeChallenge: string;
    scopes: readonly Scope[];
  }): string {
    const url = new URL(this.deps.config.authorizeUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.deps.config.clientId);
    url.searchParams.set('redirect_uri', this.deps.config.redirectUri);
    url.searchParams.set('scope', params.scopes.join(' '));
    url.searchParams.set('state', params.state);
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  async exchangeCode(params: { code: string; codeVerifier: string }): Promise<TokenGrant> {
    // No client_secret: the server issues none regardless of the registered
    // auth method (findings-dcr F-1). PKCE is the proof.
    return this.tokenRequest({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: this.deps.config.redirectUri,
      client_id: this.deps.config.clientId,
      code_verifier: params.codeVerifier,
    });
  }

  async refresh(refreshToken: string): Promise<TokenGrant> {
    return this.tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.deps.config.clientId,
    });
  }

  async revoke(token: string): Promise<void> {
    const res = await this.deps.fetch(this.deps.config.revokeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token, client_id: this.deps.config.clientId }),
    });
    if (!res.ok) throw new Error(`revocation failed with ${res.status}`);
  }

  async discoverTools(accessToken: string): Promise<readonly DiscoveredTool[]> {
    return this.rawDiscoverTools(accessToken);
  }

  /**
   * Invoke a tool, through the full guard sequence.
   *
   * Classification happens before the scope check, deliberately: scope is not a
   * safety boundary and must never be the thing that decides.
   */
  async callTool(request: ToolCallRequest): Promise<ToolCallResult> {
    const view = await this.capabilities.load(request.accessToken);
    const classification = view.classify(request.tool);

    const heldScopes = await this.scopesFor(request.userId);

    const auditEntryId = await beginGuardedCall(
      { audit: this.deps.audit, confirmations: this.deps.confirmations, heldScopes },
      {
        userId: request.userId,
        actor: request.actor,
        tool: request.tool,
        classification,
        confirmationToken: request.confirmationToken,
        target: request.target,
        idempotencyKey: request.idempotencyKey,
      },
    );

    try {
      const content = await this.rpc(request.accessToken, 'tools/call', {
        name: request.tool,
        arguments: request.args,
      });
      await this.deps.audit.complete(auditEntryId, 'succeeded');
      return { content, classification, auditEntryId };
    } catch (err) {
      // A revoked connection is already a domain error and must not be reshaped
      // into something that looks retryable.
      const domainError =
        err instanceof ConnectionRevokedError ? err : toDomainError(err, request.tool);
      await this.deps.audit.complete(auditEntryId, 'failed', domainError.message);
      throw domainError;
    }
  }

  // -- internals ---------------------------------------------------------

  /**
   * What the credential this request acts with carries.
   *
   * Delegated to `HeldScopes` because the answer has two sources now — a grant
   * BattleGrid issued, or a declaration the operator made — and they are not the
   * same kind of fact. Both still go through the same guard, because policy P1
   * says scope must never be the thing that decides.
   *
   * An earlier version returned the constant `['mcp:read']`, which happened to
   * be true under the pinned registration and would have failed *open* the moment
   * it stopped being true. See PG-004: whatever answers this must be entitled to,
   * never a convenient constant.
   */
  private async scopesFor(userId: string): Promise<readonly Scope[]> {
    return this.deps.heldScopes.forUser(userId);
  }

  private async rawDiscoverTools(accessToken: string): Promise<readonly DiscoveredTool[]> {
    const result = (await this.rpc(accessToken, 'tools/list', {})) as {
      tools?: Array<{
        name: string;
        description?: string;
        annotations?: Record<string, unknown>;
        inputSchema?: Record<string, unknown>;
      }>;
    };
    return (result.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description,
      annotations: t.annotations as DiscoveredTool['annotations'],
      // Kept rather than dropped. Discarding it left the assistant guessing
      // argument names for 110 tools, and every guess that missed arrived as a
      // failed read the user was told about.
      inputSchema: t.inputSchema,
    }));
  }

  private async rpc(accessToken: string, method: string, params: unknown): Promise<unknown> {
    const res = await this.deps.fetch(this.deps.config.mcpUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    // Authority withdrawn at BattleGrid rather than through us — or, on a
    // personal deployment, a key that was wrong from the start. The next
    // operation must fail as "no longer valid, here is what to do" rather than
    // as a generic error the user cannot act on. See R10's second scenario, and
    // "A Remedy Named Must Exist In That Deployment" for why the second half of
    // that sentence is not a constant.
    if (res.status === 401 || res.status === 403) {
      throw new ConnectionRevokedError(this.deps.remedy);
    }
    if (!res.ok) throw new Error(`${method} failed with ${res.status}`);
    const body = (await res.json()) as JsonRpcResponse;
    if (body.error) throw new Error(body.error.message);
    return body.result;
  }

  private async tokenRequest(body: Record<string, string>): Promise<TokenGrant> {
    const res = await this.deps.fetch(this.deps.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    });
    if (!res.ok) throw new Error(`token request failed with ${res.status}`);
    const json = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      sub?: string;
    };

    const scopes = (json.scope ?? '').split(' ').filter(isScope);

    // A grant with no subject cannot establish an identity. Defaulting it to ''
    // would make every such grant collide on the same key, and the second user
    // to connect would be recognised as the first — landing in a stranger's
    // workspace with a stranger's BattleGrid connection. Refuse instead.
    if (!json.sub) {
      throw new Error('BattleGrid returned a grant with no subject; cannot establish identity');
    }

    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? null,
      // Left undefined when absent so the domain applies its own conservative
      // fallback rather than this layer inventing a comfortable number.
      expiresIn: json.expires_in,
      scopes,
      subject: json.sub,
    };
  }
}
