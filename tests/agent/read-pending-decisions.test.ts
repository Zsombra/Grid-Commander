import { describe, expect, it } from 'vitest';

import { ReadPendingDecisionsQuery } from '@/application/use-cases/read-pending-decisions.query.js';
import { anEntryDecision, FakeAgentsPort } from '../support/agent-fakes.js';
import { FakeClock } from '../support/fakes.js';

const REQ = { userId: 'u1', accessToken: 't1', agentId: 'a1' };

/** A decision still awaiting an answer, shaped from the live row of 2026-08-15. */
const waiting = (over: Parameters<typeof anEntryDecision>[0] = {}) =>
  anEntryDecision({
    status: 'PENDING',
    closedAt: null,
    entryPrice: 57.176,
    stopLoss: 57.73495777,
    takeProfit: 55.5,
    positionSizePct: 10,
    positionSizePreset: 'SMALL',
    expiresAt: '2026-07-27T12:15:00.000Z',
    ...over,
  });

function world(): { agents: FakeAgentsPort; clock: FakeClock; query: ReadPendingDecisionsQuery } {
  const agents = new FakeAgentsPort();
  const clock = new FakeClock();
  return { agents, clock, query: new ReadPendingDecisionsQuery(agents, clock) };
}

describe('reading the queue', () => {
  it('shows a decision that is still awaiting an answer', async () => {
    const { agents, query } = world();
    agents.entryDecisions = { kind: 'entries', entries: [waiting()], total: 1 };

    const result = await query.execute(REQ);

    expect(result.kind).toBe('waiting');
    expect(result.kind === 'waiting' && result.decisions).toHaveLength(1);
  });

  it('filters out decisions the platform has already closed', async () => {
    // The page was read a moment ago; this one has since been answered.
    const { agents, query } = world();
    agents.entryDecisions = {
      kind: 'entries',
      entries: [waiting({ status: 'CANCELLED', closedAt: '2026-07-27T11:59:00.000Z' })],
      total: 1,
    };

    expect((await query.execute(REQ)).kind).toBe('none');
  });

  it('filters out an EXECUTED decision even when nothing closed it', async () => {
    const { agents, query } = world();
    agents.entryDecisions = {
      kind: 'entries',
      entries: [waiting({ status: 'EXECUTED', closedAt: null })],
      total: 1,
    };

    expect((await query.execute(REQ)).kind).toBe('none');
  });
});

describe('empty is not unreadable', () => {
  it('reports nothing waiting when the platform returns no rows', async () => {
    const { agents, query } = world();
    agents.entryDecisions = { kind: 'none' };

    expect(await query.execute(REQ)).toEqual({ kind: 'none' });
  });

  it('reports a refused read as unreadable, carrying the platform’s own reason', async () => {
    // Rendering this as "nothing waiting" would tell an operator their agents
    // proposed nothing when the truth is that nobody knows — and on this
    // surface that means a real trade expires unanswered.
    const { agents, query } = world();
    agents.entryDecisions = { kind: 'unreadable', reason: 'upstream 500', cause: 'refused' };

    // The cause travels with the reason: `WhyNotLoaded` says something different
    // for a refusal than for an outage, and telling somebody with a bad
    // credential to wait out an outage is the mistake it exists to stop.
    expect(await query.execute(REQ)).toEqual({
      kind: 'unreadable',
      reason: 'upstream 500',
      cause: 'refused',
    });
  });
});

describe('time remaining', () => {
  it('is derived server-side from the platform’s own expiry', async () => {
    const { agents, query } = world(); // clock is 12:00:00Z, expiry 12:15:00Z
    agents.entryDecisions = { kind: 'entries', entries: [waiting()], total: 1 };

    const result = await query.execute(REQ);

    expect(result.kind === 'waiting' && result.decisions[0]?.msRemaining).toBe(15 * 60 * 1000);
  });

  it('floors at zero rather than going negative', async () => {
    const { agents, clock, query } = world();
    agents.entryDecisions = { kind: 'entries', entries: [waiting()], total: 1 };
    clock.advance(20 * 60 * 1000);

    const result = await query.execute(REQ);

    expect(result.kind === 'waiting' && result.decisions[0]?.msRemaining).toBe(0);
  });

  it('is null when the platform sent no expiry — unknown, not "expires now"', async () => {
    const { agents, query } = world();
    agents.entryDecisions = { kind: 'entries', entries: [waiting({ expiresAt: null })], total: 1 };

    const result = await query.execute(REQ);

    expect(result.kind === 'waiting' && result.decisions[0]?.msRemaining).toBeNull();
  });
});

describe('the Iron Rule on this surface', () => {
  it('produces no currency amount anywhere for a pending decision', async () => {
    // The platform computes no size until accept time. Any figure here would
    // be our arithmetic wearing the platform's authority (PE-2).
    const { agents, query } = world();
    agents.entryDecisions = { kind: 'entries', entries: [waiting()], total: 1 };

    const result = await query.execute(REQ);
    const view = result.kind === 'waiting' ? result.decisions[0] : undefined;

    expect(view).toBeDefined();
    expect(Object.keys(view ?? {})).toEqual(['decision', 'msRemaining']);
    expect(view?.decision.positionSizePct).toBe(10);
    // The fill fields the platform leaves null until acceptance are not on the
    // port type at all — there is nothing here to render an amount from.
    expect(view?.decision.executedOrderId).toBeNull();
  });
});
