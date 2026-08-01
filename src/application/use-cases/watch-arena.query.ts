import type { FailureCause } from '@/ports/failure.js';
import type { GridSessionDetail, MarketGridPort } from '@/ports/market-grid.js';

export interface ArenaSession extends GridSessionDetail {
  readonly coinTickers: readonly string[];
  /** From the submission check alone — see the port's hasSubmitted note. */
  readonly entered: boolean;
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
 */
export class WatchArenaQuery {
  constructor(private readonly grid: MarketGridPort) {}

  async execute(req: { userId: string; accessToken: string }): Promise<WatchArenaResult> {
    const listed = await this.grid.listSessions(req);
    if (listed.kind === 'unreadable') return listed;
    if (listed.sessions.length === 0) return { kind: 'empty' };

    const sessions = await Promise.all(
      listed.sessions.map(async (s): Promise<ArenaSession> => {
        const [detail, entered] = await Promise.all([
          this.grid.sessionDetail({ ...req, sessionId: s.id }),
          this.grid.hasSubmitted({ ...req, sessionId: s.id }),
        ]);
        return { ...detail, coinTickers: s.coinTickers, entered };
      }),
    );
    return { kind: 'arena', sessions };
  }
}
