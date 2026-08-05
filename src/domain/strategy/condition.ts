/**
 * The layer above signals.
 *
 * Signals produce a score; conditions decide direction. A strategy can carry
 * both, and until 2026-08-04 this product carried conditions through its apply
 * projection without once looking inside one.
 *
 * The grammar is recursive and every form below appears in real data — checked
 * across two accounts, where twelve of thirty-seven and eleven of fifteen
 * strategies define conditions. Eight platform strategies gained them across a
 * single BattleGrid deployment, so this is a surface still being rolled out
 * rather than a settled corner.
 */

/** A report column, addressed the way the platform addresses one. */
export interface ConditionColumn {
  /** e.g. `includeRegimeContext`. Null for a column not owned by a section. */
  readonly sectionKey: string | null;
  /** e.g. `regTrend_now`. */
  readonly header: string;
}

/**
 * One comparison against one column.
 *
 * Four operator families, kept as four shapes rather than one bag with
 * optional fields: `between` needs two bounds, `in` needs a list, and a single
 * shape carrying all of them would let a nonsense combination typecheck.
 */
export type ConditionClause =
  | { readonly kind: 'compare'; readonly column: ConditionColumn; readonly op: 'lt' | 'lte' | 'gte' | 'gt'; readonly value: number }
  | { readonly kind: 'between'; readonly column: ConditionColumn; readonly low: number; readonly high: number }
  | { readonly kind: 'is'; readonly column: ConditionColumn; readonly label: string }
  | { readonly kind: 'in'; readonly column: ConditionColumn; readonly labels: readonly string[] };

/** How members of a group combine. `N_OF` carries the threshold in `n`. */
export type GroupOperator = 'ALL' | 'ANY' | 'NOT' | 'N_OF';

/**
 * A definition: a clause, a reference to another condition, or a group of
 * definitions.
 *
 * Nesting is preserved rather than flattened. A member of a group and a member
 * of a group inside a `NOT` mean opposite things, and a shape that lost the
 * difference would render Berlin's `NOT( ref FLOW_UP )` as a requirement that
 * flow must be rising — the exact inversion of what it says.
 */
export type ConditionDefinition =
  | ConditionClause
  | { readonly kind: 'ref'; readonly conditionKey: string }
  | {
      readonly kind: 'group';
      readonly op: GroupOperator;
      /** Present for `N_OF`, and meaningless for the others. */
      readonly n: number | null;
      readonly members: readonly ConditionDefinition[];
    }
  /**
   * A form this product does not model.
   *
   * Not an error and not a silent drop. The platform is adding to this grammar
   * — that is how the product got here — and a strategy that grows a seventh
   * form must still render, with the part nobody understands reported rather
   * than guessed at or omitted.
   */
  | { readonly kind: 'unrecognised'; readonly reason: string };

/**
 * A verdict, or the absence of one.
 *
 * `null` is **not** "no opinion". It marks a named building block that exists
 * to be referenced by conditions that do carry verdicts. Roughly half of all
 * conditions observed are building blocks — 27 of 55 on one account — so a
 * surface listing them as equals would report six ways to decide direction
 * where a strategy has two.
 */
export type ConditionVerdict = 'UP' | 'DOWN' | 'NEITHER' | null;

export interface StrategyCondition {
  /** `^[A-Z][A-Z0-9_]{1,39}$` — what a `ref` names. */
  readonly conditionKey: string;
  readonly name: string;
  readonly definition: ConditionDefinition;
  readonly verdict: ConditionVerdict;
}

/** A condition that decides direction, as opposed to one that assembles into those. */
export function decidesDirection(condition: StrategyCondition): boolean {
  return condition.verdict !== null;
}

/**
 * The conditions that are only referenced, never a call of their own.
 *
 * Computed here rather than in a view, for the same reason `requiredSignals`
 * is: "six conditions" and "two calls built from four parts" are different
 * claims about a strategy, and a page counting it itself would be a second
 * implementation of the distinction.
 */
export function buildingBlocks(
  conditions: readonly StrategyCondition[],
): readonly StrategyCondition[] {
  return conditions.filter((c) => !decidesDirection(c));
}

export function directionalCalls(
  conditions: readonly StrategyCondition[],
): readonly StrategyCondition[] {
  return conditions.filter(decidesDirection);
}

/** Every `conditionKey` a definition refers to, at any depth. */
export function referencedKeys(definition: ConditionDefinition): readonly string[] {
  if (definition.kind === 'ref') return [definition.conditionKey];
  if (definition.kind === 'group') return definition.members.flatMap(referencedKeys);
  return [];
}

/**
 * References naming a condition the strategy does not define.
 *
 * Surfaced rather than dropped. A reference whose target is missing is not a
 * condition that quietly holds — it is a definition nobody can evaluate, and a
 * reader who is not told sees a shorter rule than the one that exists.
 */
export function unresolvedReferences(
  conditions: readonly StrategyCondition[],
): readonly string[] {
  const defined = new Set(conditions.map((c) => c.conditionKey));
  const referenced = new Set(conditions.flatMap((c) => referencedKeys(c.definition)));
  return [...referenced].filter((key) => !defined.has(key)).sort();
}

/** Whether any part of a definition is a form this product does not model. */
export function hasUnrecognisedPart(definition: ConditionDefinition): boolean {
  if (definition.kind === 'unrecognised') return true;
  if (definition.kind === 'group') return definition.members.some(hasUnrecognisedPart);
  return false;
}
