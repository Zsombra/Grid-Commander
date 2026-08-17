import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { RecordProposalCommand } from '@/application/use-cases/record-proposal.command.js';
import type { Proposal } from '@/domain/proposal/proposal.js';
import type { ProposalStore } from '@/ports/proposals.js';

/**
 * Recording a proposal, and the two things it must not do.
 *
 * It must not reach BattleGrid, and it must not hand a model anything it could
 * spend. Both are asserted here — the first by construction, because a
 * behavioural test only proves it did not happen on the path that was tried.
 */

const NOW = new Date('2026-08-05T09:00:00Z');

class FakeStore implements ProposalStore {
  readonly recorded: Omit<Proposal, 'status' | 'resolvedAt'>[] = [];
  async record(p: Omit<Proposal, 'status' | 'resolvedAt'>) {
    this.recorded.push(p);
  }
  async list() {
    return [];
  }
  async get() {
    return null;
  }
  async resolve() {
    return true;
  }
}

const random = { token: () => 'p-abc', codeChallengeS256: () => '' };
const clock = { now: () => NOW };

function subject() {
  const store = new FakeStore();
  return { store, cmd: new RecordProposalCommand(store, random, clock) };
}

describe('recording touches nothing', () => {
  it('holds no BattleGrid port at all', () => {
    /**
     * By construction, not by behaviour. The constructor takes a store, a
     * source of ids and a clock — so there is no path through this class to
     * the platform, whatever arguments arrive. A test that merely observed
     * "no call was made" would prove it for one input.
     */
    expect(RecordProposalCommand.length).toBe(3);
    const src = readFileSync('src/application/use-cases/record-proposal.command.ts', 'utf8');
    for (const port of ['AgentsPort', 'StrategiesPort', 'RadarPort', 'BattleGridPort', 'ExplorerPort']) {
      expect(src, `record-proposal must not import ${port}`).not.toContain(port);
    }
    // And nothing that mints or spends an agreement.
    expect(src).not.toContain('ConfirmationStore');
    expect(src).not.toContain('confirmationToken');
  });

  it('records the intent and says where a person acts on it', async () => {
    const { store, cmd } = subject();
    const r = await cmd.execute({
      userId: 'u1',
      operation: 'edit',
      target: 'agent-1',
      values: { changes: { tradingMode: 'OFF' } },
    });
    expect(r.kind).toBe('recorded');
    if (r.kind !== 'recorded') throw new Error('unreachable');
    expect(r.reviewAt).toBe('/pending/p-abc');
    expect(store.recorded).toHaveLength(1);
    expect(store.recorded[0]?.recordedAt).toBe(NOW);
  });

  it('tells a model plainly that nothing has happened yet', async () => {
    const { cmd } = subject();
    const r = await cmd.execute({
      userId: 'u1',
      operation: 'edit',
      target: 'agent-1',
      values: { changes: { displayName: 'x' } },
    });
    if (r.kind !== 'recorded') throw new Error('unreachable');
    // A model will paraphrase this. "Recorded" alone reads as "done".
    expect(r.notice).toMatch(/nothing has changed/i);
    expect(r.notice).toMatch(/web app/i);
    expect(r.notice).toMatch(/agrees/i);
  });

  it('hands back no confirmation token', async () => {
    const { cmd } = subject();
    const r = await cmd.execute({
      userId: 'u1',
      operation: 'edit',
      target: 'agent-1',
      values: { changes: { displayName: 'x' } },
    });
    // There is no confirmation to leak: none is minted. Asserted on the shape
    // a model actually receives, so a later field cannot smuggle one out.
    expect(JSON.stringify(r)).not.toMatch(/token/i);
  });
});

describe('a refused proposal stores nothing', () => {
  it('refuses an operation the product does not offer', async () => {
    const { store, cmd } = subject();
    const r = await cmd.execute({
      userId: 'u1',
      operation: 'disconnect',
      target: 'x',
      values: {},
    });
    expect(r.kind).toBe('refused');
    expect(store.recorded).toEqual([]);
  });

  it('refuses an apply, and says where applying happens', async () => {
    const { store, cmd } = subject();
    const r = await cmd.execute({ userId: 'u1', operation: 'applyPlan', target: 's1', values: {} });
    if (r.kind !== 'refused') throw new Error('unreachable');
    expect(r.refusal.reason).toMatch(/web app/i);
    expect(store.recorded).toEqual([]);
  });

  it('refuses one missing a value the operation needs', async () => {
    const { store, cmd } = subject();
    const r = await cmd.execute({
      userId: 'u1',
      operation: 'edit',
      target: 'agent-1',
      values: {},
    });
    if (r.kind !== 'refused') throw new Error('unreachable');
    expect(r.refusal.kind).toBe('missing-values');
    expect(store.recorded).toEqual([]);
  });
});
