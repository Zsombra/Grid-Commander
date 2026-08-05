import type {
  ConditionColumn,
  ConditionDefinition,
  ConditionVerdict,
  GroupOperator,
  StrategyCondition,
} from '@/domain/strategy/condition.js';

/**
 * BattleGrid's condition payload, read into the domain's shape.
 *
 * The grammar is recursive and open: eight platform strategies gained
 * conditions across a single deployment, and the metric vocabulary underneath
 * them changes on most. So an unfamiliar form maps to `unrecognised` carrying
 * its reason, never to a throw and never to a silent drop. A strategy holding
 * one part nobody models must still render the six parts everybody does.
 *
 * The reason strings are written for a reader, not for a log. They surface on
 * the strategy page as "this part was not understood", so "not an object" is
 * useless and "unknown group operator XOR" is not.
 */

const GROUP_OPS: readonly GroupOperator[] = ['ALL', 'ANY', 'NOT', 'N_OF'];
const COMPARE_OPS = ['lt', 'lte', 'gte', 'gt'] as const;

const unrecognised = (reason: string): ConditionDefinition => ({ kind: 'unrecognised', reason });

function mapColumn(raw: unknown): ConditionColumn | null {
  const c = (raw ?? {}) as Record<string, unknown>;
  const header = c['header'];
  if (typeof header !== 'string' || header.length === 0) return null;
  return {
    // Explicitly nullable in the platform's own schema — a column not owned by
    // a section. Not defaulted to a string, because "" would address nothing.
    sectionKey: typeof c['sectionKey'] === 'string' ? c['sectionKey'] : null,
    header,
  };
}

/** The four comparison shapes, each checked for the operands it actually needs. */
function mapClause(d: Record<string, unknown>): ConditionDefinition {
  const column = mapColumn(d['column']);
  if (!column) return unrecognised('a clause with no column header');
  const op = d['op'];

  if (typeof op === 'string' && (COMPARE_OPS as readonly string[]).includes(op)) {
    if (typeof d['value'] !== 'number') return unrecognised(`a ${op} clause with no numeric value`);
    return { kind: 'compare', column, op: op as (typeof COMPARE_OPS)[number], value: d['value'] };
  }
  if (op === 'between') {
    if (typeof d['low'] !== 'number' || typeof d['high'] !== 'number') {
      return unrecognised('a between clause without both bounds');
    }
    return { kind: 'between', column, low: d['low'], high: d['high'] };
  }
  if (op === 'is') {
    if (typeof d['label'] !== 'string') return unrecognised('an is clause with no label');
    return { kind: 'is', column, label: d['label'] };
  }
  if (op === 'in') {
    const labels = Array.isArray(d['labels']) ? d['labels'].filter((l): l is string => typeof l === 'string') : [];
    if (labels.length === 0) return unrecognised('an in clause with no labels');
    return { kind: 'in', column, labels };
  }
  return unrecognised(`unknown clause operator ${JSON.stringify(op)}`);
}

/**
 * A definition, at any depth.
 *
 * `depth` exists only to refuse a payload that references itself into a cycle.
 * The platform's schema does not forbid one and a recursive read would not
 * return; refusing at a depth no real strategy approaches is cheaper than
 * tracking visited nodes for a grammar this shallow in practice.
 */
export function mapDefinition(raw: unknown, depth = 0): ConditionDefinition {
  if (depth > 32) return unrecognised('nested deeper than this product will follow');
  if (raw === null || typeof raw !== 'object') return unrecognised('a definition that is not an object');
  const d = raw as Record<string, unknown>;
  const kind = d['kind'];

  if (kind === 'clause') return mapClause(d);

  if (kind === 'conditionRef') {
    const key = d['conditionKey'];
    if (typeof key !== 'string' || key.length === 0) return unrecognised('a reference naming no condition');
    return { kind: 'ref', conditionKey: key };
  }

  if (kind === 'group') {
    const op = d['op'];
    if (typeof op !== 'string' || !(GROUP_OPS as readonly string[]).includes(op)) {
      return unrecognised(`unknown group operator ${JSON.stringify(op)}`);
    }
    const members = Array.isArray(d['members']) ? d['members'].map((m) => mapDefinition(m, depth + 1)) : [];
    if (members.length === 0) return unrecognised(`a ${op} group with no members`);
    return {
      kind: 'group',
      op: op as GroupOperator,
      // Only N_OF carries a threshold. Null elsewhere rather than 0, which
      // would read as "none of them must hold".
      n: op === 'N_OF' && typeof d['n'] === 'number' ? d['n'] : null,
      members,
    };
  }

  return unrecognised(`unknown definition kind ${JSON.stringify(kind)}`);
}

const VERDICTS: readonly string[] = ['UP', 'DOWN', 'NEITHER'];

/**
 * A verdict, or the absence of one.
 *
 * An unrecognised verdict maps to `null` — a building block — rather than
 * being invented into a direction. Being wrong about "this is a building
 * block" understates a strategy; being wrong about "this calls DOWN" tells the
 * operator the strategy does something it does not.
 */
function mapVerdict(raw: unknown): ConditionVerdict {
  return typeof raw === 'string' && VERDICTS.includes(raw) ? (raw as ConditionVerdict) : null;
}

/**
 * The conditions, in the order the platform gave them.
 *
 * A condition with no key is dropped, on the same reasoning `mapSignalRules`
 * drops a rule with no `signalId`: the key is what a `ref` names, so a
 * condition without one cannot be referred to and cannot be told apart from
 * another one like it.
 */
export function mapConditions(raw: unknown): readonly StrategyCondition[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => (entry ?? {}) as Record<string, unknown>)
    .filter((e) => typeof e['conditionKey'] === 'string' && (e['conditionKey'] as string).length > 0)
    .map((e) => ({
      conditionKey: e['conditionKey'] as string,
      name: typeof e['name'] === 'string' && e['name'].length > 0 ? e['name'] : (e['conditionKey'] as string),
      definition: mapDefinition(e['definition']),
      verdict: mapVerdict(e['verdict']),
    }));
}
