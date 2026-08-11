import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { brainToArgument } from '@/domain/agent/brain.js';
import type { Brain } from '@/domain/agent/brain.js';
import { compileUpdateIntent, toApplyPlan } from '@/domain/strategy/compiled-plan.js';
import type { ConditionWire } from '@/domain/strategy/condition-draft.js';
import { composeForResolution, serialiseCondition } from '@/domain/strategy/condition-draft.js';
import type { StrategyCondition } from '@/domain/strategy/condition.js';
import {
  anApprovedPlan,
  berlinFullSendDown,
  berlinRegimeDown,
} from '../support/strategy-fakes.js';
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
  /**
   * The enum-pinned half of a discriminator, recorded only where the const-pinned
   * half cannot tell two branches apart — `op` ∈ `lt|lte|gte|gt` on the
   * comparison clause, against `op = between|is|in` on the other three. Matched
   * by membership where `when` is matched by equality; a reader that honours
   * only `when` would take the comparison branch for every clause and report
   * `low`, `high`, `label` and `labels` as violations.
   */
  when_one_of?: Record<string, unknown[]>;
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

/**
 * One message, one template — read by `violations` and by the staleness
 * allowance below, so the two cannot drift into matching each other by text.
 */
const outsideClosedSet = (path: string, key: string): string =>
  `${path ? `${path}.` : ''}${key} is outside a closed accepted set — ` +
  'the platform rejects the whole payload for it';

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
        const variant = entry.variants.find(
          (v) =>
            Object.entries(v.when).every(([key, value]) => node[key] === value) &&
            Object.entries(v.when_one_of ?? {}).every(([key, values]) =>
              values.includes(node[key]),
            ),
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
          if (!accepted.includes(key)) problems.push(outsideClosedSet(path, key));
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

/** A 23-field read: the 15 writable fields plus the eight that are not. */
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
    // Read-only since v14 dropped them from the write while the read kept them.
    atrTimeframe: '4h',
    atrMatchesStrategyTimeframe: true,
    // Read-only since v15 moved the trade-level policy onto the strategy.
    maxStopLossPct: 1,
    minStopLossPct: 0.5,
    minRiskRewardRatio: 1.5,
  };
}

/** The two paths where the condition grammar's union is declared on the preview. */
const DEFINITION_PATHS = ['conditions[].definition', 'conditions[].definition.members[]'] as const;

/**
 * What a record written before the walk was fixed must say about a condition
 * payload — and nothing else may be attributed to it.
 *
 * `tools/probe_mcp_surface.py` used to stop at the outer level of
 * `conditions[].definition`'s nested `anyOf`, recording the group branch alone
 * and closing the set: `kind/members/n/op`. Against that record a clause's
 * `column` and a reference's `conditionKey` are violations of a set the platform
 * does not close — the record inventing a violation, which is why the two cases
 * below did not exist and the exemption lived in `strategy-adapter.ts` instead.
 *
 * The walk is fixed; `docs/battlegrid-mcp-surface.json` is generated by a live
 * probe and cannot be regenerated without a credential, so until it is re-probed
 * this allowance stands in for what the flattening must report. It is *derived*
 * from the record's own accepted set rather than matched by text, and it
 * evaporates the moment the record carries variants at these paths — so the
 * cases below check the whole payload today, and check it exactly after the
 * re-probe. Anything the flattening does not account for is a real defect and
 * fails now.
 */
function theFlattenedRecordsOwnDoing(tool: Tool, payload: unknown): string[] {
  const invented: string[] = [];
  for (const path of DEFINITION_PATHS) {
    const entry = tool.input_accepts?.[path];
    if (!entry || entry.variants || entry.closed !== true) continue;
    const accepted = entry.accepts ?? [];
    for (const node of nodesAt(payload, path)) {
      if (!isRecord(node)) continue;
      for (const key of Object.keys(node)) {
        if (!accepted.includes(key)) invented.push(outsideClosedSet(path, key));
      }
    }
  }
  return invented;
}

/**
 * The preview call, as `McpStrategyAdapter.previewReport` composes it.
 *
 * Mirrored here the way `upsert_radar_deployment`'s is: the shape lives in the
 * adapter, and both say so. What matters for these two cases is the `conditions`
 * argument, which is the one payload this sweep could not hold.
 */
const previewPayload = (conditions: readonly ConditionWire[]): Record<string, unknown> => ({
  timeframe: '4h',
  regimeAutoDerive: false,
  regimeTimeframe: '1d',
  sections: [{ kind: 'platform', sectionKey: 'includeRegimeContext' }],
  coinSelection: { mode: 'ranked', limit: 2 },
  conditions: [...conditions],
});

const DRAFT_COLUMN = { sectionKey: 'includeRegimeContext', header: 'regTrend_now' } as const;

/**
 * A drafted condition, through the product's own serialiser.
 *
 * Every clause form in one group, deliberately: three of them pin `op` with
 * `const` and the fourth with an `enum`, so on const-pinned discriminators alone
 * all four answer to `kind: "clause"` and a reader taking the first match would
 * check `between`'s `low`/`high` against the comparison branch. That collision
 * is what the record's `when_one_of` exists to settle, and this payload is where
 * it is exercised.
 */
const aDraftedCondition = (): ConditionWire => {
  const draft: StrategyCondition = {
    conditionKey: 'DRAFT_ONE',
    name: 'A drafted condition',
    verdict: 'UP',
    required: false,
    definition: {
      kind: 'group',
      op: 'N_OF',
      n: 2,
      members: [
        { kind: 'compare', column: DRAFT_COLUMN, op: 'gt', value: 50 },
        { kind: 'between', column: DRAFT_COLUMN, low: 1, high: 9 },
        { kind: 'is', column: DRAFT_COLUMN, label: 'trending up' },
        { kind: 'in', column: DRAFT_COLUMN, labels: ['trending up', 'extreme'] },
        { kind: 'ref', conditionKey: 'REGIME_DOWN' },
      ],
    },
  };
  const serialised = serialiseCondition(draft);
  if (serialised.kind !== 'wire') throw new Error(`refused: ${serialised.reasons.join('; ')}`);
  return serialised.condition;
};

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
    // 20 at v13, 18 at v14, 15 at v15 (trade-level policy moved to the
    // strategy). Pinned to the current record on purpose: this is the
    // anti-vacuity check, and a silent resize is what it exists to notice.
    expect(accepts['tradingConfig']?.accepts).toHaveLength(15);
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
    // Three read-only fields originally; five at v14; eight at v15.
    expect(edited.dropped).toHaveLength(8);
    const payload = {
      agentId: 'a1',
      expectedRevision: 3,
      tradingConfig: edited.config.fields,
    };
    expect(violations(toolOrThrow('update_intelligence_agent'), payload)).toEqual([]);
  });

  it('fork_strategy — the copy, unnamed and named', () => {
    // Mirrors McpStrategyAdapter.forkStrategy, which builds this payload
    // inline the way the radar adapter builds its deployment. `name` travels
    // only when the user chose one — blank is not a name (the declaration
    // pins minLength 1) — so both generations the adapter can emit are held.
    const tool = toolOrThrow('fork_strategy');
    expect(violations(tool, { strategyId: 's1', sourceRevision: 2 })).toEqual([]);
    expect(
      violations(tool, { strategyId: 's1', sourceRevision: 2, name: 'Dunkirk, mark two' }),
    ).toEqual([]);
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

  it('upsert_radar_deployment — replacement with a numeric revision', () => {
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

  it('upsert_radar_deployment — first deploy with expectedRevision: null', () => {
    const payload = {
      coinId: 'HYPE',
      request: {
        deploymentTimeframe: '15m',
        enabled: true,
        expectedRevision: null,
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

  it('update_strategy_signal_rule — the retune the ceremony composes', () => {
    // Mirrors McpStrategyAdapter.updateSignalRule: the ENVELOPED wrap, the
    // revision the describe read (schema demands ≥ 1 — never 0), the closed
    // allocation range, and params present only when the signal declares them.
    const payload = {
      request: {
        strategyId: '3c17584c-ede7-4aca-ba02-045489868a25',
        expectedRevision: 2,
        signalId: 'rsi_oversold',
        allocation: 2,
        required: true,
        params: { threshold: 25 },
      },
    };
    expect(violations(toolOrThrow('update_strategy_signal_rule'), payload)).toEqual([]);
  });

  it('preview_strategy_report — a strategy’s own conditions, round-tripped', () => {
    // `PreviewCompositionQuery` sends `conditionsAsGiven`: the platform's own
    // objects, back whole and never re-serialised out of the domain. Berlin's
    // `FULL_SEND_DOWN` is an `N_OF` group of references, a `NOT` group and three
    // `is` clauses — the widest form observed in real data.
    //
    // The one case in this file that holds a fixture rather than a builder's
    // output, and deliberately: this argument is a pass-through, so nothing here
    // is built. What has to conform is the *record*, against a payload BattleGrid
    // itself emitted.
    const tool = toolOrThrow('preview_strategy_report');
    const payload = previewPayload([berlinFullSendDown(), berlinRegimeDown()]);
    expect([...violations(tool, payload)].sort()).toEqual(
      [...theFlattenedRecordsOwnDoing(tool, payload)].sort(),
    );
  });

  it('preview_strategy_report — a drafted condition, alongside the strategy’s own', () => {
    // `TryConditionQuery` composes the draft against what the strategy already
    // defines, because a draft referring to `REGIME_DOWN` gets an answer only if
    // `REGIME_DOWN` travels with it. Through `composeForResolution`, so the list
    // is the one the platform is actually asked to resolve.
    const tool = toolOrThrow('preview_strategy_report');
    const composed = composeForResolution(
      [berlinFullSendDown(), berlinRegimeDown()],
      aDraftedCondition(),
    );
    expect(composed.standing).toBe('added');
    const payload = previewPayload(composed.conditions);
    expect([...violations(tool, payload)].sort()).toEqual(
      [...theFlattenedRecordsOwnDoing(tool, payload)].sort(),
    );
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
  it('the raw 23-field read, passed straight through, fails for exactly the eight', () => {
    /**
     * This is the historical defect, replayed. If this ever passes, the
     * accepted-set half of the sweep has gone blind — see `applyEdit`, whose
     * projection exists because this exact payload was rejected outright by
     * the platform, every time, for the life of the product.
     *
     * Three read-only fields originally; five once v14 dropped the two ATR
     * fields; eight since v15 moved the trade-level policy to the strategy.
     */
    const payload = {
      agentId: 'a1',
      expectedRevision: 3,
      tradingConfig: readBackConfig(),
    };
    const found = violations(toolOrThrow('update_intelligence_agent'), payload);
    expect(found).toHaveLength(8);
    for (const field of [
      'strategyTimeframe',
      'regimeAutoDerive',
      'regimeTimeframe',
      'atrTimeframe',
      'atrMatchesStrategyTimeframe',
      'maxStopLossPct',
      'minStopLossPct',
      'minRiskRewardRatio',
    ]) {
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

  it('the condition allowance is exactly the flattening, and nothing wider', () => {
    /**
     * The two condition cases subtract what a pre-fix record must invent, so
     * what that subtraction may contain is pinned here. Both generations are
     * asserted, because the artifact is written by a live probe and this branch
     * holds no credential: on a re-probed record the allowance is empty and the
     * two cases are exact; on the record as committed it is exactly the keys the
     * group-only accepted set leaves out.
     */
    const tool = toolOrThrow('preview_strategy_report');
    const payload = previewPayload([berlinRegimeDown()]);
    const entry = tool.input_accepts?.['conditions[].definition'];
    if (entry?.variants) {
      expect(theFlattenedRecordsOwnDoing(tool, payload)).toEqual([]);
      return;
    }
    // One `is` clause: `kind` and `op` are in the group branch's set by
    // coincidence, `column` and `label` are not — and neither is a violation.
    expect(entry?.accepts).toEqual(['kind', 'members', 'n', 'op']);
    expect(theFlattenedRecordsOwnDoing(tool, payload)).toEqual([
      outsideClosedSet('conditions[].definition', 'column'),
      outsideClosedSet('conditions[].definition', 'label'),
    ]);
  });

  it('a real defect in a condition payload still fails, allowance and all', () => {
    // The allowance covers one path and one kind of message. Everything the
    // record checks about a condition is still checked — otherwise the two cases
    // above would be a way of not looking, which is what the exemption in
    // `strategy-adapter.ts` was.
    const tool = toolOrThrow('preview_strategy_report');

    const extraKey = previewPayload([{ ...berlinRegimeDown(), conditionVerdicts: [] }]);
    expect([...violations(tool, extraKey)].sort()).toEqual(
      [
        ...theFlattenedRecordsOwnDoing(tool, extraKey),
        outsideClosedSet('conditions[]', 'conditionVerdicts'),
      ].sort(),
    );

    const withoutVerdict = { ...berlinRegimeDown() };
    delete withoutVerdict['verdict'];
    const missing = previewPayload([withoutVerdict]);
    expect([...violations(tool, missing)].sort()).toEqual(
      [...theFlattenedRecordsOwnDoing(tool, missing), 'conditions[].verdict is required and missing'].sort(),
    );
  });

  it('the condition allowance evaporates on a record that carries the union', () => {
    // The mechanism, not the artifact — provable here rather than after a
    // re-probe. A record with variants at that path allows nothing, so the two
    // cases above become the plain `toEqual([])` every other case in this file
    // makes, without either of them being edited.
    const reprobed: Tool = {
      name: 'preview_strategy_report',
      input_accepts: {
        'conditions[].definition': {
          variants: [
            { when: { kind: 'clause', op: 'is' }, closed: true, accepts: ['column', 'kind', 'label', 'op'], required: [] },
          ],
        },
      },
    };
    expect(theFlattenedRecordsOwnDoing(reprobed, previewPayload([berlinRegimeDown()]))).toEqual([]);
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
