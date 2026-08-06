import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import type { ConsultedSignal } from '@/ports/explorer.js';

/**
 * What one agent actually read, indicator by indicator.
 *
 * `/explorer` says the field loses money. `/explorer/[agentId]` says how a
 * competitor operates. This is the bottom of that stack: every signal
 * consulted on one candidate, the platform's own sentence for each, and
 * the chain the candidate then followed.
 *
 * **The untriggered signals are the point.** Sixty of seventy-two did not
 * fire on the evaluation this was built against, and what an agent looked
 * at and dismissed is as much its strategy as what fired. Nothing here
 * filters them out.
 *
 * Owner-private telemetry (`ownerView`, `llmPartialReasoning`) is nulled by
 * BattleGrid on this public read. The adapter never reads those fields and
 * this page renders no placeholder for them — an empty reasoning slot would
 * say the agent explained nothing, when in fact it was not published.
 */

const pct = (v: number | null): string => (v === null ? '—' : `${Math.round(v)}%`);
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

export default async function EvaluationPage({
  params,
}: {
  params: Promise<{ agentId: string; logId: string }>;
}) {
  const { agentId, logId } = await params;
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const result = await app.readEvaluation.execute({ ...user.authority, agentId, logId });

  const back = (
    <p className="text-sm">
      <a href={`/explorer/${agentId}`} className="underline">
        Back to the competitor
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
        {/* The `none` branch below is BattleGrid publishing no detail, which
            is a fact about the platform. This one establishes nothing. */}
        <WhyNotLoaded cause={result.cause} subject="this evaluation is" />
        {back}
      </main>
    );
  }

  if (result.kind === 'none') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No detail is published for this evaluation</h1>
        {/*
          Not a failure. BattleGrid lists evaluations whose detail it does
          not publish — every one observed was a FAILED evaluation, though
          twenty rows is a pattern rather than a rule, which is why the
          link that got here was offered rather than withheld.
        */}
        <p className="text-sm">
          BattleGrid lists this evaluation but publishes nothing further
          about it.
        </p>
        {back}
      </main>
    );
  }

  const d = result.value;
  const triggered = d.signals.filter((s) => s.triggered);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">
        What it read on {d.coinTicker ?? 'this market'}
      </h1>
      <p className="text-sm">
        Scored {pct(d.aggregateScorePercent)}
        {d.dominantBias ? ` · bias ${d.dominantBias}` : ''}
        {d.terminalStatus ? ` · ended ${d.terminalStatus}` : ''}
        {d.timeframesUsed.length > 0 ? ` · over ${d.timeframesUsed.join(', ')}` : ''}
        {d.evaluatedAt ? ` · ${d.evaluatedAt}` : ''}
      </p>
      {d.hasConflictingSignals ? (
        <p className="text-sm">Signals disagreed with each other on this candidate.</p>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-base font-medium">The chain it followed</h2>
        <div className="rounded border p-3 text-sm space-y-1">
          {d.chain.gateStatus ? (
            <p>
              Gate: {d.chain.gateStatus}
              {d.chain.gateReason ? ` — ${d.chain.gateReason}` : ''}
            </p>
          ) : null}
          {d.chain.attemptResult ? (
            <p>
              Attempt: {d.chain.attemptResult}
              {d.chain.attemptReasonCodes.length > 0
                ? ` — ${d.chain.attemptReasonCodes.join(', ')}`
                : ''}
            </p>
          ) : null}
          {d.chain.decision ? (
            <p>
              Decision: {d.chain.decision} {d.chain.decisionDirection ?? ''}
              {d.chain.convictionPercent !== null
                ? ` at ${pct(d.chain.convictionPercent)} conviction`
                : ''}
              {d.chain.entryPrice !== null
                ? ` · entry ${d.chain.entryPrice} · stop ${d.chain.stopLoss ?? '—'} · target ${d.chain.takeProfit ?? '—'}`
                : ''}
              {d.chain.riskRewardRatio !== null ? ` · R:R ${d.chain.riskRewardRatio}` : ''}
            </p>
          ) : null}
          {/* A stage the platform did not record is absent, not empty. */}
          {d.chain.executionStatus ? (
            <p>
              Execution: {d.chain.executionStatus}
              {d.chain.expiryReason ? ` — expired on ${d.chain.expiryReason}` : ''}
              {d.chain.failureReason ? ` — failed: ${d.chain.failureReason}` : ''}
            </p>
          ) : null}
          {/* The platform's own words, unparsed — see the port's note. */}
          {d.chain.executionMessage ? (
            <p className="whitespace-pre-wrap break-all">{d.chain.executionMessage}</p>
          ) : null}
          {d.chain.tradeOutcome ? (
            <p className="font-medium">
              Outcome: {d.chain.tradeOutcome} · {usd(d.chain.netPnl)}
            </p>
          ) : null}
        </div>
      </section>

      {d.attributions.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-base font-medium">How the score was built</h2>
          <p className="text-sm">
            What each contributing signal was worth to the{' '}
            {pct(d.aggregateScorePercent)} aggregate.
          </p>
          <ul className="space-y-1 text-sm">
            {d.attributions.map((a) => (
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
          Every signal it consulted — {triggered.length} of {d.signals.length} fired
        </h2>
        <p className="text-sm">
          The ones that did not fire are shown too: what an agent looks at
          and dismisses is as much its strategy as what triggers it.
        </p>
        {d.signals.length === 0 ? (
          <p className="text-sm">BattleGrid published no signal scorecard for this evaluation.</p>
        ) : (
          byModule(d.signals).map(([module, signals]) => (
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
