import type {
  ConditionDefinition,
  StrategyCondition,
} from '@/domain/strategy/condition.js';
import {
  buildingBlocks,
  directionalCalls,
  hasUnrecognisedPart,
  unresolvedReferences,
} from '@/domain/strategy/condition.js';

/**
 * The layer above the signals, shown as the structure it is.
 *
 * Signals produce a score; conditions decide direction. A strategy page that
 * lists 82 signal rules and none of its conditions describes a strategy
 * wrongly rather than incompletely — the reader sees everything that scores
 * and nothing that calls.
 *
 * Two decisions carry this component.
 *
 * **A null verdict is a named building block, not an absence of opinion.**
 * Roughly half of all conditions observed are building blocks (27 of 55 on one
 * account), referenced by the ones that carry verdicts. Listing all of them as
 * equals would report six ways to decide direction where a strategy has two,
 * so calls and blocks are counted and shown apart.
 *
 * **Nesting is drawn, not flattened.** A member of a group and a member of a
 * group inside a `NOT` mean opposite things. Berlin's `NOT( ref FLOW_UP )`
 * flattened reads as "flow must be rising" — the exact inverse of what it says.
 */

const OP_WORDS: Record<'lt' | 'lte' | 'gte' | 'gt', string> = {
  lt: 'below',
  lte: 'at most',
  gte: 'at least',
  gt: 'above',
};

/** `regTrend_now` from `includeRegimeContext`, without the noise when unowned. */
function columnLabel(column: { sectionKey: string | null; header: string }): string {
  return column.sectionKey ? `${column.header} (${column.sectionKey})` : column.header;
}

/**
 * One definition, drawn at its depth.
 *
 * A list rather than a sentence: a sentence would have to choose between
 * accuracy and readability at three levels of nesting, and this grammar goes
 * deeper than a sentence survives.
 */
function Definition({
  definition,
  defined,
}: {
  definition: ConditionDefinition;
  defined: ReadonlySet<string>;
}) {
  if (definition.kind === 'unrecognised') {
    return (
      <span className="text-text-secondary">
        Not understood by Grid-Commander: {definition.reason}
      </span>
    );
  }

  if (definition.kind === 'ref') {
    const known = defined.has(definition.conditionKey);
    return (
      <span className="text-text-primary">
        {definition.conditionKey}
        {known ? (
          ''
        ) : (
          // Never silently omitted. A reference with no target is a rule
          // nobody can evaluate, and a reader not told sees a shorter
          // condition than the one that exists.
          <span className="text-text-secondary">
            {' '}
            — no condition with this key is defined here
          </span>
        )}
      </span>
    );
  }

  if (definition.kind === 'group') {
    const n = definition.members.length;
    const heading =
      definition.op === 'ALL'
        ? `All ${n} must hold`
        : definition.op === 'ANY'
          ? `Any of ${n} must hold`
          : definition.op === 'NOT'
            ? // Said as negation, not as a count. "0 of 1 must hold" is
              // technically the same and reads as a mistake.
              'Must NOT hold'
            : `${definition.n ?? '?'} of ${n} must hold`;
    return (
      <>
        <span className="text-text-primary">{heading}</span>
        <ul className="ml-4 mt-1 space-y-1 border-l border-border-default pl-3">
          {definition.members.map((member, i) => (
            <li key={i}>
              <Definition definition={member} defined={defined} />
            </li>
          ))}
        </ul>
      </>
    );
  }

  const column = columnLabel(definition.column);
  if (definition.kind === 'compare') {
    return (
      <span className="text-text-primary">
        {column} is {OP_WORDS[definition.op]} {definition.value}
      </span>
    );
  }
  if (definition.kind === 'between') {
    return (
      <span className="text-text-primary">
        {column} is between {definition.low} and {definition.high}
      </span>
    );
  }
  if (definition.kind === 'is') {
    return (
      <span className="text-text-primary">
        {column} is “{definition.label}”
      </span>
    );
  }
  return (
    <span className="text-text-primary">
      {column} is one of {definition.labels.map((l) => `“${l}”`).join(', ')}
    </span>
  );
}

function ConditionCard({
  condition,
  defined,
}: {
  condition: StrategyCondition;
  defined: ReadonlySet<string>;
}) {
  return (
    <li className="space-y-1 rounded-gc-2 border border-border-default p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-text-primary">{condition.name}</span>
        <span className="text-xs uppercase text-text-secondary">
          {condition.conditionKey}
          {condition.verdict === null ? '' : ` · calls ${condition.verdict}`}
        </span>
      </div>
      <div className="text-sm">
        <Definition definition={condition.definition} defined={defined} />
      </div>
      {hasUnrecognisedPart(condition.definition) && (
        <p className="text-xs text-text-secondary">
          Part of this condition uses a form Grid-Commander does not model. What is shown is
          incomplete.
        </p>
      )}
    </li>
  );
}

export function StrategyConditions({
  conditions,
}: {
  conditions: readonly StrategyCondition[];
}) {
  const calls = directionalCalls(conditions);
  const blocks = buildingBlocks(conditions);
  const defined = new Set(conditions.map((c) => c.conditionKey));
  const dangling = unresolvedReferences(conditions);

  return (
    <section className="space-y-2">
      <h2 className="text-base font-medium text-text-primary">What decides direction</h2>

      {conditions.length === 0 ? (
        // Said plainly. This page is only ever reached with a strategy that
        // read successfully — an unreadable one never gets here — so an empty
        // list means empty, and saying nothing at all would leave a reader
        // unable to tell which.
        <p className="text-base text-text-secondary">
          This strategy defines no conditions. Direction is decided by its signals alone.
        </p>
      ) : (
        <>
          <p className="text-sm text-text-secondary">
            {calls.length} {calls.length === 1 ? 'condition decides' : 'conditions decide'}{' '}
            direction
            {blocks.length > 0 &&
              `, built from ${blocks.length} named ${blocks.length === 1 ? 'block' : 'blocks'} that
               do not decide anything on their own`}
          </p>

          {calls.length > 0 && (
            <ul className="space-y-2">
              {calls.map((c) => (
                <ConditionCard key={c.conditionKey} condition={c} defined={defined} />
              ))}
            </ul>
          )}

          {blocks.length > 0 && (
            <>
              <h3 className="pt-2 text-sm font-medium text-text-primary">
                Named blocks, referenced above
              </h3>
              <ul className="space-y-2">
                {blocks.map((c) => (
                  <ConditionCard key={c.conditionKey} condition={c} defined={defined} />
                ))}
              </ul>
            </>
          )}

          {dangling.length > 0 && (
            <p className="text-sm text-text-secondary">
              Referenced but not defined here: {dangling.join(', ')}. Those parts cannot be
              evaluated from what this strategy carries.
            </p>
          )}
        </>
      )}
    </section>
  );
}
