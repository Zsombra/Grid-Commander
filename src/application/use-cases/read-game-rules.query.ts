import type { GameRulesResult, MarketGridPort } from '@/ports/market-grid.js';

/**
 * What the game is, before anyone plays it.
 *
 * Market Grid has a price — `entryFee: 10` on every preset and every session
 * read on 2026-08-06 — and a scoring rule that decides what that price buys.
 * Both live on the platform's game presets, not on a session, and both are
 * readable by an account that has never entered anything.
 *
 * A read of its own rather than a second half of `WatchArenaQuery`, because
 * the two fail independently: the rulebook is one unscoped call and the arena
 * is a list plus a fan-out over fifty sessions, and the rate limit that takes
 * the second down has no reason to take the first with it.
 */
export class ReadGameRulesQuery {
  constructor(private readonly grid: MarketGridPort) {}

  async execute(req: { userId: string; accessToken: string }): Promise<GameRulesResult> {
    return this.grid.gameRules(req);
  }
}
