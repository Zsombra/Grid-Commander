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

export interface TokenGrant {
  readonly accessToken: string;
  readonly refreshToken: string | null;
  /** Seconds, as the server reported it. Absent means the server did not say. */
  readonly expiresIn: number | undefined;
  readonly scopes: readonly Scope[];
  readonly subject: string;
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
}

export interface ToolCallResult {
  readonly content: unknown;
  readonly classification: ToolClass;
  readonly auditEntryId: string;
}
