import { describe, expect, it } from 'vitest';
import { ToolRefusedError } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { CheckColumnQuery } from '@/application/use-cases/check-column.query.js';
import { ReadMetricIndexQuery } from '@/application/use-cases/read-metric-index.query.js';
import { ReadMetricQuery } from '@/application/use-cases/read-metric.query.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import { aMetric, aMetricHints, FakeStrategiesPort } from '../support/strategy-fakes.js';

/** Shaped from the live vocabulary `metrics` entry of 2026-08-01. */
const LIVE_METRIC = {
  metric: 'RSI14',
  label: 'RSI (14)',
  code: 'RSI14',
  family: 'momentum',
  nativeOutput: { kind: 'numeric', unit: 'oscillator', precision: 1, range: [0, 100] },
  timeframeMode: 'candle',
  transformIds: ['value', 'trajectory', 'classifyZone', 'spread', 'rank'],
};

/** Shaped from the live teaching refusal of 2026-08-01. */
const LIVE_REFUSAL = JSON.stringify({
  code: 'VALIDATION_ERROR',
  message:
    "[report-column] spread operand 'CLOSE' is not a legal relational operand for base 'RSI14'",
  details: {
    authoringCode: 'REPORT_COLUMN_OPERAND_UNSUPPORTED',
    path: ['column', 'inputs', 0, 'metric'],
    receivedValue: 'CLOSE',
    allowedDomain: { kind: 'enum', values: ['ADX', 'CCI20', 'MFI14', 'RSI7', 'STOCH_D', 'STOCH_K'] },
    context: { sectionKey: 'authoring', transformId: 'spread' },
  },
});

function adapterOver(respond: (req: ToolCallRequest) => unknown) {
  const calls: ToolCallRequest[] = [];
  const battlegrid: BattleGridPort = {
    buildAuthorizationUrl: () => '',
    exchangeCode: async () => {
      throw new Error('unused');
    },
    refresh: async () => {
      throw new Error('unused');
    },
    revoke: async () => {},
    discoverTools: async () => [],
    callTool: async (request) => {
      calls.push(request);
      return {
        content: respond(request),
        classification: {
          mutating: false,
          destructive: false,
          requiredScope: 'mcp:read',
          basis: 'annotations',
        },
        auditEntryId: 'a1',
      };
    },
  };
  return { adapter: new McpStrategyAdapter(battlegrid), calls };
}

const who = { userId: 'u1', accessToken: 'at' };

describe('mapping the metric index out of the vocabulary payload', () => {
  it('unions every category and keeps label, family, native contract and legal transforms', async () => {
    // The vocabulary narrows `metrics` by category (live, 2026-08-01) — the
    // index is the union, deduplicated.
    const { adapter } = adapterOver((req) => {
      if (req.tool === 'list_strategy_categories') {
        return { categories: [{ category: 'momentum' }, { category: 'price' }] };
      }
      return (req.args as Record<string, unknown>)['category'] === 'momentum'
        ? { metrics: [LIVE_METRIC], templates: [] }
        : { metrics: [LIVE_METRIC, { metric: 'CLOSE', label: 'Close price', family: 'price' }], templates: [] };
    });
    const result = await adapter.listMetrics(who);
    expect(result.kind).toBe('metrics');
    if (result.kind !== 'metrics') return;
    expect(result.metrics.map((m) => m.id)).toEqual(['RSI14', 'CLOSE']);
    expect(result.metrics[0]).toEqual({
      id: 'RSI14',
      label: 'RSI (14)',
      family: 'momentum',
      unit: 'oscillator',
      precision: 1,
      range: [0, 100],
      timeframeMode: 'candle',
      transformIds: ['value', 'trajectory', 'classifyZone', 'spread', 'rank'],
    });
  });

  it('a payload with no metrics is unreadable — the index was being dropped before', async () => {
    const { adapter } = adapterOver((req) =>
      req.tool === 'list_strategy_categories'
        ? { categories: [{ category: 'momentum' }] }
        : { templates: [] },
    );
    expect((await adapter.listMetrics(who)).kind).toBe('unreadable');
  });

  it('a row with no metric key makes the whole read unreadable', async () => {
    const { adapter } = adapterOver((req) =>
      req.tool === 'list_strategy_categories'
        ? { categories: [{ category: 'momentum' }] }
        : { metrics: [LIVE_METRIC, { label: 'ghost' }] },
    );
    expect((await adapter.listMetrics(who)).kind).toBe('unreadable');
  });
});

describe('mapping metric hints', () => {
  it('keeps each transform’s authoring detail in the platform’s words', async () => {
    const { adapter, calls } = adapterOver(() => ({
      metric: {
        ...LIVE_METRIC,
        transforms: [
          {
            id: 'value',
            label: 'Value',
            authoring: {
              parameters: {
                offset: { required: false, defaultValue: 0, description: 'Bars before the latest value.' },
              },
              calculationSummary: 'Select one value at the requested offset.',
              formula: 'output = base[t - offset]',
              nullBehavior: 'Returns null when the requested slot is absent.',
            },
          },
          {
            id: 'spread',
            label: 'Spread vs metric',
            authoring: { parameters: {} },
            operandRequired: true,
            chainSuccessors: ['trajectory', 'aggregate'],
          },
        ],
      },
    }));
    const hints = await adapter.metricHints({ ...who, metric: 'RSI14' });
    expect(hints.summary.id).toBe('RSI14');
    expect(hints.transforms[0]).toEqual({
      id: 'value',
      label: 'Value',
      parameters: [
        { key: 'offset', required: false, defaultValue: '0', description: 'Bars before the latest value.' },
      ],
      calculationSummary: 'Select one value at the requested offset.',
      formula: 'output = base[t - offset]',
      nullBehavior: 'Returns null when the requested slot is absent.',
      operandRequired: false,
      chainSuccessors: [],
    });
    expect(hints.transforms[1]?.operandRequired).toBe(true);
    expect(hints.transforms[1]?.chainSuccessors).toEqual(['trajectory', 'aggregate']);
    expect(calls[0]?.args).toEqual({ metric: 'RSI14' });
  });
});

describe('the column contract check', () => {
  it('a valid column maps its contract, and operands are wrapped the way the schema demands', async () => {
    const { adapter, calls } = adapterOver(() => ({
      contract: {
        normalizedColumn: { metric: 'RSI14', transformId: 'value' },
        effectiveParameters: { offset: 0, window: null },
        outputs: [
          {
            header: 'RSI14',
            outputType: { kind: 'numeric', unit: 'oscillator' },
            nullable: true,
            meaning: 'RSI14: latest value.',
          },
        ],
        calculationSummary: 'Select one value at the requested offset.',
        formula: 'output = RSI14[t - 0]',
        nullBehavior: 'Returns null when the requested slot is absent.',
        timeframe: { requiresSectionTimeframe: true },
        nullSentinel: '—',
      },
    }));
    const outcome = await adapter.columnContract({
      ...who,
      column: {
        metric: 'RSI14',
        transformId: 'spread',
        timeframe: { rel: 'anchor' },
        inputs: ['RSI7'],
      },
    });
    expect(outcome.kind).toBe('contract');
    if (outcome.kind !== 'contract') return;
    expect(outcome.contract.formula).toBe('output = RSI14[t - 0]');
    expect(outcome.contract.outputs[0]?.unit).toBe('oscillator');
    expect(outcome.contract.nullSentinel).toBe('—');
    expect(outcome.contract.requiresSectionTimeframe).toBe(true);
    // The wire shape wraps each operand as {metric} — the schema's demand.
    expect((calls[0]?.args as Record<string, unknown>)['column']).toMatchObject({
      inputs: [{ metric: 'RSI7' }],
    });
  });

  it('the teaching refusal survives with its structure — path, received, allowed domain', async () => {
    const { adapter } = adapterOver(() => {
      throw new ToolRefusedError('get_strategy_column_contract', LIVE_REFUSAL);
    });
    const outcome = await adapter.columnContract({
      ...who,
      column: { metric: 'RSI14', transformId: 'spread', timeframe: { rel: 'anchor' }, inputs: ['CLOSE'] },
    });
    expect(outcome.kind).toBe('refused');
    if (outcome.kind !== 'refused') return;
    expect(outcome.refusal.message).toContain('not a legal relational operand');
    expect(outcome.refusal.authoringCode).toBe('REPORT_COLUMN_OPERAND_UNSUPPORTED');
    expect(outcome.refusal.path).toEqual(['column', 'inputs', 0, 'metric']);
    expect(outcome.refusal.received).toBe('"CLOSE"');
    expect(outcome.refusal.allowedValues).toEqual(['ADX', 'CCI20', 'MFI14', 'RSI7', 'STOCH_D', 'STOCH_K']);
  });

  it('a refusal that is not JSON keeps its text as the message', async () => {
    const { adapter } = adapterOver(() => {
      throw new ToolRefusedError('get_strategy_column_contract', 'the server is on fire');
    });
    const outcome = await adapter.columnContract({
      ...who,
      column: { metric: 'RSI14', transformId: 'value', timeframe: { rel: 'anchor' } },
    });
    expect(outcome.kind).toBe('refused');
    if (outcome.kind !== 'refused') return;
    expect(outcome.refusal.message).toBe('the server is on fire');
    expect(outcome.refusal.allowedValues).toEqual([]);
  });
});

describe('the queries', () => {
  it('the index groups by family; zero metrics is unreadable', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.metrics = [
      aMetric(),
      aMetric({ id: 'CLOSE', label: 'Close price', family: 'price', unit: 'price', range: null }),
      aMetric({ id: 'RSI7', label: 'RSI (7)' }),
    ];
    const result = await new ReadMetricIndexQuery(strategies).execute(who);
    expect(result.kind).toBe('index');
    if (result.kind !== 'index') return;
    expect(result.families.map((f) => f.family)).toEqual(['momentum', 'price']);
    expect(result.families[0]?.metrics.map((m) => m.id)).toEqual(['RSI14', 'RSI7']);

    expect((await new ReadMetricIndexQuery(new FakeStrategiesPort()).execute(who)).kind).toBe(
      'unreadable',
    );
  });

  it('an unlisted metric is no-such-metric, and neither hints nor controls are asked for it', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.stageMetric(aMetricHints());
    // Membership first: an unlisted key spends nothing, the controls read
    // included — asserted by making that read a failure.
    strategies.columnControls = async () => {
      throw new Error('a controls read was spent on an unlisted metric');
    };
    expect(await new ReadMetricQuery(strategies).execute({ ...who, metric: 'GHOST' })).toEqual({
      kind: 'no-such-metric',
    });
  });

  it('a listed metric answers with its hints and the declared controls together', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.stageMetric(aMetricHints());
    const listed = await new ReadMetricQuery(strategies).execute({ ...who, metric: 'RSI14' });
    expect(listed.kind).toBe('metric');
    if (listed.kind !== 'metric') return;
    // The controls ride the same outcome, so the workbench's selects cannot
    // come from a different platform moment than its card.
    expect(listed.controls).toEqual(strategies.controls);
  });

  it('the check gates on metric membership only — the platform judges the rest', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.stageMetric(aMetricHints());
    const ghost = await new CheckColumnQuery(strategies).execute({
      ...who,
      column: { metric: 'GHOST', transformId: 'value', timeframe: { rel: 'anchor' } },
    });
    expect(ghost).toEqual({ kind: 'no-such-metric' });

    const outcome = await new CheckColumnQuery(strategies).execute({
      ...who,
      column: { metric: 'RSI14', transformId: 'nonsense', timeframe: { rel: 'anchor' } },
    });
    // The fake's default outcome is a refusal — the point is it was *sent*.
    expect(outcome.kind).toBe('refused');
    expect(strategies.calls.some((c) => c.op === 'column-contract')).toBe(true);
  });
});
