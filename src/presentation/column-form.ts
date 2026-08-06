import type { ColumnProposal } from '@/ports/strategies.js';

/**
 * A composed report column, read off a query string.
 *
 * Here rather than in the route for the reason `condition-form.ts` is here: a
 * route that did `Number(searchParams.window)` would put a `NaN` into a column
 * and send it, and `app/` is meant to be thin. A query string rather than a POST
 * body because nothing is written — the composer is a `method="get"` form, so a
 * checked column is a URL an operator can keep, share, or edit by hand, which is
 * the right affordance for a surface whose whole promise is that it changes
 * nothing.
 *
 * **The timeframe travels tagged**: `rel:anchor`, `abs:1h`. The platform's
 * schema is an `anyOf` of two single-key objects, and a bare `anchor` can only
 * be sorted into the right one by consulting a list of the relative names —
 * which is how `REL_TIMEFRAMES` came to be written down in
 * `app/(app)/strategies/metrics/[metric]/page.tsx`, the one piece of platform
 * vocabulary this product still spells out. Tagging the value makes the list
 * unnecessary rather than making it correct.
 *
 * **What is refused here and what is not.** This reader refuses only what it
 * cannot turn into a column at all: a window that is not a whole number, a
 * timeframe in a form it cannot parse. It does not judge a metric against the
 * vocabulary, a transform against the metric, or an operand against the base's
 * unit. Those are BattleGrid's to refuse in BattleGrid's own words, and
 * `CheckColumnQuery` records why pre-empting them would be worse than useless:
 * it replaces the platform's teaching with this product's guess.
 */

export type QueryFields = Readonly<Record<string, string | string[] | undefined>>;

export interface ColumnDraft {
  /** The metric whose card to show. Null when nothing has been chosen yet. */
  readonly metric: string | null;
  /** The column to check. Null when the form does not describe one. */
  readonly column: ColumnProposal | null;
  /**
   * Ours to say, and said as ours. These are values that cannot become a
   * column, so nothing is sent and BattleGrid has no opinion to report.
   */
  readonly problems: readonly string[];
}

/** The first value under a key, trimmed, or `''`. Repeated params take the first. */
function one(q: QueryFields, key: string): string {
  const raw = q[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' ? value.trim() : '';
}

export function columnFromQuery(q: QueryFields): ColumnDraft {
  const metric = one(q, 'metric');
  if (metric === '') return { metric: null, column: null, problems: [] };

  // A metric with no transform is a card being read, not a column being
  // composed. Not a problem — it is the first half of the disclosure.
  const transformId = one(q, 'transformId');
  if (transformId === '') return { metric, column: null, problems: [] };

  const problems: string[] = [];
  const timeframe = readTimeframe(one(q, 'tf'));
  if (timeframe === null) {
    problems.push('Choose a timeframe — every column reads one.');
  }

  const window = wholeNumber(q, 'window', 'Window', problems);
  const offset = wholeNumber(q, 'offset', 'Offset', problems);

  if (timeframe === null || problems.length > 0) return { metric, column: null, problems };

  return {
    metric,
    column: {
      metric,
      transformId,
      timeframe,
      chainedTransformId: blankToUndefined(one(q, 'chained')),
      window,
      offset,
      side: blankToUndefined(one(q, 'side')),
      inputs: readInputs(one(q, 'inputs')),
      bars: blankToUndefined(one(q, 'bars')),
      ordering: blankToUndefined(one(q, 'ordering')),
    },
    problems: [],
  };
}

/** `rel:anchor` / `abs:1h`. Anything else is a form this reader cannot use. */
function readTimeframe(raw: string): { rel: string } | { abs: string } | null {
  const at = raw.indexOf(':');
  if (at < 1) return null;
  const kind = raw.slice(0, at);
  const value = raw.slice(at + 1).trim();
  if (value === '') return null;
  if (kind === 'rel') return { rel: value };
  if (kind === 'abs') return { abs: value };
  return null;
}

/** How a timeframe is written into a link or a select. The reader's inverse. */
export function timeframeParam(timeframe: { rel: string } | { abs: string }): string {
  return 'rel' in timeframe ? `rel:${timeframe.rel}` : `abs:${timeframe.abs}`;
}

/**
 * A whole number, or a stated problem.
 *
 * `Number.parseInt('4 bars')` is 4, which would silently send a column the
 * operator did not compose. The whole string has to be a number or the value is
 * refused by name.
 */
function wholeNumber(
  q: QueryFields,
  key: string,
  label: string,
  problems: string[],
): number | undefined {
  const raw = one(q, key);
  if (raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    problems.push(`${label} must be a whole number — "${raw}" is not.`);
    return undefined;
  }
  return value;
}

function readInputs(raw: string): readonly string[] | undefined {
  if (raw === '') return undefined;
  const metrics = raw
    .split(',')
    .map((m) => m.trim())
    .filter((m) => m.length > 0);
  return metrics.length > 0 ? metrics : undefined;
}

const blankToUndefined = (value: string): string | undefined =>
  value === '' ? undefined : value;

/**
 * The query a link must carry to reopen a column in the editor.
 *
 * Built here rather than in the page so the link and the reader cannot drift —
 * a "start from this column" link that dropped `bars` would seed an editor with
 * a different column than the one it was opened from, and nothing would say so.
 */
export function columnQuery(column: ColumnProposal): string {
  const params = new URLSearchParams();
  params.set('metric', column.metric);
  params.set('transformId', column.transformId);
  params.set('tf', timeframeParam(column.timeframe));
  if (column.chainedTransformId !== undefined) params.set('chained', column.chainedTransformId);
  if (column.window !== undefined) params.set('window', String(column.window));
  if (column.offset !== undefined) params.set('offset', String(column.offset));
  if (column.side !== undefined) params.set('side', column.side);
  if (column.inputs !== undefined) params.set('inputs', column.inputs.join(', '));
  if (column.bars !== undefined) params.set('bars', column.bars);
  if (column.ordering !== undefined) params.set('ordering', column.ordering);
  return params.toString();
}
