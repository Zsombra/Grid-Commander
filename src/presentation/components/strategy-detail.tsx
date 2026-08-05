import { StrategyConditions } from './strategy-conditions.js';
import type { StrategyDetail } from '@/domain/strategy/strategy.js';
import { requiredSignals, weightedSignals } from '@/domain/strategy/strategy.js';

/**
 * A strategy, whole.
 *
 * Six things, in the order someone actually asks them: what is this, what does
 * it read, how does it reason, when does it act, what does it weigh, and what
 * would changing it cost.
 *
 * The cost comes last and is not a footnote. Editing a strategy reconfigures
 * every agent bound to it, immediately — so the page ends on the number that
 * decides whether a change is a small one.
 */
export function StrategyDetailView({ detail }: { detail: StrategyDetail }) {
  const { summary } = detail;
  const required = requiredSignals(detail);
  const weighted = weightedSignals(detail);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-medium text-text-primary">{summary.name}</h1>
          <span className="text-xs uppercase text-text-secondary">
            {summary.scope === 'SYSTEM' ? 'BattleGrid' : 'Yours'} · revision {summary.revision}
            {summary.isActive ? '' : ' · archived'}
          </span>
        </div>
        {summary.tagline && <p className="text-base text-text-primary">{summary.tagline}</p>}
        {summary.description && (
          <p className="text-base text-text-secondary">{summary.description}</p>
        )}
        <p className="text-sm text-text-secondary">
          {summary.timeframe}
          {detail.cadence ? ` · ${detail.cadence}` : ''}
          {detail.regimeAutoDerive
            ? ' · regime derived automatically'
            : detail.regimeTimeframe
              ? ` · regime on ${detail.regimeTimeframe}`
              : ''}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium text-text-primary">What it reads</h2>
        {detail.sections.length === 0 ? (
          // Not silence. A strategy reading nothing is a real and alarming state,
          // and blank space would read as "not loaded yet".
          <p className="text-base text-text-secondary">
            No context sources are configured. This strategy reasons from the
            market read alone.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {detail.sections.map((s) => (
              <li
                key={s.sectionKey}
                className="rounded-gc-2 border border-border-default px-2 py-1 text-sm text-text-primary"
              >
                {s.sectionKey}
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm">
          <a href={`/strategies/${summary.id}/preview`} className="underline">
            Preview what an agent reads
          </a>{' '}
          — the report rendered live from this composition, without saving
          anything.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium text-text-primary">How it reasons</h2>
        {detail.marketReadText ? (
          // `whitespace-pre-wrap`: this is authored prose with deliberate
          // paragraphs and it is the instruction the model is actually given.
          // Collapsing it would misrepresent what the agent receives.
          <p className="whitespace-pre-wrap text-base text-text-primary">
            {detail.marketReadText}
          </p>
        ) : (
          <p className="text-base text-text-secondary">No market read is set.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium text-text-primary">When it acts</h2>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Threshold label="Minimum aggregate score" value={detail.thresholds.minAggregateScore} />
          <Threshold label="Minimum required signals" value={detail.thresholds.minRequiredCount} />
          <Threshold label="Minimum ATR %" value={detail.thresholds.minAtrPct} />
        </dl>
      </section>

      <StrategyConditions conditions={detail.conditions} />

      <section className="space-y-2">
        <h2 className="text-base font-medium text-text-primary">What it weighs</h2>
        <p className="text-sm text-text-secondary">
          {detail.signalRules.length} signals configured · {weighted.length} carrying weight ·{' '}
          {required.length} required
        </p>
        {detail.signalRules.length === 0 ? (
          <p className="text-base text-text-secondary">No signal rules are configured.</p>
        ) : (
          // Scrolls in its own box. Eighty-two rows is normal here, and letting
          // them push the page height would bury the section that follows.
          <div className="max-h-96 overflow-auto rounded-gc-2 border border-border-default">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-bg-raised text-left">
                <tr>
                  <th className="p-2 font-medium text-text-primary">Signal</th>
                  <th className="p-2 font-medium text-text-primary">Weight</th>
                  <th className="p-2 font-medium text-text-primary">Required</th>
                  <th className="p-2 font-medium text-text-primary">Parameters</th>
                  <th className="p-2 font-medium text-text-primary">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {detail.signalRules.map((rule) => (
                  <tr key={rule.signalId} className="border-t border-border-default">
                    <td className="p-2 text-text-primary">{rule.signalId}</td>
                    <td className="p-2 text-text-primary">{rule.allocation}</td>
                    {/* Not a tick. A required signal is a gate on the whole
                        setup, and a glyph a screen reader announces as nothing
                        would hide that. */}
                    <td className="p-2 text-text-primary">{rule.required ? 'required' : '—'}</td>
                    <td className="p-2 text-text-secondary">{describeParams(rule.params)}</td>
                    <td className="p-2">
                      <a
                        href={`/strategies/${summary.id}/rules/${rule.signalId}`}
                        className="underline"
                      >
                        Retune
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium text-text-primary">What changing it costs</h2>
        <p className="text-base text-text-primary">
          {summary.boundAgentCount === 0
            ? 'No agents are bound to this strategy.'
            : summary.boundAgentCount === 1
              ? 'One agent is bound to this strategy and would be reconfigured immediately.'
              : `${summary.boundAgentCount} agents are bound to this strategy and would all be reconfigured immediately.`}
        </p>
        {detail.openPositionCount > 0 && (
          <p role="note" className="text-base text-text-primary">
            {detail.openPositionCount === 1
              ? 'One position is currently open under it.'
              : `${detail.openPositionCount} positions are currently open under it.`}
          </p>
        )}
      </section>
    </div>
  );
}

/**
 * Absent and zero are different answers.
 *
 * A missing threshold means the platform did not state one; `0` means it stated
 * no minimum. Rendering both as `0` would invent a fact.
 */
function Threshold({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-gc-2 border border-border-default p-3">
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd className="text-base text-text-primary">{value === null ? 'not set' : value}</dd>
    </div>
  );
}

/**
 * A signal's own parameters, shown as given.
 *
 * The shape belongs to the signal — a threshold, a lookback, something not yet
 * invented — so this names keys and values rather than interpreting them. An
 * interpretation would be a second opinion on 82 signals' schemas.
 */
function describeParams(params: Readonly<Record<string, unknown>>): string {
  const entries = Object.entries(params);
  if (entries.length === 0) return '—';
  return entries.map(([k, v]) => `${k}: ${String(v)}`).join(', ');
}
