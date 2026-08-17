import type { AuditActor } from '@/domain/audit/audit-entry.js';
import type { Scope } from '@/domain/connection/scope.js';
import type { DiscoveredTool, ToolClass } from '@/domain/capability/tool-class.js';

/**
 * The only way to BattleGrid.
 *
 * Architecture policy P6: every guarantee this product makes — classification,
 * scope refusal, audit — lives behind this interface. One bypass makes all of
 * them advisory, which is why an ESLint rule forbids importing the MCP SDK
 * outside `src/infrastructure/battlegrid/`.
 */
export interface BattleGridPort {
  /** Begin an authorization. Returns the URL to send the user to. */
  buildAuthorizationUrl(params: {
    state: string;
    codeChallenge: string;
    scopes: readonly Scope[];
  }): string;

  /** Exchange an authorization code. Throws on any failure; never returns partial. */
  exchangeCode(params: { code: string; codeVerifier: string }): Promise<TokenGrant>;

  refresh(refreshToken: string): Promise<TokenGrant>;

  /** Relinquish authority at BattleGrid, not merely locally. */
  revoke(token: string): Promise<void>;

  /** What the live server says it can do, this session. */
  discoverTools(accessToken: string): Promise<readonly DiscoveredTool[]>;

  /**
   * Invoke a tool. Implementations MUST run the full call path: classify,
   * refuse unavailable scope, require confirmation when destructive, audit
   * before attempting, audit the outcome.
   */
  callTool(request: ToolCallRequest): Promise<ToolCallResult>;

  /**
   * The server version the platform's handshake names, or null when it does
   * not say. Optional, and null-on-unknown by contract: the one consumer is
   * the signal recorder, which stamps each capture with the generation that
   * answered — a version it cannot learn is recorded as unknown, never
   * guessed, and never a reason to fail the capture. A fake that omits this
   * is a platform that did not say, which is a state the record supports.
   */
  serverVersion?(accessToken: string): Promise<string | null>;
}

/**
 * What a token response contains — which is authority, and not identity.
 *
 * **There is deliberately no subject here.** BattleGrid is plain OAuth 2.1: its
 * `/.well-known/openid-configuration` is 404, its authorization-server metadata
 * advertises no `userinfo_endpoint`, and three live grants on 2026-08-13 carried
 * `access_token, token_type, expires_in, refresh_token, scope` and nothing else.
 * `sub` is an OIDC claim and was never going to be in there.
 *
 * This interface carried one anyway, and the adapter refused every grant that
 * did not supply it — so no delegated connection ever completed. Which account a
 * grant acts as is a question for `AccountPort`, asked with the token this
 * response carries.
 */
export interface TokenGrant {
  readonly accessToken: string;
  readonly refreshToken: string | null;
  /** Seconds, as the server reported it. Absent means the server did not say. */
  readonly expiresIn: number | undefined;
  readonly scopes: readonly Scope[];
}

export interface ToolCallRequest {
  readonly userId: string;
  /** Who caused this call. Omitted means the user themselves. */
  readonly actor?: AuditActor | undefined;
  readonly accessToken: string;
  readonly tool: string;
  readonly args: Record<string, unknown>;
  /** Required when the tool classifies as destructive. */
  readonly confirmationToken?: string | undefined;
  /** The thing being changed, for confirmation binding. */
  readonly target?: string | undefined;
  readonly idempotencyKey?: string | undefined;
  /**
   * The authority this credential carries, when there is nowhere to look it up.
   *
   * Normally the guard reads a caller's scopes from their stored connection —
   * which is right for every operation a *connected* user performs, and
   * impossible for the one call that runs **before a connection exists**:
   * establishing which account an authorization grant acts as. There is no row
   * to read, so `ConnectionScopes` correctly answers "no authority at all" and
   * the guard correctly refuses. The call is then rejected for lacking exactly
   * the scope the grant in hand is holding.
   *
   * That is not hypothetical: it is what the first real delegated authorization
   * did, on 2026-08-13, and no offline test could see it — every one of them
   * fakes the port, and both live probes wired the personal path, where scopes
   * come from configuration rather than from a connection.
   *
   * Supplying the grant's own scopes is **not a bypass of the guard, it is the
   * guard's missing input.** A grant narrower than what was requested still
   * refuses here, which is the behaviour "The grant is narrower than what was
   * asked for" requires.
   *
   * Deliberately not a general escape hatch:
   * `tests/architecture/granted-scopes.test.ts` holds that the only caller is
   * the account read.
   */
  readonly grantedScopes?: readonly Scope[] | undefined;
}

export interface ToolCallResult {
  readonly content: unknown;
  readonly classification: ToolClass;
  readonly auditEntryId: string;
}
