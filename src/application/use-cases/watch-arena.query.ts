import type { FailureCause } from '@/ports/failure.js';
import type { GridSessionDetail, MarketGridPort } from '@/ports/market-grid.js';

/**
 * One session on the arena surface.
 *
 * Split into what the **list** knew and what the **per-session reads** added,
 * because they fail independently. `id`, `name` and `coinTickers` come off the
 * list and are therefore known for every session that appears at all; `detail`
 * and `entered` are separate reads and either can come back empty-handed.
 */
export interface ArenaSession {
  readonly id: string;
  readonly name: string;
  readonly coinTickers: readonly string[];
  /** Schedule, status and player count. Null when that read did not answer. */
  readonly detail: GridSessionDetail | null;
  /**
   * Whether this account entered — and **null when nobody knows**.
   *
   * Not a boolean. `false` says "has not entered", which is a claim; an
   * unanswered check has no claim to make, and rendering one as the other is
   * the same error as an unreadable roster reported as an empty one.
   */
  readonly entered: boolean | null;
  /** Why a per-session read did not answer, when one did not. */
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
 * **The list is guarded and so is the fan-out.** It was not: the list read
 * caught its failures and the two per-session reads threw, so a single
 * rate-limited session took the whole page to a 500. Found by
 * `all-controllers-probe` on its first run, in the same walk where `readField`
 * hit the identical rate limit and degraded correctly.
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
        const [detail, submission] = await Promise.all([
          this.grid.sessionDetail({ ...req, sessionId: s.id }),
          this.grid.hasSubmitted({ ...req, sessionId: s.id }),
        ]);
        // The first reason, so the surface can say something specific without
        // stacking two sentences for what is usually one outage.
        const unreadable =
          detail.kind === 'unreadable'
            ? detail.reason
            : submission.kind === 'unreadable'
              ? submission.reason
              : null;
        return {
          id: s.id,
          name: s.name,
          coinTickers: s.coinTickers,
          detail: detail.kind === 'detail' ? detail.detail : null,
          entered: submission.kind === 'submission' ? submission.entered : null,
          unreadable,
        };
      }),
    );
    return { kind: 'arena', sessions };
  }
}
