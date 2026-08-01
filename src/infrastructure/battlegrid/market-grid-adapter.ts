import type {
  ArenaListResult,
  GridResultsOutcome,
  GridSessionDetail,
  MarketGridPort,
} from '@/ports/market-grid.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';
import { ToolRefusedError } from './mcp-adapter.js';
import { unreadable } from './unreadable.js';

/**
 * The Market Grid module, read side only — mapped against the shapes
 * observed live 2026-08-01 (recorded in
 * `openspec/backlog/market-grid-is-an-unmodelled-module.md`).
 *
 * Two platform behaviors this file encodes rather than trips over:
 * a results request before settlement is refused with a CONFLICT that means
 * "not yet" (a state, not an error), and `get_market_grid_player_grid`
 * answers a **500** for "you have not played" — so the played fact comes
 * only from `check_market_grid_submission`, and the player-grid tool is not
 * called at all.
 */
const TOOLS = {
  list: 'list_market_grid_sessions',
  detail: 'get_market_grid_session',
  submitted: 'check_market_grid_submission',
  results: 'get_market_grid_results',
} as const;

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

export class McpMarketGridAdapter implements MarketGridPort {
  constructor(private readonly battlegrid: BattleGridPort) {}

  async listSessions(params: { userId: string; accessToken: string }): Promise<ArenaListResult> {
    try {
      const result = await this.battlegrid.callTool({
        userId: params.userId,
        accessToken: params.accessToken,
        tool: TOOLS.list,
        args: {},
      });
      const raw = (result.content as Record<string, unknown>)['sessions'];
      if (!Array.isArray(raw)) throw new GridPayloadError('sessions');
      return {
        kind: 'sessions',
        sessions: raw.map((entry: unknown) => {
          const s = (entry ?? {}) as Record<string, unknown>;
          const id = str(s['sessionId']);
          const name = str(s['displayName']);
          // A dropped row would render as "no such session" — refuse the read
          // instead, the same rule the radar mapper follows.
          if (!id) throw new GridPayloadError('sessionId');
          const pool = Array.isArray(s['coinPoolPreview']) ? s['coinPoolPreview'] : [];
          return {
            id,
            name: name ?? id,
            coinTickers: pool
              .map((c: unknown) => str(((c ?? {}) as Record<string, unknown>)['ticker']))
              .filter((t): t is string => t !== null),
          };
        }),
      };
    } catch (err) {
      return unreadable(err);
    }
  }

  async sessionDetail(params: {
    userId: string;
    accessToken: string;
    sessionId: string;
  }): Promise<GridSessionDetail> {
    const result = await this.battlegrid.callTool({
      userId: params.userId,
      accessToken: params.accessToken,
      tool: TOOLS.detail,
      args: { sessionId: params.sessionId },
    });
    const p = result.content as Record<string, unknown>;
    const id = str(p['id']);
    const status = str(p['status']);
    if (!id || !status) throw new GridPayloadError(!id ? 'id' : 'status');
    return {
      id,
      name: str(p['displayName']) ?? id,
      status,
      lockAt: str(p['lockAt']),
      settleAt: str(p['settleAt']),
      playerCount: typeof p['playerCount'] === 'number' ? p['playerCount'] : null,
    };
  }

  async hasSubmitted(params: {
    userId: string;
    accessToken: string;
    sessionId: string;
  }): Promise<boolean> {
    const result = await this.battlegrid.callTool({
      userId: params.userId,
      accessToken: params.accessToken,
      tool: TOOLS.submitted,
      args: { sessionId: params.sessionId },
    });
    return (result.content as Record<string, unknown>)['hasSubmitted'] === true;
  }

  async results(params: {
    userId: string;
    accessToken: string;
    sessionId: string;
  }): Promise<GridResultsOutcome> {
    try {
      const result = await this.battlegrid.callTool({
        userId: params.userId,
        accessToken: params.accessToken,
        tool: TOOLS.results,
        args: { sessionId: params.sessionId },
      });
      return { kind: 'settled', payload: result.content as Record<string, unknown> };
    } catch (err) {
      // "Results are published after the session settles" arrives as a
      // CONFLICT refusal. That is the not-settled state, not a failure —
      // observed live 2026-08-01. Anything else stays an error.
      if (
        err instanceof ToolRefusedError &&
        (err.code === 'CONFLICT' || /not available yet/i.test(err.message))
      ) {
        return { kind: 'not-settled' };
      }
      throw err;
    }
  }
}

export class GridPayloadError extends Error {
  constructor(field: string) {
    super(`BattleGrid returned a Market Grid payload with no usable "${field}"`);
  }
}
