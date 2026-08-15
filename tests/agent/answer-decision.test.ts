import { describe, expect, it } from 'vitest';

import { AnswerDecisionCommand } from '@/application/use-cases/answer-decision.command.js';
import { levelsOf } from '@/domain/agent/pending-decision.js';
import { confirmationTarget } from '@/domain/capability/confirmation.js';
import type { EntryDecision } from '@/ports/agents.js';
import { anEntryDecision, FakeAgentsPort } from '../support/agent-fakes.js';

const DECISION_ID = '6c11b3dc-28ea-4648-ab83-b4d5f14522e1';

const pending = (over: Parameters<typeof anEntryDecision>[0] = {}): EntryDecision =>
  anEntryDecision({
    id: DECISION_ID,
    status: 'PENDING',
    closedAt: null,
    entryPrice: 57.176,
    stopLoss: 57.73495777,
    takeProfit: 55.5,
    ...over,
  });

const SHOWN = levelsOf(pending());

function world(decision: EntryDecision | null): {
  agents: FakeAgentsPort;
  command: AnswerDecisionCommand;
} {
  const agents = new FakeAgentsPort();
  agents.entryDecisions =
    decision === null ? { kind: 'none' } : { kind: 'entries', entries: [decision], total: 1 };
  return { agents, command: new AnswerDecisionCommand(agents) };
}

const req = (verb: 'accept' | 'cancel', over: Record<string, unknown> = {}) => ({
  userId: 'u1',
  accessToken: 't1',
  agentId: 'a1',
  decisionId: DECISION_ID,
  verb,
  shown: SHOWN,
  confirmation: {
    token: 'tok-1',
    target: confirmationTarget.decisionAnswer(verb, DECISION_ID, SHOWN),
  },
  ...over,
});

describe('answering a decision that still matches', () => {
  it('cancels it', async () => {
    const { agents, command } = world(pending());

    const result = await command.execute(req('cancel'));

    expect(result).toEqual({ kind: 'answered', verb: 'cancel', decisionId: DECISION_ID });
    expect(agents.calls.map((c) => c.op)).toEqual(['answer:cancel']);
  });

  it('accepts it', async () => {
    const { agents, command } = world(pending());

    const result = await command.execute(req('accept'));

    expect(result.kind).toBe('answered');
    expect(agents.calls.map((c) => c.op)).toEqual(['answer:accept']);
  });

  it('sends the verb it was asked for and never the other one', async () => {
    // The asymmetry that matters: one declines, one spends.
    const { agents, command } = world(pending());
    await command.execute(req('cancel'));
    expect(agents.calls.map((c) => c.op)).not.toContain('answer:accept');
  });

  it('carries a target that differs between the two verbs', async () => {
    const cancelWorld = world(pending());
    await cancelWorld.command.execute(req('cancel'));
    const acceptWorld = world(pending());
    await acceptWorld.command.execute(req('accept'));

    expect(cancelWorld.agents.calls[0]?.target).not.toBe(acceptWorld.agents.calls[0]?.target);
  });
});

describe('nothing is sent when the binding fails', () => {
  it('refuses when a level moved, naming which', async () => {
    const { agents, command } = world(pending({ stopLoss: 99 }));

    const result = await command.execute(req('accept'));

    expect(result.kind).toBe('refused');
    expect(result.kind === 'refused' && result.refusal.kind).toBe('levels-moved');
    expect(agents.calls).toEqual([]);
  });

  it('refuses when the decision is no longer answerable, even with matching levels', async () => {
    const { agents, command } = world(pending({ status: 'EXPIRED', closedAt: '2026-08-15T17:16:40Z' }));

    const result = await command.execute(req('accept'));

    expect(result.kind === 'refused' && result.refusal.kind).toBe('not-answerable');
    expect(agents.calls).toEqual([]);
  });

  it('refuses an EXECUTED decision — closedAt is null there, so status carries it', async () => {
    const { agents, command } = world(pending({ status: 'EXECUTED', closedAt: null }));

    const result = await command.execute(req('accept'));

    expect(result.kind === 'refused' && result.refusal.kind).toBe('not-answerable');
    expect(agents.calls).toEqual([]);
  });

  it('refuses when the decision cannot be found', async () => {
    const { agents, command } = world(null);

    const result = await command.execute(req('cancel'));

    expect(result.kind === 'refused' && result.refusal.kind).toBe('gone');
    expect(agents.calls).toEqual([]);
  });

  it('refuses when the decision list cannot be read at all', async () => {
    // Unreadable and missing are answered the same way: this product cannot say
    // what it would be answering, so it does not answer.
    const { agents, command } = world(pending());
    agents.entryDecisions = { kind: 'unreadable', reason: 'upstream 500', cause: 'refused' };

    const result = await command.execute(req('accept'));

    expect(result.kind === 'refused' && result.refusal.kind).toBe('gone');
    expect(agents.calls).toEqual([]);
  });

  it('refuses a different decision that happens to carry identical levels', async () => {
    // The command looks up by id; a same-priced neighbour is not the one agreed to.
    const { agents, command } = world(pending({ id: 'some-other-decision' }));

    const result = await command.execute(req('accept'));

    expect(result.kind === 'refused' && result.refusal.kind).toBe('gone');
    expect(agents.calls).toEqual([]);
  });
});

describe('the write is re-checked, not trusted from the render', () => {
  it('reads the decision again before answering', async () => {
    const { agents, command } = world(pending());
    await command.execute(req('cancel'));
    // The read happened: the fake only serves decisions it was given, and a
    // command that skipped the re-read could not have refused the cases above.
    expect(agents.calls.map((c) => c.op)).toEqual(['answer:cancel']);
  });

  it('propagates a platform failure rather than reporting success', async () => {
    const { agents, command } = world(pending());
    agents.answerFails = new Error('BattleGrid refused');

    await expect(command.execute(req('cancel'))).rejects.toThrow('BattleGrid refused');
  });
});
