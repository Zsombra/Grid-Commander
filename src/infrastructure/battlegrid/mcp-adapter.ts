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

/**
 * The MCP envelope a `tools/call` result arrives in.
 *
 * Two encodings of one value, plus a flag saying the tool refused. All three
 * were established against the live platform; the reference documentation
 * describes the payload, not the wrapper it travels in, which is how the wrapper
 * went unread for the whole life of this product.
 */
interface ToolEnvelope {
  content?: Array<{ type?: string; text?: string }>;
  structuredContent?: unknown;
  isError?: boolean;
}

/**
 * A tool answered, and the answer was a refusal. Not a transport failure.
 *
 * Carries the platform's own `code` when it sent one. BattleGrid's refusals are
 * JSON — `{"code":"NOT_FOUND","message":…}` — inside the text block, and a
 * caller that needs to tell "not there" from "not allowed" would otherwise have
 * to match on the message. Parsing it once here is the same lesson as
 * `FailureCause`: decide it where the evidence is, not by reading words
 * downstream where a rewording starts a silent lie.
 */
export class ToolRefusedError extends Error {
  /** e.g. `NOT_FOUND`, `VALIDATION_ERROR`. Null when the refusal was not JSON. */
  readonly code: string | null;

  constructor(tool: string, detail: string) {
    super(detail || `BattleGrid refused "${tool}"`);
    this.name = 'ToolRefusedError';
    this.code = codeOf(detail);
  }
}

function codeOf(detail: string): string | null {
  try {
    const parsed: unknown = JSON.parse(detail);
    if (typeof parsed === 'object' && parsed !== null) {
      const code = (parsed as Record<string, unknown>)['code'];
      if (typeof code === 'string') return code;
    }
  } catch {
    // Not JSON. Some refusals are plain prose — an MCP validation error, for
    // one — and having no code is a fact, not a failure.
  }
  return null;
}

/** A result arrived carrying no payload this product can read. */
export class UnreadableEnvelopeError extends Error {
  constructor(tool: string) {
    super(`BattleGrid returned no readable payload for "${tool}"`);
    this.name = 'UnreadableEnvelopeError';
  }
}

/**
 * The payload a tool returned, taken out of the envelope carrying it.
 *
 * **This is the seam that was missing.** `tools/call` answers with
 * `{ content: [{ type: 'text', text: '<json>' }], structuredContent: {…} }`, and
 * the payload every mapper expects is *inside*. Passing the envelope on does not
 * fail — the mappers look for `agents`, find nothing, and report an account with
 * no agents. A real account with two agents rendered as "no agents yet" for the
 * entire life of this product, and no test could see it because every fake
 * returns the payload already unwrapped.
 *
 * So the one rule here is: **never return an empty object.** An envelope this
 * cannot read is a failed call, not a successful call that found nothing. That
 * distinction is the difference between "we could not ask" and "you own
 * nothing", and getting it wrong is how someone recreates work they already
 * have.
 *
 * Reading either encoding is not a dual path in the sense the architecture
 * review forbids: nothing branches on domain state, and the two are the same
 * value — verified byte-identical across every tool sampled against the live
 * platform. `structuredContent` is preferred because it needs no parsing;
 * the text block is read when it is absent, because relying on one field the
 * server is free to omit is what this whole change exists to stop repeating.
 */
function payloadOf(tool: string, result: unknown): Record<string, unknown> {
  const envelope = (result ?? {}) as ToolEnvelope;

  if (envelope.isError === true) {
    throw new ToolRefusedError(tool, textOf(envelope) ?? '');
  }

  if (typeof envelope.structuredContent === 'object' && envelope.structuredContent !== null) {
    return envelope.structuredContent as Record<string, unknown>;
  }

  const text = textOf(envelope);
  if (text !== null) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null) return parsed as Record<string, unknown>;
    } catch {
      // Falls through to the throw. A text block that is not JSON is a result
      // this product cannot read, which is the one thing it must not call empty.
    }
  }

  throw new UnreadableEnvelopeError(tool);
}

/** Every text block, joined. One is the norm; more is legal and cheap to allow. */
function textOf(envelope: ToolEnvelope): string | null {
  const blocks = (envelope.content ?? [])
    .filter((b) => b?.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text as string);
  return blocks.length > 0 ? blocks.join('') : null;
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
      const envelope = await this.rpc(request.accessToken, 'tools/call', {
        name: request.tool,
        arguments: request.args,
      });
      // Unwrapped before the audit completes. What makes a refusal land in the
      // record as `failed` is the catch below, which re-completes the entry
      // whatever was thrown — proven by moving this line after the completion
      // and watching nothing fail. So the order is not load-bearing, and saying
      // it was would leave the next reader defending a property the code does
      // not rest on. It is kept this way because writing `succeeded` and then
      // correcting it is a worse thing to read in a table than never writing it.
      const content = payloadOf(request.tool, envelope);
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
