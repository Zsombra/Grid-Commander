import { describe, expect, it } from 'vitest';
import { ConnectionRevokedError } from '@/domain/errors.js';
import { McpMarketAdapter } from '@/infrastructure/battlegrid/market-adapter.js';
import type { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';

/**
 * The regime pair, mapped against the shapes observed live on 2026-08-15 at
 * v18.2.0 — a BTC 1h snapshot with its whole context block, a 1h history
 * series, and the one null snapshot ever seen (an unknown ticker).
 */

/** Live `get_regime_snapshot`, verbatim in shape. */
const LIVE_SNAPSHOT = {
  symbol: 'BTC',
  timeframe: '1h',
  snapshot: {
    regime: 'bear_ranging',
    conviction: 'medium',
    regimeRunLengthBars: 15,
    context: {
      trend: 'ranging',
      volatility: 'normal',
      momentum: 'bullish',
      trendTrajectory: { t3: 'ranging', t2: 'ranging', t1: 'ranging', now: 'ranging', trend: 'flat' },
      volatilityTrajectory: { t3: 'normal', t2: 'normal', t1: 'normal', now: 'normal', trend: 'flat' },
      momentumTrajectory: { t3: 'neutral', t2: 'bullish', t1: 'bullish', now: 'bullish', trend: 'rising' },
      structuralBias: null,
      pricePosition: ['below', 'below', 'below', 'below'],
    },
  },
};

/** Live `get_regime_history`, three of the 72 points observed. */
const LIVE_HISTORY = {
  symbol: 'BTC',
  timeframe: '1h',
  points: [
    { timestamp: 1786536000000, regime: 'bull_ranging', conviction: 'medium' },
    { timestamp: 1786539600000, regime: 'bear_ranging', conviction: 'medium' },
    { timestamp: 1786712400000, regime: 'bear_expansion', conviction: 'medium' },
  ],
};

function adapterOver(
  respond: (tool: string) => unknown,
  opts: { barsMax?: number | undefined } = {},
) {
  const calls: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const battlegrid = {
    callTool: async (req: { tool: string; args: Record<string, unknown> }) => {
      calls.push({ tool: req.tool, args: req.args });
      return { content: respond(req.tool) as Record<string, unknown> };
    },
    discoverTools: async () => [
      {
        name: 'get_regime_history',
        inputSchema: {
          properties: {
            bars: opts.barsMax === undefined ? {} : { maximum: opts.barsMax },
          },
        },
      },
    ],
  } as unknown as McpBattleGridAdapter;
  return { adapter: new McpMarketAdapter(battlegrid), calls };
}

const who = { userId: 'u-1', accessToken: 't', symbol: 'BTC', timeframe: '1h' };

describe('the regime history read', () => {
  it('maps the observed points and asks at the declared maximum depth', async () => {
    const { adapter, calls } = adapterOver(() => LIVE_HISTORY, { barsMax: 500 });
    const r = await adapter.regimeHistory(who);
    if (r.kind !== 'history') throw new Error(r.kind);
    expect(r.points).toHaveLength(3);
    expect(r.points[0]).toEqual({
      at: new Date(1786536000000),
      regime: 'bull_ranging',
      conviction: 'medium',
    });
    expect(r.droppedPoints).toBe(0);
    // The look-back came from the declaration, not from a constant.
    expect(calls[0]?.args).toEqual({ symbol: 'BTC', timeframe: '1h', bars: 500 });
  });

  it('omits bars when the declaration cannot answer', async () => {
    const { adapter, calls } = adapterOver(() => LIVE_HISTORY);
    await adapter.regimeHistory(who);
    expect(calls[0]?.args).toEqual({ symbol: 'BTC', timeframe: '1h' });
  });

  it('reads zero points as the platform’s own empty answer', async () => {
    const { adapter } = adapterOver(() => ({ symbol: 'BTC', timeframe: '1h', points: [] }));
    expect(await adapter.regimeHistory(who)).toEqual({ kind: 'none' });
  });

  it('drops a row without a timestamp or regime, and counts it', async () => {
    const { adapter } = adapterOver(() => ({
      points: [
        { timestamp: 1786536000000, regime: 'bull_ranging', conviction: 'medium' },
        { regime: 'no_time' },
        { timestamp: 1786539600000 },
      ],
    }));
    const r = await adapter.regimeHistory(who);
    if (r.kind !== 'history') throw new Error(r.kind);
    expect(r.points).toHaveLength(1);
    expect(r.droppedPoints).toBe(2);
  });

  it('an answer with no usable point at all is unreadable, not empty', async () => {
    const { adapter } = adapterOver(() => ({ points: [{ note: 'nothing usable' }] }));
    const r = await adapter.regimeHistory(who);
    expect(r.kind).toBe('unreadable');
  });

  it('a missing points array is unreadable, not an empty market', async () => {
    const { adapter } = adapterOver(() => ({ symbol: 'BTC' }));
    const r = await adapter.regimeHistory(who);
    if (r.kind !== 'unreadable') throw new Error(r.kind);
    expect(r.cause).toBe('unreachable');
  });

  it('classifies a revoked connection as refused', async () => {
    const { adapter } = adapterOver(() => {
      throw new ConnectionRevokedError('reconnect');
    });
    const r = await adapter.regimeHistory(who);
    if (r.kind !== 'unreadable') throw new Error(r.kind);
    expect(r.cause).toBe('refused');
  });
});

describe('the regime snapshot read', () => {
  it('maps the observed shape, every scalar context axis verbatim', async () => {
    const { adapter } = adapterOver(() => LIVE_SNAPSHOT);
    const r = await adapter.regimeSnapshot(who);
    if (r.kind !== 'snapshot') throw new Error(r.kind);
    expect(r.snapshot).toEqual({
      regime: 'bear_ranging',
      conviction: 'medium',
      runLengthBars: 15,
      // The scalar axes only — the trajectories and price positions stay
      // unmapped, and a null structuralBias is not an axis the platform
      // stated. The names come from the payload, not from this product.
      axes: [
        { axis: 'trend', value: 'ranging' },
        { axis: 'volatility', value: 'normal' },
        { axis: 'momentum', value: 'bullish' },
      ],
    });
  });

  it('carries an axis this product has never seen', async () => {
    const { adapter } = adapterOver(() => ({
      snapshot: { regime: 'bull_expansion', context: { liquidity_v19: 'thin' } },
    }));
    const r = await adapter.regimeSnapshot(who);
    if (r.kind !== 'snapshot') throw new Error(r.kind);
    expect(r.snapshot.axes).toEqual([{ axis: 'liquidity_v19', value: 'thin' }]);
  });

  it('reads a null snapshot as unclassified — an answer, not a failure', async () => {
    // Observed live: an unknown ticker answers { snapshot: null }.
    const { adapter } = adapterOver(() => ({ symbol: 'ZZZZ', timeframe: '4h', snapshot: null }));
    expect(await adapter.regimeSnapshot(who)).toEqual({ kind: 'unclassified' });
  });

  it('a snapshot without a regime is unreadable, not unclassified', async () => {
    const { adapter } = adapterOver(() => ({ snapshot: { conviction: 'medium' } }));
    const r = await adapter.regimeSnapshot(who);
    expect(r.kind).toBe('unreadable');
  });

  it('keeps what the platform did not say as null or absent, never invented', async () => {
    const { adapter } = adapterOver(() => ({ snapshot: { regime: 'bull_expansion' } }));
    const r = await adapter.regimeSnapshot(who);
    if (r.kind !== 'snapshot') throw new Error(r.kind);
    expect(r.snapshot).toEqual({
      regime: 'bull_expansion',
      conviction: null,
      runLengthBars: null,
      axes: [],
    });
  });
});
