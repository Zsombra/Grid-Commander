import { describe, expect, it } from 'vitest';
import { AgentPayloadError, mapAgent, mapCatalog, mapSlotUsage } from '@/infrastructure/battlegrid/agent-mapper.js';

/**
 * Shaped from the real `list_intelligence_agents` response recorded in
 * findings-agents. Trimmed to the fields that participate in a rule, plus the
 * ones that must be ignored.
 */
const livePayload = {
  id: '4b7fb23b-f9c2-4ac3-b8dd-248ebe186ed0',
  userId: '0eccbf37-d90b-4933-88f2-d120627b23f7',
  scope: 'PRIVATE',
  isSystemDefault: false,
  capabilities: { canEdit: true, canDelete: true, canArchive: true, canEditOverlay: true },
  displayName: 'Volatilis',
  status: 'ACTIVE',
  revision: 6,
  strategyId: '1e174365-5d39-4f45-aa1e-d460b9f212bd',
  strategyName: 'Volatilis — imported',
  strategyRevision: 1,
  bindingState: 'BOUND',
  modelId: 'anthropic/claude-sonnet-4.6',
  behavior: { risk: 'AGGRESSIVE', outlook: 'REALIST', conviction: 'MEASURED' },
  contextSources: { includeRsi: true, includeMacd: true },
  tradingConfig: { maxLeverage: 5, maxDailyLossUsd: 300 },
  arenaChallengeEnabled: false,
  overlayText: 'VOLATILIS — hourly volatility-capture.',
  avatarUrl: 'https://example.invalid/avatar.png',
  last24hCostUsd: 1.23,
  performance: { winRate: 0.5 },
};

describe('mapping a live agent payload', () => {
  it('keeps what the rules need', () => {
    const agent = mapAgent(livePayload);
    expect(agent.id).toBe('4b7fb23b-f9c2-4ac3-b8dd-248ebe186ed0');
    expect(agent.revision).toBe(6);
    expect(agent.displayName).toBe('Volatilis');
    expect(agent.binding.strategyName).toBe('Volatilis — imported');
    expect(agent.binding.strategyRevision).toBe(1);
  });

  it('reads a custom brain as a custom brain', () => {
    const brain = mapAgent(livePayload).brain;
    expect(brain.kind).toBe('custom');
    expect(brain.kind === 'custom' && brain.modelId).toBe('anthropic/claude-sonnet-4.6');
    expect(brain.kind === 'custom' && brain.behavior.conviction).toBe('MEASURED');
  });

  it('reads a preset brain as a preset brain', () => {
    const brain = mapAgent({ ...livePayload, brainPreset: 'ROMMEL' }).brain;
    expect(brain.kind).toBe('preset');
    expect(brain.kind === 'preset' && brain.preset).toBe('ROMMEL');
  });

  it('keeps the trading config whole, because the way back needs every field', () => {
    // F-6: a partial config does not error, it resets the omitted fields.
    expect(mapAgent(livePayload).tradingConfig?.fields).toEqual({
      maxLeverage: 5,
      maxDailyLossUsd: 300,
    });
  });

  /**
   * findings-agents F-1 / decision AL-2. The live payload sets `canDelete: true`
   * and there is no delete tool over MCP. Mapping it would put a delete
   * affordance one careless `Object.entries` away from existing.
   */
  it('drops canDelete entirely', () => {
    const permissions = mapAgent(livePayload).permissions as unknown as Record<string, unknown>;
    expect(permissions['canEdit']).toBe(true);
    expect(permissions).not.toHaveProperty('canDelete');
    expect(JSON.stringify(mapAgent(livePayload))).not.toContain('canDelete');
  });

  it('drops presentation and telemetry the rules never consult', () => {
    const json = JSON.stringify(mapAgent(livePayload));
    for (const noise of ['avatarUrl', 'last24hCostUsd', 'performance', 'userId']) {
      expect(json, `${noise} should not reach the domain`).not.toContain(noise);
    }
  });

  it('treats an absent permission as withheld, not as granted', () => {
    const bare = mapAgent({ ...livePayload, capabilities: undefined });
    expect(bare.permissions.canEdit).toBe(false);
    expect(bare.permissions.canArchive).toBe(false);
  });

  /**
   * The revision is what makes optimistic concurrency work. Defaulting it would
   * produce a mutation carrying a number nobody read — which is the shape of the
   * defect the production gate found in change 1.
   */
  it('refuses a payload with no revision rather than inventing one', () => {
    expect(() => mapAgent({ ...livePayload, revision: undefined })).toThrow(AgentPayloadError);
  });

  it('refuses a payload with no id', () => {
    expect(() => mapAgent({ ...livePayload, id: undefined })).toThrow(AgentPayloadError);
  });
});

describe('mapping slot usage', () => {
  const raw = {
    level: 3,
    rank: { name: 'RECRUIT', tier: 3, displayName: 'Recruit III' },
    limit: 3,
    used: 2,
    remaining: 1,
  };

  it('carries the rank, which is the part worth telling the user', () => {
    expect(mapSlotUsage(raw).rankName).toBe('Recruit III');
  });

  it('takes the platform’s remaining count rather than deriving a second opinion', () => {
    expect(mapSlotUsage({ ...raw, remaining: 0 }).remaining).toBe(0);
  });

  it('derives one only when the platform did not say', () => {
    expect(mapSlotUsage({ ...raw, remaining: undefined }).remaining).toBe(1);
  });
});

describe('mapping the catalog', () => {
  const models = {
    models: [
      { modelId: 'anthropic/claude-opus-4.6', displayName: 'Claude Opus 4.6', provider: 'Anthropic', isDefault: false },
      { displayName: 'Nameless', provider: 'Nobody' },
    ],
  };

  const trading = {
    positionManagementPresets: [
      { preset: 'COLT', label: 'Colt', description: 'Patient / wide' },
      { preset: 'WEBLEY', label: 'Webley', description: 'Defensive / measured' },
    ],
    tradingDefaults: {
      bounds: {
        minimumStopLossPct: 0.1,
        maximumStopLossPct: 25,
        maximumMaxDailyTrades: 100,
        minimumAllocationUsd: 10,
      },
    },
  };

  const catalog = mapCatalog(models, trading, ['ROMMEL']);

  it('keeps every model that has an id', () => {
    expect(catalog.models.map((m) => m.modelId)).toEqual(['anthropic/claude-opus-4.6']);
  });

  it('carries the preset the documentation had not caught up to', () => {
    expect(catalog.positionManagementPresets.map((p) => p.preset)).toContain('WEBLEY');
  });

  it('translates the registry keys onto the fields they constrain', () => {
    expect(catalog.bounds['maxStopLossPct']).toEqual({ min: 0.1, max: 25 });
    expect(catalog.bounds['maxDailyTrades']).toEqual({ max: 100 });
    expect(catalog.bounds['minAllocationUsd']).toEqual({ min: 10 });
  });

  it('leaves a field the registry does not bound absent, rather than unbounded', () => {
    expect(catalog.bounds['gridMinConfidence']).toBeUndefined();
  });

  it('survives a registry it cannot read', () => {
    expect(mapCatalog({}, {}, []).bounds).toEqual({});
  });
});
