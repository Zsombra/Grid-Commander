import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';
import { anAgent, anEntryDecision, FakeAgentsPort } from '../support/agent-fakes.js';
import type { Scope } from '@/domain/connection/scope.js';

/**
 * `/approvals` — the trades an agent proposed and is waiting on a human for.
 *
 * Two assertions matter more than the rest, and they are the two this change's
 * gate is made of: **accept is not rendered anywhere**, and a connection without
 * fund-committing authority gets no control at all rather than a disabled one.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const DECISION_ID = '6c11b3dc-28ea-4648-ab83-b4d5f14522e1';

// The rendering harness's clock sits at 2026-07-27T12:00Z, so this decision has
// ten minutes of its window left.
const waiting = (over: Parameters<typeof anEntryDecision>[0] = {}) =>
  anEntryDecision({
    id: DECISION_ID,
    status: 'PENDING',
    closedAt: null,
    coinTicker: 'HYPE',
    direction: 'SHORT',
    entryPrice: 57.176,
    stopLoss: 57.73495777,
    takeProfit: 55.5,
    conviction: 0.55,
    positionSizePct: 10,
    positionSizePreset: 'SMALL',
    reasoning: 'Momentum rolled over against a thin bid.',
    expiresAt: '2026-07-27T12:10:00.000Z',
    ...over,
  });

function world(
  decisions: ReturnType<typeof waiting>[],
  heldScopes: readonly Scope[] = ['mcp:read'],
  unreadable = false,
) {
  const agents = new FakeAgentsPort([anAgent({ id: 'a1', displayName: 'Undertow' })]);
  agents.entryDecisionsByAgent.set(
    'a1',
    unreadable
      ? { kind: 'unreadable', reason: 'upstream 500', cause: 'unreachable' }
      : decisions.length === 0
        ? { kind: 'none' }
        : { kind: 'entries', entries: decisions, total: decisions.length },
  );
  current = actingWith({ agents, heldScopes }) as unknown as { app: unknown; user: unknown };
  return agents;
}

async function queuePage(search: Record<string, string> = {}) {
  const Page = (await import('../../app/(app)/approvals/page.js')).default;
  return (await rendered(await Page({ searchParams: Promise.resolve(search) }))).text;
}

async function decisionPage(search: Record<string, string> = {}) {
  const Page = (await import('../../app/(app)/approvals/[agentId]/[id]/page.js')).default;
  return (
    await rendered(
      await Page({
        params: Promise.resolve({ agentId: 'a1', id: DECISION_ID }),
        searchParams: Promise.resolve(search),
      }),
    )
  ).text;
}

describe('the queue', () => {
  beforeEach(() => vi.resetModules());

  it('lists a waiting decision with its levels, conviction and reasoning', async () => {
    world([waiting()]);
    const t = await queuePage();

    expect(t).toMatch(/SHORT HYPE/);
    expect(t).toContain('57.176');
    expect(t).toContain('57.73495777');
    expect(t).toContain('55.5');
    expect(t).toContain('0.55');
    expect(t).toMatch(/Momentum rolled over/);
    expect(t).toMatch(/Undertow/);
  });

  it('shows how long is left rather than a raw expiry stamp', async () => {
    world([waiting()]);
    const t = await queuePage();

    expect(t).toMatch(/10m 0s left to answer/);
    expect(t).not.toContain('2026-07-27T12:10:00.000Z');
  });

  it('says nothing is waiting when nothing is', async () => {
    world([]);
    expect(await queuePage()).toMatch(/Nothing is waiting/);
  });

  /**
   * The mistake this surface must never make. "Nothing is waiting" is a fact
   * about the account; "we could not ask" is a fact about the connection, and
   * here the difference is a real trade expiring unanswered.
   */
  it('never reports an unreadable queue as an empty one', async () => {
    world([], ['mcp:read'], true);
    const t = await queuePage();

    // The unqualified claim is the one that must not appear. The heading may
    // still open with "Nothing is waiting" provided it finishes the sentence —
    // "from the agents that answered" is a narrower fact and a true one.
    expect(t).not.toMatch(/None of your agents has a trade waiting/);
    expect(t).toMatch(/Nothing is waiting from the agents that answered/);
    expect(t).toMatch(/this is not the whole account/);
    expect(t).toMatch(/could not be asked/);
    expect(t).toContain('upstream 500');
  });

  it('states no currency amount for a waiting decision', async () => {
    world([waiting()]);
    const t = await queuePage();

    // The proportion, and what it is a proportion of. Never a figure.
    expect(t).toMatch(/10% of the agent's available funds/);
    expect(t).not.toMatch(/\$\s?\d/);
  });
});

describe('one decision, and the answer that can be given to it', () => {
  beforeEach(() => vi.resetModules());

  /**
   * **The gate, asserted rather than asserted-about.** Section 5 of the change
   * is not begun until a cancel has been performed through the product and
   * confirmed in the audit (DL-11), so no surface may reach accept.
   */
  it('renders no accept control anywhere, with authority or without', async () => {
    world([waiting()], ['mcp:read', 'mcp:wager']);
    const withAuthority = await decisionPage();
    expect(withAuthority).not.toMatch(/Accept this|Accept and|>\s*Accept\s*</);

    vi.resetModules();
    world([waiting()], ['mcp:read']);
    const without = await decisionPage();
    expect(without).not.toMatch(/Accept this|Accept and|>\s*Accept\s*</);
  });

  it('offers cancel, naming what is lost, when the connection may answer', async () => {
    world([waiting()], ['mcp:read', 'mcp:wager']);
    const t = await decisionPage();

    expect(t).toMatch(/Cancel this proposal/);
    expect(t).toMatch(/will not propose this trade again/);
  });

  /**
   * Gate by not rendering, never by disabling. A greyed-out cancel says the
   * product could do this if the operator found the right lever — on the
   * surface where that belief is most expensive.
   */
  it('renders the decision but no control at all without the authority', async () => {
    world([waiting()], ['mcp:read']);
    const t = await decisionPage();

    // Fully readable.
    expect(t).toMatch(/SHORT HYPE/);
    expect(t).toContain('57.176');
    // And no control.
    expect(t).not.toMatch(/Cancel this proposal/);
    expect(t).not.toMatch(/disabled/);
    // Offering the step-up, from the point of use.
    expect(t).toMatch(/authority this connection does not hold/);
    expect(t).toMatch(/Grant authority to answer proposed trades/);
  });

  /**
   * **Task 3.4.** Expiry is told as expiry — never as a cancel the operator
   * performed. Saying "cancelled" would credit the product with an act that
   * never happened and an outcome the agent's own record contradicts.
   */
  it('reports a decision that expired first as expired, not as a cancel', async () => {
    world([waiting({ status: 'EXPIRED', closedAt: '2026-07-27T11:59:00.000Z' })], [
      'mcp:read',
      'mcp:wager',
    ]);
    const t = await decisionPage();

    expect(t).toMatch(/expired unanswered/i);
    expect(t).toMatch(/Nothing was cancelled/);
    expect(t).not.toMatch(/Cancel this proposal/);
  });
});

describe('the step-up', () => {
  beforeEach(() => vi.resetModules());

  async function authorityPage(search: Record<string, string> = {}) {
    const Page = (await import('../../app/(app)/approvals/authority/page.js')).default;
    return (await rendered(await Page({ searchParams: Promise.resolve(search) }))).text;
  }

  it('states what the authority permits and that it commits real money', async () => {
    world([waiting()], ['mcp:read']);
    const t = await authorityPage();

    expect(t).toMatch(/opens a position with your money/);
    expect(t).toMatch(/commits nothing/);
    expect(t).toMatch(/commit your money at BattleGrid/);
  });

  it('says the platform caps still apply', async () => {
    world([waiting()], ['mcp:read']);
    expect(await authorityPage()).toMatch(/limits do not change/);
  });

  it('offers nothing to grant when the authority is already held', async () => {
    world([waiting()], ['mcp:read', 'mcp:wager']);
    const t = await authorityPage();

    expect(t).toMatch(/already/);
    expect(t).not.toMatch(/Continue to BattleGrid to grant/);
  });

  /**
   * A crafted `next` must not bounce somebody to another origin carrying the
   * appearance of this product's authority behind them.
   */
  it('refuses an off-site return address', async () => {
    world([waiting()], ['mcp:read']);
    const t = await authorityPage({ next: 'https://evil.example/steal' });

    expect(t).not.toContain('evil.example');
  });
});
