/**
 * Evidence that a human was shown what a destructive operation would do.
 *
 * A boolean `confirmed: true` proves nothing — any caller can set it. A token
 * is issued alongside the rendered consequence and bound to the operation and
 * target it was issued for, so it cannot be replayed against a different
 * action.
 */
export interface ConfirmationToken {
  readonly token: string;
  readonly userId: string;
  readonly tool: string;
  /** The specific thing being changed — an agent id, a strategy id. */
  readonly target: string;
  /** The wording the user was actually shown. Stored so the audit can prove it. */
  readonly consequence: string;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
}

export interface ConfirmationStore {
  issue(token: ConfirmationToken): Promise<void>;
  /** Single-use. Returns null if unknown, expired, already used, or mismatched. */
  consume(token: string, userId: string, tool: string, target: string): Promise<ConfirmationToken | null>;
}

export function isValid(token: ConfirmationToken, now: Date): boolean {
  return token.consumedAt === null && token.expiresAt.getTime() > now.getTime();
}

/** Long enough to read the consequence, short enough not to be left lying around. */
export const CONFIRMATION_TTL_SECONDS = 300;
