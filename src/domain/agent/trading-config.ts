import type { Catalog } from './catalog.js';
import { checkBound, isKnownPositionPreset, TRADING_CONFIG_FIELDS } from './catalog.js';

/**
 * An agent's money limits.
 *
 * Held as an opaque field map rather than a 25-field interface, deliberately.
 * BattleGrid requires *every* field whenever the object is supplied
 * (findings-agents F-6), the set grows, and nothing in the domain reasons about
 * any individual limit — the rules are "validate against the registry" and
 * "never send a partial one". Enumerating the fields here would create a second
 * schema to keep in sync with the server's, for no rule that needs it.
 */
export interface TradingConfig {
  readonly fields: Readonly<Record<string, unknown>>;
}

export interface ValidationIssue {
  readonly field: string;
  readonly reason: string;
}

/**
 * The fields whose bounds exist only in the tool schema, never in the registry.
 * Named here so a reader can see what the registry does *not* cover, rather
 * than discovering it from a rejection.
 */
const SCHEMA_ONLY_BOUNDS: Readonly<Record<string, { min: number; max: number }>> = {
  'positionSizePresets.smallPct': { min: 0.5, max: 100 },
  'positionSizePresets.mediumPct': { min: 0.5, max: 100 },
  'positionSizePresets.largePct': { min: 0.5, max: 100 },
};

const SIGNAL_TIMEOUT_MINUTES = [5, 10, 15];

/**
 * Validate a config against what the platform says, not against what we
 * remember.
 *
 * Returns every issue rather than the first, because a user filling a
 * twenty-five field form deserves to fix them in one pass.
 */
export function validateTradingConfig(
  config: TradingConfig,
  catalog: Catalog,
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const f = config.fields;

  for (const [field, value] of Object.entries(f)) {
    if (typeof value !== 'number') continue;
    const check = checkBound(catalog, field, value);
    if (check.ok === false) issues.push({ field, reason: check.reason });
  }

  for (const [field, bound] of Object.entries(SCHEMA_ONLY_BOUNDS)) {
    const value = readPath(f, field);
    if (typeof value !== 'number') continue;
    if (value < bound.min || value > bound.max) {
      issues.push({ field, reason: `${field} must be between ${bound.min} and ${bound.max}` });
    }
  }

  const timeout = f['signalTimeoutMinutes'];
  if (typeof timeout === 'number' && !SIGNAL_TIMEOUT_MINUTES.includes(timeout)) {
    issues.push({
      field: 'signalTimeoutMinutes',
      reason: `signalTimeoutMinutes must be one of ${SIGNAL_TIMEOUT_MINUTES.join(', ')}`,
    });
  }

  issues.push(...checkMonotonicSizing(f));

  const preset = readPath(f, 'positionManagement.positionManagementPreset');
  if (typeof preset === 'string' && !isKnownPositionPreset(catalog, preset)) {
    issues.push({
      field: 'positionManagement.positionManagementPreset',
      reason: `"${preset}" is not a position-management preset this account offers`,
    });
  }

  return issues;
}

/**
 * small ≤ medium ≤ large.
 *
 * This constraint appears in the tool's prose and in no machine-readable field
 * (findings-agents F-2). Whether the server also enforces it is unestablished —
 * proving it needs a real agent creation on an account with one slot left, so
 * it was not attempted (AL-3). Enforced here either way: if the server does not,
 * we are the only guard; if it does, we fail earlier and more kindly.
 */
function checkMonotonicSizing(f: Readonly<Record<string, unknown>>): readonly ValidationIssue[] {
  const small = readPath(f, 'positionSizePresets.smallPct');
  const medium = readPath(f, 'positionSizePresets.mediumPct');
  const large = readPath(f, 'positionSizePresets.largePct');
  if (typeof small !== 'number' || typeof medium !== 'number' || typeof large !== 'number') {
    return [];
  }
  if (small <= medium && medium <= large) return [];
  return [
    {
      field: 'positionSizePresets',
      reason: 'position sizes must increase: small ≤ medium ≤ large',
    },
  ];
}

function readPath(obj: Readonly<Record<string, unknown>>, path: string): unknown {
  let current: unknown = obj;
  for (const key of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export interface EditResult {
  readonly config: TradingConfig;
  /**
   * Fields the read carried that the write will not take. Reported rather than
   * dropped quietly: a surface that silently discards part of what it read is
   * how "I changed the timeframe and nothing happened" becomes unexplainable.
   */
  readonly dropped: readonly string[];
  /** Required fields absent after the merge. Non-empty means: do not send. */
  readonly missing: readonly string[];
}

/**
 * Apply an edit to an existing config.
 *
 * The whole object goes back to BattleGrid because a partial one does not
 * error — it *resets* the omitted fields to the server's defaults. A user who
 * changed `maxLeverage` would silently lose their `maxDailyLossUsd`. See design
 * D-E; this is why reading before writing is a correctness rule here rather
 * than a convenience.
 *
 * **But the read is wider than the write, and that is not symmetrical.**
 * `get_intelligence_agent` returns twenty-three fields;
 * `update_intelligence_agent` accepts eighteen (twenty before v14 dropped the
 * two ATR fields) and declares `additionalProperties: false`. The extras —
 * `strategyTimeframe`, `regimeAutoDerive`, `regimeTimeframe`, and since v14
 * `atrTimeframe` and `atrMatchesStrategyTimeframe` — are real facts about an
 * agent and are not writable.
 *
 * This function used to be `{ ...current.fields, ...changes }`, which passed all
 * twenty-three straight back, so **every edit was rejected outright**, for the
 * life of this product. The projection onto `TRADING_CONFIG_FIELDS` is the fix:
 * that list is already the names a create is assembled from, so there is
 * no second list to keep in sync.
 *
 * Completeness is checked here too. The create path has always refused an
 * incomplete config; the edit path never did, and a partial `tradingConfig`
 * resets what it omits rather than erroring — so an edit missing a field is the
 * one case where sending is worse than refusing.
 */
export function applyEdit(
  current: TradingConfig,
  changes: Readonly<Record<string, unknown>>,
): EditResult {
  const merged: Record<string, unknown> = { ...current.fields, ...changes };
  const writable: Record<string, unknown> = {};
  const missing: string[] = [];

  for (const field of TRADING_CONFIG_FIELDS) {
    if (merged[field] === undefined) {
      missing.push(field);
      continue;
    }
    writable[field] = merged[field];
  }

  const dropped = Object.keys(merged).filter(
    (key) => !(TRADING_CONFIG_FIELDS as readonly string[]).includes(key),
  );

  return { config: { fields: writable }, dropped, missing };
}

/**
 * What the operator must answer, because the platform will not.
 *
 * `tradingMode` leads deliberately. `OFF` is one of its three values, and it is
 * the only answer that makes the other five harmless — an agent that does not
 * trade cannot exceed a loss cap. Offering it first is not a UI preference: it
 * is the difference between creating something that reasons and creating
 * something that spends.
 */
export interface MoneyAnswers {
  readonly tradingMode: string;
  readonly minAllocationUsd: number;
  readonly balanceThresholdUsd: number;
  readonly maxConcurrentExposureUsd: number;
  readonly maxCumulativeDrawdownUsd: number;
  readonly maxDailyLossUsd: number;
}

export type BuildResult =
  | { readonly kind: 'config'; readonly config: TradingConfig }
  /** Named so a surface can say which question is unanswered, not just that one is. */
  | { readonly kind: 'incomplete'; readonly missing: readonly string[] };

/**
 * A complete `tradingConfig`, from what the platform defaults plus what the
 * operator answered.
 *
 * **Complete or nothing.** BattleGrid requires all eighteen fields whenever
 * the object is supplied and resets what a partial send omits (findings-agents
 * F-6), so there is no "set the loss cap and leave the rest". Either every
 * field has a value or this refuses and says which do not.
 *
 * The split is the platform's, not ours. Whatever BattleGrid is willing to
 * default is defaulted; whatever it declines to default becomes a question. So
 * if the platform starts defaulting a field tomorrow, it stops being asked, and
 * if it stops, it starts — without anyone editing a list here.
 *
 * Before this existed, `create_intelligence_agent` was called with no
 * `tradingConfig` at all: an agent trading real money under limits this product
 * could not name, on a page whose whole design elsewhere is refusing to state
 * what it does not know.
 */
export function buildTradingConfig(
  catalog: Catalog,
  answers: Partial<Record<string, unknown>>,
): BuildResult {
  const fields: Record<string, unknown> = {};
  const missing: string[] = [];

  for (const field of TRADING_CONFIG_FIELDS) {
    const answered = answers[field];
    if (answered !== undefined && answered !== null && answered !== '') {
      fields[field] = answered;
      continue;
    }
    const declared = catalog.defaults[field];
    if (declared !== undefined) {
      fields[field] = declared;
      continue;
    }
    missing.push(field);
  }

  if (missing.length > 0) return { kind: 'incomplete', missing };
  return { kind: 'config', config: { fields } };
}

/**
 * The values this product chooses, because BattleGrid declines to.
 *
 * These six are required by `create_intelligence_agent` and absent from
 * `get_trading_config_catalog`'s defaults. Something has to go on the wire, so
 * this product picks — and the picking is stated here rather than hidden in a
 * `?? literal` at the end of a lookup that always misses.
 *
 * That disguise is not a style complaint. `sizingStrategy` read
 * `d['sizingStrategy'] ?? 'FIXED'`, which looks like a default being honoured
 * and was a guess being made — and `FIXED` is not one of the two values the
 * enum permits, so it made `create_intelligence_agent` impossible. It survived
 * because a fallback reads as though the question is answered.
 *
 * Each choice, and why:
 *
 * - `sizingStrategy: MANUAL` — the enum is `MANUAL | VOLATILITY_AUTO`, and
 *   MANUAL is the mode that *uses the preset percentages*. This product sends
 *   `smallPct`/`mediumPct`/`largePct` from the platform's own catalog;
 *   VOLATILITY_AUTO would derive sizes from ATR and make those three inert.
 *   MANUAL is the value that matches what is actually sent.
 * - `trailingType: ATR` — the enum is `ATR | FIXED`, and all five position
 *   management presets the platform ships use ATR. None uses FIXED.
 * - The three feature switches — `false`. The platform *does* default the
 *   master switch, `positionMgmtEnabled`, to false. With the block off, its
 *   sub-switches are moot, and off is the only completion coherent with the one
 *   value the platform was willing to state.
 */
const OURS: Readonly<Record<string, unknown>> = {
  sizingStrategy: 'MANUAL',
  trailingType: 'ATR',
  breakEvenEnabled: false,
  trailingEnabled: false,
  timeDecayEnabled: false,
};

/**
 * The position-management block, all fifteen fields of it.
 *
 * A preset is a *label the caller supplies alongside* the fourteen values, not
 * a shorthand the server expands — established against the live server, see
 * `a-preset-does-not-constrain-its-config`. So choosing "COLT" means sending
 * COLT's fourteen values *and* the label; it does not mean sending the label
 * and letting BattleGrid fill in the rest.
 *
 * Where a value has a platform default it is read; where it does not it comes
 * from `OURS`, which says so.
 */
export function positionManagementFrom(
  catalog: Catalog,
  preset: string,
): Readonly<Record<string, unknown>> {
  const d = catalog.defaults;
  return {
    positionManagementPreset: preset,
    enabled: d['positionMgmtEnabled'] ?? false,
    breakEvenEnabled: OURS['breakEvenEnabled'],
    breakEvenTriggerTpProgressPct: d['positionMgmtBreakevenTriggerTpProgressPct'] ?? 50,
    trailingEnabled: OURS['trailingEnabled'],
    trailingType: OURS['trailingType'],
    trailingAtrMultiple: d['positionMgmtTrailingAtrMultiple'] ?? 3,
    trailingFixedPct: d['positionMgmtTrailingFixedPct'] ?? 1,
    trailingBufferPct: d['positionMgmtTrailingBufferPct'] ?? 0.25,
    timeDecayEnabled: OURS['timeDecayEnabled'],
    timeDecayGracePeriodMinutes: d['positionMgmtTimeDecayGracePeriodMinutes'] ?? 60,
    timeDecayIntervalMinutes: d['positionMgmtTimeDecayIntervalMinutes'] ?? 15,
    timeDecayTightenPct: d['positionMgmtTimeDecayTightenPct'] ?? 5,
    timeDecayMaxTightenPct: d['positionMgmtTimeDecayMaxTightenPct'] ?? 50,
    timeDecayStaleThresholdTpProgressPct:
      d['positionMgmtTimeDecayStaleThresholdTpProgressPct'] ?? 50,
  };
}

/**
 * The platform's own values for a named preset, with its label beside them.
 *
 * Exactly what the catalog stated and nothing else: choosing "COLT" means
 * BattleGrid's fourteen COLT values, not this product's recollection of them,
 * and not the assembled defaults with a COLT sticker. Returns null when the
 * catalog cannot answer — the preset is unknown, or arrived without its
 * configuration — and the caller refuses rather than substituting.
 */
export function positionManagementForPreset(
  catalog: Catalog,
  preset: string,
): Readonly<Record<string, unknown>> | null {
  const found = catalog.positionManagementPresets.find((p) => p.preset === preset);
  if (!found || found.config === null) return null;
  return { positionManagementPreset: found.preset, ...found.config };
}

/**
 * The fourteen behavioural fields a position-management object carries,
 * beside its label. One list, exported, because the edit transport, the
 * drift comparison, and the tests all need the same answer to "which
 * fields" — a second list is a drift of its own.
 */
export const POSITION_MANAGEMENT_FIELDS = [
  'enabled',
  'breakEvenEnabled',
  'breakEvenTriggerTpProgressPct',
  'trailingEnabled',
  'trailingType',
  'trailingAtrMultiple',
  'trailingFixedPct',
  'trailingBufferPct',
  'timeDecayEnabled',
  'timeDecayGracePeriodMinutes',
  'timeDecayIntervalMinutes',
  'timeDecayTightenPct',
  'timeDecayMaxTightenPct',
  'timeDecayStaleThresholdTpProgressPct',
] as const;

/**
 * What kind of value each field carries — the form's control types and the
 * transport's coercion both read this, so they cannot disagree about what
 * `"true"` or `"3"` means on the way in versus the way out.
 */
export function positionFieldKind(field: string): 'boolean' | 'text' | 'number' {
  if (
    field === 'enabled' ||
    field === 'breakEvenEnabled' ||
    field === 'trailingEnabled' ||
    field === 'timeDecayEnabled'
  ) {
    return 'boolean';
  }
  if (field === 'trailingType' || field === 'positionManagementPreset') return 'text';
  return 'number';
}

/**
 * Whether an agent's values still are what its label claims.
 *
 * A preset is a label beside fourteen independent values — nothing on the
 * platform makes them agree (`a-preset-does-not-constrain-its-config`,
 * answered live). So a surface showing the label alone would lie
 * confidently the day they diverge. `null` when there is no claim to check:
 * the agent is `CUSTOM` (its values are deliberately its own), names no
 * preset, or the catalog cannot say what the preset means.
 */
export function positionDrift(
  current: Readonly<Record<string, unknown>> | null | undefined,
  catalog: Catalog,
): { readonly preset: string; readonly differing: readonly string[] } | null {
  if (!current) return null;
  const preset = current['positionManagementPreset'];
  if (typeof preset !== 'string' || preset === '' || preset === 'CUSTOM') return null;
  const claimed = catalog.positionManagementPresets.find((p) => p.preset === preset);
  if (!claimed || claimed.config === null) return null;

  const differing = POSITION_MANAGEMENT_FIELDS.filter(
    // Strict inequality on the raw values: both sides are platform JSON, so
    // 3 and "3" differing is a fact worth surfacing, not noise to coerce away.
    (field) => current[field] !== claimed.config?.[field],
  );
  return { preset, differing };
}

/** The three size percentages and the strategy that picks between them. */
export function positionSizePresetsFrom(catalog: Catalog): Readonly<Record<string, unknown>> {
  const d = catalog.defaults;
  return {
    sizingStrategy: OURS['sizingStrategy'],
    smallPct: d['smallPct'] ?? 1,
    mediumPct: d['mediumPct'] ?? 2.5,
    largePct: d['largePct'] ?? 5,
  };
}

/**
 * Every value this product puts on the wire that no operator chose.
 *
 * Exported so the conformance guard can check it against the platform's own
 * declared constants. A list the guard derives from the code is the only kind
 * that cannot drift away from it.
 */
export function unpromptedValues(): Readonly<Record<string, unknown>> {
  return { ...OURS };
}
