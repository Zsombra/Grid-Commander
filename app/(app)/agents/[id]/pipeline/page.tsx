import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import type { SignalVerdict, StageResult } from '@/ports/agents.js';

/**
 * Why an agent did or did not trade.
 *
 * Three stages, in the order a candidate meets them: blocked before it was
 * ever evaluated, evaluated and skipped, or decided against in the agent's
 * own words. Each stage stands alone — one that cannot be read says so
 * without hiding the two that answered, and one that is empty says what
 * its emptiness means, because "nothing was blocked" and "we could not ask
 * what was blocked" send an operator to different places.
 */

/**
 * What an empty or unreadable stage says, so no branch renders as blank.
 *
 * `subject` names the stage the way `empty` already does, rather than one
 * wording covering all three. A reader who came for one of the three stages is
 * owed the reassurance about that stage.
 *
 * Each subject names the *record*, not the thing recorded. "This does not mean
 * what stopped this agent is gone" says the blocker is still in force, which is
 * the opposite of reassuring and not what failed to load.
 */
function StageNote({
  stage,
  empty,
  subject,
}: {
  stage: StageResult<unknown>;
  empty: string;
  subject: string;
}) {
  if (stage.kind === 'none') return <p className="text-sm">{empty}</p>;
  if (stage.kind === 'unreadable') {
    return (
      <>
        <p role="alert" className="text-sm">
          This stage could not be read: {stage.reason}
        </p>
        <WhyNotLoaded cause={stage.cause} subject={subject} />
      </>
    );
  }
  return null;
}

/** For a fraction in 0..1, as the stage reads report scores and conviction. */
const pct = (v: number | null): string => (v === null ? '—' : `${Math.round(v * 100)}%`);

/**
 * For a value the platform already expressed as a percentage.
 *
 * Two helpers rather than one because the platform sends both: the stage
 * reads give `aggregateScore: 0.397` while the funnel gives
 * `fillRatePct: 76`. Passing the second through the first renders 7600%,
 * which is the kind of wrong that looks like a rendering glitch rather
 * than a lie about money.
 */
const already = (v: number | null): string => (v === null ? 'not measured' : `${Math.round(v)}%`);

/**
 * The evidence a decision was drawn from, signal by signal.
 *
 * The verdict is printed as the platform sent it rather than mapped to a
 * colour or an icon: `WARN` is a third thing, and a reader who sees only
 * green and red learns that the agent was certain when it was not. The
 * counts above the list exist so the disagreement is legible before any of
 * the interpretations are read — "5 CONFIRM · 2 WARN · 1 REJECT" is the
 * shape of the decision.
 */
function Evidence({ checklist }: { checklist: readonly SignalVerdict[] }) {
  if (checklist.length === 0) return null;

  const counts = new Map<string, number>();
  for (const s of checklist) {
    const k = s.verdict ?? 'unstated';
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  return (
    <details className="mt-1">
      <summary className="cursor-pointer">
        What it read: {[...counts].map(([v, n]) => `${n} ${v}`).join(' · ')} across{' '}
        {checklist.length} signal{checklist.length === 1 ? '' : 's'}
      </summary>
      <ul className="mt-2 space-y-2">
        {checklist.map((s) => (
          <li key={s.signalId} className="border-l pl-3">
            <p className="font-medium">
              {s.label ?? s.signalId} — {s.verdict ?? 'no verdict stated'}
            </p>
            {/* The platform's reading of this one signal, unparaphrased. */}
            {s.interpretation ? <p>{s.interpretation}</p> : null}
          </li>
        ))}
      </ul>
    </details>
  );
}

export default async function PipelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { funnel, blocks, evaluations, decisions } = await app.readPipeline.execute({
    ...user.authority,
    agentId: id,
    limit: 10,
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">Why it did or didn&apos;t trade</h1>
      <p className="text-sm">
        A candidate can end at three places: stopped before it was evaluated,
        evaluated and skipped, or decided against. Newest first.
      </p>

      {/*
        The frame around the three stages. Ten rows cannot say what "245
        evaluations behind 73 entries" says, and this figure existed for
        competitors before it existed for the user's own agents.
      */}
      <section className="space-y-2">
        <h2 className="text-base font-medium">What it looks at, and what it acts on</h2>
        {funnel.kind === 'unreadable' ? (
          <>
            <p role="alert" className="text-sm">
              The record could not be read: {funnel.reason}
            </p>
            <WhyNotLoaded cause={funnel.cause} subject="this agent’s record is" />
          </>
        ) : funnel.kind === 'none' ? (
          <p className="text-sm">This agent has evaluated nothing yet.</p>
        ) : (
          <div className="rounded border p-3 text-sm space-y-1">
            <p>
              {funnel.funnel.totalEvaluations ?? '—'} evaluations →{' '}
              {funnel.funnel.totalDecisions ?? '—'} decisions →{' '}
              {funnel.funnel.enterDecisions ?? '—'} entered
            </p>
            {/* Two counters the platform names alike and means differently. */}
            <p>
              Decisions to skip: {funnel.funnel.skipDecisions ?? '—'} · pipelines
              ending SKIPPED: {funnel.funnel.skippedTerminal ?? '—'}
            </p>
            <p>
              Of what it entered: {funnel.funnel.executed ?? '—'} executed ·{' '}
              {funnel.funnel.failed ?? '—'} failed · {funnel.funnel.expired ?? '—'} expired
            </p>
            <p>
              Fill rate {already(funnel.funnel.fillRatePercent)} · average score{' '}
              {already(funnel.funnel.avgAggregateScorePercent)} · average conviction{' '}
              {already(funnel.funnel.avgConvictionPercent)}
            </p>
            {funnel.funnel.topCoins.length > 0 ? (
              <p>
                Watches most:{' '}
                {funnel.funnel.topCoins
                  .slice(0, 6)
                  .map((c) => `${c.coinTicker}${c.count === null ? '' : ` (${c.count})`}`)
                  .join(' · ')}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Stopped before evaluation</h2>
        <StageNote
          stage={blocks}
          empty="Nothing was stopped before evaluation — every candidate reached the signal stage."
          subject="this agent’s record of what stopped it is"
        />
        {blocks.kind === 'entries' ? (
          <ul className="space-y-2">
            {blocks.entries.map((b) => (
              <li key={b.id} className="rounded border p-3 text-sm space-y-1">
                <p className="font-medium">
                  {b.reasonCode}
                  {b.coinTicker ? ` · ${b.coinTicker}` : ' · account-wide'} · {b.gateStage} stage
                </p>
                {/* The numbers are the answer; the code is only the label. */}
                {Object.keys(b.reasonDetail).length > 0 ? (
                  <p>
                    {Object.entries(b.reasonDetail)
                      .map(([k, v]) => `${k}: ${String(v)}`)
                      .join(' · ')}
                  </p>
                ) : null}
                {b.at ? <p className="text-text-secondary">{b.at}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Evaluated</h2>
        <StageNote
          stage={evaluations}
          empty="No signal evaluation has run for this agent yet."
          subject="this agent’s evaluations are"
        />
        {evaluations.kind === 'entries' ? (
          <ul className="space-y-2">
            {evaluations.entries.map((e) => (
              <li key={e.id} className="rounded border p-3 text-sm space-y-1">
                <p className="font-medium">
                  {/* Opens the full scorecard: every signal consulted, not
                      only the ones that fired. */}
                  <a href={`/agents/${id}/pipeline/${e.id}`} className="underline">
                    {e.coinTicker ?? 'unnamed market'}
                  </a>{' '}
                  · scored {pct(e.aggregateScore)} against a{' '}
                  {pct(e.minAggregateScore)} threshold
                  {e.terminalStatus ? ` · ${e.terminalStatus}` : ''}
                </p>
                <p>
                  {e.triggeredSignalCount ?? '—'} signal(s) triggered
                  {e.minRequiredCount !== null ? ` of ${e.minRequiredCount} required` : ''}
                  {e.dominantBias ? ` · bias ${e.dominantBias}` : ''}
                  {e.assessmentDirection ? ` · read ${e.assessmentDirection}` : ''}
                </p>
                {e.hasConflictingSignals ? (
                  <p>Signals disagreed with each other on this candidate.</p>
                ) : null}
                {e.gateStatus ? (
                  <p>
                    Gate: {e.gateStatus}
                    {e.gateReason ? ` — ${e.gateReason}` : ''}
                  </p>
                ) : null}
                {e.at ? <p className="text-text-secondary">{e.at}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Decided</h2>
        <StageNote
          stage={decisions}
          empty="This agent has not reached a decision yet."
          subject="this agent’s decisions are"
        />
        {decisions.kind === 'entries' ? (
          <ul className="space-y-2">
            {decisions.entries.map((d) => (
              <li key={d.id} className="rounded border p-3 text-sm space-y-1">
                <p className="font-medium">
                  {d.decision} {d.coinTicker ?? ''} {d.direction ?? ''}
                  {d.conviction !== null ? ` · ${pct(d.conviction)} conviction` : ''}
                  {d.status ? ` · ${d.status}` : ''}
                </p>
                {/*
                  "at the decision" is load-bearing. Position management moves
                  the stop and target after a trade opens — observed live, a
                  decision recorded 55.67456526 while its position reported
                  55.954 — so this page and the agent page would otherwise show
                  one word meaning two different numbers.
                */}
                {d.entryPrice !== null || d.stopLoss !== null || d.takeProfit !== null ? (
                  <p>
                    At the decision: entry {d.entryPrice ?? '—'} · stop {d.stopLoss ?? '—'} ·
                    target {d.takeProfit ?? '—'}
                    {d.riskRewardRatio !== null ? ` · R:R ${d.riskRewardRatio}` : ''}
                  </p>
                ) : null}
                {/* What it would have staked, and what it sized that against. */}
                {d.positionSizePct !== null || d.timeHorizon || d.atrPct !== null ? (
                  <p>
                    {d.positionSizePct !== null
                      ? `Size ${d.positionSizePct}%${d.positionSizePreset ? ` (${d.positionSizePreset})` : ''}`
                      : 'Size not stated'}
                    {d.timeHorizon ? ` · over ${d.timeHorizon}` : ''}
                    {d.atrPct !== null ? ` · ATR ${d.atrPct}%` : ''}
                  </p>
                ) : null}
                {/* The agent explaining itself, whole and unparaphrased. */}
                {d.reasoning ? <p className="whitespace-pre-wrap">{d.reasoning}</p> : null}
                <Evidence checklist={d.checklist} />
                {/* The thread from "it decided" to "an order exists". */}
                {d.executedOrderId ? (
                  <p className="text-text-secondary">
                    Order {d.executedOrderId}
                    {d.stopLossOrderId ? ` · stop ${d.stopLossOrderId}` : ''}
                    {d.takeProfitOrderId ? ` · target ${d.takeProfitOrderId}` : ''}
                  </p>
                ) : null}
                {d.at ? <p className="text-text-secondary">{d.at}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <p className="text-sm">
        <a href={`/agents/${id}`} className="underline">Back to the agent</a>
      </p>
    </main>
  );
}
