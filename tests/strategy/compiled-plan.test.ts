import { describe, expect, it } from 'vitest';
import {
  blastRadius,
  changedAxes,
  concerns,
  confirmationSummary,
  FIELDS_APPLY_REJECTS,
  isViable,
  PlanProjectionError,
  toApplyPlan,
} from '@/domain/strategy/compiled-plan.js';

/**
 * Shaped from a real `compile_strategy_plan` response, recorded in
 * findings-strategies. Trimmed, but every key the live server returned is here —
 * including the eight that must not go back.
 */
const APPROVED_PLAN = {
  operation: 'UPDATE',
  expiresAt: '2026-07-28T01:08:50.257Z',
  expectedRevision: 1,
  proposedRevision: 2,
  authoringCatalogDigest: '2d35afc7429f255a82bd914e732e1ba90dd12c0bc238564ae5bd4524cb8a7cae',
  postState: {
    id: '9fc7be37-8330-4d60-a28f-287dd695187f',
    scope: 'PRIVATE',
    systemKey: null,
    name: 'Midway (fork)',
    description: 'Balanced — VWAP deviation signal.',
    tagline: 'Compile probe — not applied',
    visibility: 'UNLISTED',
    timeframe: '1h',
    cadence: 'INTRADAY',
    regimeAutoDerive: true,
    regimeTimeframe: '4h',
    marketReadText: 'Read the tape.',
    sections: [{ kind: 'report', columns: [] }],
    signalRules: [{ signalId: 'rsi_oversold' }],
    minAggregateScore: 0.5,
    minRequiredCount: 0,
    minAtrPct: 0.5,
    forkedFromStrategyId: 'e811f5cd-9548-4514-8cf1-38583a1f018b',
    isActive: true,
  },
  explicitRuleOverrides: [{ signalId: 'rsi_oversold', allocation: 3, required: false }],
  viability: { viable: true, minRequiredCount: 0, enabledRequiredCount: 0 },
  mismatches: [
    {
      code: 'ACTIVE_SIGNAL_MODULE_NOT_IN_REPORT',
      signalId: 'bollinger_cci_overbought',
      message: "Active signal 'bollinger_cci_overbought' belongs to a module not shown in the report.",
    },
    { code: 'ACTIVE_SIGNAL_MODULE_NOT_IN_REPORT', signalId: 'bollinger_cci_oversold', message: 'x' },
  ],
  diff: { changedAxes: ['IDENTITY'], identity: { before: {}, after: {} }, report: null },
  bindingImpact: { boundAgentCount: 0, materializationFenceDigest: '4f53cda1' },
};

/**
 * S-A. The projection is two renames, one unwrap and eight omissions, and the
 * obvious implementation — hand back what compile returned — is an unknown-key
 * error every time.
 *
 * Both directions are asserted. Presence alone would let a stray `diff` through;
 * absence alone would let a missing `minAtrPct` through.
 */
describe('toApplyPlan projects rather than forwards', () => {
  const plan = toApplyPlan(APPROVED_PLAN);

  it('carries every field apply requires', () => {
    for (const field of [
      'operation',
      'strategyId',
      'expiresAt',
      'sections',
      'regimeTimeframe',
      'name',
      'description',
      'tagline',
      'timeframe',
      'regimeAutoDerive',
      'marketReadText',
      'minAggregateScore',
      'minRequiredCount',
      'minAtrPct',
      'rules',
    ]) {
      expect(plan, `apply requires "${field}"`).toHaveProperty(field);
    }
  });

  it('carries no field apply rejects', () => {
    for (const field of FIELDS_APPLY_REJECTS) {
      expect(plan, `apply rejects "${field}" as an unknown key`).not.toHaveProperty(field);
    }
  });

  it('renames postState.id to strategyId', () => {
    expect(plan['strategyId']).toBe('9fc7be37-8330-4d60-a28f-287dd695187f');
    expect(plan).not.toHaveProperty('id');
  });

  it('renames explicitRuleOverrides to rules', () => {
    expect(plan['rules']).toEqual([{ signalId: 'rsi_oversold', allocation: 3, required: false }]);
    expect(plan).not.toHaveProperty('explicitRuleOverrides');
  });

  it('unwraps postState one level rather than nesting it', () => {
    expect(plan['name']).toBe('Midway (fork)');
    expect(plan['minAtrPct']).toBe(0.5);
  });

  it('drops the postState fields apply does not accept', () => {
    // `scope`, `systemKey`, `visibility`, `cadence`, `signalRules`,
    // `forkedFromStrategyId`, `isActive` are all inside postState and none is a
    // plan field.
    for (const field of ['scope', 'systemKey', 'visibility', 'cadence', 'forkedFromStrategyId', 'isActive']) {
      expect(plan, `"${field}" is postState, not plan`).not.toHaveProperty(field);
    }
  });

  it('refuses a compiled plan it cannot project rather than sending a partial one', () => {
    expect(() => toApplyPlan({ operation: 'UPDATE', expiresAt: 'x' })).toThrow(PlanProjectionError);
    const noOperation: Record<string, unknown> = { ...APPROVED_PLAN };
    delete noOperation['operation'];
    expect(() => toApplyPlan(noOperation)).toThrow(PlanProjectionError);
  });
});

/**
 * S-C. The single easiest way to get this feature wrong: `mismatches` is a list
 * of things that sound like errors, and an empty array *feels* like the success
 * condition. It is not.
 */
describe('viability decides; concerns are advisory', () => {
  it('a plan with concerns is still viable', () => {
    expect(concerns(APPROVED_PLAN)).toHaveLength(2);
    expect(isViable(APPROVED_PLAN)).toBe(true);
  });

  it('a plan the platform calls unviable is not applied', () => {
    expect(isViable({ ...APPROVED_PLAN, viability: { viable: false } })).toBe(false);
  });

  it('an absent viability reads as unviable, not as viable', () => {
    // Missing information is not permission.
    expect(isViable({})).toBe(false);
  });

  it('surfaces each concern with something to read', () => {
    const first = concerns(APPROVED_PLAN)[0];
    expect(first?.code).toBe('ACTIVE_SIGNAL_MODULE_NOT_IN_REPORT');
    expect(first?.message).toContain('bollinger_cci_overbought');
  });

  it('treats a missing mismatches list as no concerns, not as a failure', () => {
    expect(concerns({})).toEqual([]);
  });
});

describe('what the review screen reads', () => {
  it('takes the blast radius from the platform', () => {
    expect(blastRadius(APPROVED_PLAN)).toBe(0);
    expect(blastRadius({ ...APPROVED_PLAN, bindingImpact: { boundAgentCount: 5 } })).toBe(5);
  });

  it('reports an unknown blast radius as unknown, not as zero', () => {
    // Zero means "this changes nothing else". Not knowing is a different claim.
    expect(blastRadius({})).toBeNull();
  });

  it('takes the changed axes from the server’s own diff', () => {
    expect(changedAxes(APPROVED_PLAN)).toEqual(['IDENTITY']);
  });

  it('uses the platform’s confirmation summary verbatim', () => {
    const summary =
      "UPDATE strategy 'Midway (fork)' as revision 2; changed axes: IDENTITY; 0 bound agent(s) and 0 open position(s) observed.";
    expect(confirmationSummary({ confirmationSummary: summary })).toBe(summary);
  });

  it('reports an absent summary rather than composing one', () => {
    expect(confirmationSummary({})).toBeNull();
  });
});
