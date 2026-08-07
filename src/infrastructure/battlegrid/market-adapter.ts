import type {
  CoinSignalPreviewResult,
  MarketPort,
  RankedCoinsResult,
  RankingVocabulary,
} from '@/ports/market.js';
import { mapRankedCoin } from './agent-mapper.js';
import type { McpBattleGridAdapter } from './mcp-adapter.js';
import { mapSignalPreview, UnmappablePreviewError } from './signal-preview-mapper.js';
import { malformed, messageOf, unreadable } from './unreadable.js';

/**
 * Market data that belongs to nobody's agent.
 *
 * Two tools: `get_top_ranked_coins`, a read with no account scope that
 * answers the same list for every caller, and `get_coin_signal_preview`, the
 * unweighted signal layer for one coin — what the recorder captures. Neither
 * is about an agent, which is what earns them this port.
 */
const TOOLS = {
  ranked: 'get_top_ranked_coins',
  signalPreview: 'get_coin_signal_preview',
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
