import type { RegimePoint, RegimeSnapshot } from '@/domain/recording/regime.js';
import type {
  CoinSignalPreviewResult,
  MarketPort,
  RankedCoinsResult,
  RankingVocabulary,
  RegimeHistoryResult,
  RegimeSnapshotResult,
} from '@/ports/market.js';
import { mapRankedCoin } from './agent-mapper.js';
import type { McpBattleGridAdapter } from './mcp-adapter.js';
import { mapSignalPreview, UnmappablePreviewError } from './signal-preview-mapper.js';
import { malformed, messageOf, unreadable } from './unreadable.js';

/**
 * Market data that belongs to nobody's agent.
 *
 * Four tools: `get_top_ranked_coins`, a read with no account scope that
 * answers the same list for every caller; `get_coin_signal_preview`, the
 * unweighted signal layer for one coin — what the recorder captures; and the
 * regime pair, `get_regime_snapshot` / `get_regime_history` — the platform's
 * own classification of what the market is doing, the same answer for every
 * account. None is about an agent, which is what earns them this port.
 */
const TOOLS = {
  ranked: 'get_top_ranked_coins',
  signalPreview: 'get_coin_signal_preview',
  regimeSnapshot: 'get_regime_snapshot',
  regimeHistory: 'get_regime_history',
} as const;

export class McpMarketAdapter implements MarketPort {
  constructor(private readonly battlegrid: McpBattleGridAdapter) {}

  async topRankedCoins(params: {
    userId: string;
    accessToken: string;
    metric: string;
    interval: string;
    limit?: number | undefined;
  }): Promise<RankedCoinsResult> {
    let payload: Record<string, unknown>;
    try {
      const result = await this.battlegrid.callTool({
        userId: params.userId,
        accessToken: params.accessToken,
        tool: TOOLS.ranked,
        args: {
          metric: params.metric,
          interval: params.interval,
          ...(params.limit === undefined ? {} : { limit: params.limit }),
        },
      });
      payload = result.content as Record<string, unknown>;
    } catch (err) {
      return unreadable(err);
    }
    const raw = payload['coins'];
    // A ranking that did not arrive is not a market in which nothing ranks.
    if (!Array.isArray(raw)) return malformed('the ranking carried no coins');
    if (raw.length === 0) return { kind: 'none' };
    try {
      return { kind: 'coins', coins: raw.map(mapRankedCoin) };
    } catch (err) {
      return malformed(messageOf(err));
    }
  }

  async coinSignalPreview(params: {
    userId: string;
    accessToken: string;
    ticker: string;
    interval: string;
  }): Promise<CoinSignalPreviewResult> {
    let payload: Readonly<Record<string, unknown>>;
    try {
      const result = await this.battlegrid.callTool({
        userId: params.userId,
        accessToken: params.accessToken,
        tool: TOOLS.signalPreview,
        // No agentId, ever: the unweighted preview is the record.
        args: { ticker: params.ticker, interval: params.interval },
      });
      payload = result.content as Readonly<Record<string, unknown>>;
    } catch (err) {
      return unreadable(err);
    }
    try {
      return { kind: 'preview', preview: mapSignalPreview(payload) };
    } catch (err) {
      // The answer arrived and could not be read. It rides along raw so the
      // recorder keeps it — this failure is exactly the kind a later mapper
      // improvement can recover, but only if the answer survives today.
      if (err instanceof UnmappablePreviewError) {
        return { ...malformed(err.message), raw: payload };
      }
      return { ...malformed(messageOf(err)), raw: payload };
    }
  }

  async platformVersion(params: { accessToken: string }): Promise<string | null> {
    return (await this.battlegrid.serverVersion?.(params.accessToken)) ?? null;
  }

  async regimeHistory(params: {
    userId: string;
    accessToken: string;
    symbol: string;
    timeframe: string;
  }): Promise<RegimeHistoryResult> {
    let payload: Record<string, unknown>;
    try {
      // The deepest look-back the declaration offers, read at call time —
      // never a compiled-in constant of the platform's contract. When the
      // declaration cannot answer, `bars` is omitted and the platform's own
      // default applies; whether the answer reaches a caller's window is
      // derived downstream from the points themselves and said out loud.
      const bars = await this.regimeLookback(params.accessToken);
      const result = await this.battlegrid.callTool({
        userId: params.userId,
        accessToken: params.accessToken,
        tool: TOOLS.regimeHistory,
        args: {
          symbol: params.symbol,
          timeframe: params.timeframe,
          ...(bars === null ? {} : { bars }),
        },
      });
      payload = result.content as Record<string, unknown>;
    } catch (err) {
      return unreadable(err);
    }
    const raw = payload['points'];
    if (!Array.isArray(raw)) return malformed('the regime history carried no points');
    // Zero points is the platform's own stated answer for a cold cache or an
    // un-enriched timeframe — an empty history, not a broken one.
    if (raw.length === 0) return { kind: 'none' };
    const points = raw.map(mapRegimePoint).filter((p): p is RegimePoint => p !== null);
    if (points.length === 0) return malformed('no regime point carried a timestamp and a regime');
    return { kind: 'history', points, droppedPoints: raw.length - points.length };
  }

  async regimeSnapshot(params: {
    userId: string;
    accessToken: string;
    symbol: string;
    timeframe: string;
  }): Promise<RegimeSnapshotResult> {
    let payload: Record<string, unknown>;
    try {
      const result = await this.battlegrid.callTool({
        userId: params.userId,
        accessToken: params.accessToken,
        tool: TOOLS.regimeSnapshot,
        args: { symbol: params.symbol, timeframe: params.timeframe },
      });
      payload = result.content as Record<string, unknown>;
    } catch (err) {
      return unreadable(err);
    }
    const raw = payload['snapshot'];
    // `snapshot: null` observed live (2026-08-15): no regime classified for
    // that coin and timeframe. An answer, emphatically not a failure.
    if (raw === null || raw === undefined) return { kind: 'unclassified' };
    const snapshot = mapRegimeSnapshot(raw);
    if (snapshot === null) return malformed('the regime snapshot carried no regime');
    return { kind: 'snapshot', snapshot };
  }

  /**
   * The deepest `bars` the history tool declares it accepts, out of the
   * discovered schema — the same runtime-read discipline as
   * `rankingVocabulary`, for the same reason. Null when the declaration
   * cannot answer, and the caller omits the argument rather than inventing
   * a depth.
   */
  private async regimeLookback(accessToken: string): Promise<number | null> {
    const tools = await this.battlegrid.discoverTools(accessToken);
    const history = tools.find((t) => t.name === TOOLS.regimeHistory);
    const schema = (history?.inputSchema ?? {}) as Record<string, unknown>;
    const props = (schema['properties'] ?? {}) as Record<string, unknown>;
    const bars = (props['bars'] ?? {}) as Record<string, unknown>;
    const max = bars['maximum'];
    return typeof max === 'number' && Number.isFinite(max) && max > 0 ? max : null;
  }

  /**
   * The `metric` and `interval` enums out of the discovered schema, exactly as
   * `RadarPort.deploymentTimeframes` reads its own.
   *
   * Empty when the declaration cannot answer, and the caller stops rather than
   * sending a value it invented — which the platform would refuse anyway, one
   * round trip later and with a worse message.
   */
  async rankingVocabulary(params: {
    userId: string;
    accessToken: string;
  }): Promise<RankingVocabulary> {
    const tools = await this.battlegrid.discoverTools(params.accessToken);
    const ranked = tools.find((t) => t.name === TOOLS.ranked);
    const schema = (ranked?.inputSchema ?? {}) as Record<string, unknown>;
    const props = (schema['properties'] ?? {}) as Record<string, unknown>;
    const enumOf = (key: string): readonly string[] => {
      const field = (props[key] ?? {}) as Record<string, unknown>;
      const values = field['enum'];
      return Array.isArray(values) ? values.filter((v): v is string => typeof v === 'string') : [];
    };
    return { metrics: enumOf('metric'), intervals: enumOf('interval') };
  }
}

/**
 * One history row, from the shape observed live (2026-08-15, v18.2.0):
 * `{timestamp: epoch-ms int, regime: str, conviction: str}`. A row without a
 * placeable time or a regime label is dropped and counted by the caller —
 * null-and-filter, never an invented bar.
 */
function mapRegimePoint(raw: unknown): RegimePoint | null {
  const row = obj(raw);
  const at = epochMs(row['timestamp']);
  const regime = str(row['regime']);
  if (at === null || regime === null) return null;
  return { at, regime, conviction: str(row['conviction']) };
}

/**
 * The snapshot, from the observed shape: regime + conviction +
 * regimeRunLengthBars + a `context` block. Every scalar string axis of the
 * context travels as an `{axis, value}` pair, names verbatim — the observed
 * three (trend, volatility, momentum) today, whatever the platform states
 * tomorrow. The trajectories and price-position arrays stay unmapped on
 * purpose — this surface renders the current state, and an unread field
 * here is re-readable on the next call, unlike the recorder's raw answers
 * nothing else keeps.
 */
function mapRegimeSnapshot(raw: unknown): RegimeSnapshot | null {
  const s = obj(raw);
  const regime = str(s['regime']);
  if (regime === null) return null;
  const bars = s['regimeRunLengthBars'];
  const axes: { axis: string; value: string }[] = [];
  for (const [axis, v] of Object.entries(obj(s['context']))) {
    const value = str(v);
    if (value !== null) axes.push({ axis, value });
  }
  return {
    regime,
    conviction: str(s['conviction']),
    runLengthBars: typeof bars === 'number' && Number.isFinite(bars) ? bars : null,
    axes,
  };
}

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const obj = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const epochMs = (v: unknown): Date | null =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? new Date(v) : null;
