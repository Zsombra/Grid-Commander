import type { FailureCause } from '@/ports/failure.js';
import type { MetricResult } from './read-metric.query.js';
import type {
  ColumnCheckOutcome,
  ColumnControls,
  ColumnProposal,
  SectionTemplate,
  StrategiesPort,
} from '@/ports/strategies.js';

/**
 * Everything one section-template page needs, in one read.
 *
 * Deliberately one query rather than three. `ReadMetricQuery` and
 * `CheckColumnQuery` each establish the metric's membership by calling
 * `listMetrics`, which the adapter serves as ten category reads merged — so a
 * page composing them would pay for twenty. Here the membership check happens
 * once and both calls hang off it, which is also the only way the *ordering*
 * guarantee holds: no unlisted metric is ever sent onward, to either tool.
 *
 * Nothing here writes. The three tools it can reach —
 * `list_strategy_vocabulary`, `get_metric_construction_hints` and
 * `get_strategy_column_contract` — are all annotated `readOnlyHint: true`, and
 * the contract read is explicitly market-value-free: it compiles a column and
 * reads no prices.
 */

/**
 * The ten keys the platform's column object accepts.
 *
 * Written here, next to the reader that uses them, because their purpose is to
 * answer *which keys did the platform send that we do not carry* — a question
 * whose answer must change when the platform widens the grammar. It widened by
 * two in one deployment (`bars`, `ordering`) and this product noticed months
 * later. These are argument names, not vocabulary: no metric, transform or enum
 * value appears here or anywhere else outside the adapter boundary.
 */
const COLUMN_KEYS: readonly string[] = [
  'metric',
  'transformId',
  'chainedTransformId',
  'timeframe',
  'window',
  'offset',
  'side',
  'inputs',
  'bars',
  'ordering',
];

/**
 * One column a section template renders, read out of the platform's own entry.
 *
 * Three outcomes in one shape, because a surface has to tell them apart:
 * a column this product can express (`proposal`), one it cannot because a
 * required part is absent (`missing`), and one carrying a key this product does
 * not model (`unrecognised`) — which is *not* a failure. The column still
 * renders and the key is named, the way an unmodelled condition-evidence form
 * is named rather than dropped.
 */
export interface TemplateColumn {
  /** The column as this product can express it, or null when a part is missing. */
  readonly proposal: ColumnProposal | null;
  /** Required parts the platform's entry did not carry. */
  readonly missing: readonly string[];
  /** Keys the entry carried that this product does not carry. Named, never dropped. */
  readonly unrecognised: readonly string[];
}

/**
 * The platform's verdict on a composed column, or why there is none.
 *
 * `ColumnCheckOutcome` already carries both halves of an *answered* question —
 * a contract and a refusal are both content here. The third case is a read that
 * did not happen, which is a different thing from a refusal and never rendered
 * as one.
 */
export type ColumnVerdict =
  | ColumnCheckOutcome
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export type ComposeColumnResult =
  | {
      readonly kind: 'section';
      readonly template: SectionTemplate;
      readonly columns: readonly TemplateColumn[];
      readonly controls: ColumnControls;
      /** Null when no metric is being looked at — not a failed read. */
      readonly hints: MetricResult | null;
      /** Null when the form does not describe a column yet. */
      readonly check: ColumnVerdict | null;
    }
  | { readonly kind: 'no-such-section' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export interface ComposeColumnRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly sectionKey: string;
  /** The metric whose authoring detail to show. Ignored when `column` names one. */
  readonly metric: string | null;
  /** The composed column, when the form describes one. */
  readonly column: ColumnProposal | null;
}

export class ComposeColumnQuery {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: ComposeColumnRequest): Promise<ComposeColumnResult> {
    const who = { userId: req.userId, accessToken: req.accessToken };

    // Independent: the templates come from the vocabulary, the controls from
    // the tool declaration. Neither needs the other to start.
    const [listed, controls] = await Promise.all([
      this.strategies.listVocabularyTemplates(who),
      this.strategies.columnControls(who),
    ]);

    if (listed.kind === 'unreadable') {
      return { kind: 'unreadable', reason: listed.reason, cause: listed.cause };
    }
    const template = listed.templates.find((t) => keyOf(t) === req.sectionKey);
    if (!template) return { kind: 'no-such-section' };

    const columns = (template.columns ?? []).map(readTemplateColumn);
    const base = { kind: 'section', template, columns, controls } as const;

    // The composed column's own metric wins: the form carries both, and a page
    // that checked one while showing hints for the other would explain the
    // wrong transform beside the right verdict.
    const metric = req.column?.metric ?? req.metric;
    if (metric === null || metric.length === 0) {
      return { ...base, hints: null, check: null };
    }

    // Membership first — the roster pattern. The key arrives from a URL, the
    // platform enum-rejects an unknown one, and a refusal there would read as
    // "the platform is down" rather than "there is no such metric".
    const index = await this.strategies.listMetrics(who);
    if (index.kind === 'unreadable') {
      return { ...base, hints: index, check: null };
    }
    if (!index.metrics.some((m) => m.id === metric)) {
      return { ...base, hints: { kind: 'no-such-metric' }, check: null };
    }

    const [hints, check] = await Promise.all([
      this.hintsFor(who, metric),
      req.column === null ? null : this.verdictOn(who, req.column),
    ]);
    return { ...base, hints, check };
  }

  /**
   * Not `ReadMetricQuery`, and the duplication is the point: that query
   * re-establishes membership by calling `listMetrics` itself, which is the ten
   * reads this one has already paid for. What is shared is the *result type*,
   * so the two surfaces cannot come to disagree about what a hints failure is.
   */
  private async hintsFor(
    who: { userId: string; accessToken: string },
    metric: string,
  ): Promise<MetricResult> {
    try {
      return { kind: 'metric', hints: await this.strategies.metricHints({ ...who, metric }) };
    } catch (err) {
      return { kind: 'unreadable', reason: reasonOf(err), cause: 'unreachable' };
    }
  }

  /**
   * The platform's own verdict, refusals included. A refusal is content — the
   * validator names the offending path, the value received and the legal domain
   * — so it travels as a result and never as a thrown failure.
   */
  private async verdictOn(
    who: { userId: string; accessToken: string },
    column: ColumnProposal,
  ): Promise<ColumnVerdict> {
    try {
      return await this.strategies.columnContract({ ...who, column });
    } catch (err) {
      return { kind: 'unreadable', reason: reasonOf(err), cause: 'unreachable' };
    }
  }
}

/** A template's identity, whichever of the two keys it carries. */
export function keyOf(template: SectionTemplate): string {
  return template.kind === 'platform' ? template.sectionKey : template.templateKey;
}

/**
 * One platform column entry, read into what this product can send back.
 *
 * Read rather than trusted: the entry is the platform's, and `ColumnProposal`
 * is what `get_strategy_column_contract` accepts. They agree today — the
 * compile request and the contract tool declare the same ten-key closed object
 * — and the day they stop, the difference shows up as a named unrecognised key
 * rather than as a payload the platform rejects.
 */
export function readTemplateColumn(entry: Readonly<Record<string, unknown>>): TemplateColumn {
  const unrecognised = Object.keys(entry).filter((key) => !COLUMN_KEYS.includes(key));

  const metric = text(entry['metric']);
  const transformId = text(entry['transformId']);
  const timeframe = readTimeframe(entry['timeframe']);
  const missing = [
    ...(metric === undefined ? ['metric'] : []),
    ...(transformId === undefined ? ['transformId'] : []),
    ...(timeframe === null ? ['timeframe'] : []),
  ];
  if (metric === undefined || transformId === undefined || timeframe === null) {
    return { proposal: null, missing, unrecognised };
  }

  return {
    proposal: {
      metric,
      transformId,
      timeframe,
      chainedTransformId: text(entry['chainedTransformId']),
      window: whole(entry['window']),
      offset: whole(entry['offset']),
      side: text(entry['side']),
      inputs: readInputs(entry['inputs']),
      bars: text(entry['bars']),
      ordering: text(entry['ordering']),
    },
    missing,
    unrecognised,
  };
}

/**
 * `inputs` is an array of `{metric}` objects, not of strings.
 *
 * The port carries operands as bare keys and the adapter wraps them on the way
 * out; this unwraps them on the way in, so a template column round-trips to the
 * same payload the check form composes.
 */
function readInputs(raw: unknown): readonly string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const metrics = raw
    .map((entry) => text((entry as Record<string, unknown> | null)?.['metric']))
    .filter((m): m is string => m !== undefined);
  return metrics.length > 0 ? metrics : undefined;
}

function readTimeframe(raw: unknown): { rel: string } | { abs: string } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const tf = raw as Record<string, unknown>;
  const rel = text(tf['rel']);
  if (rel !== undefined) return { rel };
  const abs = text(tf['abs']);
  if (abs !== undefined) return { abs };
  return null;
}

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const whole = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) ? value : undefined;

const reasonOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));
