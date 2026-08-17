import type {
  ConditionClause,
  ConditionColumn,
  ConditionDefinition,
  ConditionVerdict,
  GroupOperator,
  StrategyCondition,
} from '@/domain/strategy/condition.js';

/**
 * A drafted condition, read off a query string.
 *
 * Here rather than in the route for the reason every other reader in
 * `form.ts` is: `app/` may not import the domain (W-D), and a route that
 * coerced `Number(searchParams.value)` would put a `NaN` into a definition and
 * send it. Here rather than *inside* `form.ts` because that file reads the
 * agent and plan forms, and this grammar is large enough that mixing them would
 * make both harder to follow.
 *
 * A query string rather than a POST body because nothing is written. The
 * composer is a `method="get"` form like the preview's coin selection and the
 * edit page's compose step, so a tried draft is a URL an operator can keep,
 * share, or edit by hand — which is the right affordance for a surface whose
 * whole promise is that it changes nothing.
 *
 * **What is refused here and what is not.** This parser refuses only what it
 * cannot turn into a definition at all: a clause with no column header, a bound
 * that is not a number, a group with no members. Those are structural — the
 * domain has no shape to hold them. It does **not** judge a condition key
 * against the platform's pattern, a column against any report, or a threshold
 * against any bound. Those are BattleGrid's to refuse, in BattleGrid's words,
 * and `CheckColumnQuery` records why pre-empting them here would be worse than
 * useless: it replaces the platform's teaching with this product's guess.
 */

/**
 * How many members one group may be composed from.
 *
 * Six because the largest group observed in real data has six members —
 * Berlin's `FULL_SEND_DOWN`, `N_OF 3` over three references and three clauses
 * (`the-condition-layer-is-legible`, 2026-08-05). The platform's own schema
 * permits 64. This is a composer limit, said on the page, not a claim about
 * what BattleGrid accepts.
 */
export const MEMBER_SLOTS = 6;

const COMPARE_OPS = ['lt', 'lte', 'gte', 'gt'] as const;
const GROUP_OPS: readonly GroupOperator[] = ['ALL', 'ANY', 'NOT', 'N_OF'];
const VERDICTS: readonly string[] = ['UP', 'DOWN', 'NEITHER'];

/** Every clause operator the composer offers, in the order the form lists them. */
export const CLAUSE_OPS = [...COMPARE_OPS, 'between', 'is', 'in'] as const;

export type QueryFields = Readonly<Record<string, string | string[] | undefined>>;

/** The first value under a key, or `''`. Repeated params take the first. */
function one(q: QueryFields, key: string): string {
  const raw = q[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' ? value.trim() : '';
}

export type DraftFromForm =
  /** Nothing has been drafted yet — render the blank composer. */
  | { readonly kind: 'blank' }
  | { readonly kind: 'draft'; readonly condition: StrategyCondition }
  /**
   * The definition comes from a condition the strategy already carries, at
   * whatever depth it has, with the identity taken from the form.
   *
   * This is the bridge across the composer's own limit. The rows below build
   * one level of grouping; the platform's grammar nests to 64 members and this
   * product reads it to depth 32. Without a way to start from what exists, a
   * strategy's most interesting conditions — the deep ones — would be the ones
   * an author could never ask a question about.
   */
  | {
      readonly kind: 'from-existing';
      readonly sourceKey: string;
      readonly conditionKey: string | null;
      readonly name: string | null;
      readonly verdict: ConditionVerdict;
    }
  /**
   * The form does not describe a definition. Not a platform refusal and not
   * an error: the operator left a row half-filled, and the fix is on the page
   * they are already looking at.
   */
  | { readonly kind: 'malformed'; readonly problems: readonly string[] };

function column(q: QueryFields, prefix: string): ConditionColumn | null {
  const header = one(q, `${prefix}header`);
  if (header.length === 0) return null;
  const sectionKey = one(q, `${prefix}section`);
  // Empty means "a column not owned by a section", which is a value the
  // platform's own schema declares. Not defaulted to a string: `""` would
  // address nothing, and the mapper reads the absent case the same way.
  return { sectionKey: sectionKey.length > 0 ? sectionKey : null, header };
}

/** A number, or null. Never `NaN`, and never a silent zero for an empty box. */
function numeric(q: QueryFields, key: string): number | null {
  const raw = one(q, key);
  if (raw.length === 0) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * One member row: a clause, a reference, or nothing at all.
 *
 * Returns `null` for a row the operator left empty — six slots are rendered and
 * most drafts use one or two, so an untouched row is the common case rather
 * than a mistake. A row that is *started* and incomplete is a problem, and says
 * which part is missing.
 */
function member(
  q: QueryFields,
  index: number,
  problems: string[],
): ConditionDefinition | null {
  const prefix = `m${index}.`;
  const kind = one(q, `${prefix}kind`);
  if (kind === '') return null;

  if (kind === 'ref') {
    const key = one(q, `${prefix}ref`);
    if (key.length === 0) {
      problems.push(`Row ${index + 1} refers to another condition but names none.`);
      return null;
    }
    return { kind: 'ref', conditionKey: key };
  }

  if (kind !== 'clause') {
    problems.push(`Row ${index + 1} has a kind this composer does not build: ${kind}.`);
    return null;
  }

  const col = column(q, prefix);
  if (!col) {
    problems.push(`Row ${index + 1} compares a column but names no column header.`);
    return null;
  }

  const op = one(q, `${prefix}op`);
  const clause = clauseFor(q, prefix, col, op, index, problems);
  return clause;
}

function clauseFor(
  q: QueryFields,
  prefix: string,
  col: ConditionColumn,
  op: string,
  index: number,
  problems: string[],
): ConditionClause | null {
  if ((COMPARE_OPS as readonly string[]).includes(op)) {
    const value = numeric(q, `${prefix}value`);
    if (value === null) {
      problems.push(`Row ${index + 1} compares ${col.header} to nothing — give it a number.`);
      return null;
    }
    return { kind: 'compare', column: col, op: op as (typeof COMPARE_OPS)[number], value };
  }
  if (op === 'between') {
    const low = numeric(q, `${prefix}low`);
    const high = numeric(q, `${prefix}high`);
    if (low === null || high === null) {
      problems.push(`Row ${index + 1} is a between clause and needs both bounds as numbers.`);
      return null;
    }
    // Sent in the order given. Which way round the platform wants them is its
    // rule to state — swapping them here would be this product deciding what
    // the operator meant.
    return { kind: 'between', column: col, low, high };
  }
  if (op === 'is') {
    const label = one(q, `${prefix}label`);
    if (label.length === 0) {
      problems.push(`Row ${index + 1} checks ${col.header} against no label.`);
      return null;
    }
    return { kind: 'is', column: col, label };
  }
  if (op === 'in') {
    const labels = one(q, `${prefix}labels`)
      .split(',')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (labels.length === 0) {
      problems.push(`Row ${index + 1} checks ${col.header} against an empty list of labels.`);
      return null;
    }
    return { kind: 'in', column: col, labels };
  }
  problems.push(`Row ${index + 1} uses a comparison this composer does not build: ${op}.`);
  return null;
}

function verdictOf(raw: string): ConditionVerdict {
  // Anything else is a building block — the same reading the mapper takes, and
  // for the same reason: being wrong about "this is a building block"
  // understates a draft, being wrong about "this calls DOWN" describes a draft
  // that does something it does not.
  return VERDICTS.includes(raw) ? (raw as ConditionVerdict) : null;
}

export function draftFromQuery(q: QueryFields): DraftFromForm {
  if (one(q, 'try') !== '1') return { kind: 'blank' };

  const sourceKey = one(q, 'from');
  if (sourceKey.length > 0) {
    // The rows are ignored entirely rather than merged. A definition is one
    // thing: half from a stored condition and half from six form rows would be
    // a shape the operator never composed and could not read back.
    const key = one(q, 'key');
    const name = one(q, 'name');
    return {
      kind: 'from-existing',
      sourceKey,
      conditionKey: key.length > 0 ? key : null,
      name: name.length > 0 ? name : null,
      // Straight from the form, with no fallback to the source's own. The
      // select always submits a definite value, and "no verdict" is one of
      // them — a named building block, not an unanswered question. The link
      // that seeds the form carries the source's verdict so a bare click does
      // not silently demote a directional call to a building block.
      verdict: verdictOf(one(q, 'verdict')),
    };
  }

  const problems: string[] = [];
  const members: ConditionDefinition[] = [];
  for (let i = 0; i < MEMBER_SLOTS; i += 1) {
    const parsed = member(q, i, problems);
    if (parsed) members.push(parsed);
  }

  if (members.length === 0) {
    if (problems.length === 0) {
      problems.push('Nothing was composed — fill in at least one row.');
    }
    return { kind: 'malformed', problems };
  }
  if (problems.length > 0) return { kind: 'malformed', problems };

  const shape = one(q, 'shape');
  const groupOp = one(q, 'groupOp');
  let definition: ConditionDefinition;
  if (shape === 'group') {
    if (!GROUP_OPS.includes(groupOp as GroupOperator)) {
      return {
        kind: 'malformed',
        problems: [`This composer does not build a ${groupOp || 'nameless'} group.`],
      };
    }
    const op = groupOp as GroupOperator;
    definition = {
      kind: 'group',
      op,
      // Only `N_OF` carries a threshold. Null elsewhere rather than 0, which
      // would read as "none of them must hold" — the mapper's own reasoning.
      n: op === 'N_OF' ? numeric(q, 'n') : null,
      members,
    };
  } else {
    // A single-member draft is that member, not a group of one. `ALL` over one
    // member resolves the same way and is a different payload; sending the
    // wrapper would mean the platform was asked about a shape the operator did
    // not compose.
    definition = members[0] as ConditionDefinition;
    if (members.length > 1) {
      return {
        kind: 'malformed',
        problems: [
          'More than one row was filled in, but the draft is set to a single ' +
            'comparison. Choose a group, or clear the extra rows.',
        ],
      };
    }
  }

  const key = one(q, 'key');
  return {
    kind: 'draft',
    condition: {
      // Neither key nor name is checked here. The platform's schema pins the
      // key's pattern and the name's length, and its refusal names both far
      // better than a message written in this file could.
      conditionKey: key,
      name: one(q, 'name') || key,
      definition,
      verdict: verdictOf(one(q, 'verdict')),
      // Required only by the explicit must-hold value; anything else —
      // absent, empty, or a word the select does not offer — composes as
      // optional, the platform's own default. The asymmetry is `verdictOf`'s:
      // a wrong "optional" understates a draft, a wrong "required" silently
      // hardens a strategy the operator was composing.
      required: one(q, 'holding') === 'must-hold',
    },
  };
}
