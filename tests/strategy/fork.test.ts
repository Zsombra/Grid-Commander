import { describe, expect, it } from 'vitest';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import { ToolRefusedError } from '@/infrastructure/battlegrid/mcp-adapter.js';

/**
 * The fork at the wire: what `fork_strategy` is actually sent, and what its
 * refusals become.
 *
 * Adapter-level on purpose — the command's fake cannot see either property.
 * The `name` argument exists in the declared schema with `minLength: 1`, so
 * whether a blank travels is decided here, where that schema is honoured; and
 * a refusal is converted to a result here, the same seam where `setActive`
 * already does it.
 */

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
          mutating: true,
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

/** The platform's answer to a successful fork, as `fork_strategy` declares it. */
const forkedPayload = () => ({
  strategy: {
    id: 'f1',
    name: 'Dunkirk, second landing',
    revision: 1,
    scope: 'PRIVATE',
    isActive: true,
    boundAgentCount: 0,
    forkedFromStrategyId: 's1',
  },
});

const request = { ...who, strategyId: 's1', sourceRevision: 2 };

describe('what the fork sends', () => {
  it('sends the chosen name beside the source and revision', async () => {
    const { adapter, calls } = adapterOver(forkedPayload);
    const res = await adapter.forkStrategy({ ...request, name: 'Dunkirk, second landing' });
    expect(calls[0]?.tool).toBe('fork_strategy');
    expect(calls[0]?.args).toEqual({
      strategyId: 's1',
      sourceRevision: 2,
      name: 'Dunkirk, second landing',
    });
    expect(res.kind === 'forked' && res.strategy.id).toBe('f1');
  });

  it('sends no name when none was chosen', async () => {
    const { adapter, calls } = adapterOver(forkedPayload);
    await adapter.forkStrategy(request);
    // Absent, not empty: an absent argument is how the platform is told to use
    // its own naming, `<parent> (fork)`.
    expect(calls[0]?.args).toEqual({ strategyId: 's1', sourceRevision: 2 });
  });

  it('treats a blank as no name — the schema declares minLength 1', async () => {
    const { adapter, calls } = adapterOver(forkedPayload);
    await adapter.forkStrategy({ ...request, name: '   ' });
    expect(calls[0]?.args).toEqual({ strategyId: 's1', sourceRevision: 2 });
  });
});

describe('what a refused fork becomes', () => {
  it('a refusal is a result carrying the platform’s words', async () => {
    // The refusal live forking actually meets: INTERNAL_ERROR when a strategy
    // named `<parent> (fork)` already exists (2026-08-06 — see
    // openspec/backlog/forking-a-name-that-exists-is-a-500.md). It used to
    // escape as a throw and crash the server action.
    const detail = '{"code":"INTERNAL_ERROR","message":"Internal server error"}';
    const { adapter } = adapterOver(() => {
      throw new ToolRefusedError('fork_strategy', detail);
    });
    const res = await adapter.forkStrategy(request);
    expect(res).toEqual({ kind: 'refused', reason: detail });
  });

  it('a transport failure still throws — "no answer" is not "no"', async () => {
    const { adapter } = adapterOver(() => {
      throw new Error('tools/call failed with 504');
    });
    await expect(adapter.forkStrategy(request)).rejects.toThrow('tools/call failed with 504');
  });
});
