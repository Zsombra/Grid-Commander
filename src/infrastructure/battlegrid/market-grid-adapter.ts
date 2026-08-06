import type {
  ArenaListResult,
  GamePreset,
  GameRulesResult,
  GridResultsOutcome,
  GridDetailResult,
  GridSubmissionResult,
  MarketGridPort,
} from '@/ports/market-grid.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';
import { ToolRefusedError } from './mcp-adapter.js';
import { malformed, unreadable } from './unreadable.js';

/**
 * The Market Grid module, read side only — mapped against the shapes
 * observed live 2026-08-01 (recorded in
 * `openspec/backlog/market-grid-is-an-unmodelled-module.md`) and re-probed
 * 2026-08-06 into `docs/battlegrid-mcp-surface.json`, which is where the
 * session-summary and preset fields below come from.
 *
 * Two platform behaviors this file encodes rather than trips over:
 * a results request before settlement is refused with a CONFLICT that means
 * "not yet" (a state, not an error), and `get_market_grid_player_grid`
 * answers a **500** for "you have not played" — so the played fact comes
 * only from `check_market_grid_submission`, and the player-grid tool is not
 * called at all.
 *
 * **Only observed fields are mapped.** The session summary also carries a
 * crowd consensus (`crowdUpPercent`, `crowdDownPercent`) and a pick roster
 * (`coinPicks.top`) that have only ever answered null and empty, and the
 * settled results payload has never been seen at all. None of them is
 * modelled here — see
 * `openspec/backlog/market-grid-payloads-that-only-fill-once-someone-plays.md`.
 */
const TOOLS = {
  list: 'list_market_grid_sessions',
  presets: 'list_game_presets',
  detail: 'get_market_grid_session',
  submitted: 'check_market_grid_submission',
  results: 'get_market_grid_results',
} as const;

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

/**
 * A number, or null for anything that is not one.
 *
 * An entry fee falling back to 0 would say the game is free, which is the
 * most expensive thing this particular surface could get wrong.
 */
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** A flag the platform set, never one it merely failed to mention. */
const flag = (v: unknown): boolean => v === true;

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
          // `sessionId` here, `id` on the detail payload — the same session
          // under two names, which is exactly the shape that gets a mapper
          // reading one level too shallow. Both are read explicitly, in the
          // method that meets each payload, and neither key is assumed of the
          // other.
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
            // The price, and what it buys. All five came back populated on
            // every one of the 50 sessions the list returned (2026-08-06), and
            // all five are carried nullable anyway: a missing fee is unknown,
            // never free.
            entryFee: num(s['entryFee']),
            prizePool: num(s['totalPrizePool']),
            minimumPlayers: num(s['minimumPlayers']),
            playersNeeded: num(s['playersNeeded']),
            timeRangeKey: str(s['timeRangeKey']),
            // The schedule, which this row has always carried. The arena used
            // to fetch these four with one `get_market_grid_session` per listed
            // session — fifty calls, and the fan-out where `all-controllers-
            // probe` met HTTP 429 — then rendered "this session's schedule
            // could not be read" for any that failed, while the answer sat in
            // this payload.
            //
            // Redundant is measured, not assumed: both reads were taken for
            // session 9954544c on 2026-08-06 22:00Z and all four fields came
            // back byte-identical (`"PENDING"`, the two ISO instants, `0`).
            // Nullable regardless — a status nobody sent is not a state to put
            // a session in.
            status: str(s['status']),
            lockAt: str(s['lockAt']),
            settleAt: str(s['settleAt']),
            playerCount: num(s['playerCount']),
          };
        }),
      };
    } catch (err) {
      return unreadable(err);
    }
  }

  async gameRules(params: { userId: string; accessToken: string }): Promise<GameRulesResult> {
    try {
      const result = await this.battlegrid.callTool({
        userId: params.userId,
        accessToken: params.accessToken,
        tool: TOOLS.presets,
        args: {},
      });
      const raw = (result.content as Record<string, unknown>)['presets'];
      if (!Array.isArray(raw)) throw new GridPayloadError('presets');
      // Dropped rather than refused is wrong here: a rulebook missing the one
      // preset the session in front of you was dealt from reads as a complete
      // rulebook. Three presets came back on 2026-08-06 — small enough that
      // "some of the rules" is never the useful answer.
      return { kind: 'rules', presets: raw.map(mapPreset) };
    } catch (err) {
      return unreadable(err);
    }
  }

  async sessionDetail(params: {
    userId: string;
    accessToken: string;
    sessionId: string;
  }): Promise<GridDetailResult> {
    // Guarded like every other read here. It was not, and one rate-limited
    // session took the whole arena down as a 500 — the outcome the three-state
    // result exists to make unrepresentable. The arena no longer calls this at
    // all (the schedule is on the list row above); one session opened on its
    // own does, once.
    try {
      const result = await this.battlegrid.callTool({
        userId: params.userId,
        accessToken: params.accessToken,
        tool: TOOLS.detail,
        args: { sessionId: params.sessionId },
      });
      const p = result.content as Record<string, unknown>;
      const id = str(p['id']);
      const status = str(p['status']);
      if (!id || !status) return malformed(new GridPayloadError(!id ? 'id' : 'status').message);
      return {
        kind: 'detail',
        detail: {
          id,
          name: str(p['displayName']) ?? id,
          status,
          lockAt: str(p['lockAt']),
          settleAt: str(p['settleAt']),
          playerCount: typeof p['playerCount'] === 'number' ? p['playerCount'] : null,
        },
      };
    } catch (err) {
      return unreadable(err);
    }
  }

  async hasSubmitted(params: {
    userId: string;
    accessToken: string;
    sessionId: string;
  }): Promise<GridSubmissionResult> {
    try {
      const result = await this.battlegrid.callTool({
        userId: params.userId,
        accessToken: params.accessToken,
        tool: TOOLS.submitted,
        args: { sessionId: params.sessionId },
      });
      return {
        kind: 'submission',
        entered: (result.content as Record<string, unknown>)['hasSubmitted'] === true,
      };
    } catch (err) {
      // Emphatically not `false`. "Has not entered" is a claim; this is the
      // absence of one.
      return unreadable(err);
    }
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
      // Opaque on purpose: no settled session has ever been read on this
      // account, so there is no observed shape to map and the declaration is
      // not one. The surface says results were published and that it does not
      // read them, which is the whole truth available.
      return { kind: 'settled', payloadUnmodelled: result.content as Record<string, unknown> };
    } catch (err) {
      // "Results are published after the session settles" arrives as a
      // CONFLICT refusal. That is the not-settled state, not a failure —
      // observed live 2026-08-01.
      if (
        err instanceof ToolRefusedError &&
        (err.code === 'CONFLICT' || /not available yet/i.test(err.message))
      ) {
        return { kind: 'not-settled' };
      }
      // Anything else is a failed read, and it is *not* not-settled: telling a
      // player their session has not settled when the platform never answered
      // is the same false claim as an unread submission check rendered as
      // "you did not enter". This used to throw, which was safe only while
      // nothing called it; a session page calls it now.
      return unreadable(err);
    }
  }
}

/**
 * One preset, from the shape observed 2026-08-06.
 *
 * Every field here came back populated on all three presets. The ones left
 * out — fee split, payout bands, jackpot highlight table, war bond, host,
 * badge art, distribution curve — are real and unrendered, which is a reason
 * not to map them rather than a reason to.
 */
function mapPreset(entry: unknown): GamePreset {
  const p = (entry ?? {}) as Record<string, unknown>;
  const id = str(p['id']);
  const gameType = str(p['gameType']);
  // Two refusals rather than two fallbacks. A rule with no identity cannot be
  // shown beside the sessions it governs, and a rule that does not say which
  // game it belongs to would be rendered on a page about one particular game —
  // the same reason `sessionDetail` refuses a session with no status instead
  // of inventing one.
  if (!id) throw new GridPayloadError('id');
  if (!gameType) throw new GridPayloadError('gameType');
  return {
    id,
    name: str(p['displayName']) ?? id,
    gameType,
    timeRangeKey: str(p['timeRangeKey']),
    gridRows: num(p['gridRows']),
    gridCols: num(p['gridCols']),
    coinsPerGame: num(p['gridSize']),
    entryFee: num(p['entryFee']),
    changeMultiplier: num(p['changeMultiplier']),
    captainMultiplier: num(p['captainMultiplier']),
    captainWrongPenaltyMultiplier: num(p['captainWrongPenaltyMultiplier']),
    wrongPenaltyMultiplier: num(p['wrongPenaltyMultiplier']),
    jackpotEnabled: flag(p['jackpotEnabled']),
    perfectGameNeedsEveryCall: flag(p['perfectGameAllCorrectRequired']),
    minimumPlayers: num(p['minimumPlayers']),
    maxPlayers: num(p['maxPlayers']),
    cancelsBelowMinimum: flag(p['cancelBelowThreshold']),
  };
}

export class GridPayloadError extends Error {
  constructor(field: string) {
    super(`BattleGrid returned a Market Grid payload with no usable "${field}"`);
  }
}
