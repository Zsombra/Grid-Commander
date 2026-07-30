import type { Decision } from '@/application/use-cases/read-thought-log.query.js';

/**
 * An agent's decision cycles.
 *
 * Every reading shown here is computed in the use case. A surface that works
 * out `confidence - threshold` for itself will one day work it out backwards,
 * and the answer is the entire reason both numbers are recorded.
 */
export function DecisionList({ decisions }: { decisions: readonly Decision[] }) {
  return (
    <ol className="space-y-4">
      {decisions.map((d) => (
        <li
          key={d.entry.id}
          className="space-y-2 rounded-gc-2 border border-consequence-border p-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-text-primary">
              {d.entry.snapshot ? d.entry.snapshot.coinTicker : 'No market recorded'}
              {d.entry.snapshot?.thesisDirection ? ` · ${d.entry.snapshot.thesisDirection}` : ''}
            </span>
            <time className="text-sm text-text-secondary" dateTime={d.entry.at.toISOString()}>
              {d.entry.at.toISOString().replace('T', ' ').slice(0, 16)}
            </time>
          </div>

          <p className="text-sm text-text-primary">
            <strong>{d.outcome}</strong>
            {d.declined ? ' — it evaluated this and chose not to act.' : ''}
          </p>

          <Bar decision={d} />

          {d.entry.reasoning && (
            <p className="whitespace-pre-wrap text-sm text-text-secondary">{d.entry.reasoning}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

/**
 * Confidence, and the bar it had to clear.
 *
 * Never one without the other. 0.35 alone says nothing; against a threshold of
 * 0.35 it says the agent only just acted, and against 0.7 it says the agent
 * stood down and was right to.
 */
function Bar({ decision }: { decision: Decision }) {
  const { bar, entry } = decision;

  if (bar.kind === 'no-bar') {
    return (
      <p className="text-sm text-text-secondary">
        {entry.confidence === null
          ? 'No confidence recorded for this decision.'
          : `Confidence ${entry.confidence}. BattleGrid recorded no threshold to measure it against.`}
      </p>
    );
  }

  return (
    <p className="text-sm text-text-secondary">
      Confidence <strong>{entry.confidence}</strong> against a bar of{' '}
      <strong>{entry.threshold}</strong> —{' '}
      {bar.kind === 'cleared' ? `cleared it by ${bar.by}.` : `short by ${bar.by}.`}
    </p>
  );
}
