import type { ConditionWire } from './condition-draft.js';
import { composeForResolution, serialiseCondition } from './condition-draft.js';
import type { StrategyCondition } from './condition.js';
import { unresolvedReferences } from './condition.js';

/**
 * A condition on its way *into* a strategy — the list, not the condition.
 *
 * `condition-draft.ts` turns one drafted condition into the platform's declared
 * shape so BattleGrid can resolve it. This turns an *edit* into the whole
 * condition list the platform is asked to save, because there is no tool that
 * writes one condition. All 110 probed tools, 2026-08-06: nothing does. The only
 * path is `compile_strategy_plan` (UPDATE) → `apply_strategy_plan`, which takes
 * the strategy's entire `conditions` array and reconfigures every bound agent
 * atomically.
 *
 * That is the whole reason this file exists, and the reason it computes more
 * than the changed condition. An operator agreeing to "add FLOW_UP" is in fact
 * agreeing to resubmit every condition the strategy has, so what they are shown
 * has to be the list.
 *
 * **Two readings of the same array travel together, and neither can replace the
 * other.** The wire list (`conditionsAsGiven`) is what is sent: the platform's
 * own objects, back whole, because the grammar is still being rolled out and a
 * form the mapper read as `unrecognised` must not be dropped on the way back.
 * The domain list is what is *reasoned about*: `unresolvedReferences` needs
 * definitions it can walk, and the wire objects are opaque past
 * `condition-draft.ts`. Deriving one from the other would give up exactly the
 * property the other one has.
 */

/** What the operator asked for, resolved to something the list can be edited by. */
export type ConditionEdit =
  | { readonly kind: 'upsert'; readonly condition: StrategyCondition }
  | { readonly kind: 'remove'; readonly conditionKey: string };

/**
 * What the edit did to the list.
 *
 * Three, not two: an upsert whose key the strategy already defines *replaces*
 * that condition, and the operator is entitled to know which of the two
 * happened — the same distinction `DraftStanding` draws on the try surface, for
 * the same reason. `removed` is its own act with its own consequence.
 */
export type EditStanding = 'added' | 'replaced' | 'removed';

export interface ConditionListChange {
  /** Exactly what the compiler is sent, in order. */
  readonly conditions: readonly ConditionWire[];
  /** The same list, read into the domain — what the describe reasons over. */
  readonly resulting: readonly StrategyCondition[];
  readonly standing: EditStanding;
  /**
   * References **this edit** would leave with nothing to resolve.
   *
   * Computed here rather than left to a surface: removing `FLOW_UP` while
   * `FULL_SEND_DOWN` negates it leaves a rule nobody can evaluate, and that
   * consequence is invisible in a diff of the condition being changed.
   *
   * The set the strategy already cannot resolve is subtracted, deliberately.
   * A reference that dangles before and after is a property of the strategy —
   * `strategy-conditions.tsx` reports it where the strategy is read — and
   * listing it under "after this" would attribute to the edit something the
   * edit did not do, in the one place an operator is deciding whether to
   * proceed. Overstating a consequence spends the same credibility as
   * understating one.
   *
   * Shown, never enforced. Whether the platform accepts a dangling reference is
   * its ruling; pre-judging would replace BattleGrid's answer with a guess.
   */
  readonly dangling: readonly string[];
}

export type ConditionEditResult =
  | { readonly kind: 'change'; readonly change: ConditionListChange }
  /** The draft carries a form this product will not write back. */
  | { readonly kind: 'inexpressible'; readonly reasons: readonly string[] }
  /** A removal naming a key the strategy does not define. */
  | { readonly kind: 'no-such-condition'; readonly conditionKey: string };

const keyOf = (entry: ConditionWire): unknown => entry['conditionKey'];

/**
 * The condition keys of a list, as the list itself carries them.
 *
 * Read off the wire objects rather than off the domain reading, because this
 * feeds the sentence an operator agrees to and that sentence must describe the
 * array that is actually sent. `mapConditions` drops an entry with no key — it
 * cannot be referred to or told apart from its neighbour — so a describe
 * counting the domain list would understate a list the platform would still
 * receive whole. `null` marks such an entry rather than hiding it.
 */
export function listedKeys(conditions: readonly ConditionWire[]): readonly (string | null)[] {
  return conditions.map((entry) => {
    const key = keyOf(entry);
    return typeof key === 'string' && key.length > 0 ? key : null;
  });
}

/**
 * The list this edit would leave the strategy with.
 *
 * `existing` and `asGiven` are the two readings of the strategy's current
 * conditions; the edit is applied to both by the same rule, so what is sent and
 * what is described can never be two different lists.
 */
export function resolveConditionEdit(
  existing: readonly StrategyCondition[],
  asGiven: readonly ConditionWire[],
  edit: ConditionEdit,
): ConditionEditResult {
  if (edit.kind === 'remove') {
    const { conditionKey } = edit;
    const present =
      asGiven.some((entry) => keyOf(entry) === conditionKey) ||
      existing.some((c) => c.conditionKey === conditionKey);
    // Its own outcome rather than a list that happens to come back unchanged: a
    // removal that removed nothing and a removal that succeeded look identical
    // afterwards, and only one of them is worth compiling.
    if (!present) return { kind: 'no-such-condition', conditionKey };
    return {
      kind: 'change',
      change: finish(
        asGiven.filter((entry) => keyOf(entry) !== conditionKey),
        existing.filter((c) => c.conditionKey !== conditionKey),
        'removed',
        existing,
      ),
    };
  }

  const serialised = serialiseCondition(edit.condition);
  // The one thing this product will not do: write back a form it read as
  // unrecognised. A guessed shape reaches BattleGrid looking composed, and the
  // grammar is still being extended — so the refusal names the part instead.
  if (serialised.kind === 'inexpressible') {
    return { kind: 'inexpressible', reasons: serialised.reasons };
  }

  // The same composition the try surface sends to be resolved, deliberately.
  // A second implementation of "a key is never sent twice, and a matching draft
  // stands in its place" would let the list an operator saved differ from the
  // list they were shown resolving.
  const composed = composeForResolution(asGiven, serialised.condition);
  const draft = edit.condition;
  const replaces = existing.some((c) => c.conditionKey === draft.conditionKey);
  return {
    kind: 'change',
    change: finish(
      composed.conditions,
      replaces
        ? existing.map((c) => (c.conditionKey === draft.conditionKey ? draft : c))
        : [...existing, draft],
      composed.standing,
      existing,
    ),
  };
}

function finish(
  conditions: readonly ConditionWire[],
  resulting: readonly StrategyCondition[],
  standing: EditStanding,
  before: readonly StrategyCondition[],
): ConditionListChange {
  const already = new Set(unresolvedReferences(before));
  return {
    conditions,
    resulting,
    standing,
    dangling: unresolvedReferences(resulting).filter((key) => !already.has(key)),
  };
}
