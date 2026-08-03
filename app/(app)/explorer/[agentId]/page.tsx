import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import type { PublicResult } from '@/ports/explorer.js';

/**
 * One competitor's public record.
 *
 * `/explorer` answers "am I doing badly". This answers the question that
 * follows: what does someone doing better actually do? The funnel is the
 * heart of it — how much an agent looks at versus how much it acts on is
 * the difference between two agents with the same win rate.
 *
 * Four reads, each rendered on its own. A competitor whose trades will not
 * load still shows their funnel, because reporting the whole page
 * unreadable when three quarters answered is the worse lie.
 */

/** What an empty or unreadable section says, so no branch renders blank. */
function SectionNote({ result, empty }: { result: PublicResult<unknown>; empty: string }) {
  if (result.kind === 'none') return <p className="text-sm">{empty}</p>;
  if (result.kind === 'unreadable') {
    return (
      <p role="alert" className="text-sm">
        This could not be read: {result.reason}
      </p>
    );
  }
  return null;
}

const usd = (v: number | null): string =>
  v === null ? '—' : `${v < 0 ? '−' : ''}$${Math.abs(v).toFixed(2)}`;
const pct = (v: number | null): string => (v === null ? 'not measured' : `${Math.round(v)}%`);
const hours = (s: number | null): string => (s === null ? '—' : `${(s / 3600).toFixed(1)}h`);

export default async function CompetitorPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { funnel, open, trades, evaluations } = await app.readCompetitor.execute({
    ...user.authority,
    agentId,
    limit: 10,
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">A competitor&apos;s record</h1>
      <p className="text-sm">
        What BattleGrid publishes about this agent. Reads only — and only
        the public projection: its owner&apos;s private reasoning is
        withheld by the platform, not missing.
      </p>

      <section className="space-y-2">
        <h2 className="text-base font-medium">What it looks at, and what it acts on</h2>
        <SectionNote
          result={funnel}
          empty="BattleGrid publishes no evaluation record for this agent."
        />
        {funnel.kind === 'value' ? (
          <div className="rounded border p-3 text-sm space-y-1">
            <p>
              {funnel.value.totalEvaluations ?? '—'} evaluations →{' '}
              {funnel.value.totalDecisions ?? '—'} decisions →{' '}
              {funnel.value.enterDecisions ?? '—'} entered
            </p>
            {/*
              The two counters the platform names alike and means
              differently. Labelled apart, never summed.
            */}
            <p>
              Decisions to skip: {funnel.value.skipDecisions ?? '—'} · pipelines
              ending SKIPPED: {funnel.value.skippedTerminal ?? '—'}
            </p>
            <p>
              Of what it entered: {funnel.value.executed ?? '—'} executed ·{' '}
              {funnel.value.failed ?? '—'} failed · {funnel.value.expired ?? '—'} expired
              {funnel.value.cancelled ? ` · ${funnel.value.cancelled} cancelled` : ''}
              {funnel.value.blocked ? ` · ${funnel.value.blocked} blocked` : ''}
            </p>
            <p>
              Fill rate {pct(funnel.value.fillRatePercent)} · average score{' '}
              {pct(funnel.value.avgAggregateScorePercent)} · average conviction{' '}
              {pct(funnel.value.avgConvictionPercent)}
              {funnel.value.avgRiskRewardRatio !== null
                ? ` · average R:R ${funnel.value.avgRiskRewardRatio.toFixed(2)}`
                : ''}
            </p>
            <p className="font-medium">
              Result: {funnel.value.winCount ?? '—'}W / {funnel.value.lossCount ?? '—'}L over{' '}
              {funnel.value.outcomeCount ?? '—'} closed · win rate{' '}
              {pct(funnel.value.winRatePercent)} · {usd(funnel.value.totalNetPnl)} net ·{' '}
              {usd(funnel.value.avgNetPnl)} per trade · held {hours(funnel.value.avgDurationSeconds)}{' '}
              on average
            </p>
            {funnel.value.topCoins.length > 0 ? (
              <p>
                Watches most:{' '}
                {funnel.value.topCoins
                  .slice(0, 6)
                  .map((c) => `${c.coinTicker}${c.count === null ? '' : ` (${c.count})`}`)
                  .join(' · ')}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">What it is holding now</h2>
        <SectionNote result={open} empty="BattleGrid publishes no position snapshot for this agent." />
        {open.kind === 'value' ? (
          <div className="text-sm space-y-1">
            <p>
              {open.value.openPositionCount ?? 0} open position
              {open.value.openPositionCount === 1 ? '' : 's'} ·{' '}
              {usd(open.value.unrealizedPnl)} unrealized
            </p>
            {/*
              The rows are carried but not read: no agent in the field has
              ever held an open position, so their shape has never been
              observed and is not guessed at. See
              `open-position-rows-are-unobserved`.
            */}
            {open.value.positionsUnmodelled.length > 0 ? (
              <p>
                Grid-Commander does not yet read the detail of individual
                positions — this shape has never been observed on a live
                one.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">What it closed</h2>
        <SectionNote result={trades} empty="This agent has closed no trades." />
        {trades.kind === 'value' ? (
          <>
            {trades.total !== null && trades.total > trades.value.length ? (
              <p className="text-sm">
                Showing {trades.value.length} of {trades.total}.
              </p>
            ) : null}
            <ul className="space-y-2">
              {trades.value.map((t) => (
                <li key={t.id} className="rounded border p-3 text-sm space-y-1">
                  <p className="font-medium">
                    {t.coinTicker ?? 'unnamed market'} {t.direction ?? ''} · {usd(t.netPnl)}
                    {/* The platform's verdict, not one derived from the figure. */}
                    {t.isWin === null ? '' : t.isWin ? ' · win' : ' · loss'}
                    {t.closeReason ? ` · ${t.closeReason}` : ''}
                  </p>
                  <p>
                    In {t.entryFillPrice ?? '—'} out {t.exitFillPrice ?? '—'}
                    {t.roePercent !== null ? ` · ROE ${t.roePercent.toFixed(1)}%` : ''}
                    {t.leverage !== null ? ` · ${t.leverage}× leverage` : ''}
                    {t.conviction !== null ? ` · opened at ${pct(t.conviction * 100)} conviction` : ''}
                  </p>
                  <p className="text-text-secondary">
                    {t.durationSeconds !== null ? `held ${hours(t.durationSeconds)}` : 'duration unknown'}
                    {t.closedAt ? ` · closed ${t.closedAt}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">What it evaluated</h2>
        <SectionNote result={evaluations} empty="BattleGrid publishes no evaluations for this agent." />
        {evaluations.kind === 'value' ? (
          <>
            {evaluations.total !== null && evaluations.total > evaluations.value.length ? (
              <p className="text-sm">
                Showing {evaluations.value.length} of {evaluations.total}.
              </p>
            ) : null}
            <ul className="space-y-2">
              {evaluations.value.map((e) => (
                <li key={e.id} className="rounded border p-3 text-sm space-y-1">
                  <p className="font-medium">
                    {/*
                      Every row is offered, including the ones whose detail
                      the platform may not publish. Hiding a link on a
                      prediction would be guessing on the reader's behalf;
                      the detail page says plainly when nothing is there.
                    */}
                    <a
                      href={`/explorer/${agentId}/evaluations/${e.id}`}
                      className="underline"
                    >
                      {e.coinTicker ?? 'unnamed market'}
                    </a>{' '}
                    · scored {pct(e.aggregateScorePercent)} against{' '}
                    {pct(e.minAggregateScorePercent)}
                    {e.terminalStatus ? ` → ${e.terminalStatus}` : ''}
                  </p>
                  <p>
                    {e.triggeredSignalCount ?? '—'} signals triggered
                    {e.dominantBias ? ` · bias ${e.dominantBias}` : ''}
                    {e.assessmentDirection ? ` · read ${e.assessmentDirection}` : ''}
                    {e.signalSource ? ` · via ${e.signalSource}` : ''}
                  </p>
                  {e.hasConflictingSignals ? <p>Signals disagreed on this candidate.</p> : null}
                  {e.at ? <p className="text-text-secondary">{e.at}</p> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <p className="text-sm">
        <a href="/explorer" className="underline">
          Back to the field
        </a>
      </p>
    </main>
  );
}
