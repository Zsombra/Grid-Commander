import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ListStrategiesQuery } from '@/application/use-cases/list-strategies.query.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import type { StrategiesPort, StrategyListResult } from '@/ports/strategies.js';

const who = { userId: 'u1', accessToken: 'at' };

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
    callTool: async (request) => ({
      content: respond(request),
      classification: {
        mutating: false,
        destructive: false,
        requiredScope: 'mcp:read',
        basis: 'annotations',
      },
      auditEntryId: 'a1',
    }),
  };
  return { adapter: new McpStrategyAdapter(battlegrid) };
}

/**
 * A catalog with nothing in it, told apart from one that could not be read.
 *
 * These are indistinguishable as blank space, and only one of them is true of
 * the account. Telling someone their catalog is empty when the platform simply
 * did not answer is how they conclude their work is gone — which is why
 * `RosterResult` and `JournalResult` have carried this distinction from the
 * start, and why fixing it here meant adding a kind to the port rather than a
 * `length === 0` branch to a component.
 */

describe('the platform returning nothing', () => {
  it('is empty, not a zero-length list of strategies', async () => {
    const { adapter } = adapterOver(() => ({ strategies: [] }));
    await expect(adapter.listStrategies(who)).resolves.toEqual({ kind: 'empty' });
  });

  it('is empty when the platform omits the field entirely', async () => {
    // Previously this produced `{ kind: 'strategies', strategies: [] }` — the
    // same shape as a real catalog, with nothing in it.
    const { adapter } = adapterOver(() => ({}));
    await expect(adapter.listStrategies(who)).resolves.toEqual({ kind: 'empty' });
  });

  it('carries no quota', async () => {
    // A quota is meaningful against the strategies you own, and an empty
    // catalog owns none. Deliberately unlike RosterResult's `empty`, which
    // keeps `slots` because an account with no agents still has a capacity.
    const { adapter } = adapterOver(() => ({ strategies: [], quota: { used: 0, limit: 25, remaining: 25 } }));
    await expect(adapter.listStrategies(who)).resolves.toEqual({ kind: 'empty' });
  });
});

describe('a catalog that could not be read', () => {
  it('stays unreadable and is never reported as empty', async () => {
    const { adapter } = adapterOver(() => {
      throw new Error('tools/call failed with 503');
    });
    const result = await adapter.listStrategies(who);
    expect(result.kind).toBe('unreadable');
  });

  it('is still unreadable when a strategy in it is malformed', async () => {
    // A payload that arrived and could not be trusted is not an empty account.
    const { adapter } = adapterOver(() => ({ strategies: [{ ...LIVE, id: undefined }] }));
    const result = await adapter.listStrategies(who);
    expect(result.kind).toBe('unreadable');
  });
});

describe('what the use case hands to the surface', () => {
  const query = (result: StrategyListResult) =>
    new ListStrategiesQuery({
      listStrategies: async () => result,
    } as unknown as StrategiesPort).execute({ userId: 'u1', accessToken: 'at' });

  it('passes the empty kind through rather than flattening it', async () => {
    const { result, listings } = await query({ kind: 'empty' });
    expect(result.kind).toBe('empty');
    expect(listings).toEqual([]);
  });

  it('reports forking as unknown rather than inventing a remaining count', async () => {
    // The platform returned no strategies, so it reported no quota. Saying
    // "24 remaining" here would be the fabrication this product refuses
    // everywhere else.
    const { forking } = await query({ kind: 'empty' });
    expect(forking).toEqual({ kind: 'unknown' });
  });

  it('keeps an unreadable catalog distinguishable at the surface', async () => {
    const { result } = await query({ kind: 'unreadable', reason: 'timeout', cause: 'unreachable' });
    expect(result.kind).toBe('unreadable');
  });
});

describe('the surface is handed the distinction rather than deriving it', () => {
  const source = readFileSync('src/presentation/components/strategy-list.tsx', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');

  it('branches on the kind, not on a length', () => {
    expect(source).toMatch(/result\.kind === 'empty'/);
    expect(source, 'counting is how the two states became indistinguishable').not.toMatch(
      /listings\.length\s*===\s*0|strategies\.length\s*===\s*0/,
    );
  });

  it('says nothing failed, so it is not mistaken for the error branch', () => {
    expect(source).toMatch(/nothing here has failed/i);
  });

  it('offers no action against strategies that were not returned', () => {
    // `list_strategies` returns the visible SYSTEM catalog *and* the private
    // strategies you own, so an empty result leaves nothing to fork from.
    // "Start by forking one of BattleGrid's" would be an affordance leading
    // nowhere, and worse than silence because it reads as reassurance.
    const empty = source.slice(source.indexOf("result.kind === 'empty'"), source.indexOf('space-y-4'));
    expect(empty).not.toMatch(/href=/);
    expect(empty).not.toMatch(/\bfork(ing)?\b/i);
  });
});
