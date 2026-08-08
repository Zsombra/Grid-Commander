import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { brainToArgument } from '@/domain/agent/brain.js';
import type { Brain } from '@/domain/agent/brain.js';
import {
  buildTradingConfig,
  positionManagementFrom,
  positionSizePresetsFrom,
  unpromptedValues,
} from '@/domain/agent/trading-config.js';
import { defaultCatalog } from '../support/agent-fakes.js';

/**
 * What the product puts on the wire, against what the platform will accept.
 *
 * The sibling file `mcp-conformance.test.ts` checks that every *required
 * argument* is built. This checks that the *values* filling them are ones the
 * server would take — and the two are further apart than they sound.
 *
 * `create_intelligence_agent` had never succeeded. Not once, for the life of
 * this product. A live probe returned two validation errors:
 *
 *     brain.kind — Expected 'PRESET' | 'CUSTOM'
 *     tradingConfig.positionSizePresets.sizingStrategy —
 *         Expected 'MANUAL' | 'VOLATILITY_AUTO', received 'FIXED'
 *
 * Both were literals this product invented. `mcp-conformance` passed throughout:
 * it could see that a `brain` key was sent, and had nothing to check the brain
 * *against*. `docs/battlegrid-mcp-surface.json` recorded field names, top level
 * only, and not a single enum. The record was missing the half that mattered.
 *
 * So the walk below is deliberately generic. Naming the two known-bad fields
 * would guard the two mistakes already made; walking every value against every
 * constant guards the next one, which is the only kind worth having.
 */

interface Surface {
  tools: Array<{ name: string; input_constants?: Record<string, unknown[]> }>;
}

const surface = JSON.parse(readFileSync('docs/battlegrid-mcp-surface.json', 'utf8')) as Surface;
const constantsFor = (tool: string): Record<string, unknown[]> =>
  surface.tools.find((t) => t.name === tool)?.input_constants ?? {};

/**
 * Every leaf of a payload, as `dotted.path → value`.
 *
 * The same shape `input_constants` uses, so the two are directly comparable.
 * Arrays get `[]` in the path, matching the probe's `items` walk.
 */
function leaves(node: unknown, path = ''): Array<[string, unknown]> {
  if (Array.isArray(node)) return node.flatMap((v) => leaves(v, `${path}[]`));
  if (typeof node === 'object' && node !== null) {
    return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [[path, node]];
}

/** The create payload the adapter builds, assembled the same way it assembles it. */
function createPayload(brain: Brain) {
  const catalog = defaultCatalog();
  const built = buildTradingConfig(catalog, {
    tradingMode: 'OFF',
    minAllocationUsd: 10,
    balanceThresholdUsd: 10,
    maxConcurrentExposureUsd: 10,
    maxCumulativeDrawdownUsd: 10,
    maxDailyLossUsd: 10,
    positionManagement: positionManagementFrom(catalog, 'CUSTOM'),
    positionSizePresets: positionSizePresetsFrom(catalog),
  });
  if (built.kind !== 'config') throw new Error(`incomplete config: ${built.missing.join(', ')}`);
  return {
    displayName: 'probe',
    brain: brainToArgument(brain),
    strategyId: 's1',
    tradingConfig: built.config.fields,
  };
}

const PRESET: Brain = { kind: 'preset', preset: 'ROMMEL' };
const CUSTOM: Brain = {
  kind: 'custom',
  modelId: 'anthropic/claude-opus-4.6',
  behavior: { risk: 'MODERATE', outlook: 'REALIST', conviction: 'MEASURED' },
};

describe('the record carries what the platform permits', () => {
  it('has input constants at all', () => {
    /**
     * The first version of the artifact had none, which is the whole reason two
     * invented literals survived four production gates. A vacuous pass here
     * would restore exactly that blindness, so this is the check that must fail
     * loudest when `docs/battlegrid-mcp-surface.json` is stale.
     */
    const withConstants = surface.tools.filter(
      (t) => Object.keys(t.input_constants ?? {}).length > 0,
    );
    expect(
      withConstants.length,
      're-probe: BATTLEGRID_API_KEY=… python3 tools/probe_mcp_surface.py',
    ).toBeGreaterThan(20);
  });

  it('pins the two values that made agent creation impossible', () => {
    // Named explicitly, because a generic walk over an artifact that silently
    // lost these paths would pass while checking nothing.
    const c = constantsFor('create_intelligence_agent');
    expect(c['brain.kind']).toEqual(expect.arrayContaining(['PRESET', 'CUSTOM']));
    expect(c['tradingConfig.positionSizePresets.sizingStrategy']).toEqual([
      'MANUAL',
      'VOLATILITY_AUTO',
    ]);
  });
});

describe('every value the product sends is one the platform accepts', () => {
  for (const [label, brain] of [
    ['a preset brain', PRESET],
    ['a custom brain', CUSTOM],
  ] as const) {
    it(`create_intelligence_agent — ${label}`, () => {
      const constants = constantsFor('create_intelligence_agent');
      const wrong = leaves(createPayload(brain))
        .filter(([path]) => constants[path] !== undefined)
        .filter(([path, value]) => !constants[path]?.includes(value))
        .map(([path, value]) => `${path}=${JSON.stringify(value)}`);

      expect(wrong, 'the platform rejects these outright').toEqual([]);
    });
  }

  it('checks something, rather than finding no constrained paths', () => {
    // The failure mode of a generic walk: a path-naming change on either side
    // makes every filter empty and every assertion pass. This is what notices.
    const constants = constantsFor('create_intelligence_agent');
    const checked = leaves(createPayload(PRESET)).filter(
      ([path]) => constants[path] !== undefined,
    );
    // `tradingConfig.atrTimeframe` sat in this list until v14 removed the
    // field (and its enum) from create entirely — a constrained path can
    // leave the schema, and the sentinel list has to follow the record.
    expect(checked.map(([p]) => p)).toEqual(
      expect.arrayContaining([
        'brain.kind',
        'brain.preset',
        'tradingConfig.tradingMode',
        'tradingConfig.signalTimeoutMinutes',
        'tradingConfig.positionSizePresets.sizingStrategy',
        'tradingConfig.positionManagement.trailingType',
        'tradingConfig.positionManagement.positionManagementPreset',
      ]),
    );
  });
});

describe('the values nobody chose are the ones worth checking', () => {
  /**
   * `OURS` in `trading-config.ts` — the six the platform declines to default.
   * They reach the wire without passing a form, a validator, or an operator, so
   * they are the values most likely to be wrong and least likely to be noticed.
   * Two of the six *were* wrong.
   */
  it('every unprompted value appears in a payload and is accepted', () => {
    const unprompted = unpromptedValues();
    expect(Object.keys(unprompted).length, 'an empty set would pass vacuously').toBeGreaterThan(0);

    const constants = constantsFor('create_intelligence_agent');
    const sent = new Map(leaves(createPayload(PRESET)).map(([path, v]) => [path.split('.').pop(), v]));

    for (const [field, value] of Object.entries(unprompted)) {
      expect(sent.get(field), `${field} is declared as ours but never sent`).toEqual(value);

      const path = [...Object.keys(constants)].find((p) => p.endsWith(`.${field}`));
      // Booleans have no enum to check against — the schema constrains them by
      // type. Only the two string choices are pinned, and both were guesses.
      if (path === undefined) {
        expect(typeof value, `${field} has no declared constants, so it must be a boolean`).toBe(
          'boolean',
        );
        continue;
      }
      expect(constants[path], `${field}: ${JSON.stringify(value)} is not permitted`).toContain(
        value,
      );
    }
  });

  /**
   * The source-level checks that need no artifact — that `sizingStrategy` is
   * `MANUAL`, that no choice is written as a lookup, that everything declared
   * is sent — live in `tests/agent/unprompted-values.test.ts`. They guard the
   * same two defects without depending on a fresh probe, so a stale artifact
   * cannot take them down with it. This file holds only what genuinely needs
   * the platform's own record.
   */
});
