import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import type { StageResult } from '@/ports/agents.js';

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

/** What an empty or unreadable stage says, so no branch renders as blank. */
function StageNote({ stage, empty }: { stage: StageResult<unknown>; empty: string }) {
  if (stage.kind === 'none') return <p className="text-sm">{empty}</p>;
  if (stage.kind === 'unreadable') {
    return (
      <p role="alert" className="text-sm">
        This stage could not be read: {stage.reason}
      </p>
    );
  }
  return null;
}

const pct = (v: number | null): string => (v === null ? '—' : `${Math.round(v * 100)}%`);

export default async function PipelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { blocks, evaluations, decisions } = await app.readPipeline.execute({
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

      <section className="space-y-2">
        <h2 className="text-base font-medium">Stopped before evaluation</h2>
        <StageNote
          stage={blocks}
          empty="Nothing was stopped before evaluation — every candidate reached the signal stage."
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
        />
        {evaluations.kind === 'entries' ? (
          <ul className="space-y-2">
            {evaluations.entries.map((e) => (
              <li key={e.id} className="rounded border p-3 text-sm space-y-1">
                <p className="font-medium">
                  {e.coinTicker ?? 'unnamed market'} · scored {pct(e.aggregateScore)} against a{' '}
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
        <StageNote stage={decisions} empty="This agent has not reached a decision yet." />
        {decisions.kind === 'entries' ? (
          <ul className="space-y-2">
            {decisions.entries.map((d) => (
              <li key={d.id} className="rounded border p-3 text-sm space-y-1">
                <p className="font-medium">
                  {d.decision} {d.coinTicker ?? ''} {d.direction ?? ''}
                  {d.conviction !== null ? ` · ${pct(d.conviction)} conviction` : ''}
                  {d.status ? ` · ${d.status}` : ''}
                </p>
                {d.entryPrice !== null || d.stopLoss !== null || d.takeProfit !== null ? (
                  <p>
                    Entry {d.entryPrice ?? '—'} · stop {d.stopLoss ?? '—'} · target{' '}
                    {d.takeProfit ?? '—'}
                    {d.riskRewardRatio !== null ? ` · R:R ${d.riskRewardRatio}` : ''}
                  </p>
                ) : null}
                {/* The agent explaining itself, whole and unparaphrased. */}
                {d.reasoning ? <p className="whitespace-pre-wrap">{d.reasoning}</p> : null}
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
