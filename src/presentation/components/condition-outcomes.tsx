import type {
  ConditionCounts,
  ConditionEvidence,
  ConditionOutcome,
  TickerOutcomes,
} from '@/domain/strategy/condition-outcome.js';
import { hasUnmodelledEvidence, stillProvisional } from '@/domain/strategy/condition-outcome.js';

/**
 * How the strategy's rules stand, coin by coin — the platform's answer, shown.
 *
 * `strategy-conditions.tsx` renders what a condition *says*; this renders what
 * it *did*, resolved against the same live market state the report above it was
 * rendered from. Everything here arrived from BattleGrid: nothing on this
 * surface compares an observed value to a required one, and
 * `Grid-Commander Never Decides Whether A Condition Holds` makes that a
 * requirement with a test.
 *
 * Three decisions carry this component, one per thing that must not flatten.
 *
 * **Evidence is the point, not a detail.** `operand` is what the market showed,
 * `literal` what the rule required. A rendering that showed only the verdict
 * would keep the half an author already knew and drop the half they came for.
 *
 * **A provisional outcome is not a settled one.** The platform marks an outcome
 * provisional when the bar is not closed and the answer can still change.
 * Showing the two identically would tell an author a rule failed where the
 * platform said only that it has not held yet — the same defect as a simulated
 * score rendered as what happened.
 *
 * **Unresolved is a third state.** `unresolvedCount` counts members the
 * platform could not answer for. It is shown beside the count that held, never
 * summed into it, and no count of members that did not hold is derived here —
 * the moment such a number exists, three states are being shown as two.
 */

/**
 * The outcome word, coloured but never rewritten.
 *
 * The word rendered is always the platform's own — an outcome this map does not
 * know still reads exactly as it arrived, in the neutral treatment. Colour is
 * an affordance over vocabulary that is the platform's to extend, so it defaults
 * rather than enumerates.
 */
const OUTCOME_TONE: Record<string, string> = {
  TRUE: 'text-success-default',
  FALSE: 'text-text-secondary',
  UNRESOLVED: 'text-warning-default',
};

function Outcome({ word }: { word: string }) {
  return (
    <span className={`text-xs font-medium uppercase ${OUTCOME_TONE[word] ?? 'text-text-primary'}`}>
      {word}
    </span>
  );
}

/** One clause's reason: the column, what was seen, what was wanted. */
function Evidence({ evidence }: { evidence: ConditionEvidence }) {
  if (evidence.kind === 'unmodelled') {
    return (
      <span className="text-text-secondary">
        Not understood by Grid-Commander: {evidence.reason} · <Outcome word={evidence.outcome} />
      </span>
    );
  }
  return (
    <span className="text-text-primary">
      {evidence.header} ({evidence.sectionKey}) {evidence.op} “{evidence.literal}” · observed “
      {evidence.operand}” · <Outcome word={evidence.outcome} />
    </span>
  );
}

/**
 * A threshold group's tally, as three numbers.
 *
 * Held, unresolved, total — each the platform's. No fourth number is computed:
 * "did not hold" is exactly the figure that would collapse the unresolved into
 * the false, and it is not this product's to state.
 */
function Counts({ counts }: { counts: ConditionCounts }) {
  return (
    <p className="text-xs text-text-secondary">
      {counts.trueCount} of {counts.total} members held
      {counts.unresolvedCount > 0
        ? ` · ${counts.unresolvedCount} could not be resolved — neither held nor failed`
        : ' · none unresolved'}
    </p>
  );
}

function OutcomeCard({ outcome }: { outcome: ConditionOutcome }) {
  return (
    <li className="space-y-1 rounded-gc-2 border border-border-default p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-text-primary">{outcome.name}</span>
        <span className="text-xs uppercase text-text-secondary">
          {outcome.conditionKey} · <Outcome word={outcome.outcome} />
        </span>
      </div>

      {outcome.provisional && (
        // On the outcome itself, not only in a summary. This is the label that
        // stops a reader treating an open bar's answer as the final one.
        <p className="text-xs text-warning-default">
          Provisional — the bar is not closed and this can still change.
        </p>
      )}

      {outcome.counts !== null ? <Counts counts={outcome.counts} /> : null}

      {outcome.evidence.length > 0 ? (
        <ul className="ml-4 space-y-1 border-l border-border-default pl-3 text-sm">
          {outcome.evidence.map((e, i) => (
            <li key={i}>
              <Evidence evidence={e} />
            </li>
          ))}
        </ul>
      ) : (
        // Said rather than left blank. The platform explaining nothing and this
        // product losing the explanation look identical as empty space.
        <p className="text-xs text-text-secondary">
          BattleGrid gave no clause-level reason for this one.
        </p>
      )}

      {hasUnmodelledEvidence(outcome) && (
        <p className="text-xs text-text-secondary">
          Part of this explanation uses a form Grid-Commander does not model. What is shown is
          incomplete.
        </p>
      )}
    </li>
  );
}

function TickerBlock({ row }: { row: TickerOutcomes }) {
  const open = stillProvisional(row.outcomes);
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-text-primary">{row.ticker}</h3>
      <p className="text-xs text-text-secondary">
        {row.outcomes.length} {row.outcomes.length === 1 ? 'condition' : 'conditions'} resolved
        against live market data
        {open.length > 0
          ? ` · ${open.length} still provisional, on a bar that has not closed`
          : ''}
      </p>
      {row.outcomes.length > 0 ? (
        <ul className="space-y-2">
          {row.outcomes.map((o) => (
            <OutcomeCard key={o.conditionKey} outcome={o} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-secondary">
          BattleGrid resolved no conditions on this coin.
        </p>
      )}
    </section>
  );
}

export function ConditionOutcomes({
  outcomes,
  conditionsDefined,
}: {
  outcomes: readonly TickerOutcomes[];
  /** How many conditions the strategy defines — the two empty states differ. */
  conditionsDefined: number;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-medium text-text-primary">
        How these rules stand right now
      </h2>

      {conditionsDefined === 0 ? (
        <p className="text-sm text-text-secondary">
          This strategy defines no conditions. Direction is decided by its signals alone.
        </p>
      ) : outcomes.length === 0 ? (
        // A different sentence from the one above, deliberately. "No conditions"
        // and "conditions the platform said nothing about" are different facts,
        // and a reader shown the same words for both cannot tell which they have.
        <p role="alert" className="text-sm text-text-secondary">
          This strategy defines {conditionsDefined}{' '}
          {conditionsDefined === 1 ? 'condition' : 'conditions'}, and BattleGrid returned no
          outcome for {conditionsDefined === 1 ? 'it' : 'them'} on this preview.
        </p>
      ) : (
        <>
          <p className="text-sm text-text-secondary">
            BattleGrid resolved this strategy&apos;s conditions against each coin below. The
            outcomes are the platform&apos;s — Grid-Commander computes none of them.
          </p>
          {outcomes.map((row) => (
            <TickerBlock key={row.ticker} row={row} />
          ))}
        </>
      )}
    </section>
  );
}
