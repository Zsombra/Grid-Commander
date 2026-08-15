import { describe, expect, it } from 'vitest';
import { ToolRefusedError } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { PreviewCompositionQuery } from '@/application/use-cases/preview-composition.query.js';
import { mapConditions } from '@/infrastructure/battlegrid/condition-mapper.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import { aDetail, aMembership, aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';

/**
 * Shaped from the live `preview_strategy_report` payload of **2026-08-06**, on
 * v9.0.0.
 *
 * The body is nested under `section`. It used to sit flat beside `sectionKey`,
 * and this fixture carried the flat shape for five days after the platform
 * changed — which is why the preview page rendered five empty sections and
 * every test stayed green. A fixture that outlives its payload proves the
 * mapper against a world that no longer exists.
 */
const LIVE_PREVIEW = {
  renderedSections: [
    {
      sectionKey: 'includePriceAction',
      section: {
        title: 'Price Action',
        text: 'Schema: 1h candles. last: the last traded price (live, not a bar close).',
      },
    },
  ],
  // The v9.0.0 payload. `estimatedTokenCount` is gone as a standalone field —
  // it is `budgetUsage.estimatedTokens` now, used against cap. Observed live on
  // 2026-08-06: `~null tokens (o200k_base) | gauges … estimatedTokens 1767/16000`.
  tokenCountModel: 'o200k_base',
  budgetUsage: {
    sections: { used: 5, cap: 32 },
    sectionColumns: { used: 0, cap: 32 },
    distinctTimeframes: { used: 3, cap: 8 },
    estimatedTokens: { used: 1767, cap: 16000 },
  },
  // Empty because that call sent no conditions — the tool resolves only what it
  // is given, which is why this key read empty for the life of the product.
  conditionOutcomes: [],
};

/**
 * The `conditionOutcomes` row observed live on **2026-08-04**, from the capture
 * recorded in `openspec/backlog/condition-outcomes-are-unrendered.md`.
 *
 * Held apart from `LIVE_PREVIEW` rather than merged into it, because the two
 * were captured on different days against different strategies and a single
 * fixture claiming to be one payload would be a payload nobody saw. Tests that
 * need both spread this over that, and the mapper reads the two keys
 * independently.
 */
const LIVE_CONDITION_OUTCOMES = [
  {
    ticker: 'BTC',
    outcomes: [
      {
        conditionKey: 'ALL_AGREE_UP',
        name: 'Regime, HTF and ADX agree — up',
        outcome: 'FALSE',
        provisional: true,
        counts: null,
        evidence: [
          {
            kind: 'clause',
            sectionKey: 'includeRegimeContext',
            header: 'regTrend_now',
            op: 'is',
            operand: 'ranging',
            literal: 'trending up',
            outcome: 'FALSE',
          },
        ],
      },
    ],
  },
];

/** Berlin's `REGIME_DOWN`, exactly as `get_strategy` sends it (live, 2026-08-04). */
const LIVE_CONDITION = {
  conditionKey: 'REGIME_DOWN',
  name: 'Regime trending down',
  verdict: null,
  definition: {
    kind: 'clause',
    column: { sectionKey: 'includeRegimeContext', header: 'regTrend_now' },
    op: 'is',
    label: 'trending down',
  },
};

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
const SECTIONS = [{ kind: 'platform', sectionKey: 'includeRsi' }];

describe('mapping the preview payload', () => {
  it('keeps the rendered text, the token estimate with its model, and every gauge', async () => {
    const { adapter, calls } = adapterOver(() => LIVE_PREVIEW);
    const outcome = await adapter.previewReport({
      ...who,
      timeframe: '1h',
      sections: SECTIONS,
      coinSelection: { mode: 'ranked', limit: 2 },
    });
    expect(outcome.kind).toBe('preview');
    if (outcome.kind !== 'preview') return;
    expect(outcome.preview.sections[0]?.title).toBe('Price Action');
    expect(outcome.preview.sections[0]?.text).toContain('the last traded price');
    expect(outcome.preview.tokenCountModel).toBe('o200k_base');
    // Gauge names pass through as the platform names them — not enumerated,
    // which is why `estimatedTokens` needed no mapper change when v9 moved it
    // here from a field of its own.
    expect(outcome.preview.budget).toEqual([
      { name: 'sections', used: 5, cap: 32 },
      { name: 'sectionColumns', used: 0, cap: 32 },
      { name: 'distinctTimeframes', used: 3, cap: 8 },
      { name: 'estimatedTokens', used: 1767, cap: 16000 },
    ]);
    // And the cost is a pair, never a bare number: "how much room is left" is
    // the question, and 1767 alone cannot answer it.
    const tokens = outcome.preview.budget.find((g) => g.name === 'estimatedTokens');
    expect(tokens?.cap).toBe(16000);
    expect(calls[0]?.args).toMatchObject({
      timeframe: '1h',
      coinSelection: { mode: 'ranked', limit: 2 },
    });
  });

  it('a refused draft is a result in the platform’s words, not a throw', async () => {
    const { adapter } = adapterOver(() => {
      throw new ToolRefusedError(
        'preview_strategy_report',
        'VALIDATION_ERROR: custom section requires a self-contained definition',
      );
    });
    const outcome = await adapter.previewReport({
      ...who,
      timeframe: '1h',
      sections: SECTIONS,
      coinSelection: { mode: 'explicit', tickers: ['BTC'] },
    });
    expect(outcome.kind).toBe('refused');
    if (outcome.kind !== 'refused') return;
    expect(outcome.reason).toContain('self-contained definition');
  });

  it('reads the resolved conditions the same call returns', async () => {
    const { adapter } = adapterOver(() => ({
      ...LIVE_PREVIEW,
      conditionOutcomes: LIVE_CONDITION_OUTCOMES,
    }));
    const outcome = await adapter.previewReport({
      ...who,
      timeframe: '1h',
      sections: SECTIONS,
      coinSelection: { mode: 'explicit', tickers: ['BTC'] },
      conditions: [LIVE_CONDITION],
    });
    if (outcome.kind !== 'preview') throw new Error(outcome.kind);
    const [btc] = outcome.preview.conditionOutcomes;
    expect(btc?.ticker).toBe('BTC');
    expect(btc?.outcomes[0]?.outcome).toBe('FALSE');
    expect(btc?.outcomes[0]?.provisional).toBe(true);
    const [e] = btc?.outcomes[0]?.evidence ?? [];
    if (e?.kind !== 'clause') throw new Error('the observed evidence is a clause');
    expect(e.operand).toBe('ranging');
    expect(e.literal).toBe('trending up');
  });

  it('sends the strategy’s conditions back whole, because nothing is resolved without them', async () => {
    const { adapter, calls } = adapterOver(() => LIVE_PREVIEW);
    await adapter.previewReport({
      ...who,
      timeframe: '1h',
      sections: SECTIONS,
      coinSelection: { mode: 'ranked', limit: 2 },
      conditions: [LIVE_CONDITION],
    });
    // Byte-for-byte what `get_strategy` sent, not a re-serialisation of the
    // domain shape — which would drop whatever the mapper read as
    // `unrecognised`, in a grammar the platform is still rolling out.
    expect((calls[0]?.args as Record<string, unknown>)['conditions']).toEqual([LIVE_CONDITION]);
  });

  it('a strategy with no conditions sends the payload it always sent', async () => {
    const { adapter, calls } = adapterOver(() => LIVE_PREVIEW);
    await adapter.previewReport({
      ...who,
      timeframe: '1h',
      sections: SECTIONS,
      coinSelection: { mode: 'ranked', limit: 2 },
      conditions: [],
    });
    // The outer object is closed. An argument sent empty is one more key the
    // platform can reject on a call that has worked since v5, so the empty case
    // stays exactly as it was.
    expect(Object.keys(calls[0]?.args as Record<string, unknown>)).not.toContain('conditions');
  });

  it('a section with no key refuses the whole read', async () => {
    const { adapter } = adapterOver(() => ({
      renderedSections: [{ section: { title: 'ghost', text: 'x' } }],
      budgetUsage: {},
    }));
    await expect(
      adapter.previewReport({
        ...who,
        timeframe: '1h',
          sections: SECTIONS,
        coinSelection: { mode: 'ranked', limit: 1 },
      }),
    ).rejects.toThrow('sectionKey');
  });
});

describe('mapping the rule view', () => {
  it('keeps membership, status and the platform default per signal', async () => {
    const { adapter } = adapterOver(() => ({
      rules: [
        { signalId: 'rsi_oversold', inReport: true, status: 'IN_REPORT', reportDefaultAllocation: 2, params: { threshold: 30 } },
        { signalId: 'macd_bull_cross', inReport: false, status: 'NOT_IN_REPORT', reportDefaultAllocation: 0, params: {} },
      ],
    }));
    const rows = await adapter.deriveRuleView({ ...who, sections: SECTIONS });
    expect(rows).toEqual([
      { signalId: 'rsi_oversold', inReport: true, status: 'IN_REPORT', defaultAllocation: 2 },
      { signalId: 'macd_bull_cross', inReport: false, status: 'NOT_IN_REPORT', defaultAllocation: 0 },
    ]);
  });

  it('a payload with no rules array refuses the read', async () => {
    const { adapter } = adapterOver(() => ({}));
    await expect(adapter.deriveRuleView({ ...who, sections: SECTIONS })).rejects.toThrow('rules');
  });
});

describe('the preview query', () => {
  it('reads the strategy fresh and answers with both halves', async () => {
    const summary = aStrategy();
    const strategies = new FakeStrategiesPort([summary]);
    strategies.detail = aDetail(summary);
    strategies.membership = [aMembership(), aMembership({ signalId: 'macd_bull_cross', inReport: false })];
    const result = await new PreviewCompositionQuery(strategies).execute({
      ...who,
      strategyId: summary.id,
      coinSelection: { mode: 'ranked', limit: 3 },
    });
    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') return;
    expect(result.outcome.kind).toBe('preview');
    expect(result.membership).toHaveLength(2);
    const call = strategies.calls.find((c) => c.op === 'preview');
    expect(call?.payload).toMatchObject({ timeframe: '1h', coinSelection: { mode: 'ranked', limit: 3 } });
  });

  it('sends the conditions the strategy holds, so there is something to resolve', async () => {
    const summary = aStrategy();
    const strategies = new FakeStrategiesPort([summary]);
    strategies.detail = { ...aDetail(summary), conditions: mapConditions([LIVE_CONDITION]) };
    strategies.conditionsAsGiven = [LIVE_CONDITION];
    const result = await new PreviewCompositionQuery(strategies).execute({
      ...who,
      strategyId: summary.id,
      coinSelection: { mode: 'ranked', limit: 3 },
    });
    if (result.kind !== 'ready') throw new Error(result.kind);
    const call = strategies.calls.find((c) => c.op === 'preview');
    expect(call?.payload?.['conditions']).toEqual([LIVE_CONDITION]);
    // Carried so the surface can tell "no conditions" apart from "conditions
    // the platform said nothing about" — two empty lists, two different facts.
    expect(result.conditionsDefined).toBe(1);
  });

  it('a strategy with no conditions reports none defined', async () => {
    const summary = aStrategy();
    const strategies = new FakeStrategiesPort([summary]);
    strategies.detail = aDetail(summary);
    const result = await new PreviewCompositionQuery(strategies).execute({
      ...who,
      strategyId: summary.id,
      coinSelection: { mode: 'ranked', limit: 3 },
    });
    if (result.kind !== 'ready') throw new Error(result.kind);
    expect(result.conditionsDefined).toBe(0);
  });

  it('missing and unreadable strategies stay themselves', async () => {
    const strategies = new FakeStrategiesPort();
    expect(
      (await new PreviewCompositionQuery(strategies).execute({
        ...who,
        strategyId: 'ghost',
        coinSelection: { mode: 'ranked', limit: 3 },
      })).kind,
    ).toBe('strategy-missing');
    strategies.detailReadable = false;
    expect(
      (await new PreviewCompositionQuery(strategies).execute({
        ...who,
        strategyId: 's1',
        coinSelection: { mode: 'ranked', limit: 3 },
      })).kind,
    ).toBe('unreadable');
  });
});

describe('a custom table survives the round trip', () => {
  /** Exactly what `get_strategy` returns for a saved custom section (live, 2026-08-01). */
  const LIVE_CUSTOM = {
    kind: 'custom',
    sectionKey: 'custom:8b041f05-4eb8-4ff2-b83a-b89eb8934c8e',
    title: 'Probe Momentum Table',
    timeframe: '1h',
    columns: [
      { metric: 'RSI14', transformId: 'value', timeframe: { rel: 'anchor' } },
      { metric: 'ADX', transformId: 'value', timeframe: { rel: 'anchor' } },
    ],
  };

  it('the mapper keeps the definition, not just the key', async () => {
    const { adapter } = adapterOver(() => ({
      strategy: {
        id: 's1',
        revision: 2,
        name: 'Fork',
        scope: 'PRIVATE',
        isActive: true,
        boundAgentCount: 0,
        sections: [LIVE_CUSTOM, { kind: 'platform', sectionKey: 'includeRsi' }],
        signalRules: [],
      },
    }));
    const read = await adapter.readStrategy({ ...who, strategyId: 's1' });
    if (read.kind !== 'strategy') throw new Error(read.kind);
    const [custom, platform] = read.detail.sections;
    expect(custom?.title).toBe('Probe Momentum Table');
    expect(custom?.timeframe).toBe('1h');
    expect(custom?.columns).toHaveLength(2);
    // A platform section is fully named by its key and carries nothing else.
    expect(platform?.title).toBeUndefined();
    expect(platform?.columns).toBeUndefined();
  });

  it('the conditions are kept whole too, unread, for the same reason', async () => {
    // A form the mapper reports as `unrecognised` still has to go back to the
    // platform exactly as it came, or previewing a strategy would silently
    // resolve fewer rules than the strategy has.
    const UNMODELLED = { conditionKey: 'FUTURE', name: 'Future', verdict: 'UP', definition: { kind: 'somethingNew' } };
    const { adapter } = adapterOver(() => ({
      strategy: {
        id: 's1',
        revision: 2,
        name: 'Berlin',
        scope: 'SYSTEM',
        isActive: true,
        boundAgentCount: 0,
        sections: [],
        signalRules: [],
        conditions: [LIVE_CONDITION, UNMODELLED],
      },
    }));
    const read = await adapter.readStrategy({ ...who, strategyId: 's1' });
    if (read.kind !== 'strategy') throw new Error(read.kind);
    expect(read.conditionsAsGiven).toEqual([LIVE_CONDITION, UNMODELLED]);
    // And the read-for-rendering copy still reports the form it cannot model,
    // rather than the two copies quietly agreeing to drop it.
    expect(read.detail.conditions[1]?.definition.kind).toBe('unrecognised');
  });

  it('the preview sends a custom table back whole — a key alone is refused', async () => {
    const { adapter, calls } = adapterOver(() => LIVE_PREVIEW);
    await adapter.previewReport({
      ...who,
      timeframe: '1h',
      sections: [
        {
          kind: 'custom',
          sectionKey: LIVE_CUSTOM.sectionKey,
          title: LIVE_CUSTOM.title,
          timeframe: LIVE_CUSTOM.timeframe,
          columns: LIVE_CUSTOM.columns,
        },
        { kind: 'platform', sectionKey: 'includeRsi' },
      ],
      coinSelection: { mode: 'ranked', limit: 1 },
    });
    const sent = (calls[0]?.args as Record<string, unknown>)['sections'] as Record<string, unknown>[];
    expect(sent[0]).toEqual(LIVE_CUSTOM);
    expect(sent[1]).toEqual({ kind: 'platform', sectionKey: 'includeRsi' });
  });
});
