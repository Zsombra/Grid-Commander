import type {
  ConditionCounts,
  ConditionEvidence,
  ConditionOutcome,
  TickerOutcomes,
} from '@/domain/strategy/condition-outcome.js';

/**
 * `preview_strategy_report`'s `conditionOutcomes`, read into the domain's shape.
 *
 * Shaped from the live payload of **2026-08-04** — per ticker, per condition,
 * with clause-level evidence and a `counts` block on threshold groups.
 *
 * **This is a separate file from `condition-mapper.ts` on purpose.** That one
 * reads definitions and has a test asserting the word `conditionOutcomes` does
 * not appear in it at all: outcomes are the platform's answer about live market
 * state, definitions are structure, and keeping the two mappers apart is what
 * makes "this product never decides whether a condition holds" checkable rather
 * than merely stated.
 *
 * Nothing here compares, counts or concludes. Every value is carried as it
 * arrived, including the outcome words — see `ConditionOutcome.outcome` for why
 * they are strings rather than a union.
 */

const asRecord = (raw: unknown): Record<string, unknown> =>
  typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const whole = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * One evidence entry.
 *
 * A clause entry needs all six of its fields to say anything: an explanation
 * missing the value that was observed, or the one that was required, explains
 * nothing. Anything else — the declared-but-never-seen `conditionRef` variant, a
 * form added tomorrow — keeps its outcome and reports itself as not understood,
 * the same discipline `mapDefinition` applies to a definition it cannot read.
 */
function mapEvidence(raw: unknown): ConditionEvidence {
  const e = asRecord(raw);
  const outcome = text(e['outcome']) ?? '(no outcome given)';
  const kind = e['kind'];

  if (kind === 'clause') {
    const sectionKey = text(e['sectionKey']);
    const header = text(e['header']);
    const op = text(e['op']);
    // `operand` and `literal` are declared as plain strings — an empty one is a
    // value the platform actually sent, so they are checked for type only.
    const operand = typeof e['operand'] === 'string' ? e['operand'] : null;
    const literal = typeof e['literal'] === 'string' ? e['literal'] : null;
    if (sectionKey !== null && header !== null && op !== null && operand !== null && literal !== null) {
      return { kind: 'clause', sectionKey, header, op, operand, literal, outcome };
    }
    return {
      kind: 'unmodelled',
      outcome,
      // Named for a reader on the preview page: "a clause explanation missing
      // the value it compared" is actionable, "invalid" is not.
      reason: 'a clause explanation missing part of what it compared',
    };
  }

  return {
    kind: 'unmodelled',
    outcome,
    reason: `an explanation of a kind Grid-Commander does not model: ${JSON.stringify(kind)}`,
  };
}

/**
 * A threshold group's tally, or its absence.
 *
 * All three numbers or none. A half-read tally — held and total, with the
 * unresolved count silently missing — would render as a group where everything
 * that did not hold was false, which is the one reading this payload exists to
 * prevent. The same rule `mapPreviewLimits` applies to a half-published ceiling.
 */
function mapCounts(raw: unknown): ConditionCounts | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const c = raw as Record<string, unknown>;
  const trueCount = whole(c['trueCount']);
  const total = whole(c['total']);
  const unresolvedCount = whole(c['unresolvedCount']);
  if (trueCount === null || total === null || unresolvedCount === null) return null;
  return { trueCount, total, unresolvedCount };
}

/**
 * One condition's resolution.
 *
 * A row with no `conditionKey` is dropped, on the same reasoning
 * `mapConditions` drops a definition without one: the key is what identifies
 * the condition an author would go and look at, and two unnamed rows cannot be
 * told apart.
 */
function mapOutcome(raw: unknown): ConditionOutcome | null {
  const o = asRecord(raw);
  const conditionKey = text(o['conditionKey']);
  if (conditionKey === null) return null;
  const outcome = text(o['outcome']);
  // No default outcome. A row whose answer did not arrive is not a row that
  // says FALSE, and inventing either word here would put this product's guess
  // where the platform's answer belongs.
  if (outcome === null) return null;
  return {
    conditionKey,
    name: text(o['name']) ?? conditionKey,
    outcome,
    // Strictly `=== true`. An absent flag means the platform did not mark this
    // outcome provisional; it never means "assume it might be".
    provisional: o['provisional'] === true,
    counts: mapCounts(o['counts']),
    evidence: (Array.isArray(o['evidence']) ? o['evidence'] : []).map(mapEvidence),
  };
}

/**
 * The outcomes, per ticker, in the order the platform gave them.
 *
 * A ticker row with no ticker is dropped: the whole shape of this payload is
 * "this condition, on this coin", and a row that cannot name its coin is one
 * nobody can act on. An empty array is a real and ordinary answer — it is what
 * the platform returns when it was sent no conditions to resolve.
 */
export function mapConditionOutcomes(raw: unknown): readonly TickerOutcomes[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): TickerOutcomes | null => {
      const t = asRecord(entry);
      const ticker = text(t['ticker']);
      if (ticker === null) return null;
      return {
        ticker,
        outcomes: (Array.isArray(t['outcomes']) ? t['outcomes'] : [])
          .map(mapOutcome)
          .filter((o): o is ConditionOutcome => o !== null),
      };
    })
    .filter((t): t is TickerOutcomes => t !== null);
}
