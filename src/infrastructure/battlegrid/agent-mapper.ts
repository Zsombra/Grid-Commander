import type { Agent, AgentStatus, SlotUsage } from '@/domain/agent/agent.js';
import type { Brain } from '@/domain/agent/brain.js';
import { isConviction, isOutlook, isRisk } from '@/domain/agent/brain.js';
import type { ApprovedModel, Bound, Catalog, PositionManagementPreset } from '@/domain/agent/catalog.js';
import type { MarketSnapshot, ThoughtEntry } from '@/domain/agent/thought.js';
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

  const modelId = str(a.modelId) ?? '';
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
    return [
      {
        preset,
        label: str(p['label']) ?? preset,
        description: str(p['description']) ?? '',
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
