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
 * lists every signal rule and none of its conditions describes a strategy
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
 *
 * Exported since 2026-08-06 so the drafting surface draws a composed condition
 * with the same vocabulary a saved one is drawn with. A second renderer would
 * be a second reading of the grammar, and the two would disagree about a
 * negation eventually — which is the exact misreading this component's `NOT`
 * handling exists to prevent.
 */
export function ConditionStructure({
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
              <ConditionStructure definition={member} defined={defined} />
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

/**
 * One saved condition, drawn as a card.
 *
 * Exported since 2026-08-16 because the condition-save surface had grown its
 * own copy of this markup and the two had already begun to differ (#167). A
 * second card is a second answer to "what does a condition look like", and the
 * one below is the answer this component's two decisions are written against.
 *
 * **`blockNote` is the encoding, not a style.** `spec.md:758-762` requires a
 * null verdict be shown as a named building block rather than a way the
 * strategy calls direction — and there are two honest ways to satisfy it.
 * `StrategyConditions` satisfies it by *position*: it lists the calls and the
 * blocks apart, under a heading that names the second group, so a card inside
 * that group need not repeat what the heading above it just said. A flat list
 * has no such heading, so the card itself has to say it. The save surface
 * lists flat; it passes `blockNote`. Anything else listing flat must too.
 */
export function ConditionCard({
  condition,
  defined,
  blockNote = false,
  actions,
}: {
  condition: StrategyCondition;
  defined: ReadonlySet<string>;
  blockNote?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <li className="space-y-1 rounded-gc-2 border border-border-default p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-text-primary">{condition.name}</span>
        <span className="text-xs uppercase text-text-secondary">
          {condition.conditionKey}
          {condition.verdict === null
            ? blockNote
              ? ' · a named building block'
              : ''
            : ` · calls ${condition.verdict}`}
        </span>
      </div>
      <div className="text-sm">
        <ConditionStructure definition={condition.definition} defined={defined} />
      </div>
      {hasUnrecognisedPart(condition.definition) && (
        <p className="text-xs text-text-secondary">
          Part of this condition uses a form Grid-Commander does not model. What is shown is
          incomplete.
        </p>
      )}
      {/* Padding rather than a margin: the card sets `space-y-1`, whose sibling
          selector outranks a plain `mt-*` on the child, so a caller asking for
          more room than the stack gives would silently not get it. */}
      {actions === undefined ? null : <div className="pt-1 text-sm">{actions}</div>}
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
