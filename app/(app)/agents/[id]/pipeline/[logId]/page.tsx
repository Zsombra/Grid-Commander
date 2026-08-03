import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import type { ConsultedSignal } from '@/ports/agents.js';

/**
 * What your own agent read, indicator by indicator — and what it cost.
 *
 * The mirror of `/explorer/[agentId]/evaluations/[logId]`, which existed
 * first. For a while this product explained a stranger's agent better than
 * the user's own, because it read the 23-key list row and never called
 * `get_signal_log` for the other eight keys.
 *
 * One thing here a competitor's page can never have: `ownerView`, which
 * BattleGrid nulls on every public read. It is what the thinking cost, and
 * an operator tuning a strategy is paying it on every evaluation —
 * including the ones where fifty-one of sixty-four signals answered "no".
 */

const pct = (v: number | null): string => (v === null ? 'not measured' : `${Math.round(v)}%`);
const usd = (v: number | null): string =>
  v === null ? '—' : `${v < 0 ? '−' : ''}$${Math.abs(v).toFixed(2)}`;

/** Signals in the order the platform's modules appear, module by module. */
function byModule(signals: readonly ConsultedSignal[]): [string, ConsultedSignal[]][] {
  const groups = new Map<string, ConsultedSignal[]>();
  for (const s of signals) {
    const key = s.module ?? 'unnamed module';
    const bucket = groups.get(key);
    if (bucket) bucket.push(s);
    else groups.set(key, [s]);
  }
  return [...groups];
}

export default async function OwnEvaluationPage({
  params,
}: {
  params: Promise<{ id: string; logId: string }>;
}) {
  const { id, logId } = await params;
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const result = await app.readOwnEvaluation.execute({ ...user.authority, agentId: id, logId });

  // Both ways back. The reachability guard asks for the entity itself —
  // a reader three levels deep should not have to walk up one rung at a
  // time to reach the agent this is all about.
  const back = (
    <p className="text-sm">
      <a href={`/agents/${id}/pipeline`} className="underline">
        Back to why it did or didn&apos;t trade
      </a>
      {' · '}
      <a href={`/agents/${id}`} className="underline">
        Back to the agent
      </a>
    </p>
  );

  if (result.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">This evaluation could not be read</h1>
        <p role="alert" className="text-sm">
          {result.reason}
        </p>
        {back}
      </main>
    );
  }

  if (result.kind === 'none') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No detail is published for this evaluation</h1>
        <p className="text-sm">
          BattleGrid lists this evaluation but publishes nothing further about
          it.
        </p>
        {back}
      </main>
    );
  }

  const e = result.evaluation;
  const fired = e.signals.filter((s) => s.triggered);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">
        What it read on {e.coinTicker ?? 'this market'}
      </h1>
      <p className="text-sm">
        Scored {pct(e.aggregateScorePercent)}
        {e.dominantBias ? ` · bias ${e.dominantBias}` : ''}
        {e.terminalStatus ? ` · ended ${e.terminalStatus}` : ''}
        {e.timeframesUsed.length > 0 ? ` · over ${e.timeframesUsed.join(', ')}` : ''}
        {e.evaluatedAt ? ` · ${e.evaluatedAt}` : ''}
      </p>
      {e.hasConflictingSignals ? (
        <p className="text-sm">Signals disagreed with each other on this candidate.</p>
      ) : null}

      {/*
        Yours alone. The public projection nulls this, so no competitor page
        can show it — and no other surface in this product has ever shown
        what a decision cost to reach.
      */}
      {e.cost ? (
        <section className="space-y-2">
          <h2 className="text-base font-medium">What this decision cost to think</h2>
          <p className="text-sm">
            {e.cost.modelDisplayName ?? 'model not stated'}
            {e.cost.provider ? ` · ${e.cost.provider}` : ''}
            {/* Null is not free. An unreported price and a price of zero are
                different facts, and only one should reassure. */}
            {e.cost.costUsd !== null
              ? ` · $${e.cost.costUsd.toFixed(4)}`
              : ' · cost not reported'}
            {e.cost.durationMs !== null ? ` · ${(e.cost.durationMs / 1000).toFixed(1)}s` : ''}
            {e.cost.billingType ? ` · billed ${e.cost.billingType}` : ''}
          </p>
          {e.cost.errorMessage ? (
            <p role="alert" className="text-sm">
              The model reported: {e.cost.errorMessage}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-base font-medium">The chain it followed</h2>
        <div className="rounded border p-3 text-sm space-y-1">
          {e.chain.gateStatus ? (
            <p>
              Gate: {e.chain.gateStatus}
              {e.chain.gateReason ? ` — ${e.chain.gateReason}` : ''}
            </p>
          ) : null}
          {e.chain.attemptResult ? (
            <p>
              Attempt: {e.chain.attemptResult}
              {e.chain.attemptReasonCodes.length > 0
                ? ` — ${e.chain.attemptReasonCodes.join(', ')}`
                : ''}
            </p>
          ) : null}
          {e.chain.decision ? (
            <p>
              Decision: {e.chain.decision} {e.chain.decisionDirection ?? ''}
              {e.chain.convictionPercent !== null
                ? ` at ${pct(e.chain.convictionPercent)} conviction`
                : ''}
              {e.chain.entryPrice !== null
                ? ` · entry ${e.chain.entryPrice} · stop ${e.chain.stopLoss ?? '—'} · target ${e.chain.takeProfit ?? '—'}`
                : ''}
              {e.chain.riskRewardRatio !== null ? ` · R:R ${e.chain.riskRewardRatio}` : ''}
            </p>
          ) : null}
          {/* A stage the platform did not record is absent, not empty. */}
          {e.chain.executionStatus ? (
            <p>
              Execution: {e.chain.executionStatus}
              {e.chain.expiryReason ? ` — expired on ${e.chain.expiryReason}` : ''}
              {e.chain.failureReason ? ` — failed: ${e.chain.failureReason}` : ''}
            </p>
          ) : null}
          {/* The platform's own words, unparsed. */}
          {e.chain.executionMessage ? (
            <p className="whitespace-pre-wrap break-all">{e.chain.executionMessage}</p>
          ) : null}
          {e.chain.tradeOutcome ? (
            <p className="font-medium">
              Outcome: {e.chain.tradeOutcome} · {usd(e.chain.netPnl)}
            </p>
          ) : null}
        </div>
      </section>

      {e.attributions.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-base font-medium">How the score was built</h2>
          <p className="text-sm">
            What each contributing signal was worth to the{' '}
            {pct(e.aggregateScorePercent)} aggregate.
          </p>
          <ul className="space-y-1 text-sm">
            {e.attributions.map((a) => (
              <li key={a.signalId}>
                {a.name ?? a.signalId} — {pct(a.attributionPercent)} of the score
                {a.scorePercent !== null ? ` (scored ${pct(a.scorePercent)})` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-base font-medium">
          Every signal it consulted — {fired.length} of {e.signals.length} fired
        </h2>
        <p className="text-sm">
          The ones that did not fire are shown too: what your agent looks at
          and dismisses is as much its strategy as what triggers it.
        </p>
        {e.signals.length === 0 ? (
          <p className="text-sm">BattleGrid published no signal scorecard for this evaluation.</p>
        ) : (
          byModule(e.signals).map(([module, signals]) => (
            <div key={module} className="space-y-1">
              <h3 className="text-sm font-medium">
                {module} — {signals.filter((s) => s.triggered).length} of {signals.length} fired
              </h3>
              <ul className="space-y-1 text-sm">
                {signals.map((s) => (
                  <li key={s.signalId} className="border-l pl-3">
                    <p>
                      <span className="font-medium">
                        {s.triggered ? 'Fired' : 'Did not fire'}
                      </span>{' '}
                      · {s.signalId}
                      {s.scorePercent !== null ? ` · ${pct(s.scorePercent)}` : ''}
                      {s.bias ? ` · ${s.bias}` : ''}
                      {s.isPrimary ? ' · primary' : ''}
                      {s.required ? ' · required' : ''}
                    </p>
                    {/* The platform's sentence: the reading and the bar. */}
                    {s.details ? <p>{s.details}</p> : null}
                    {Object.keys(s.indicatorValues).length > 0 ? (
                      <p className="text-text-secondary">
                        {Object.entries(s.indicatorValues)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(' · ')}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {back}
    </main>
  );
}
