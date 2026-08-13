import type { Performance } from '@/domain/agent/performance.js';
import { asPercent, hasPlayed, hasTraded, usd } from '@/domain/agent/performance.js';

/**
 * How an agent has actually done.
 *
 * The figures come from the roster payload, which this product has parsed and
 * discarded on every agents page for its whole life. Nothing here is computed
 * from a curve or cross-totalled: the platform sends the totals and they are
 * shown as sent.
 *
 * Games and trades stay apart. An agent with 97 grid entries and 18 perps trades
 * has two records in different units, and a single combined figure would be an
 * average of a score and a dollar.
 */
export function AgentRecord({ performance }: { performance: Performance }) {
  const { games, trades } = performance;
  const played = hasPlayed(performance);
  const traded = hasTraded(performance);
  /**
   * Rounded here and nowhere else.
   *
   * The platform sends the rate twice — `winRate: 0.3917525773195876` and
   * `winRatePercent: 39` — and the mapper keeps only the fraction. One rounding
   * rule, in the domain, so this screen can never show a figure that disagrees
   * with the one beside it.
   */
  const winRatePercent = asPercent(games.winRate);
  const accuracyPercent = asPercent(games.avgAccuracy);

  /**
   * Nothing yet, said as nothing.
   *
   * An unplayed agent reports `played: 0`, `winRate: 0`, `earnings: 0`, and
   * three zeroes on a screen read as a dismal record rather than an absent one.
   * Six of the nine agents this was built against were in exactly that state,
   * three of them created that afternoon.
   */
  if (!played && !traded) {
    return (
      <section className="space-y-1">
        <h2 className="font-medium text-text-primary">How it has done</h2>
        <p className="text-sm text-text-secondary">
          This agent has not played a game or opened a trade yet. That is not a
          record of zero — there is no record.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="font-medium text-text-primary">How it has done</h2>

      {played && (
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-text-primary">Grids</h3>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <Figure label="Played" value={String(games.played)} />
            <Figure label="Won" value={winRatePercent === null ? 'not recorded' : `${winRatePercent}%`} />
            <Figure label="Average accuracy" value={accuracyPercent === null ? 'not recorded' : `${accuracyPercent}%`} />
            <Figure label="Earned" value={usd(games.earningsUsd)} />
          </dl>
        </div>
      )}

      {traded && (
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-text-primary">Trades</h3>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <Figure label="Placed" value={String(trades.trades)} />
            {trades.open > 0 && <Figure label="Still open" value={String(trades.open)} />}
            <Figure label="Won / lost" value={`${trades.wins} / ${trades.losses}`} />
            {/**
             * Null on an agent that has not traded — the platform's own
             * distinction, and the one place in this payload it draws it
             * unprompted. Not rendered as $0.00.
             */}
            <Figure
              label="Average"
              value={trades.avgPnlUsd === null ? 'not recorded' : usd(trades.avgPnlUsd)}
            />
          </dl>
        </div>
      )}

      {/**
       * Said plainly, because `get_agent_performance` exists and answers a
       * *different* number: realized P&L since the agent's risk-budget
       * baseline, trades and wagers totalled, measured against the drawdown
       * stop the platform halts on. This page is the lifetime record.
       *
       * It used to say that tool "answers with zeros". It does so only when
       * there is no budget or no settlement yet — it does not disagree with
       * this page, it measures from a different start (#189).
       */}
      <p className="text-xs text-text-secondary">
        As BattleGrid reports it on the agent itself.
      </p>
    </section>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="text-text-primary">{value}</dd>
    </div>
  );
}
