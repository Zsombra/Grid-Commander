import type { Catalog } from './catalog.js';
import { checkBound, isKnownPositionPreset } from './catalog.js';

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

/**
 * Apply an edit to an existing config.
 *
 * The whole object goes back to BattleGrid because a partial one does not
 * error — it *resets* the omitted fields to the server's defaults. A user who
 * changed `maxLeverage` would silently lose their `maxDailyLossUsd`. See design
 * D-E; this is why reading before writing is a correctness rule here rather
 * than a convenience.
 */
export function applyEdit(
  current: TradingConfig,
  changes: Readonly<Record<string, unknown>>,
): TradingConfig {
  return { fields: { ...current.fields, ...changes } };
}
