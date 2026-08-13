import { describe, expect, it } from 'vitest';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';

/**
 * Reading a history the platform refuses in part.
 *
 * `list_gate_blocks` returns 500 INTERNAL_ERROR on **specific rows**,
 * deterministically, and the refusals cluster at the head of the history
 * (#100, re-bisected 2026-08-13). One call for a hundred rows therefore fails
 * whenever any one of the hundred is poisoned — which on 2026-08-13 left all
 * three active agents on the operator's account reporting `unreadable`, while
 * three archived ones summarised normally from 297, 970 and 27 blocks. The
 * split is the diagnosis: the refusals track the newest rows, so an agent
 * still writing history is exactly the one that goes dark.
 *
 * The property under test is a pair, and the second half is what keeps this
 * from becoming permanent machinery: **read around a refusal, and cost nothing
 * when there is none.**
 */

const who = { userId: 'u1', accessToken: 'at', agentId: 'a-1' };

/** Undertow's dominant reason on 2026-08-13, and the one the surface exists to name. */
function conflictRow(n: number) {
  return {
    id: `b-${n}`,
    coinTicker: 'SOL',
    gateStage: 'ACCOUNT',
    reasonCode: 'OPEN_POSITION_CONFLICT',
    reasonDetail: {},
    createdAt: `2026-08-${String(10 + (n % 3)).padStart(2, '0')}T0${n % 9}:15:00.000Z`,
  };
}

/**
 * The harness `coin-qualification.test.ts` established: a `BattleGridPort`
 * whose every call is recorded, so a test can assert how many were made and
 * not merely what came back.
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
      const content = respond(request);
      if (content instanceof Error) throw content;
      return {
        content,
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
  return { adapter: new McpAgentAdapter(battlegrid), calls };
}

/** The page a request asked for, or `null` for the single unpaged read. */
const pageOf = (req: ToolCallRequest): number | null =>
  typeof req.args['page'] === 'number' ? req.args['page'] : null;

describe('a history the platform serves whole', () => {
  it('costs exactly one call', async () => {
    const { adapter, calls } = adapterOver(() => ({
      entries: [conflictRow(1), conflictRow(2)],
      total: 2,
    }));

    const out = await adapter.readGateBlocks({ ...who, limit: 100 });

    if (out.kind !== 'entries') throw new Error(out.kind);
    expect(out.entries).toHaveLength(2);
    // The assertion that keeps the fallback from becoming the normal path. A
    // workaround that runs when nothing is wrong is not a workaround, it is
    // architecture — and this one must retire itself the day #100 is fixed.
    expect(calls).toHaveLength(1);
    // Unpaged: the ordinary read is the ordinary read, untouched.
    expect(pageOf(calls[0]!)).toBeNull();
  });

  it('admits no gap, because there was none', async () => {
    const { adapter } = adapterOver(() => ({ entries: [conflictRow(1)], total: 1 }));

    const out = await adapter.readGateBlocks({ ...who, limit: 100 });

    if (out.kind !== 'entries') throw new Error(out.kind);
    // Not `undefined`, and not an empty object that reads as truthy on a
    // surface. Null is the claim "nothing refused", made explicitly.
    expect(out.refused).toBeNull();
  });

  it('reports an empty history as none, not as a refusal', async () => {
    const { adapter, calls } = adapterOver(() => ({ entries: [], total: 0 }));

    const out = await adapter.readGateBlocks({ ...who, limit: 100 });

    expect(out.kind).toBe('none');
    expect(calls).toHaveLength(1);
  });
});

describe('a history that refuses in part', () => {
  it('summarises what was served instead of reporting the whole thing unreadable', async () => {
    // The live shape: the single call fails, and so does the newest window.
    // Everything older answers.
    const { adapter, calls } = adapterOver((req) => {
      const page = pageOf(req);
      if (page === null || page === 1) return new Error('500 INTERNAL_ERROR');
      return { entries: Array.from({ length: 25 }, (_, i) => conflictRow(i)), total: 297 };
    });

    const out = await adapter.readGateBlocks({ ...who, limit: 100 });

    if (out.kind !== 'entries') throw new Error(`${out.kind}: ${JSON.stringify(out)}`);
    expect(out.entries.length).toBeGreaterThanOrEqual(100);
    expect(out.total).toBe(297);
    // One window refused, and the result says so rather than presenting the
    // rest as the agent's whole history.
    expect(out.refused).toEqual({ windows: 1, rows: 25 });
    // The single call, then the windows. The refused one is asked once and
    // skipped, not retried — the refusals are deterministic per row.
    expect(calls.map(pageOf)).toEqual([null, 1, 2, 3, 4, 5]);
  });

  it('stops walking once it has what was asked for', async () => {
    const { adapter, calls } = adapterOver((req) => {
      if (pageOf(req) === null) return new Error('500 INTERNAL_ERROR');
      return { entries: Array.from({ length: 25 }, (_, i) => conflictRow(i)), total: 297 };
    });

    await adapter.readGateBlocks({ ...who, limit: 50 });

    // Two windows fill fifty. Walking the other six would answer an outage
    // with a second one against a rate-limited platform.
    expect(calls.map(pageOf)).toEqual([null, 1, 2]);
  });

  it('is bounded when the refusals keep coming', async () => {
    const { adapter, calls } = adapterOver((req) => {
      const page = pageOf(req);
      if (page === null || page < 7) return new Error('500 INTERNAL_ERROR');
      return { entries: [conflictRow(1)], total: 297 };
    });

    const out = await adapter.readGateBlocks({ ...who, limit: 100 });

    if (out.kind !== 'entries') throw new Error(out.kind);
    // Eight windows, then it stops and admits the gap. It does not keep going
    // until it has a hundred rows, because that is a loop with no exit against
    // a platform that is already failing.
    expect(calls).toHaveLength(9);
    expect(out.refused).toEqual({ windows: 6, rows: 150 });
    expect(out.entries).toHaveLength(2);
  });

  it('treats the end of the history as the end, not as a gap', async () => {
    const { adapter } = adapterOver((req) => {
      const page = pageOf(req);
      if (page === null) return new Error('500 INTERNAL_ERROR');
      if (page === 1) return { entries: [conflictRow(1)], total: 1 };
      return { entries: [], total: 1 };
    });

    const out = await adapter.readGateBlocks({ ...who, limit: 100 });

    if (out.kind !== 'entries') throw new Error(out.kind);
    // An empty window means there are no more rows. Counting it as a refusal
    // would put a permanent "some could not be read" on every agent whose
    // history is shorter than the walk.
    expect(out.refused).toBeNull();
    expect(out.entries).toHaveLength(1);
  });
});

describe('a history that refuses entirely', () => {
  it('stays unreadable, carrying the platform’s own reason', async () => {
    const { adapter, calls } = adapterOver(() => new Error('500 INTERNAL_ERROR'));

    const out = await adapter.readGateBlocks({ ...who, limit: 100 });

    if (out.kind !== 'unreadable') throw new Error(out.kind);
    // Reading around a refusal is not inventing a summary from nothing. An
    // empty summary here would tell an operator their agent is fine on the
    // strength of a read that failed nine times.
    expect(out.reason).toContain('500 INTERNAL_ERROR');
    expect(out.cause).toBe('unreachable');
    expect(calls).toHaveLength(9);
  });

  it('is unreadable rather than none when every window is refused', async () => {
    const { adapter } = adapterOver(() => new Error('500 INTERNAL_ERROR'));

    const out = await adapter.readGateBlocks({ ...who, limit: 100 });

    // The distinction the whole result type exists for: `none` is good news
    // and this is not news at all.
    expect(out.kind).not.toBe('none');
  });
});
