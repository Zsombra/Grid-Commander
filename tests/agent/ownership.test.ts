import { describe, expect, it } from 'vitest';
import type { Agent } from '@/domain/agent/agent.js';
import { isArchivable, isEditable, isReactivatable, isRebindable } from '@/domain/agent/agent.js';
import { ownerOf, partitionEdit } from '@/domain/agent/field-ownership.js';

function agent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'a1',
    revision: 3,
    displayName: 'Volatilis',
    status: 'ACTIVE',
    binding: {
      strategyId: 's1',
      strategyName: 'Volatilis — imported',
      strategyRevision: 1,
      state: 'BOUND',
    },
    brain: { kind: 'preset', preset: 'ROMMEL' },
    tradingConfig: null,
    arenaChallengeEnabled: false,
    overlayText: null,
    performance: null,
    permissions: { canEdit: true, canArchive: true, canEditOverlay: true },
    ...overrides,
  };
}

/** A4 — editing changes only what the agent owns. */
describe('agent_owned_fields_only', () => {
  it('accepts the fields the agent owns', () => {
    const { accepted, rejected } = partitionEdit({
      displayName: 'Renamed',
      arenaChallengeEnabled: true,
    });
    expect(Object.keys(accepted).sort()).toEqual(['arenaChallengeEnabled', 'displayName']);
    expect(rejected).toEqual([]);
  });

  it('rejects an unknown field rather than forwarding it', () => {
    // Forwarding would mean sending a field we cannot reason about into a
    // mutation on someone's account.
    const { accepted, rejected } = partitionEdit({ somethingNew: 1 });
    expect(accepted).toEqual({});
    expect(rejected[0]?.owner).toBe('unknown');
  });

  it('classifies every declared field', () => {
    expect(ownerOf('tradingConfig')).toBe('agent');
    expect(ownerOf('contextSources')).toBe('strategy');
    expect(ownerOf('nonsense')).toBe('unknown');
  });
});

/** A4 — inherited configuration is not editable from the agent. */
describe('inherited_is_not_editable', () => {
  it('refuses a strategy-owned field', () => {
    const { accepted, rejected } = partitionEdit({ contextSources: { includeRsi: true } });
    expect(accepted).toEqual({});
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.owner).toBe('strategy');
  });

  it('points at the strategy or a rebind, rather than just saying no', () => {
    const { rejected } = partitionEdit({ signalRules: [] });
    expect(rejected[0]?.reason).toMatch(/strategy/i);
    expect(rejected[0]?.reason).toMatch(/rebind/i);
  });

  it('does not silently do either of them', () => {
    // The rejection must not be accompanied by the field arriving anyway.
    const { accepted } = partitionEdit({ displayName: 'ok', prose: 'sneaky' });
    expect(accepted).toEqual({ displayName: 'ok' });
  });
});

/** A7 — agents the platform owns are not presented as editable. */
describe('immutable_offers_no_actions', () => {
  it('offers nothing when the platform says the agent cannot be edited', () => {
    const locked = agent({ permissions: { canEdit: false, canArchive: false, canEditOverlay: false } });
    expect(isEditable(locked)).toBe(false);
    expect(isArchivable(locked)).toBe(false);
    expect(isRebindable(locked)).toBe(false);
  });

  it('offers them when it says the agent can be', () => {
    const a = agent();
    expect(isEditable(a)).toBe(true);
    expect(isArchivable(a)).toBe(true);
    expect(isRebindable(a)).toBe(true);
  });

  it('treats an archived agent as uneditable but reactivatable', () => {
    const archived = agent({ status: 'ARCHIVED' });
    expect(isEditable(archived)).toBe(false);
    expect(isArchivable(archived)).toBe(false);
    expect(isReactivatable(archived)).toBe(true);
  });

  /**
   * findings-agents F-1 / decision AL-2. The live payload sets `canDelete: true`
   * and there is no delete tool in the MCP surface — the flag describes what
   * BattleGrid's own app can do. Mapping it would ship a button that cannot
   * work.
   */
  it('has no notion of deletion at all', () => {
    const a = agent() as unknown as Record<string, unknown>;
    expect(a['permissions']).not.toHaveProperty('canDelete');
    expect(Object.keys(a)).not.toContain('canDelete');
  });
});
