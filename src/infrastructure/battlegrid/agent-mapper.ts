import type { Agent, AgentStatus, SlotUsage } from '@/domain/agent/agent.js';
import type { Brain } from '@/domain/agent/brain.js';
import { isConviction, isOutlook, isRisk } from '@/domain/agent/brain.js';
import type { ApprovedModel, Bound, Catalog, PositionManagementPreset } from '@/domain/agent/catalog.js';
import type { Budget, Gauge } from '@/domain/agent/budget.js';
import type { ActivityEvent, AgentRecord, GameResult } from '@/domain/agent/journal.js';
import type { Performance, Point } from '@/domain/agent/performance.js';
import type { MarketSnapshot, ThoughtEntry } from '@/domain/agent/thought.js';
import type { EntryDecision, GateBlock, SignalEvaluation, TradeOutcome } from '@/ports/agents.js';
import type { TradingConfig } from '@/domain/agent/trading-config.js';

/**
 * BattleGrid's payload → the domain's agent.
 *
 * The boundary where a schema surprise surfaces, and the only place that knows
 * the platform's field names. See design D-A: the payload carries thirty fields,
 * roughly a dozen of which participate in a rule.
 */

interface RawAgent {
  id?: unknown;
  revision?: unknown;
  displayName?: unknown;
  status?: unknown;
  strategyId?: unknown;
  strategyName?: unknown;
  strategyRevision?: unknown;
  bindingState?: unknown;
  brainPreset?: unknown;
  modelId?: unknown;
  behavior?: unknown;
  tradingConfig?: unknown;
  performance?: unknown;
  arenaChallengeEnabled?: unknown;
  overlayText?: unknown;
  capabilities?: unknown;
}

export class AgentPayloadError extends Error {
  constructor(field: string) {
    super(`BattleGrid returned an agent with no usable "${field}"`);
  }
}

export function mapAgent(raw: unknown): Agent {
  const a = (raw ?? {}) as RawAgent;

  const id = str(a.id);
  if (!id) throw new AgentPayloadError('id');

  // The revision is what makes optimistic concurrency work. An agent without
  // one cannot be safely mutated, so it is not something to default.
  const revision = typeof a.revision === 'number' ? a.revision : null;
  if (revision === null) throw new AgentPayloadError('revision');

  return {
    id,
    revision,
    displayName: str(a.displayName) ?? '(unnamed)',
    status: mapStatus(a.status),
    binding: {
      strategyId: str(a.strategyId) ?? '',
      strategyName: str(a.strategyName) ?? '(unknown strategy)',
      strategyRevision: typeof a.strategyRevision === 'number' ? a.strategyRevision : 0,
      state: str(a.bindingState) ?? 'UNKNOWN',
    },
    brain: mapBrain(a),
    tradingConfig: mapTradingConfig(a.tradingConfig),
    arenaChallengeEnabled: a.arenaChallengeEnabled === true,
    overlayText: str(a.overlayText),
    performance: mapPerformance(a.performance),
    permissions: mapPermissions(a.capabilities),
  };
}

function mapStatus(raw: unknown): AgentStatus {
  return raw === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE';
}

/**
 * `canDelete` is read nowhere.
 *
 * The live payload sets it true and the MCP surface has no delete tool — the
 * flag describes what BattleGrid's own app can do, not this client. Mapping it
 * would put a delete affordance one careless `Object.entries` away. See
 * findings-agents F-1 and decision AL-2.
 */
function mapPermissions(raw: unknown): Agent['permissions'] {
  const c = (raw ?? {}) as Record<string, unknown>;
  return {
    canEdit: c['canEdit'] === true,
    canArchive: c['canArchive'] === true,
    canEditOverlay: c['canEditOverlay'] === true,
  };
}

function mapBrain(a: RawAgent): Brain {
  const preset = str(a.brainPreset);
  if (preset) return { kind: 'preset', preset };

  const modelId = str(a.modelId);
  if (!modelId) return { kind: 'unknown' };

  const b = (a.behavior ?? {}) as Record<string, unknown>;
  return {
    kind: 'custom',
    modelId,
    behavior: {
      risk: isRisk(b['risk']) ? b['risk'] : 'MODERATE',
      outlook: isOutlook(b['outlook']) ? b['outlook'] : 'REALIST',
      conviction: isConviction(b['conviction']) ? b['conviction'] : 'MEASURED',
    },
  };
}

/**
 * Kept whole, deliberately. Every field is required on the way back
 * (findings-agents F-6), so the way in must not drop any — an edit is a
 * read-modify-write and the read is where the unmodified fields come from.
 */
function mapTradingConfig(raw: unknown): TradingConfig | null {
  if (typeof raw !== 'object' || raw === null) return null;
  return { fields: raw as Record<string, unknown> };
}

/**
 * Capacity, or null when the platform did not report it.
 *
 * Null rather than zeroes. Defaulting `limit` and `used` to 0 would produce a
 * coherent-looking `SlotUsage` that says the user has no slots — and the copy
 * built from it reads "You are using all 0 of your agent slots", a specific
 * claim about their account that nobody made. That is the defect the production
 * gate found in change 1 (PG-003), in a different field.
 *
 * Callers must treat null as *unknown*, which is not the same as at-capacity.
 */
export function mapSlotUsage(raw: unknown): SlotUsage | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const s = raw as Record<string, unknown>;
  const rank = (s['rank'] ?? {}) as Record<string, unknown>;
  const limit = num(s['limit']);
  const used = num(s['used']);
  const remaining = num(s['remaining']);

  // Without a limit there is no capacity to report. `remaining` alone cannot
  // stand in: it says how many more, not what governs the number.
  if (limit === undefined) return null;

  return {
    limit,
    used: used ?? 0,
    // The server reports `remaining`; deriving it is a second opinion on a
    // number the platform owns, and only worth taking when it stayed silent.
    remaining: remaining ?? Math.max(0, limit - (used ?? 0)),
    rankName: str(rank['displayName']) ?? str(rank['name']) ?? 'your rank',
  };
}

export function mapCatalog(models: unknown, tradingConfig: unknown, brainPresets: readonly string[]): Catalog {
  return {
    models: mapModels(models),
    brainPresets,
    positionManagementPresets: mapPositionPresets(tradingConfig),
    bounds: mapBounds(tradingConfig),
    defaults: mapDefaults(tradingConfig),
  };
}

/**
 * What the platform is willing to default, keyed by the field it defaults.
 *
 * The catalog names them `defaultMaxLeverage`, `defaultMaxStopLossPct` and so
 * on; the write schema calls the same things `maxLeverage`, `maxStopLossPct`.
 * The rename is mechanical, and doing it here means the rest of the product
 * only ever sees the write-schema name.
 *
 * Some catalog defaults have no write-schema counterpart at all
 * (`defaultStrategyTimeframe`, `defaultRegimeAutoDerive`) — those are the read
 * shape's extra fields, which create rejects. They are carried anyway and
 * simply never asked for: filtering here would put knowledge of the write
 * schema in a mapper.
 */
function mapDefaults(raw: unknown): Readonly<Record<string, unknown>> {
  const declared = ((raw ?? {}) as Record<string, unknown>)['tradingDefaults'];
  const values = ((declared ?? {}) as Record<string, unknown>)['defaults'];
  if (typeof values !== 'object' || values === null) return {};

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
    if (!key.startsWith('default')) continue;
    const field = key.slice('default'.length);
    out[field.charAt(0).toLowerCase() + field.slice(1)] = value;
  }
  // The catalog spells the slippage default `defaultEntrySlippageBps` and the
  // write schema calls it `maxSlippageBps`. One rename, stated rather than
  // pattern-matched, because guessing at the pairing is how a value lands in a
  // field it does not belong to.
  if (out['entrySlippageBps'] !== undefined) out['maxSlippageBps'] = out['entrySlippageBps'];
  return out;
}

function mapModels(raw: unknown): readonly ApprovedModel[] {
  const list = ((raw ?? {}) as Record<string, unknown>)['models'];
  if (!Array.isArray(list)) return [];
  return list.flatMap((entry: unknown): ApprovedModel[] => {
    const m = (entry ?? {}) as Record<string, unknown>;
    const modelId = str(m['modelId']);
    if (!modelId) return [];
    return [
      {
        modelId,
        displayName: str(m['displayName']) ?? modelId,
        provider: str(m['provider']) ?? '',
        isDefault: m['isDefault'] === true,
      },
    ];
  });
}

function mapPositionPresets(raw: unknown): readonly PositionManagementPreset[] {
  const list = ((raw ?? {}) as Record<string, unknown>)['positionManagementPresets'];
  if (!Array.isArray(list)) return [];
  return list.flatMap((entry: unknown): PositionManagementPreset[] => {
    const p = (entry ?? {}) as Record<string, unknown>;
    const preset = str(p['preset']);
    if (!preset) return [];
    // The config block is the point of the preset: the platform declines to
    // expand a label server-side, so these fourteen values are what choosing
    // "COLT" actually sends. Carried through verbatim when it is an object,
    // null otherwise — a preset the platform did not fully describe stays
    // visibly incomplete rather than being completed here.
    const config = p['config'];
    return [
      {
        preset,
        label: str(p['label']) ?? preset,
        description: str(p['description']) ?? '',
        config:
          typeof config === 'object' && config !== null && !Array.isArray(config)
            ? (config as Readonly<Record<string, unknown>>)
            : null,
        tagline: str(p['tagline']) ?? '',
        cardSummary: str(p['cardSummary']) ?? '',
      },
    ];
  });
}

/**
 * The registry's `minimumX` / `maximumX` keys, translated to the field names
 * they constrain.
 *
 * Written out rather than derived by string surgery on the key names: the
 * mapping is not mechanical (`minimumTradingEquityUsd` bounds
 * `balanceThresholdUsd`), and a silent mis-derivation would produce a bound
 * applied to the wrong field, which is worse than no bound at all.
 */
const BOUND_KEYS: ReadonlyArray<
  readonly [field: string, min: string | undefined, max: string | undefined]
> = [
  ['balanceThresholdUsd', 'minimumTradingEquityUsd', undefined],
  ['maxLeverage', 'minimumLeverage', undefined],
  ['minStopLossPct', 'minimumStopLossPct', 'maximumStopLossPct'],
  ['maxStopLossPct', 'minimumStopLossPct', 'maximumStopLossPct'],
  ['maxEntryDeviationAtrMultiple', 'minimumMaxEntryDeviationAtrMultiple', 'maximumMaxEntryDeviationAtrMultiple'],
  ['minRiskRewardRatio', 'minimumRiskRewardRatio', 'maximumRiskRewardRatio'],
  ['maxSlippageBps', 'minimumMaxSlippageBps', 'maximumMaxSlippageBps'],
  ['minAllocationUsd', 'minimumAllocationUsd', undefined],
  ['maxDailyTrades', undefined, 'maximumMaxDailyTrades'],
  ['gridMinConfidence', 'agentMinConfidenceFloor', undefined],
  ['minTradeConviction', 'agentMinTradeConvictionFloor', undefined],
];

function mapBounds(raw: unknown): Readonly<Record<string, Bound>> {
  const defaults = ((raw ?? {}) as Record<string, unknown>)['tradingDefaults'];
  const registry = ((defaults ?? {}) as Record<string, unknown>)['bounds'];
  if (typeof registry !== 'object' || registry === null) return {};
  const source = registry as Record<string, unknown>;

  const bounds: Record<string, Bound> = {};
  for (const [field, minKey, maxKey] of BOUND_KEYS) {
    const min = minKey === undefined ? undefined : num(source[minKey]);
    const max = maxKey === undefined ? undefined : num(source[maxKey]);
    if (min === undefined && max === undefined) continue;
    bounds[field] = {
      ...(min === undefined ? {} : { min }),
      ...(max === undefined ? {} : { max }),
    };
  }
  return bounds;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined;
}

/**
 * A thought-log entry, from the payload the live server returns.
 *
 * Written against an observed response, not the declared schema — the field
 * names, and crucially their *types*, come from calling
 * `get_agent_thought_log` and `get_user_thought_log` and recording what came
 * back. `confidenceScore` is a float, `confidenceScorePercent` an int, and the
 * two are the same number twice; this keeps the float and derives nothing.
 *
 * Nulls are preserved rather than defaulted. `thesisDirection` is absent on
 * roughly a third of the entries observed, and a threshold nobody set is not a
 * threshold of zero — defaulting either would invent a fact about an agent's
 * reasoning.
 */
export function mapThought(raw: unknown): ThoughtEntry {
  const t = (raw ?? {}) as Record<string, unknown>;
  const snapshot = t['marketSnapshot'];

  return {
    id: str(t['id']) ?? '',
    at: new Date(String(t['createdAt'] ?? 0)),
    agentId: str(t['agentId']) ?? '',
    reasoning: str(t['reasoning']) ?? '',
    snapshot: mapSnapshot(snapshot),
    confidence: num(t['confidenceScore']) ?? null,
    threshold: num(t['confidenceThreshold']) ?? null,
    // Never narrowed and never defaulted to a recognised value: an outcome this
    // product has not seen must reach the surface as the platform named it.
    outcome: str(t['outcome']) ?? 'UNKNOWN',
  };
}

function mapSnapshot(raw: unknown): MarketSnapshot | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const s = raw as Record<string, unknown>;
  const coinTicker = str(s['coinTicker']);
  if (!coinTicker) return null;
  return {
    coinTicker,
    thesisDirection: str(s['thesisDirection']),
    primaryTimeframe: str(s['primaryTimeframe']),
  };
}

/**
 * An agent's live risk budget, from the payload the server returns.
 *
 * The one translation that matters: a gauge the platform reports as
 * `configured: false` carries `remaining: 0`, and that zero is passed on here
 * as `null`. Rendering the platform's zero would say "no headroom left" about a
 * limit that does not exist — the inverse of the truth, on the gauges that
 * govern loss.
 *
 * `fill` is the amount consumed, not a fraction: `fill: 21, remaining: 13`
 * against a ceiling of 34. Mapped to `used` because `fill` invites a reader to
 * treat it as a proportion, which is how a 21-of-34 bar gets drawn at 2100%.
 */
export function mapBudget(raw: unknown): Budget {
  const b = ((raw ?? {}) as Record<string, unknown>);
  const inner = (typeof b['budget'] === 'object' && b['budget'] !== null ? b['budget'] : b) as Record<string, unknown>;

  const gauges: Record<string, Gauge> = {};
  const rawGauges = inner['gauges'];
  if (typeof rawGauges === 'object' && rawGauges !== null) {
    for (const [name, value] of Object.entries(rawGauges as Record<string, unknown>)) {
      if (typeof value !== 'object' || value === null) continue;
      const g = value as Record<string, unknown>;
      const configured = g['configured'] === true;
      gauges[name] = {
        used: num(g['fill']) ?? 0,
        remaining: configured ? (num(g['remaining']) ?? null) : null,
        ceiling: configured ? ceilingFor(name, inner) : null,
        breached: g['breached'] === true,
      };
    }
  }

  const haltedAt = str(inner['haltedAt']);
  return {
    agentId: str(inner['agentId']) ?? '',
    gauges,
    overSubscribed: inner['budgetOverSubscribed'] === true,
    stopBelowSingleTradeLoss: inner['stopBelowSingleTradeLoss'] === true,
    stopEffectivelyUnbounded: inner['stopEffectivelyUnbounded'] === true,
    haltedAt: haltedAt === null ? null : new Date(haltedAt),
    haltReason: str(inner['haltReason']),
    capitalAtRiskUsd: num(inner['capitalAtRiskUsd']) ?? null,
    headroomUsd: num(inner['headroomUsd']) ?? null,
  };
}

/**
 * The ceiling a gauge is measured against.
 *
 * Written out rather than derived from the gauge name: `dailyLoss` is capped by
 * `maxDailyLossUsd` and `exposure` by `maxConcurrentExposureUsd`, and string
 * surgery on those pairings is how a ceiling lands on the wrong gauge — the
 * same reasoning as `BOUND_KEYS` above.
 */
const GAUGE_CEILINGS: Readonly<Record<string, string>> = {
  dailyLoss: 'maxDailyLossUsd',
  dailyTrades: 'maxDailyTrades',
  drawdown: 'maxCumulativeDrawdownUsd',
  exposure: 'maxConcurrentExposureUsd',
};

function ceilingFor(gauge: string, budget: Record<string, unknown>): number | null {
  const key = GAUGE_CEILINGS[gauge];
  return key === undefined ? null : (num(budget[key]) ?? null);
}

/**
 * An agent's record, from the payload `get_agent_journal` returns.
 *
 * The three key names below are the whole point of this function. The adapter
 * used to read `payload['entries'] ?? payload['journal']`; the response carries
 * neither, so the lookup missed, the result was `empty`, and every agent's
 * journal said the agent had recorded nothing. Both of those key names were
 * invented, as were `at`, `type`, `kind`, `summary` and `title` beneath them.
 *
 * These five came from calling the tool. `username` is the sixth and is not
 * read: it names the account, which every page already states.
 */
export function mapRecord(raw: unknown): AgentRecord {
  const p = (raw ?? {}) as Record<string, unknown>;
  return {
    activity: array(p['recentActivity']).map(mapActivity),
    // The same entries `/thinking` renders, through the same mapper. Two
    // readings of one payload shape would be two things to keep in step.
    thoughts: array(p['recentThoughts']).map(mapThought),
    games: array(p['recentGames']).map(mapGame),
  };
}

function array(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function mapActivity(raw: unknown): ActivityEvent {
  const e = (raw ?? {}) as Record<string, unknown>;
  const detail = e['metadata'];
  return {
    id: str(e['id']) ?? '',
    at: new Date(String(e['createdAt'] ?? 0)),
    // Never narrowed to a recognised kind, for the reason `EVENTS` gives.
    kind: str(e['eventType']) ?? 'UNKNOWN',
    // Carried whole and unread. What it holds depends on the kind, and one kind
    // was observed with two different shapes — so the domain reads it, and this
    // does not decide in advance which fields survive.
    detail: typeof detail === 'object' && detail !== null ? (detail as Record<string, unknown>) : {},
  };
}

/**
 * One submitted grid.
 *
 * `finalScore`, `rank`, `outcome` and every payout field were `null` on all ten
 * games observed — the account has none that settled. So nothing here defaults
 * them: a null reaches the domain as a null, `settled()` reads it, and the
 * surface says "not settled yet" rather than showing a score of zero.
 *
 * `cells` is counted rather than carried. It holds the nine picks with their
 * per-coin reasoning, which is a grid view and not a journal line.
 */
function mapGame(raw: unknown): GameResult {
  const g = (raw ?? {}) as Record<string, unknown>;
  return {
    at: new Date(String(g['submittedAt'] ?? 0)),
    gameType: str(g['gameType']) ?? 'UNKNOWN',
    confidence: num(g['confidenceScore']) ?? null,
    reasoning: str(g['reasoning']) ?? '',
    picks: array(g['cells']).length,
    score: num(g['finalScore']) ?? null,
    rank: num(g['rank']) ?? null,
    payoutUsd: num(g['totalPayout']) ?? null,
    outcome: str(g['outcome']),
  };
}

/**
 * An agent's record, from the block the roster payload already carries.
 *
 * `null` when the block is absent, and a `Performance` full of zeroes when the
 * agent simply has not played. Those are different facts and the mapper must not
 * merge them: six of the nine agents observed had a real block reporting zero
 * games, three of them created that afternoon.
 *
 * `winRatePercent` and `avgAccuracyPercent` are read and discarded. They are the
 * same numbers as `winRate` and `avgAccuracy`, pre-rounded — `0.3917525773195876`
 * against `39`. Keeping both would put two versions of one fact on one screen,
 * and the rounded one cannot be recovered from. Same call as `mapThought` makes
 * for `confidenceScorePercent`.
 */
export function mapPerformance(raw: unknown): Performance | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const p = raw as Record<string, unknown>;
  const games = (p['gameStats'] ?? {}) as Record<string, unknown>;
  const trades = (p['tradeStats'] ?? {}) as Record<string, unknown>;
  const winLoss = (trades['winLoss'] ?? {}) as Record<string, unknown>;

  return {
    games: {
      played: num(games['gamesPlayed']) ?? 0,
      // Null rather than 0: a win rate nobody has established is not a win rate
      // of zero, and an agent with no games reports exactly that.
      winRate: num(games['winRate']) ?? null,
      avgAccuracy: num(games['avgAccuracy']) ?? null,
      earningsUsd: num(games['gameEarnings']) ?? 0,
      earningsCurve: mapCurve(games['earningsSparkline']),
    },
    trades: {
      trades: num(trades['trades']) ?? 0,
      open: num(trades['open']) ?? 0,
      wins: num(winLoss['wins']) ?? 0,
      losses: num(winLoss['losses']) ?? 0,
      // The platform itself sends null here on an agent that has not traded —
      // the one place in this payload it draws the distinction unprompted.
      avgPnlUsd: num(trades['avgPnl']) ?? null,
      pnlCurve: mapCurve(trades['pnlSparkline']),
    },
  };
}

function mapCurve(raw: unknown): readonly Point[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    return { at: new Date(String(e['timestamp'] ?? 0)), value: num(e['value']) ?? 0 };
  });
}

/**
 * One closed trade, mapped whole — shaped from the live
 * `list_trade_outcomes` row of 2026-08-02.
 *
 * Every money figure is carried and none is defaulted to zero: a missing
 * fee rendered as `0` understates a loss, and this is the surface an
 * operator uses to decide whether an agent earns its capital. The id and
 * the market are the two fields a row cannot be read without — a trade
 * with neither is not a trade anyone can act on, so the read refuses
 * rather than render a nameless line.
 */
export function mapTradeOutcome(raw: unknown): TradeOutcome {
  const t = (raw ?? {}) as Record<string, unknown>;
  const id = typeof t['id'] === 'string' && t['id'] ? t['id'] : null;
  if (id === null) throw new TradeOutcomePayloadError('id');
  const coinTicker = typeof t['coinTicker'] === 'string' && t['coinTicker'] ? t['coinTicker'] : null;
  if (coinTicker === null) throw new TradeOutcomePayloadError('coinTicker');
  const text = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

  return {
    id,
    coinTicker,
    direction: text(t['direction']) ?? 'UNKNOWN',
    closeReason: text(t['closeReason']),
    closedBy: text(t['closedBy']),
    entryFillPrice: num(t['entryFillPrice']) ?? null,
    exitFillPrice: num(t['exitFillPrice']) ?? null,
    realizedPnl: num(t['realizedPnl']) ?? null,
    totalFees: num(t['totalFees']) ?? null,
    netPnl: num(t['netPnl']) ?? null,
    slippageEntry: num(t['slippageEntry']) ?? null,
    slippageExit: num(t['slippageExit']) ?? null,
    effectiveLeverage: num(t['effectiveLeverage']) ?? null,
    conviction: num(t['conviction']) ?? null,
    openedAt: text(t['openedAt']),
    closedAt: text(t['closedAt']),
    durationSeconds: num(t['durationSeconds']) ?? null,
    decisionId: text(t['decisionId']),
    signalLogId: text(t['signalLogId']),
  };
}

export class TradeOutcomePayloadError extends Error {
  constructor(field: string) {
    super(`BattleGrid returned a trade outcome with no usable "${field}"`);
  }
}

/**
 * A candidate stopped before evaluation — shaped from the live
 * `list_gate_blocks` row of 2026-08-03.
 *
 * `reasonDetail` is carried as the platform structured it rather than
 * flattened to prose: `INSUFFICIENT_EQUITY` is a category, and
 * `{equityUsd: 2.18, thresholdUsd: 10}` is the answer an operator came
 * for. `coinTicker` is genuinely nullable — an account-stage block is
 * about the account, not a market.
 */
export function mapGateBlock(raw: unknown): GateBlock {
  const b = (raw ?? {}) as Record<string, unknown>;
  const id = typeof b['id'] === 'string' && b['id'] ? b['id'] : null;
  if (id === null) throw new PipelinePayloadError('gate block id');
  return {
    id,
    coinTicker: typeof b['coinTicker'] === 'string' && b['coinTicker'] ? b['coinTicker'] : null,
    gateStage: String(b['gateStage'] ?? 'UNKNOWN'),
    reasonCode: String(b['reasonCode'] ?? 'UNSTATED'),
    reasonDetail:
      typeof b['reasonDetail'] === 'object' && b['reasonDetail'] !== null
        ? (b['reasonDetail'] as Record<string, unknown>)
        : {},
    at: typeof b['createdAt'] === 'string' ? b['createdAt'] : null,
  };
}

/** One evaluation that ran — live `list_signal_logs` row of 2026-08-03. */
export function mapSignalEvaluation(raw: unknown): SignalEvaluation {
  const e = (raw ?? {}) as Record<string, unknown>;
  const id = typeof e['id'] === 'string' && e['id'] ? e['id'] : null;
  if (id === null) throw new PipelinePayloadError('signal log id');
  const text = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
  return {
    id,
    coinTicker: text(e['coinTicker']),
    aggregateScore: num(e['aggregateScore']) ?? null,
    // The threshold *in force when this ran*. Reading today's setting here
    // would explain an old skip with a rule that did not apply to it.
    minAggregateScore: num(e['effectiveMinAggregateScore']) ?? null,
    minRequiredCount: num(e['effectiveMinRequiredCount']) ?? null,
    triggeredSignalCount: num(e['triggeredSignalCount']) ?? null,
    dominantBias: text(e['dominantBias']),
    assessmentDirection: text(e['assessmentDirection']),
    hasConflictingSignals: e['hasConflictingSignals'] === true,
    gateStatus: text(e['evaluationGateStatus']),
    gateReason: text(e['evaluationGateReason']),
    terminalStatus: text(e['terminalStatus']),
    at: text(e['evaluatedAt']) ?? text(e['createdAt']),
  };
}

/** A decision the agent reached — live `list_entry_decisions` row of 2026-08-03. */
export function mapEntryDecision(raw: unknown): EntryDecision {
  const d = (raw ?? {}) as Record<string, unknown>;
  const id = typeof d['id'] === 'string' && d['id'] ? d['id'] : null;
  if (id === null) throw new PipelinePayloadError('decision id');
  const text = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
  return {
    id,
    coinTicker: text(d['coinTicker']),
    decision: String(d['decision'] ?? 'UNKNOWN'),
    direction: text(d['direction']),
    conviction: num(d['conviction']) ?? null,
    entryPrice: num(d['entryPrice']) ?? null,
    stopLoss: num(d['stopLoss']) ?? null,
    takeProfit: num(d['takeProfit']) ?? null,
    riskRewardRatio: num(d['riskRewardRatio']) ?? null,
    status: text(d['status']),
    // Whole. This is the agent explaining itself, and a truncated
    // explanation is a different explanation.
    reasoning: text(d['reasoning']),
    at: text(d['createdAt']),
  };
}

export class PipelinePayloadError extends Error {
  constructor(field: string) {
    super(`BattleGrid returned a pipeline row with no usable "${field}"`);
  }
}
