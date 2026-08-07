import type { FailureCause } from '@/ports/failure.js';
import type { GridSessionSummary, MarketGridPort } from '@/ports/market-grid.js';

/**
 * One session on the arena surface.
 *
 * Everything a reader sees about the *session* — its name, status, schedule,
 * player count, coin pool and price — is `GridSessionSummary`, which comes off
 * the list and is therefore known for every session that appears at all. The
 * two fields added here are about the *account*, and they are the only ones a
 * separate read can fail to answer.
 *
 * Extended from the summary rather than restated, so a field added to the list
 * mapping reaches the surface instead of being dropped by a copy nobody
 * updated. That is load-bearing now: the schedule arrived exactly this way.
 */
export interface ArenaSession extends GridSessionSummary {
  /**
   * Whether this account entered — and **null when nobody knows**.
   *
   * Not a boolean. `false` says "has not entered", which is a claim; an
   * unanswered check has no claim to make, and rendering one as the other is
   * the same error as an unreadable roster reported as an empty one.
   */
  readonly entered: boolean | null;
  /**
   * Why the submission check did not answer, when it did not.
   *
   * Only ever about that check now. It used to carry the first of two reasons —
   * the detail read's or the submission check's — and the detail read is gone.
   */
  readonly unreadable: string | null;
}

export type WatchArenaResult =
  | { readonly kind: 'arena'; readonly sessions: readonly ArenaSession[] }
  | { readonly kind: 'empty' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * The arena, watched: every listed session with its schedule, coin pool,
 * and whether this account has entered. An unreadable list is unreadable —
 * it never renders as an empty arena, because "nothing is running" and
 * "nothing could be read" are different facts and only one of them should
 * keep a player away.
 *
 * **One read per session, and it is the only one no list can answer.** There
 * were two. `get_market_grid_session` was called once per listed session for
 * `status`, `lockAt`, `settleAt` and `playerCount` — all four of which
 * `list_market_grid_sessions` sends on every row, observed on all fifty
 * (2026-08-06). Fifty calls for data already in hand, and the fan-out where
 * `all-controllers-probe` met HTTP 429: the previous change made that failure
 * survivable, this one makes it unnecessary. It also retires a sentence that
 * was false — the arena said a session's schedule could not be read while the
 * payload that rendered the row was holding it.
 *
 * The submission check stays per session because it is a question about an
 * *account*: no list of sessions carries "and this user entered that one".
 *
 * **The remaining read is still guarded.** It was not: the list read caught its
 * failures and the per-session reads threw, so a single rate-limited session
 * took the whole page to a 500 — found in the same walk where `readField` hit
 * the identical rate limit and degraded correctly.
 */
export class WatchArenaQuery {
  constructor(private readonly grid: MarketGridPort) {}

  async execute(req: { userId: string; accessToken: string }): Promise<WatchArenaResult> {
    const listed = await this.grid.listSessions(req);
    // The one failure that is still total: with no list there is nothing to
    // show, and an empty arena would be a claim about what is running.
    if (listed.kind === 'unreadable') return listed;
    if (listed.sessions.length === 0) return { kind: 'empty' };

    const sessions = await Promise.all(
      listed.sessions.map(async (s): Promise<ArenaSession> => {
        const submission = await this.grid.hasSubmitted({ ...req, sessionId: s.id });
        return {
          // Spread, so every field the list mapper learns to read arrives here
          // without this file being edited — which is how the schedule got
          // here, and how the four fields before it did.
          ...s,
          entered: submission.kind === 'submission' ? submission.entered : null,
          unreadable: submission.kind === 'unreadable' ? submission.reason : null,
        };
      }),
    );
    return { kind: 'arena', sessions };
  }
}
