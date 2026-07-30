import { describe, expect, it } from 'vitest';
import { McpStrategyAdapter, StrategyPayloadError } from '@/infrastructure/battlegrid/strategy-adapter.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';

/** Shaped from the real `list_strategies` response. */
const LIVE = {
  id: '3c17584c-ede7-4aca-ba02-045489868a25',
  ownerUserId: null,
  scope: 'SYSTEM',
  systemKey: 'DUNKIRK',
  name: 'Dunkirk',
  tagline: 'Evacuate and preserve',
  description: 'Ultra Cautious — minimize exposure, never overcommit.',
  visibility: 'UNLISTED',
  timeframe: '1h',
  cadence: 'INTRADAY',
  sectionCount: 4,
  revision: 2,
  isActive: true,
  boundAgentCount: 4,
  forkedFromStrategyId: null,
};

function adapterOver(respond: (req: ToolCallRequest) => unknown) {
  const calls: ToolCallRequest[] = [];
  const battlegrid: BattleGridPort = {
    buildAuthorizationUrl: () => '',
    exchangeCode: async () => {
      throw new Error('unused');
    },
    refresh: async () => {
      throw new Error('unused');
    },
    revoke: async () => {},
    discoverTools: async () => [],
    callTool: async (request) => {
      calls.push(request);
      return {
        content: respond(request),
        classification: {
          mutating: false,
          destructive: false,
          requiredScope: 'mcp:read',
          basis: 'annotations',
        },
        auditEntryId: 'a1',
      };
    },
  };
  return { adapter: new McpStrategyAdapter(battlegrid), calls };
}

const who = { userId: 'u1', accessToken: 'at' };

describe('mapping a live strategy payload', () => {
  it('keeps what the rules need, including the blast radius', async () => {
    const { adapter } = adapterOver(() => ({
      strategies: [LIVE],
      quota: { used: 2, limit: 25, remaining: 23 },
    }));
    const result = await adapter.listStrategies(who);
    expect(result.kind).toBe('strategies');
    if (result.kind !== 'strategies') return;

    const first = result.strategies[0];
    expect(first?.name).toBe('Dunkirk');
    expect(first?.scope).toBe('SYSTEM');
    expect(first?.revision).toBe(2);
    expect(first?.boundAgentCount).toBe(4);
    expect(result.quota).toEqual({ used: 2, limit: 25, remaining: 23 });
  });

  /**
   * The fourth appearance of one shape in this project. An id becomes
   * `strategyId` on a destructive apply and a revision becomes
   * `expectedRevision` on a compile — defaulting either sends a value nobody
   * read into an operation that reconfigures a fleet.
   */
  it('refuses a strategy with no id rather than keying on an empty string', async () => {
    const { adapter } = adapterOver(() => ({ strategies: [{ ...LIVE, id: undefined }] }));
    await expect(adapter.listStrategies(who)).resolves.toMatchObject({ kind: 'unreadable' });
  });

  it('refuses a strategy with no revision rather than inventing zero', async () => {
    const { adapter } = adapterOver(() => ({ strategies: [{ ...LIVE, revision: undefined }] }));
    await expect(adapter.listStrategies(who)).resolves.toMatchObject({ kind: 'unreadable' });
  });

  it('throws a named error so the reason survives', () => {
    expect(new StrategyPayloadError('id').message).toContain('id');
  });

  it('reports an unknown quota as unknown, not as exhausted', async () => {
    const { adapter } = adapterOver(() => ({ strategies: [LIVE] }));
    const result = await adapter.listStrategies(who);
    expect(result.kind === 'strategies' && result.quota).toBeNull();
  });

  it('does not treat a strategy with no bound agents as unknown', async () => {
    const { adapter } = adapterOver(() => ({ strategies: [{ ...LIVE, boundAgentCount: 0 }] }));
    const result = await adapter.listStrategies(who);
    expect(result.kind === 'strategies' && result.strategies[0]?.boundAgentCount).toBe(0);
  });
});

/**
 * The envelope trap. Four tools take `{ request: payload }` and the rest take
 * the payload directly. Getting it wrong is a validation error rather than a
 * silent misbehaviour — but it is exactly the asymmetry someone "tidies up".
 */
describe('the strict outer envelope', () => {
  it('wraps compile in a request envelope', async () => {
    const { adapter, calls } = adapterOver(() => ({
      approvedPlan: { operation: 'UPDATE' },
      reviewContext: {},
      planToken: 'bgsp1.x.y',
    }));
    await adapter.compilePlan({ ...who, request: { operation: 'UPDATE', strategyId: 's1' } });

    const args = calls[0]?.args ?? {};
    expect(args).toHaveProperty('request');
    // The payload never sits beside the envelope.
    expect(args).not.toHaveProperty('operation');
  });

  it('wraps apply in a request envelope', async () => {
    const { adapter, calls } = adapterOver(() => ({ strategy: LIVE }));
    await adapter.applyPlan({
      ...who,
      strategyId: 's1',
      plan: { operation: 'UPDATE' },
      planToken: 'bgsp1.x.y',
      confirmation: { token: 'c1', target: 't' },
    });
    expect(calls[0]?.args).toHaveProperty('request');
  });

  it('does not wrap the tools that take a bare payload', async () => {
    const { adapter, calls } = adapterOver(() => ({ strategies: [] }));
    await adapter.listStrategies(who);
    expect(calls[0]?.args).not.toHaveProperty('request');
  });

  it('carries the confirmation and the target into the guarded call', async () => {
    /**
     * Forwards the target; does not compose it.
     *
     * This used to assert the adapter built `strategy:s1` itself — and that was
     * the bug. `DescribeApplyQuery` issues against
     * `strategy:<id>#<intentDigest>`, so a token issued for a plan was spent
     * against the bare strategy id, `consume` never matched, and **every apply
     * was refused by the product before it reached BattleGrid.** The fake port
     * does not go through `enforce()`, so nothing saw it.
     *
     * A composed target can differ from the issued one. A forwarded one cannot.
     */
    const { adapter, calls } = adapterOver(() => ({ strategy: LIVE }));
    await adapter.applyPlan({
      ...who,
      strategyId: 's1',
      plan: {},
      planToken: 'pt',
      confirmation: { token: 'c1', target: 'strategy:s1#abc123' },
    });
    expect(calls[0]?.confirmationToken).toBe('c1');
    expect(calls[0]?.target, 'the target the caller bound, unaltered').toBe('strategy:s1#abc123');
  });
});

describe('restoring can need repair', () => {
  it('reports REPAIR_REQUIRED as its own outcome', async () => {
    const { adapter } = adapterOver(() => ({ status: 'REPAIR_REQUIRED' }));
    const result = await adapter.setActive({ ...who, strategyId: 's1', expectedRevision: 3, active: true });
    expect(result.kind).toBe('repair-required');
  });

  it('reports an ordinary restore as changed', async () => {
    const { adapter } = adapterOver(() => ({ strategy: { ...LIVE, isActive: true } }));
    const result = await adapter.setActive({ ...who, strategyId: 's1', expectedRevision: 3, active: true });
    expect(result.kind).toBe('changed');
  });
});
