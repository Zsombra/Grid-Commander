import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';
import { aProposal, FakeProposalStore } from '../support/proposal-fakes.js';
import type { Proposal } from '@/domain/proposal/proposal.js';
import { ProposalQueue } from '@/presentation/components/proposal-queue.js';


/**
 * `/pending` — what a model has suggested for you.
 *
 * A proposal that exists and is not visible is a change waiting to happen that
 * nobody knows about, which is the whole reason recording is allowed at all.
 *
 * The assertion that matters most is the third one: "nothing has been proposed"
 * and "we could not ask" must never be the same page.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

// The rendering harness's clock sits at 2026-07-27T12:00Z.
const NOW = new Date('2026-07-27T12:00:00Z');
const hoursBefore = (n: number) => new Date(NOW.getTime() - n * 3600_000);

async function pageWith(rows: Proposal[], listFails: string | null = null) {
  const proposals = new FakeProposalStore();
  proposals.rows = rows;
  proposals.listFails = listFails;
  current = actingWith({ proposals }) as unknown as { app: unknown; user: unknown };
  const Page = (await import('../../app/(app)/pending/page.js')).default;
  return (await rendered(await Page())).text;
}

describe('the proposal queue', () => {
  beforeEach(() => vi.resetModules());

  it('says nothing has been proposed when nothing has', async () => {
    const t = await pageWith([]);
    expect(t).toMatch(/Nothing has been proposed/);
  });

  it('says the store could not be read, and that this is not the same as none', async () => {
    // The single most important assertion here. A failed read reported as an
    // empty queue tells an operator nothing is waiting at the exact moment
    // something is.
    const t = await pageWith([], 'the database refused the connection');
    expect(t).toMatch(/could not be read/i);
    expect(t).toContain('the database refused the connection');
    expect(t).toMatch(/not the same as having none/i);
    expect(t).not.toMatch(/Nothing has been proposed/);
  });

  it('lists what is waiting, in the operator’s words', async () => {
    const t = await pageWith([aProposal({ recordedAt: hoursBefore(1) })]);
    expect(t).toMatch(/Waiting for you/);
    // The operation's label, not its key.
    expect(t).toContain('change an agent’s settings');
    expect(t).toContain('agent-1');
  });

  it('shows a stale proposal as history', async () => {
    const t = await pageWith([aProposal({ id: 'old', recordedAt: hoursBefore(100) })]);
    expect(t).toMatch(/Went stale unread/);
    expect(t).toMatch(/no longer be agreed to/);
    expect(t).toMatch(/nothing happened to the account/);
  });

  it('keeps waiting, stale and decided apart', async () => {
    const t = await pageWith([
      aProposal({ id: 'fresh', recordedAt: hoursBefore(1) }),
      aProposal({ id: 'old', recordedAt: hoursBefore(100) }),
      aProposal({ id: 'done', recordedAt: hoursBefore(2), status: 'agreed' }),
    ]);
    expect(t).toMatch(/Waiting for you/);
    expect(t).toMatch(/Went stale unread/);
    expect(t).toMatch(/Already decided/);
  });

  it('links nowhere until the page it would link to exists', async () => {
    /**
     * Asserted on links the harness collected, not on rendered text.
     *
     * The first draft checked `text` for "/pending/old" — which the harness
     * never emitted, because it joins text nodes and drops attributes. The
     * assertion passed while proving nothing, which is the vacuity every guard
     * here carries a warning about. Found because a sibling expectation on the
     * same string failed for the same reason, and fixed by teaching the harness
     * to collect hrefs.
     *
     * Nothing links yet: `/pending/[id]` is the next piece, and
     * `reachability.test.ts` refuses a link to a route the app does not serve.
     * When it lands, this becomes `['/pending/fresh']` — actionable only.
     */
    const result = {
      kind: 'proposals' as const,
      actionable: [aProposal({ id: 'fresh' })],
      stale: [aProposal({ id: 'old' })],
      resolved: [aProposal({ id: 'done', status: 'agreed' as const })],
    };
    const found = (await rendered(ProposalQueue({ result }))).links;
    expect(found).toEqual([]);
  });

  it('says nothing is waiting when all of them are resolved', async () => {
    const t = await pageWith([aProposal({ status: 'declined', recordedAt: hoursBefore(1) })]);
    // Not "nothing has been proposed" — something was, and it was declined.
    expect(t).toMatch(/Nothing is waiting for a decision/);
    expect(t).not.toMatch(/Nothing has been proposed/);
  });

  it('tells the operator the account is untouched', async () => {
    const t = await pageWith([aProposal({ recordedAt: hoursBefore(1) })]);
    expect(t).toMatch(/cannot make one/i);
    expect(t).toMatch(/has touched your BattleGrid account/i);
  });
});
