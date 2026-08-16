import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ReadApprovalQueueQuery } from '@/application/use-cases/read-approval-queue.query.js';
import { DescribeDecisionAnswerQuery } from '@/application/use-cases/describe-decision-answer.query.js';
import { confirmationTarget } from '@/domain/capability/confirmation.js';
import { levelsOf } from '@/domain/agent/pending-decision.js';
import type { EntryDecision } from '@/ports/agents.js';
import { anAgent, anEntryDecision, FakeAgentsPort } from '../support/agent-fakes.js';
import { FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * The queue an operator reads, and the page that describes answering one row.
 *
 * Change tasks 1.4b, 3.3, 3.4 and 7.2.
 */

const DECISION_ID = '6c11b3dc-28ea-4648-ab83-b4d5f14522e1';

const waiting = (over: Parameters<typeof anEntryDecision>[0] = {}): EntryDecision =>
  anEntryDecision({
    id: DECISION_ID,
    status: 'PENDING',
    closedAt: null,
    coinTicker: 'HYPE',
    direction: 'SHORT',
    entryPrice: 57.176,
    stopLoss: 57.73495777,
    takeProfit: 55.5,
    positionSizePct: 10,
    positionSizePreset: 'SMALL',
    expiresAt: '2026-07-27T12:15:00.000Z',
    ...over,
  });

const REQ = { userId: 'u1', accessToken: 't1' };

function queueOver(seed: readonly { id: string; name: string }[]): {
  agents: FakeAgentsPort;
  query: ReadApprovalQueueQuery;
} {
  const agents = new FakeAgentsPort(seed.map((a) => anAgent({ id: a.id, displayName: a.name })));
  return { agents, query: new ReadApprovalQueueQuery(agents, new FakeClock()) };
}

describe('the queue reads every agent, not one', () => {
  it('names the agent that proposed each decision', async () => {
    const { agents, query } = queueOver([
      { id: 'a1', name: 'Undertow' },
      { id: 'a2', name: 'Breakwater' },
    ]);
    agents.entryDecisionsByAgent.set('a1', { kind: 'entries', entries: [waiting()], total: 1 });
    agents.entryDecisionsByAgent.set('a2', { kind: 'none' });

    const result = await query.execute(REQ);

    expect(result.kind).toBe('waiting');
    expect(result.kind === 'waiting' && result.groups.map((g) => g.agentName)).toEqual(['Undertow']);
  });

  /**
   * **The failure this query exists to get right.** One read per agent means the
   * ordinary failure is that *some* answer. An operator shown one agent's
   * decisions and told nothing about the other would reasonably conclude the
   * other proposed nothing — on the one surface where that mistake means a real
   * trade expires unanswered.
   */
  it('carries the agents it could not ask alongside the ones it could', async () => {
    const { agents, query } = queueOver([
      { id: 'a1', name: 'Undertow' },
      { id: 'a2', name: 'Breakwater' },
    ]);
    agents.entryDecisionsByAgent.set('a1', { kind: 'entries', entries: [waiting()], total: 1 });
    agents.entryDecisionsByAgent.set('a2', {
      kind: 'unreadable',
      reason: 'upstream 500',
      cause: 'unreachable',
    });

    const result = await query.execute(REQ);

    expect(result.kind).toBe('waiting');
    expect(result.kind === 'waiting' && result.unreadable).toEqual([
      { agentId: 'a2', agentName: 'Breakwater', reason: 'upstream 500', cause: 'unreachable' },
    ]);
  });

  it('still reports the unreachable agent when no decision was found anywhere', async () => {
    const { agents, query } = queueOver([{ id: 'a2', name: 'Breakwater' }]);
    agents.entryDecisionsByAgent.set('a2', {
      kind: 'unreadable',
      reason: 'upstream 500',
      cause: 'unreachable',
    });

    const result = await query.execute(REQ);

    // "Nothing is waiting" and "nobody knows" must never collapse into one.
    expect(result.kind).toBe('none');
    expect(result.kind === 'none' && result.unreadable).toHaveLength(1);
  });

  it('tells an unreadable roster apart from an account with no agents', async () => {
    const { agents, query } = queueOver([{ id: 'a1', name: 'Undertow' }]);
    agents.rosterReadable = false;

    expect((await query.execute(REQ)).kind).toBe('unreadable');

    const empty = queueOver([]);
    expect((await empty.query.execute(REQ)).kind).toBe('no-agents');
  });

  it('leaves out decisions the platform has already closed', async () => {
    const { agents, query } = queueOver([{ id: 'a1', name: 'Undertow' }]);
    agents.entryDecisionsByAgent.set('a1', {
      kind: 'entries',
      entries: [waiting({ status: 'EXPIRED', closedAt: '2026-08-15T13:33:10.729Z' })],
      total: 1,
    });

    expect((await query.execute(REQ)).kind).toBe('none');
  });
});

// -- the describe, and the confirmation it mints ----------------------------

function describing(decision: EntryDecision | null): {
  agents: FakeAgentsPort;
  confirmations: FakeConfirmationStore;
  query: DescribeDecisionAnswerQuery;
} {
  const clock = new FakeClock();
  const agents = new FakeAgentsPort();
  agents.entryDecisions =
    decision === null ? { kind: 'none' } : { kind: 'entries', entries: [decision], total: 1 };
  const confirmations = new FakeConfirmationStore(clock);
  return {
    agents,
    confirmations,
    query: new DescribeDecisionAnswerQuery(
      agents,
      confirmations,
      { token: () => 'tok-1', codeChallengeS256: () => 'unused' },
      clock,
    ),
  };
}

const describeReq = (verb: 'accept' | 'cancel', mintConfirmation = true) => ({
  userId: 'u1',
  accessToken: 't1',
  agentId: 'a1',
  decisionId: DECISION_ID,
  verb,
  mintConfirmation,
});

describe('describing what answering would do', () => {
  /**
   * **Task 3.3.** The consequence names what is being cancelled and says the
   * agent will not bring it back — the two things an operator needs before
   * closing a proposal for good.
   */
  it('states the coin, the direction, and that the proposal will not return', async () => {
    const { query } = describing(waiting());

    const result = await query.execute(describeReq('cancel'));

    expect(result.kind).toBe('answerable');
    const consequence = result.kind === 'answerable' ? result.description.consequence : '';
    expect(consequence).toContain('SHORT HYPE');
    expect(consequence).toMatch(/will not propose this trade again/);
    expect(consequence).toMatch(/no money moves/);
  });

  it('binds the confirmation to the verb, the decision and the three levels', async () => {
    const { confirmations, query } = describing(waiting());

    await query.execute(describeReq('cancel'));

    const issued = confirmations.tokens.get('tok-1');
    expect(issued?.target).toBe(
      confirmationTarget.decisionAnswer('cancel', DECISION_ID, levelsOf(waiting())),
    );
  });

  /**
   * A token issued for a decline can never be spent buying. The asymmetry is
   * worse than the deploy/undeploy pair this precedent comes from: one of these
   * commits nothing and the other spends real money.
   */
  it('mints different targets for accept and cancel', async () => {
    const a = describing(waiting());
    await a.query.execute(describeReq('accept'));
    const b = describing(waiting());
    await b.query.execute(describeReq('cancel'));

    expect(a.confirmations.tokens.get('tok-1')?.target).not.toBe(
      b.confirmations.tokens.get('tok-1')?.target,
    );
  });

  /**
   * The mint site and the spend site must name the same tool, and they are in
   * different layers. Asked of the port so the literal stays in the adapter.
   */
  it('issues against the tool the answer will actually be performed with', async () => {
    const { agents, confirmations, query } = describing(waiting());

    await query.execute(describeReq('cancel'));

    expect(confirmations.tokens.get('tok-1')?.tool).toBe(agents.answerDecisionTool('cancel'));
  });

  /**
   * No agreement is minted for an act the connection cannot perform. An
   * unspendable token would record that somebody was offered a choice they were
   * never actually offered.
   */
  it('describes without minting when the connection cannot answer', async () => {
    const { confirmations, query } = describing(waiting());

    const result = await query.execute(describeReq('cancel', false));

    expect(result.kind).toBe('answerable');
    expect(result.kind === 'answerable' && result.description.confirmationToken).toBeNull();
    expect([...confirmations.tokens.keys()]).toEqual([]);
  });

  /**
   * **Task 3.4.** A decision that closed before it was opened is reported as
   * what it is, and never as a cancel somebody performed.
   */
  it('reports an expired decision as expired rather than answerable', async () => {
    const { confirmations, query } = describing(
      waiting({ status: 'EXPIRED', closedAt: '2026-08-15T13:33:10.729Z' }),
    );

    const result = await query.execute(describeReq('cancel'));

    expect(result.kind).toBe('no-longer-answerable');
    expect(result.kind === 'no-longer-answerable' && result.status).toBe('EXPIRED');
    // Nothing to agree to, so nothing is issued.
    expect([...confirmations.tokens.keys()]).toEqual([]);
  });

  it('tells a decision that cannot be found apart from one that cannot be read', async () => {
    expect((await describing(null).query.execute(describeReq('cancel'))).kind).toBe('gone');

    const unreadable = describing(waiting());
    unreadable.agents.entryDecisions = {
      kind: 'unreadable',
      reason: 'upstream 500',
      cause: 'refused',
    };
    const result = await unreadable.query.execute(describeReq('cancel'));
    expect(result.kind).toBe('unreadable');
    expect(result.kind === 'unreadable' && result.cause).toBe('refused');
  });
});

// -- 7.2 — no currency amount, anywhere on this path ------------------------

describe('no currency amount is produced for a pending decision', () => {
  /**
   * **Task 7.2**, at the surface rather than the view.
   *
   * The platform computes no size until acceptance, and the formula that would
   * produce one is known and exact — that is *why* the rule exists, not why it
   * can be broken. A figure here would be this product's arithmetic wearing the
   * platform's authority, on a confirmation, about money (PE-2).
   */
  const SURFACES = [
    'src/presentation/components/approval-queue.tsx',
    'app/(app)/approvals/page.tsx',
    'app/(app)/approvals/[agentId]/[id]/page.tsx',
    'src/application/use-cases/describe-decision-answer.query.ts',
    'src/application/use-cases/read-approval-queue.query.ts',
  ];

  it.each(SURFACES)('renders no currency formatting in %s', (file) => {
    const source = readFileSync(file, 'utf8');
    // A dollar sign outside a template-literal interpolation, a currency
    // formatter, or one of the money-shaped fields being read.
    expect(source).not.toMatch(/toLocaleString\(|Intl\.NumberFormat|style:\s*'currency'/);
    expect(source).not.toMatch(/headroomUsd|capitalAtRiskUsd|effectiveNotionalUsd|marginedUsd/);
    expect(source).not.toMatch(/\$\d/);
  });

  it('says the proportion, and says what it is a proportion of', async () => {
    const { query } = describing(waiting());
    const result = await query.execute(describeReq('accept'));
    const consequence = result.kind === 'answerable' ? result.description.consequence : '';

    expect(consequence).toContain('10%');
    // A bare percentage is not an amount, but it is also not informative — the
    // sentence has to name what it is a percentage of.
    expect(consequence).toMatch(/of the agent's available funds/);
  });
});
