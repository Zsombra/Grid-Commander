import type { GameRulesResult } from '@/ports/market-grid.js';
import { WhyNotLoaded } from './why-not-loaded.js';

/**
 * What the game is, in BattleGrid's own numbers.
 *
 * The operator described Market Grid as "nine coins, and you deploy an agent
 * to call them". The preset is where that description is a fact: a 3×3 grid of
 * nine, a 1H window, an entry fee of 10, a change multiplier of 100, a captain
 * pick worth double and a wrong call that costs — read live 2026-08-06.
 *
 * Rendered on the arena rather than on a page of its own because the rules are
 * what makes a session list mean anything: without them a row of nine tickers
 * and a settle time is a schedule, not a game.
 *
 * A preset for another game type is shown rather than filtered out. The
 * platform lists what it lists, and quietly hiding a row is how a surface comes
 * to claim the catalogue is smaller than it is.
 */

/** The platform's own figure, or the absence of one. Never a zero we invented. */
const n = (v: number | null): string => (v === null ? '—' : `${v}`);

export function GameRules({ rules }: { rules: GameRulesResult }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-medium">The game</h2>
      {rules.kind === 'unreadable' ? (
        <>
          <p role="alert" className="text-sm">
            The game&apos;s rules could not be read: {rules.reason}
          </p>
          {/* Not "this game has no rules": the sessions below are still listed
              and still cost something, and a reader told nothing about the
              price is worse off than one told the price is unknown. */}
          <WhyNotLoaded cause={rules.cause} subject="the rules are" />
        </>
      ) : rules.presets.length === 0 ? (
        <p className="text-sm">BattleGrid lists no active game presets.</p>
      ) : (
        <ul className="space-y-3">
          {rules.presets.map((p) => (
            <li key={p.id} className="rounded-gc-2 border border-border-default p-3 text-sm space-y-1">
              <p className="font-medium">
                {p.name} · {p.gameType}
                {p.timeRangeKey ? ` · ${p.timeRangeKey}` : ''}
              </p>
              <p>
                {n(p.gridRows)}×{n(p.gridCols)} grid — {n(p.coinsPerGame)} coins to call ·
                entry {n(p.entryFee)}
              </p>
              <p>
                A right call scores its price change ×{n(p.changeMultiplier)}; the captain pick
                counts ×{n(p.captainMultiplier)} and costs ×{n(p.captainWrongPenaltyMultiplier)}
                when it is wrong; any other wrong call costs ×{n(p.wrongPenaltyMultiplier)}.
              </p>
              {/* Only when the platform said so. An absent flag is not a denial,
                  and "no jackpot" is a claim. */}
              {p.jackpotEnabled ? (
                <p>
                  A jackpot rides on this game
                  {p.perfectGameNeedsEveryCall ? ', and it takes every call correct' : ''}.
                </p>
              ) : null}
              <p className="text-text-secondary">
                {n(p.minimumPlayers)} player(s) minimum, {n(p.maxPlayers)} maximum
                {p.cancelsBelowMinimum ? ' — short of the minimum, the game is cancelled' : ''}.
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
