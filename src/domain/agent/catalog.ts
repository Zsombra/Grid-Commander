/**
 * The vocabulary and the limits, as the platform states them.
 *
 * Nothing in this file is a literal list of BattleGrid values. Every enum with
 * an open or growing value set is read at runtime, because the documented list
 * was already wrong: `docs/BATTLEGRID_SURFACE_MAP.md` names four
 * position-management presets and the live server returns five
 * (findings-agents F-3). That is the staleness the server itself warns about,
 * caught inside a week, on a low-stakes field.
 */

export interface ApprovedModel {
  readonly modelId: string;
  readonly displayName: string;
  readonly provider: string;
  readonly isDefault: boolean;
}

export interface PositionManagementPreset {
  readonly preset: string;
  readonly label: string;
  readonly description: string;
}

/**
 * A numeric limit as the registry states it. Either end may be absent — the
 * registry bounds some fields on one side only.
 */
export interface Bound {
  readonly min?: number;
  readonly max?: number;
}

export interface Catalog {
  readonly models: readonly ApprovedModel[];
  readonly brainPresets: readonly string[];
  readonly positionManagementPresets: readonly PositionManagementPreset[];
  /** Keyed by trading-config field name. Absent means the registry is silent. */
  readonly bounds: Readonly<Record<string, Bound>>;
  /**
   * What the platform is willing to default, keyed by trading-config field.
   *
   * The absences are the interesting part. BattleGrid declares a default for
   * leverage, stop loss, trade count, slippage and a dozen other knobs — and
   * declares **none** for `tradingMode`, `maxDailyLossUsd`,
   * `maxCumulativeDrawdownUsd`, `maxConcurrentExposureUsd`,
   * `balanceThresholdUsd` or `minAllocationUsd`.
   *
   * Those six are exactly the money questions. The platform will not answer
   * them on anyone's behalf, so neither may this product: see
   * `undefaultableFields`.
   */
  readonly defaults: Readonly<Record<string, unknown>>;
}

/**
 * Every field `create_intelligence_agent` requires inside `tradingConfig`.
 *
 * All twenty, because the object is all-or-nothing: BattleGrid rejects a
 * partial one, and sending a subset would reset the fields it omits
 * (findings-agents F-6). There is no "just set the loss cap" call.
 */
/**
 * The caps BattleGrid reads as *no cap* when they are zero.
 *
 * From the platform's own field descriptions, not inferred:
 *
 * ```
 * maxConcurrentExposureUsd   0 = unset
 * maxCumulativeDrawdownUsd   0 = no stop
 * maxDailyLossUsd            0 = no daily limit
 * ```
 *
 * This mattered because the form asks "most it may lose in a day" and promises
 * "trading stops for the day once this is reached". Under that wording `0` is
 * the most cautious answer available, and it creates an agent with no daily
 * loss limit at all — the safest input producing the least bounded agent.
 *
 * `balanceThresholdUsd` and `minAllocationUsd` are deliberately absent. The
 * schema carries no `0 = …` note for either, so nothing is established about
 * what zero means there and nothing is guessed.
 */
export const UNBOUNDED_AT_ZERO = [
  'maxConcurrentExposureUsd',
  'maxCumulativeDrawdownUsd',
  'maxDailyLossUsd',
] as const;

/** Whether this value removes the limit rather than setting it low. */
export function removesTheLimit(field: string, value: unknown): boolean {
  return (UNBOUNDED_AT_ZERO as readonly string[]).includes(field) && value === 0;
}

/**
 * The caps this configuration leaves unbounded, named.
 *
 * `tradingConfig != null` was rendered as "configured". A present object is not
 * a set limit: the live account's active agent carries a full twenty-field
 * config in which two of the three caps above are zero, and the agent page
 * called that "Money limits: configured".
 */
export function unboundedCaps(fields: Readonly<Record<string, unknown>>): readonly string[] {
  return UNBOUNDED_AT_ZERO.filter((field) => removesTheLimit(field, fields[field]));
}

export const TRADING_CONFIG_FIELDS = [
  'tradingMode',
  'minAllocationUsd',
  'maxDailyTrades',
  'balanceThresholdUsd',
  'maxLeverage',
  'maxSlippageBps',
  'maxConcurrentExposureUsd',
  'maxCumulativeDrawdownUsd',
  'maxDailyLossUsd',
  'maxStopLossPct',
  'minStopLossPct',
  'signalTimeoutMinutes',
  'maxEntryDeviationAtrMultiple',
  'minRiskRewardRatio',
  'minTradeConviction',
  'gridMinConfidence',
  'positionSizePresets',
  'positionManagement',
  'atrMatchesStrategyTimeframe',
  'atrTimeframe',
] as const;

/**
 * The fields a caller must answer, because the platform will not.
 *
 * Derived from the catalog rather than listed, so this stays true when
 * BattleGrid starts or stops defaulting something. A field with no default is
 * not a field with a safe implicit value — it is a question nobody has
 * answered, and creating an agent around it means creating one whose limits
 * this product cannot state.
 */
export function undefaultableFields(catalog: Catalog): readonly string[] {
  return TRADING_CONFIG_FIELDS.filter((f) => catalog.defaults[f] === undefined);
}

/**
 * Whether a field can be validated at all.
 *
 * The registry covers sixteen limits and is silent on several fields the tool
 * schema constrains — position size percentages, the signal-timeout enum, and
 * the monotonic ordering of the three size presets, which exists only in prose
 * (findings-agents F-2).
 *
 * A field the registry does not bound is *unvalidatable*, not unbounded. The
 * distinction matters: treating silence as permission is how a client submits
 * work the server will reject and then blames the user for it.
 */
export function isBounded(catalog: Catalog, field: string): boolean {
  return field in catalog.bounds;
}

export type BoundCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string }
  | { readonly ok: 'unvalidatable' };

export function checkBound(catalog: Catalog, field: string, value: number): BoundCheck {
  const bound = catalog.bounds[field];
  if (!bound) return { ok: 'unvalidatable' };
  if (bound.min !== undefined && value < bound.min) {
    return { ok: false, reason: `${field} must be at least ${bound.min}` };
  }
  if (bound.max !== undefined && value > bound.max) {
    return { ok: false, reason: `${field} must be at most ${bound.max}` };
  }
  return { ok: true };
}

export function isApprovedModel(catalog: Catalog, modelId: string): boolean {
  return catalog.models.some((m) => m.modelId === modelId);
}

export function isKnownBrainPreset(catalog: Catalog, preset: string): boolean {
  return catalog.brainPresets.includes(preset);
}

export function isKnownPositionPreset(catalog: Catalog, preset: string): boolean {
  // CUSTOM is a schema value meaning "none of the presets", not a preset the
  // catalog lists. It is valid and will never appear in the catalog response.
  return preset === 'CUSTOM' || catalog.positionManagementPresets.some((p) => p.preset === preset);
}

/**
 * The catalog cannot be read.
 *
 * A distinct state rather than an empty catalog: an empty catalog would offer a
 * form with no choices and reject everything the user typed, which is a worse
 * experience than saying the platform could not be reached.
 */
export type CatalogResult =
  | { readonly kind: 'catalog'; readonly catalog: Catalog }
  | { readonly kind: 'unreadable'; readonly reason: string };
