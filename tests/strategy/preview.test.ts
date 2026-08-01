import { describe, expect, it } from 'vitest';
import { ToolRefusedError } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { PreviewCompositionQuery } from '@/application/use-cases/preview-composition.query.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import { aDetail, aMembership, aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';

/** Shaped from the live `preview_strategy_report` payload of 2026-08-01. */
const LIVE_PREVIEW = {
  renderedSections: [
    {
      sectionKey: 'includePriceAction',
      title: 'Price Action',
      text: 'Schema: 1h candles. last: the last traded price (live, not a bar close).',
    },
  ],
  estimatedTokenCount: 1393,
  tokenCountModel: 'o200k_base',
  budgetUsage: {
    sections: { used: 5, cap: 32 },
    sectionColumns: { used: 0, cap: 32 },
    distinctTimeframes: { used: 3, cap: 8 },
  },
  conditionOutcomes: [],
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
      regimeAutoDerive: true,
      sections: SECTIONS,
      coinSelection: { mode: 'ranked', limit: 2 },
    });
    expect(outcome.kind).toBe('preview');
    if (outcome.kind !== 'preview') return;
    expect(outcome.preview.sections[0]?.title).toBe('Price Action');
    expect(outcome.preview.sections[0]?.text).toContain('the last traded price');
    expect(outcome.preview.estimatedTokenCount).toBe(1393);
    expect(outcome.preview.tokenCountModel).toBe('o200k_base');
    // Gauge names pass through as the platform names them — not enumerated.
    expect(outcome.preview.budget).toEqual([
      { name: 'sections', used: 5, cap: 32 },
      { name: 'sectionColumns', used: 0, cap: 32 },
      { name: 'distinctTimeframes', used: 3, cap: 8 },
    ]);
    expect(calls[0]?.args).toMatchObject({
      timeframe: '1h',
      regimeAutoDerive: true,
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
      regimeAutoDerive: false,
      sections: SECTIONS,
      coinSelection: { mode: 'explicit', tickers: ['BTC'] },
    });
    expect(outcome.kind).toBe('refused');
    if (outcome.kind !== 'refused') return;
    expect(outcome.reason).toContain('self-contained definition');
  });

  it('a section with no key refuses the whole read', async () => {
    const { adapter } = adapterOver(() => ({
      renderedSections: [{ title: 'ghost' }],
      budgetUsage: {},
    }));
    await expect(
      adapter.previewReport({
        ...who,
        timeframe: '1h',
        regimeAutoDerive: false,
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
