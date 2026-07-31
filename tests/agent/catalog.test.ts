import { describe, expect, it } from 'vitest';
import type { Catalog } from '@/domain/agent/catalog.js';
import {
  checkBound,
  isApprovedModel,
  isBounded,
  isKnownPositionPreset,
} from '@/domain/agent/catalog.js';
import { validateTradingConfig } from '@/domain/agent/trading-config.js';

/** Shaped like the live response, with the values the live server returned. */
const catalog: Catalog = {
  models: [
    { modelId: 'anthropic/claude-opus-4.6', displayName: 'Claude Opus 4.6', provider: 'Anthropic', isDefault: false },
    { modelId: 'anthropic/claude-sonnet-4.6', displayName: 'Claude Sonnet 4.6', provider: 'Anthropic', isDefault: true },
  ],
  brainPresets: ['MONTGOMERY', 'ROMMEL', 'PATTON'],
  positionManagementPresets: [
    { preset: 'COLT', label: 'Colt', description: 'Patient / wide', config: null, tagline: '', cardSummary: '' },
    { preset: 'WEBLEY', label: 'Webley', description: 'Defensive / measured', config: null, tagline: '', cardSummary: '' },
    { preset: 'BERETTA', label: 'Beretta', description: 'Balanced', config: null, tagline: '', cardSummary: '' },
    { preset: 'LUGER', label: 'Luger', description: 'Aggressive / tight', config: null, tagline: '', cardSummary: '' },
    { preset: 'WALTHER', label: 'Walther', description: 'Hair-trigger', config: null, tagline: '', cardSummary: '' },
  ],
  bounds: {
    maxStopLossPct: { min: 0.1, max: 25 },
    maxSlippageBps: { min: 1, max: 1000 },
    maxDailyTrades: { max: 100 },
    minAllocationUsd: { min: 10 },
  },
  // The six the platform refuses to default are absent here on purpose — see
  // `undefaultableFields`. Filling them in a fixture would hide the whole point.
  defaults: { maxLeverage: 1, maxStopLossPct: 5, maxDailyTrades: 10 },
};

/** A2 — choices come from the server. */
describe('models_come_from_the_server', () => {
  it('accepts a model the server approves', () => {
    expect(isApprovedModel(catalog, 'anthropic/claude-opus-4.6')).toBe(true);
  });

  it('rejects one it does not, however plausible', () => {
    expect(isApprovedModel(catalog, 'anthropic/claude-opus-9')).toBe(false);
  });

  /**
   * findings-agents F-3: the repo's own surface map lists four
   * position-management presets and the live server returns five. A hard-coded
   * list would already be wrong, one week after it was written.
   */
  it('knows the preset the documentation had not caught up to', () => {
    expect(isKnownPositionPreset(catalog, 'WEBLEY')).toBe(true);
  });

  it('accepts CUSTOM, which means none of them and never appears in the catalog', () => {
    expect(isKnownPositionPreset(catalog, 'CUSTOM')).toBe(true);
    expect(catalog.positionManagementPresets.some((p) => p.preset === 'CUSTOM')).toBe(false);
  });
});

/** A2 — bounds come from the registry, and silence is not permission. */
describe('bounds_come_from_the_registry', () => {
  it('accepts a value inside the registry bound', () => {
    expect(checkBound(catalog, 'maxStopLossPct', 5)).toEqual({ ok: true });
  });

  it('rejects one outside it, naming the limit', () => {
    const result = checkBound(catalog, 'maxStopLossPct', 40);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('25');
  });

  it('honours a one-sided bound', () => {
    expect(checkBound(catalog, 'maxDailyTrades', 500).ok).toBe(false);
    expect(checkBound(catalog, 'maxDailyTrades', 0).ok).toBe(true);
  });

  /**
   * The registry is silent on several constrained fields (F-2). Treating
   * silence as permission is how a client submits work the server rejects and
   * then blames the user for it.
   */
  it('reports an unbounded field as unvalidatable, not as valid', () => {
    expect(isBounded(catalog, 'someFieldTheRegistryDoesNotMention')).toBe(false);
    expect(checkBound(catalog, 'someFieldTheRegistryDoesNotMention', 1e9)).toEqual({
      ok: 'unvalidatable',
    });
  });

  it('applies the schema-only bounds the registry does not carry', () => {
    const issues = validateTradingConfig(
      { fields: { positionSizePresets: { smallPct: 0.1, mediumPct: 2, largePct: 5 } } },
      catalog,
    );
    expect(issues.some((i) => i.field === 'positionSizePresets.smallPct')).toBe(true);
  });

  it('enforces the monotonic ordering that exists only in prose', () => {
    const issues = validateTradingConfig(
      { fields: { positionSizePresets: { smallPct: 5, mediumPct: 2.5, largePct: 1 } } },
      catalog,
    );
    expect(issues.some((i) => i.reason.includes('small ≤ medium ≤ large'))).toBe(true);
  });

  it('accepts a correctly ordered set', () => {
    const issues = validateTradingConfig(
      { fields: { positionSizePresets: { smallPct: 1, mediumPct: 2.5, largePct: 5 } } },
      catalog,
    );
    expect(issues).toEqual([]);
  });

  it('rejects a signal timeout outside the enum', () => {
    const issues = validateTradingConfig({ fields: { signalTimeoutMinutes: 7 } }, catalog);
    expect(issues.some((i) => i.field === 'signalTimeoutMinutes')).toBe(true);
  });

  it('reports every problem at once rather than the first', () => {
    const issues = validateTradingConfig(
      { fields: { maxStopLossPct: 40, maxSlippageBps: 5000, signalTimeoutMinutes: 7 } },
      catalog,
    );
    expect(issues).toHaveLength(3);
  });

  it('rejects a position-management preset this account does not offer', () => {
    const issues = validateTradingConfig(
      { fields: { positionManagement: { positionManagementPreset: 'DERRINGER' } } },
      catalog,
    );
    expect(issues.some((i) => i.field.endsWith('positionManagementPreset'))).toBe(true);
  });
});
