import type { AgentExposure, FillFailures } from '@/application/use-cases/read-exposure.query.js';
import type { OpenPosition } from '@/ports/positions.js';

/**
 * What this agent has at stake, and what it could not get to the exchange.
 *
 * Every figure below is the platform's. Mark price, unrealized result, ROE,
 * margin and liquidation price all arrive computed — recomputing any of them
 * from an entry price would disagree with the exchange the first time
 * BattleGrid changed how it marks, on the surface where that matters most.
 */

const money = (v: number | null): string =>
  v === null ? 'not priced' : `${v < 0 ? '-' : ''}$${Math.abs(v).toFixed(2)}`;

/** A percentage the platform already scaled. Never multiplied here. */
const percent = (v: number | null): string =>
  v === null ? 'not priced' : `${(Math.round(v * 100) / 100).toFixed(2)}%`;

const price = (v: number | null): string => (v === null ? '—' : String(v));

/**
 * One open position.
 *
 * The stop and target shown are the **effective** ones and say so. Position
 * management moves them after the decision that opened the trade — observed
 * live: a decision recorded 55.67456526 and its position reported 55.954 — so
 * a surface presenting the decided values as current understates the
 * protection in force.
 */
function Position({ p }: { p: OpenPosition }) {
  // The platform distinguishes a position it could not price from one worth
  // nothing, and so does this. `unpricedPositionCount` is that distinction
  // arriving as a field.
  const unpriced = p.markPrice === null;

  return (
    <li className="space-y-1 rounded border p-3 text-sm">
      <p className="font-medium">
        {`${p.coinTicker} ${p.direction}`}
        {p.effectiveLeverage === null ? '' : ` · ${p.effectiveLeverage}× leverage`}
        {p.status === null ? '' : ` · ${p.status}`}
      </p>

      <p>
        {`Entered at ${price(p.entryFillPrice)}`}
        {unpriced ? ' · not priced right now' : ` · marked at ${price(p.markPrice)}`}
      </p>

      <p>
        {`${money(p.currentNotionalUsd ?? p.entryNotionalUsd)} at stake · ${money(p.marginedUsd)} margined`}
      </p>

      {/* Unknown, not zero. A position whose value could not be read has an
          unknown result, and rendering it flat would be a claim. */}
      <p className={p.unrealizedPnlUsd !== null && p.unrealizedPnlUsd < 0 ? 'font-medium' : undefined}>
        {p.unrealizedPnlUsd === null
          ? 'Unrealized result unknown — BattleGrid could not price this one.'
          : `Unrealized ${money(p.unrealizedPnlUsd)} (${percent(p.roePct)} on margin)`}
      </p>

      <p>
        {`Stop now ${price(p.effectiveStopLoss)} · target now ${price(p.effectiveTakeProfit)}`}
        {p.liquidationPrice === null ? '' : ` · liquidation ${price(p.liquidationPrice)}`}
      </p>
      {/* Named because it is the trap: these are where the stop and target
          actually are, not where the decision put them. */}
      <p className="text-text-secondary">
        Stop and target are the current ones — position management moves them
        after the decision.
      </p>

      {p.openedAt ? (
        <p className="text-text-secondary">
          {`Opened ${p.openedAt}`}
          {p.timeHorizon ? ` · sized for ${p.timeHorizon}` : ''}
        </p>
      ) : null}
    </li>
  );
}

/**
 * Entries that never became an order.
 *
 * The counts already existed on the funnel and already rendered on
 * `/pipeline` — as a row of statistics, which is where 28 looks like a number
 * rather than half of everything the agent decided. Said against the total,
 * it is a different sentence.
 */
function Fills({ fills }: { fills: FillFailures }) {
  if (fills.failed === 0) return null;

  return (
    <div className="space-y-1 text-sm">
      <p className={fills.dominant ? 'font-medium' : undefined}>
        {`${fills.failed} of ${fills.decided} entries never became an order.`}
      </p>
      {fills.dominant ? (
        <p>
          More of what this agent decided failed than succeeded — {fills.failed}{' '}
          failed against {fills.executed} executed.
        </p>
      ) : null}
      {/*
        No reason is offered per failure: the platform sends none. A failed
        decision carries an execution time and no order id, and that absence is
        the whole of the evidence.
      */}
      <p className="text-text-secondary">
        BattleGrid does not say why an individual entry failed — only that it
        reached execution and produced no order.
        {fills.platformFillRatePercent === null
          ? ''
          : ` BattleGrid's own fill rate for this agent is ${fills.platformFillRatePercent}%.`}
      </p>
    </div>
  );
}

export function Exposure({ exposure, fills }: AgentExposure) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-medium">What it has at stake</h2>

      {exposure.kind === 'unreadable' ? (
        <p role="alert" className="text-sm">
          What this agent is holding could not be read: {exposure.reason}
        </p>
      ) : exposure.kind === 'flat' ? (
        <p className="text-sm">This agent is holding nothing right now.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {exposure.positions.map((p) => (
              <Position key={p.positionId} p={p} />
            ))}
          </ul>
          {/*
            A snapshot, and it says so. The platform declares how often a
            client should re-read; a server-rendered page cannot honour that,
            so it states when it was priced rather than implying it is live.
          */}
          {exposure.totals.generatedAtMs === null ? null : (
            <p className="text-sm text-text-secondary">
              {`Priced ${new Date(exposure.totals.generatedAtMs).toISOString()} — a snapshot, not a live ticker.`}
            </p>
          )}
          {/* What else on the account is exposed, so one agent's page does not
              imply it is the only thing at risk. */}
          {exposure.totals.openPositionCount !== null && exposure.totals.openPositionCount > exposure.positions.length ? (
            <p className="text-sm text-text-secondary">
              {`${exposure.totals.openPositionCount} positions are open across this account, ` +
                `${money(exposure.totals.marginedUsd)} margined in total.`}
            </p>
          ) : null}
          {exposure.totals.unpricedPositionCount !== null && exposure.totals.unpricedPositionCount > 0 ? (
            <p className="text-sm">
              {`BattleGrid could not price ${exposure.totals.unpricedPositionCount} of them.`}
            </p>
          ) : null}
        </>
      )}

      {fills ? <Fills fills={fills} /> : null}
    </section>
  );
}
