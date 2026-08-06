import type { ConditionColumn, ConditionDefinition, StrategyCondition } from './condition.js';

/**
 * A condition on its way *out* — the direction this product had never gone.
 *
 * `condition-mapper.ts` reads BattleGrid's condition payload into the domain.
 * Nothing wrote one back, because until now nothing composed one: the two
 * changes that made the layer legible (2026-08-05, 2026-08-06) read it, and the
 * strategy's own conditions travel to the preview as the platform's objects,
 * whole (`StrategyDetailResult.conditionsAsGiven`).
 *
 * A *drafted* condition has no platform object to carry. It exists only here, so
 * it has to be serialised — and that is the one place this product could invent
 * platform semantics without noticing. Two rules follow from that, and they are
 * the whole design of this file.
 *
 * **A form the mapper did not understand is never written back.** `mapDefinition`
 * answers `unrecognised` for a shape it does not model, carrying the reason. That
 * is the right answer for a reader: a strategy holding one part nobody models
 * still renders the parts everybody does. It is the wrong answer for a writer —
 * there is no shape to emit, and emitting a guess would send BattleGrid something
 * the operator never composed. So a draft carrying an unrecognised part refuses,
 * naming the part.
 *
 * **Everything else goes as composed.** An illegal key, a column no report
 * carries, a threshold outside the platform's bounds — none of them are checked
 * here. `CheckColumnQuery` set that precedent for the column grammar and says why:
 * pre-filtering locally replaces the platform's teaching with this product's
 * guess. BattleGrid's refusal names the offending path and what is legal in its
 * place, and this surface exists to show exactly that.
 *
 * The wire shapes below are the ones declared by
 * `docs/battlegrid-mcp-capabilities.json` for `compile_strategy_plan` and
 * `preview_strategy_report` — the same union on both, checked 2026-08-06.
 * `tests/strategy/condition-draft.test.ts` holds every branch of this file
 * against that declaration as it is read from the artifact, rather than against
 * a copy of it written down here.
 */

/** One condition as the platform's schema declares it. Opaque past this file. */
export type ConditionWire = Readonly<Record<string, unknown>>;

/**
 * Why a draft could not be turned into a payload.
 *
 * Only ever the unexpressible form. A list rather than a single reason because a
 * definition can carry more than one — an operator whose group has two
 * unrecognised members should fix both, not discover the second after fixing the
 * first.
 */
export type DraftSerialisation =
  | { readonly kind: 'wire'; readonly condition: ConditionWire }
  | { readonly kind: 'inexpressible'; readonly reasons: readonly string[] };

/** Every reason a definition cannot be written back, at any depth. */
function inexpressibleParts(definition: ConditionDefinition): readonly string[] {
  if (definition.kind === 'unrecognised') return [definition.reason];
  if (definition.kind === 'group') return definition.members.flatMap(inexpressibleParts);
  return [];
}

/**
 * A definition, as the platform's schema declares it.
 *
 * Callers reach this through `serialiseCondition`, which has already refused an
 * unrecognised part. The branch below throws rather than emitting a placeholder,
 * because a placeholder is precisely the invented shape this file exists to
 * prevent — and an unreachable throw is a louder failure than a silent guess.
 */
export function serialiseDefinition(definition: ConditionDefinition): ConditionWire {
  switch (definition.kind) {
    case 'compare':
      return {
        kind: 'clause',
        column: { sectionKey: definition.column.sectionKey, header: definition.column.header },
        op: definition.op,
        value: definition.value,
      };
    case 'between':
      return {
        kind: 'clause',
        column: { sectionKey: definition.column.sectionKey, header: definition.column.header },
        op: 'between',
        low: definition.low,
        high: definition.high,
      };
    case 'is':
      return {
        kind: 'clause',
        column: { sectionKey: definition.column.sectionKey, header: definition.column.header },
        op: 'is',
        label: definition.label,
      };
    case 'in':
      return {
        kind: 'clause',
        column: { sectionKey: definition.column.sectionKey, header: definition.column.header },
        op: 'in',
        labels: [...definition.labels],
      };
    case 'ref':
      return { kind: 'conditionRef', conditionKey: definition.conditionKey };
    case 'group':
      return {
        kind: 'group',
        op: definition.op,
        // Emitted only when the domain holds one. `mapDefinition` keeps `n`
        // for `N_OF` alone and nulls it elsewhere, because a threshold on an
        // `ALL` group means nothing — so a group that arrived carrying a
        // meaningless `n` goes back without it. The only shape that reaches
        // here without a round trip is one the composer built, and the
        // composer sets `n` for `N_OF` alone.
        ...(definition.n !== null ? { n: definition.n } : {}),
        members: definition.members.map(serialiseDefinition),
      };
    case 'unrecognised':
      throw new Error(
        'a definition this product does not model cannot be written back; ' +
          'serialiseCondition refuses it before reaching here',
      );
  }
}

/**
 * A composed condition, ready to be sent — or a refusal naming what stopped it.
 *
 * `verdict` is emitted even when it is `null`, because the platform's schema
 * requires the key on every condition and `null` is its declared value for a
 * named building block. Omitting it would be an unknown-key error's opposite and
 * just as fatal: a required field missing.
 */
export function serialiseCondition(condition: StrategyCondition): DraftSerialisation {
  const reasons = inexpressibleParts(condition.definition);
  if (reasons.length > 0) return { kind: 'inexpressible', reasons };
  return {
    kind: 'wire',
    condition: {
      conditionKey: condition.conditionKey,
      name: condition.name,
      definition: serialiseDefinition(condition.definition),
      verdict: condition.verdict,
    },
  };
}

/**
 * Whether the draft joined the strategy's conditions or displaced one of them.
 *
 * Carried rather than left for a surface to work out. A page comparing the
 * draft's key against a list would be a second implementation of the rule that
 * decides what BattleGrid was actually asked — and the operator is entitled to
 * be told which of the two happened, because the outcomes differ.
 */
export type DraftStanding = 'added' | 'replaced';

export interface ComposedConditions {
  /** Exactly what the platform is sent, in order. */
  readonly conditions: readonly ConditionWire[];
  readonly standing: DraftStanding;
  /** How many of the strategy's own conditions travel alongside the draft. */
  readonly alongside: number;
}

/**
 * The list the platform is asked to resolve.
 *
 * A draft cannot be resolved on its own. `preview_strategy_report` takes no
 * strategy id and resolves only the conditions it is given, so a draft
 * referring to `FLOW_UP` gets an answer only if `FLOW_UP` travels with it —
 * which means the strategy's own conditions go too.
 *
 * They go as the platform sent them (`conditionsAsGiven`), never re-serialised
 * out of the domain: the grammar is still being rolled out, and a strategy
 * holding a form this product reads as `unrecognised` must not have that form
 * silently dropped on its way back. Only the draft passes through the
 * serialiser, because only the draft has no platform object of its own.
 *
 * A key is never sent twice. Two conditions sharing one key is a list with no
 * answer to which of them a `conditionRef` names, and the outcome that came
 * back would be attributed to a draft that may not have produced it — so a
 * draft whose key matches an existing condition stands **in its place**, at
 * that condition's position, and the surface says so.
 */
export function composeForResolution(
  existing: readonly ConditionWire[],
  draft: ConditionWire,
): ComposedConditions {
  const key = draft['conditionKey'];
  const matches = (entry: ConditionWire): boolean =>
    typeof key === 'string' && entry['conditionKey'] === key;

  if (existing.some(matches)) {
    return {
      conditions: existing.map((entry) => (matches(entry) ? draft : entry)),
      standing: 'replaced',
      // The replaced one is not travelling — it is the one being asked about.
      alongside: existing.length - existing.filter(matches).length,
    };
  }
  return { conditions: [...existing, draft], standing: 'added', alongside: existing.length };
}

/**
 * Every report column this strategy's conditions already read, deduplicated.
 *
 * The composer needs to offer columns, and there is no tool that lists the
 * headers a strategy's report produces — `list_strategy_vocabulary` publishes
 * metrics and section templates, not the rendered column names a clause
 * addresses. So the honest source is the strategy itself: the columns its own
 * conditions demonstrably read are columns the platform resolves for it.
 *
 * Offered as a suggestion, never as a constraint. An operator composing against
 * a column no existing condition uses is doing something legitimate, and
 * BattleGrid's refusal is the answer if the column does not exist — the same
 * reading `CheckColumnQuery` takes.
 *
 * Here rather than beside `referencedKeys` in `condition.ts`: that file is the
 * read model of a condition, and this exists only to feed the drafting surface.
 */
export function columnsRead(
  conditions: readonly StrategyCondition[],
): readonly ConditionColumn[] {
  const seen = new Map<string, ConditionColumn>();
  const walk = (definition: ConditionDefinition): void => {
    if (definition.kind === 'group') {
      definition.members.forEach(walk);
      return;
    }
    if (definition.kind === 'ref' || definition.kind === 'unrecognised') return;
    seen.set(`${definition.column.sectionKey ?? ''} ${definition.column.header}`, definition.column);
  };
  conditions.forEach((c) => walk(c.definition));
  return [...seen.values()].sort((a, b) => a.header.localeCompare(b.header));
}
