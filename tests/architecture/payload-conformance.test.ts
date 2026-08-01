import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { brainToArgument } from '@/domain/agent/brain.js';
import type { Brain } from '@/domain/agent/brain.js';
import { compileUpdateIntent, toApplyPlan } from '@/domain/strategy/compiled-plan.js';
import { anApprovedPlan } from '../support/strategy-fakes.js';
import {
  applyEdit,
  buildTradingConfig,
  positionManagementForPreset,
  positionManagementFrom,
  positionSizePresetsFrom,
} from '@/domain/agent/trading-config.js';
import { defaultCatalog } from '../support/agent-fakes.js';

/**
 * Every payload the product constructs, against the full declaration — every
 * required path at any depth, and every closed accepted set.
 *
 * The two sibling files each check one dimension: `mcp-conformance.test.ts`
 * checks that top-level required *names* are built, `wire-values.test.ts` that
 * pinned *values* are permitted. Neither could see the defect that made
 * `update_intelligence_agent` impossible for the life of the product:
 * `tradingConfig` reads back with 23 keys, the write accepts 20 and declares
 * `additionalProperties: false`, so passing the read back rejected the whole
 * payload. That is an *accepted-set* defect — the dimension neither file
 * measured. The record now carries it (`input_accepts`), along with required
 * paths below the top level (`input_required_paths`), and this file holds the
 * product's payloads against both.
 *
 * Payloads are assembled through the same domain builders the product uses —
 * a fixture payload conforms by construction and checks nothing.
 */

interface Variant {
  when: Record<string, unknown>;
  closed: boolean;
  accepts: string[];
  required: string[];
}
interface AcceptsEntry {
  closed?: boolean;
  accepts?: string[];
  variants?: Variant[];
}
interface Tool {
  name: string;
  input_required_paths?: string[];
  input_accepts?: Record<string, AcceptsEntry>;
}

const surface = JSON.parse(readFileSync('docs/battlegrid-mcp-surface.json', 'utf8')) as {
  tools: Tool[];
};
const byName = new Map(surface.tools.map((t) => [t.name, t]));
const toolOrThrow = (name: string): Tool => {
  const tool = byName.get(name);
  if (!tool) throw new Error(`${name} is not in the probed surface`);
  return tool;
};

/**
 * Objects the platform supplied and the product passes through unaltered.
 *
 * Named here, not skipped quietly: removing an entry is a decision with a
 * diff, never an accident. **Empty since 2026-07-31, and the one entry it
 * ever held is a cautionary tale**: `apply_strategy_plan`'s `plan` was
 * exempted as "the server's own approvedPlan handed straight back" — but the
 * product constructs that plan through `toApplyPlan`, and the projection was
 * missing three required fields. Every apply was rejected by input
 * validation, and this exemption is precisely where the guard could not see
 * it (`apply-sends-the-plan-the-platform-requires`). An exemption is a claim
 * about the code, and claims about the code belong in checks.
 */
const PASS_THROUGH: Readonly<Record<string, readonly string[]>> = {};

/** Every value at `path`, using the record's grammar: dots and `[]`. */
function nodesAt(root: unknown, path: string): unknown[] {
  if (path === '') return [root];
  let nodes: unknown[] = [root];
  for (const part of path.split('.')) {
    const arrayDepth = (part.match(/(\[\])+$/)?.[0].length ?? 0) / 2;
    const key = part.slice(0, part.length - arrayDepth * 2);
    const next: unknown[] = [];
    for (const node of nodes) {
      if (typeof node !== 'object' || node === null || Array.isArray(node)) continue;
      const value = (node as Record<string, unknown>)[key];
      if (value === undefined) continue;
      let layer: unknown[] = [value];
      for (let depth = 0; depth < arrayDepth; depth += 1) {
        layer = layer.flatMap((v) => (Array.isArray(v) ? v : []));
      }
      next.push(...layer);
    }
    nodes = next;
  }
  return nodes;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Required paths present wherever their parent exists. A nested requirement
 * binds the object it sits in: `tradingConfig.tradingMode` is demanded of a
 * payload that carries `tradingConfig`, and of no payload that omits it —
 * whether `tradingConfig` itself is demanded is its own, shorter path.
 */
function missingRequired(root: unknown, paths: readonly string[], skip: (p: string) => boolean): string[] {
  const missing = new Set<string>();
  for (const path of paths) {
    if (skip(path)) continue;
    const cut = path.lastIndexOf('.');
    const parent = cut < 0 ? '' : path.slice(0, cut);
    const leaf = cut < 0 ? path : path.slice(cut + 1);
    for (const node of nodesAt(root, parent)) {
      if (!isRecord(node)) continue;
      if (node[leaf] === undefined) missing.add(path);
    }
  }
  return [...missing].sort();
}

/** Everything the declaration rejects about this payload. Empty means it can succeed. */
function violations(tool: Tool, payload: unknown): string[] {
  const passThrough = PASS_THROUGH[tool.name] ?? [];
  const skip = (path: string): boolean =>
    passThrough.some((p) => path.startsWith(`${p}.`) || path.startsWith(`${p}[`));

  const problems = missingRequired(payload, tool.input_required_paths ?? [], skip).map(
    (path) => `${path} is required and missing`,
  );

  for (const [path, entry] of Object.entries(tool.input_accepts ?? {})) {
    if (skip(path) || passThrough.includes(path)) continue;
    for (const node of nodesAt(payload, path)) {
      if (!isRecord(node)) continue;

      let closed: boolean;
      let accepted: readonly string[];
      let conditionallyRequired: readonly string[] = [];
      if (entry.variants) {
        const variant = entry.variants.find((v) =>
          Object.entries(v.when).every(([key, value]) => node[key] === value),
        );
        if (!variant) {
          problems.push(`${path || 'payload'}: no declared variant matches what is sent`);
          continue;
        }
        ({ closed, accepts: accepted, required: conditionallyRequired } = variant);
      } else {
        closed = entry.closed === true;
        accepted = entry.accepts ?? [];
      }

      if (closed) {
        for (const key of Object.keys(node)) {
          if (!accepted.includes(key)) {
            problems.push(
              `${path ? `${path}.` : ''}${key} is outside a closed accepted set — ` +
                'the platform rejects the whole payload for it',
            );
          }
        }
      }
      for (const missing of missingRequired(node, conditionallyRequired, (rel) =>
        skip(path ? `${path}.${rel}` : rel),
      )) {
        problems.push(
          `${path ? `${path}.` : ''}${missing} is required by the matched variant and missing`,
        );
      }
    }
  }
  return problems;
}

/** The create payload, assembled the way the adapter assembles it. */
function createPayload(brain: Brain): Record<string, unknown> {
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

/** A 23-field read: the 20 writable fields plus the three that are not. */
function readBackConfig(): Record<string, unknown> {
  const built = buildTradingConfig(defaultCatalog(), {
    tradingMode: 'OFF',
    minAllocationUsd: 10,
    balanceThresholdUsd: 10,
    maxConcurrentExposureUsd: 10,
    maxCumulativeDrawdownUsd: 10,
    maxDailyLossUsd: 10,
    positionManagement: positionManagementFrom(defaultCatalog(), 'CUSTOM'),
    positionSizePresets: positionSizePresetsFrom(defaultCatalog()),
  });
  if (built.kind !== 'config') throw new Error(`incomplete config: ${built.missing.join(', ')}`);
  return {
    ...built.config.fields,
    strategyTimeframe: '4h',
    regimeAutoDerive: true,
    regimeTimeframe: '1d',
  };
}

const PRESET: Brain = { kind: 'preset', preset: 'ROMMEL' };
const CUSTOM: Brain = {
  kind: 'custom',
  modelId: 'anthropic/claude-opus-4.6',
  behavior: { risk: 'MODERATE', outlook: 'REALIST', conviction: 'MEASURED' },
};

describe('the record carries the two dimensions this file checks', () => {
  /**
   * The anti-vacuity pass. A generic walk over an artifact that silently lost
   * these fields would pass while checking nothing — the exact failure that
   * let two invented literals live for the life of the product.
   */
  it('accepted sets, with the one that made the edit path impossible', () => {
    const accepts = toolOrThrow('update_intelligence_agent').input_accepts ?? {};
    expect(accepts['']?.closed).toBe(true);
    expect(accepts['tradingConfig']?.closed).toBe(true);
    expect(accepts['tradingConfig']?.accepts).toHaveLength(20);
  });

  it('required paths below the top level', () => {
    const nested = surface.tools.filter((t) =>
      (t.input_required_paths ?? []).some((p) => p.includes('.') || p.includes('[]')),
    );
    expect(nested.length).toBeGreaterThanOrEqual(10);
  });

  it('union variants, keyed by the value that discriminates them', () => {
    const request = toolOrThrow('compile_strategy_plan').input_accepts?.['request'];
    expect(request?.variants?.map((v) => v.when['operation'])).toEqual([
      'CREATE',
      'UPDATE',
      'RESTORE',
    ]);
    const brain = toolOrThrow('create_intelligence_agent').input_accepts?.['brain'];
    expect(brain?.variants?.map((v) => v.when['kind'])).toEqual(['PRESET', 'CUSTOM']);
  });
});

describe('every payload the product constructs can succeed', () => {
  for (const [label, brain] of [
    ['a preset brain', PRESET],
    ['a custom brain', CUSTOM],
  ] as const) {
    it(`create_intelligence_agent — ${label}`, () => {
      expect(violations(toolOrThrow('create_intelligence_agent'), createPayload(brain))).toEqual(
        [],
      );
    });
  }

  it('create_intelligence_agent — a catalog preset, sent as the platform stated it', () => {
    // The preset path bypasses the product's assembly: the fourteen values are
    // the catalog's own. They must still satisfy the closed fifteen-key
    // positionManagement object and every required path beneath it.
    const catalog = defaultCatalog();
    const preset = positionManagementForPreset(catalog, 'COLT');
    expect(preset, 'the fake catalog must carry a fully-described preset').not.toBeNull();
    const built = buildTradingConfig(catalog, {
      tradingMode: 'OFF',
      minAllocationUsd: 10,
      balanceThresholdUsd: 10,
      maxConcurrentExposureUsd: 10,
      maxCumulativeDrawdownUsd: 10,
      maxDailyLossUsd: 10,
      positionManagement: preset as Readonly<Record<string, unknown>>,
      positionSizePresets: positionSizePresetsFrom(catalog),
    });
    if (built.kind !== 'config') throw new Error(`incomplete: ${built.missing.join(', ')}`);
    const payload = {
      displayName: 'probe',
      brain: brainToArgument(PRESET),
      strategyId: 's1',
      tradingConfig: built.config.fields,
    };
    expect(violations(toolOrThrow('create_intelligence_agent'), payload)).toEqual([]);
  });

  it('update_intelligence_agent — an edit assembled from a 23-field read', () => {
    const edited = applyEdit({ fields: readBackConfig() }, { maxDailyLossUsd: 25 });
    expect(edited.missing).toEqual([]);
    expect(edited.dropped).toHaveLength(3);
    const payload = {
      agentId: 'a1',
      expectedRevision: 3,
      tradingConfig: edited.config.fields,
    };
    expect(violations(toolOrThrow('update_intelligence_agent'), payload)).toEqual([]);
  });

  it('compile_strategy_plan — the UPDATE request the edit page composes', () => {
    // The same builder the page calls (`compileUpdateIntent`), so a drift in
    // the page's shape is a drift in this payload — the mirror this used to
    // be could keep checking yesterday's shape and pass
    // (`compile-intent-shape-lives-in-two-places`).
    const intent = compileUpdateIntent({
      strategyId: 's1',
      expectedRevision: 4,
      intentSummary: 'Change the sections of Momentum',
      assumptions: ['Only the sections change'],
      tagline: 'Ride the wave',
      sections: [{ kind: 'platform', sectionKey: 'includeRsi' }],
    });
    // The adapter's call() wraps ENVELOPED tools as { request: payload }.
    expect(violations(toolOrThrow('compile_strategy_plan'), { request: intent })).toEqual([]);
  });

  it('upsert_radar_deployment — the one-slot deployment the radar adapter composes', () => {
    // Mirrors McpRadarAdapter.upsertDeployment. The shape lives in two places
    // and both say so: the slot's inert extras are observed live values, and
    // both objects are closed — one invented key rejects the whole payload.
    // `expectedRevision: 1` because the live schema demands > 0 (a constraint
    // the record does not carry) — an existing policy's revision, never 0.
    const payload = {
      coinId: 'HYPE',
      request: {
        deploymentTimeframe: '15m',
        enabled: true,
        expectedRevision: 1,
        slots: [
          { agentId: 'a1', conditions: [], isDefault: true, minConviction: null, priority: null },
        ],
      },
    };
    expect(violations(toolOrThrow('upsert_radar_deployment'), payload)).toEqual([]);
  });

  it('delete_radar_deployment — coin, confirm, and the revision it read', () => {
    const payload = { coinId: 'HYPE', confirm: true, expectedRevision: 1 };
    expect(violations(toolOrThrow('delete_radar_deployment'), payload)).toEqual([]);
  });

  it('apply_strategy_plan — the projected plan satisfies every declared demand', () => {
    // The real projection over the realistic fixture — NOT a pass-through
    // exemption. The exemption is how the sixth dead write path stayed
    // invisible: `toApplyPlan` omitted expectedRevision, conditions and
    // conditionVerdicts, every apply was rejected by input validation, and
    // the guard had been told not to look inside the plan.
    const payload = {
      request: {
        plan: toApplyPlan(anApprovedPlan()),
        planToken: 'tok-1',
        confirm: true,
      },
    };
    expect(violations(toolOrThrow('apply_strategy_plan'), payload)).toEqual([]);
  });
});

describe('the check that guards the check', () => {
  it('the raw 23-field read, passed straight through, fails for exactly the three', () => {
    /**
     * This is the historical defect, replayed. If this ever passes, the
     * accepted-set half of the sweep has gone blind — see `applyEdit`, whose
     * projection exists because this exact payload was rejected outright by
     * the platform, every time, for the life of the product.
     */
    const payload = {
      agentId: 'a1',
      expectedRevision: 3,
      tradingConfig: readBackConfig(),
    };
    const found = violations(toolOrThrow('update_intelligence_agent'), payload);
    expect(found).toHaveLength(3);
    for (const field of ['strategyTimeframe', 'regimeAutoDerive', 'regimeTimeframe']) {
      expect(found.join('\n')).toContain(`tradingConfig.${field}`);
    }
  });

  it('a required path missing below the top level is named', () => {
    const payload = {
      agentId: 'a1',
      expectedRevision: 3,
      // Present but gutted: every top-level requirement is satisfied, the
      // omissions are all one level down — where the old check never looked.
      tradingConfig: { tradingMode: 'OFF' },
    };
    const found = violations(toolOrThrow('update_intelligence_agent'), payload);
    expect(found.length).toBeGreaterThan(10);
    expect(found.join('\n')).toContain('tradingConfig.maxDailyLossUsd is required and missing');
  });

  it('a payload matching no declared variant is refused, not waved past', () => {
    const intent = {
      operation: 'REPLACE',
      strategyId: 's1',
    };
    const found = violations(toolOrThrow('compile_strategy_plan'), { request: intent });
    expect(found.join('\n')).toContain('no declared variant matches');
  });
});
