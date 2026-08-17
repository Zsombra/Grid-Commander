import type { FeasibilityAdvisory } from './feasibility.js';

/**
 * The advisory, on its way from the write that produced it to the page that
 * shows it.
 *
 * ## Why this exists at all
 *
 * Every write in this product ends in a redirect, and the edit surface holds no
 * client state — both are stated as constraints in `openspec/design/surfaces/agent-edit.json`,
 * not as preferences. So the reply to the write has to survive a redirect, and
 * only two channels can carry it: the URL, or a cookie.
 *
 * The URL was rejected. A count of tradeable coins in a query string is a count
 * anyone can type, and a surface rendering `?buildable=12` as BattleGrid's
 * answer would be stating a platform claim the platform never made. This
 * product refuses that everywhere else — "a parameter added to the URL by hand
 * is rejected here rather than sent to BattleGrid".
 *
 * ## What makes it trustworthy
 *
 * The transport signs it, the same way `CookieSession` signs a session: a user
 * id in an unsigned cookie is an invitation to type someone else's, and so is a
 * fleet's feasibility. This module holds only the shape and the two rules a
 * verified payload must still pass — right agent, recent enough.
 */
export interface FeasibilityReply {
  /**
   * Which agent the advisory was computed for.
   *
   * Checked at render. A signature proves the server wrote it; it does not
   * prove the reader is looking at the agent it was written about, and one
   * agent's tradeable universe shown under another agent's name is a false
   * statement that verifies perfectly.
   */
  readonly agentId: string;
  /** When the write it came back from happened. */
  readonly issuedAt: Date;
  readonly advisory: FeasibilityAdvisory;
  /**
   * Whether the per-coin detail made it.
   *
   * A cookie is finite and a fleet is not. Where the coins did not fit, the
   * platform's own `counts` still travel and this is `false`, so the surface
   * can say the detail was dropped instead of rendering a shorter fleet as if
   * it were the whole one. A silent truncation here would misreport how many
   * coins an operator has.
   */
  readonly coinsCarried: boolean;
}

/**
 * How long a reply is worth showing.
 *
 * Two minutes, and the number is short for a reason that is not caution. The
 * advisory is a reading of *live volatility* against the strategy's dials at
 * one instant. It does not become wrong the way a stale name does — it becomes
 * wrong the way a stale price does, quietly and without anything to notice. A
 * reply the operator finds an hour later, after wandering away and back, would
 * describe a market that has moved.
 *
 * It is deliberately not the cookie's `maxAge` alone. The browser's expiry is a
 * courtesy; this is the check that decides, so a cookie that outlives its
 * window — clock skew, a browser that rounds, a replayed jar — still renders
 * nothing.
 */
export const FEASIBILITY_REPLY_TTL_SECONDS = 120;

export function isStale(reply: FeasibilityReply, now: Date): boolean {
  const age = now.getTime() - reply.issuedAt.getTime();
  // A reply from the future is stale too. A negative age means the clock moved
  // under us, and "how old is this" has no answer worth rendering.
  return age < 0 || age > FEASIBILITY_REPLY_TTL_SECONDS * 1000;
}

/**
 * Whether this reply may be shown on this agent's surface.
 *
 * One function rather than two checks at the call site, because the call site
 * that forgets the second one renders the right numbers under the wrong name
 * and looks entirely correct doing it.
 */
export function isShowable(reply: FeasibilityReply, agentId: string, now: Date): boolean {
  return reply.agentId === agentId && !isStale(reply, now);
}
