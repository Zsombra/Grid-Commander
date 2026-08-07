import { describe, expect, it } from 'vitest';
import { ListStrategiesQuery } from '@/application/use-cases/list-strategies.query.js';
import {
  DescribeArchiveStrategyQuery,
  ForkStrategyCommand,
  REPAIR_REQUIRED_GUIDANCE,
  SetStrategyActiveCommand,
} from '@/application/use-cases/strategy-lifecycle.command.js';
import { aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';
import { SequentialRandom } from '../support/agent-fakes.js';
import { FakeClock, FakeConfirmationStore } from '../support/fakes.js';

const who = { userId: 'u1', accessToken: 'at' };

const SYSTEM = aStrategy({ id: 'sys-1', name: 'Berlin', scope: 'SYSTEM', revision: 2, boundAgentCount: 5 });
const MINE = aStrategy({ id: 'mine-1', name: 'Midway (fork)', boundAgentCount: 1 });

function harness(seed = [SYSTEM, MINE]) {
  const clock = new FakeClock();
  const port = new FakeStrategiesPort(seed);
  const confirmations = new FakeConfirmationStore(clock);
  return {
    port,
    confirmations,
    list: new ListStrategiesQuery(port),
    fork: new ForkStrategyCommand(port),
    describeArchive: new DescribeArchiveStrategyQuery(confirmations, new SequentialRandom(), clock),
    setActive: new SetStrategyActiveCommand(port),
  };
}

/** A strategy shows how many agents it governs. */
describe('a strategy is never presented alone', () => {
  it('states the blast radius on every listing', async () => {
    const res = await harness().list.execute(who);
    const berlin = res.listings.find((l) => l.strategy.name === 'Berlin');
    expect(berlin?.governs).toMatch(/5 agents are bound/i);
    expect(berlin?.governs).toMatch(/reconfigured immediately/i);
  });

  it('states zero as plainly as five', async () => {
    const res = await harness([aStrategy({ boundAgentCount: 0 })]).list.execute(who);
    // Silence would make the warning's absence ambiguous rather than reassuring.
    expect(res.listings[0]?.governs).toBe('No agents are bound to this strategy.');
  });

  it('distinguishes one agent from several', async () => {
    const res = await harness([aStrategy({ boundAgentCount: 1 })]).list.execute(who);
    expect(res.listings[0]?.governs).toMatch(/^One agent/);
  });

  it('separates the platform’s strategies from the user’s', async () => {
    const res = await harness().list.execute(who);
    const berlin = res.listings.find((l) => l.strategy.name === 'Berlin');
    const mine = res.listings.find((l) => l.strategy.name === 'Midway (fork)');
    expect(berlin?.editable).toBe(false);
    expect(berlin?.fork).toEqual({ kind: 'offered' });
    expect(mine?.editable).toBe(true);
    // Not `withheld`: a copy is not how a strategy you already own gets changed,
    // so there is nothing to explain the absence of.
    expect(mine?.fork).toEqual({ kind: 'not-needed' });
  });

  it('reports an unreadable list as unreadable, not as empty', async () => {
    const h = harness();
    h.port.readable = false;
    const res = await h.list.execute(who);
    expect(res.result.kind).toBe('unreadable');
    expect(res.forking.kind).toBe('unknown');
  });
});

/** Capacity for a new strategy is explained before the work. */
describe('strategy capacity', () => {
  it('offers forking while there is room', async () => {
    const res = await harness().list.execute(who);
    expect(res.forking.kind).toBe('available');
  });

  it('explains the limit rather than only refusing', async () => {
    const h = harness();
    h.port.quota = { used: 25, limit: 25, remaining: 0 };
    const res = await h.list.execute(who);
    expect(res.forking.kind).toBe('at-capacity');
    const explanation = res.forking.kind === 'at-capacity' ? res.forking.explanation : '';
    expect(explanation).toContain('25');
    expect(explanation).toMatch(/archive one/i);
  });

  it('reports unknown capacity as unknown, not as full', async () => {
    const h = harness();
    h.port.quota = null;
    expect((await h.list.execute(who)).forking.kind).toBe('unknown');
  });
});

/**
 * A control that cannot work is not offered, and its absence is explained.
 *
 * The account this was found on has 25 of 25 strategies. The roster printed
 * *"You have all 25 of your strategies"* and then rendered **Make my own copy to
 * edit** on all twelve platform strategies beneath it. `fork_strategy` answers
 * every one of them with `VALIDATION_ERROR: "Strategy limit reached — you can
 * have at most 25 active strategies."`
 *
 * A warning followed by twelve controls the warning says cannot work is not a
 * warning; it is a warning the page itself ignores.
 */
describe('the copy that cannot be made', () => {
  const atCapacity = () => {
    const h = harness();
    h.port.quota = { used: 25, limit: 25, remaining: 0 };
    return h;
  };

  it('withholds the fork on a platform strategy when there is no room', async () => {
    const res = await atCapacity().list.execute(who);
    const berlin = res.listings.find((l) => l.strategy.name === 'Berlin');
    expect(berlin?.fork.kind).toBe('withheld');
  });

  it('explains the absence where the control would have been', async () => {
    const res = await atCapacity().list.execute(who);
    const berlin = res.listings.find((l) => l.strategy.name === 'Berlin');
    const because = berlin?.fork.kind === 'withheld' ? berlin.fork.because : '';
    // A control that simply vanishes reads as the page forgetting rather than
    // refusing, and the row is where the reader is looking.
    expect(because).toContain('25');
    expect(because).toMatch(/no room/i);
  });

  it('leaves a strategy you already own alone', async () => {
    // Nothing to withhold and nothing to explain: a copy is not how a private
    // strategy changes. `withheld` here would print a reason beside an Edit link
    // that works.
    const res = await atCapacity().list.execute(who);
    const mine = res.listings.find((l) => l.strategy.name === 'Midway (fork)');
    expect(mine?.fork).toEqual({ kind: 'not-needed' });
    expect(mine?.editable).toBe(true);
  });

  it('offers the fork when the quota could not be read', async () => {
    // **Unknown is not at-capacity.** Withholding a working control on a fact we
    // do not have is the opposite mistake, and it is the silent one: the user
    // simply cannot fork any more and nothing says why.
    const h = harness();
    h.port.quota = null;
    const res = await h.list.execute(who);
    expect(res.listings.find((l) => l.strategy.name === 'Berlin')?.fork).toEqual({
      kind: 'offered',
    });
  });

  it('offers the fork with one slot left', async () => {
    // The boundary, stated. `remaining: 1` is room for exactly one copy, and an
    // off-by-one here reads as a limit of 24.
    const h = harness();
    h.port.quota = { used: 24, limit: 25, remaining: 1 };
    const res = await h.list.execute(who);
    expect(res.listings.find((l) => l.strategy.name === 'Berlin')?.fork).toEqual({
      kind: 'offered',
    });
  });
});

/** A private copy is how a platform strategy is changed. */
describe('forking', () => {
  it('copies the revision the user was looking at', async () => {
    const h = harness();
    await h.fork.execute({ ...who, strategy: SYSTEM });
    expect(h.port.calls.find((c) => c.op === 'fork')?.payload).toMatchObject({
      strategyId: 'sys-1',
      // Not "latest" — forking whatever is current copies a version they never saw.
      sourceRevision: 2,
    });
  });

  it('produces a private strategy the user can edit', async () => {
    const res = await harness().fork.execute({ ...who, strategy: SYSTEM });
    expect(res.kind).toBe('forked');
    expect(res.kind === 'forked' && res.strategy.scope).toBe('PRIVATE');
    expect(res.kind === 'forked' && res.strategy.forkedFromStrategyId).toBe('sys-1');
  });

  it('threads the name the user chose through to the platform', async () => {
    const h = harness();
    const res = await h.fork.execute({ ...who, strategy: SYSTEM, name: 'Berlin, my tune' });
    expect(h.port.calls.find((c) => c.op === 'fork')?.payload).toMatchObject({
      name: 'Berlin, my tune',
    });
    expect(res.kind === 'forked' && res.strategy.name).toBe('Berlin, my tune');
  });

  it('sends no name when none was chosen — the platform picks "<parent> (fork)"', async () => {
    const h = harness();
    const res = await h.fork.execute({ ...who, strategy: SYSTEM });
    // Absent, not empty: the schema declares minLength 1, so an empty string
    // is a refusal waiting to happen, and undefined is the "name it yourself"
    // the platform has always been given.
    expect(h.port.calls.find((c) => c.op === 'fork')?.payload?.['name']).toBeUndefined();
    expect(res.kind === 'forked' && res.strategy.name).toBe('Berlin (fork)');
  });

  it('carries a refusal through as the platform gave it', async () => {
    // The arm that used to crash the server action: `refused` was declared on
    // the result and nothing ever produced it, so a fork the platform declined
    // — which a re-fork of an already-forked strategy is, live — rendered as a
    // framework error page instead of the platform's answer.
    const h = harness();
    h.port.forkRefusal = '{"code":"INTERNAL_ERROR","message":"Internal server error"}';
    const res = await h.fork.execute({ ...who, strategy: SYSTEM });
    expect(res).toEqual({
      kind: 'refused',
      reason: '{"code":"INTERNAL_ERROR","message":"Internal server error"}',
    });
  });
});

/** Retiring accounts for what depends on the strategy. */
describe('archiving and restoring', () => {
  it('names the blast radius before archiving', async () => {
    const res = await harness().describeArchive.execute({ ...who, strategy: MINE });
    expect(res.kind).toBe('proposal');
    const text = res.kind === 'proposal' ? res.proposal.consequence : '';
    expect(text).toMatch(/One agent is bound/i);
    expect(text).toMatch(/reversible/i);
  });

  it('does not promise restoration it cannot guarantee', async () => {
    const res = await harness().describeArchive.execute({ ...who, strategy: MINE });
    const text = res.kind === 'proposal' ? res.proposal.consequence : '';
    // Reversible, with the platform's caveat stated rather than hidden.
    expect(text).toMatch(/may require the strategy to be\s+rebuilt/i);
  });

  it('refuses to archive a platform strategy', async () => {
    const res = await harness().describeArchive.execute({ ...who, strategy: SYSTEM });
    expect(res.kind).toBe('refused');
  });

  it('restores an archived strategy', async () => {
    const archived = aStrategy({ id: 'a1', isActive: false });
    const h = harness([archived]);
    const res = await h.setActive.execute({ ...who, strategy: archived, active: true });
    expect(res.kind).toBe('changed');
  });

  /**
   * `REPAIR_REQUIRED` is its own outcome, not a failure. The strategy stays
   * archived and the way forward — the RESTORE arm of the compile pipeline — is
   * something the user can actually do.
   */
  it('reports repair-required as its own outcome, with a way forward', async () => {
    const archived = aStrategy({ id: 'a1', isActive: false });
    const h = harness([archived]);
    h.port.restoreNeedsRepair = true;
    const res = await h.setActive.execute({ ...who, strategy: archived, active: true });
    expect(res.kind).toBe('repair-required');
    expect(REPAIR_REQUIRED_GUIDANCE).toMatch(/stays archived/i);
    expect(REPAIR_REQUIRED_GUIDANCE).toMatch(/RESTORE plan/);
    expect(REPAIR_REQUIRED_GUIDANCE).not.toMatch(/failed/i);
  });

  it('refuses to restore something that is not archived', async () => {
    const res = await harness().setActive.execute({ ...who, strategy: MINE, active: true });
    expect(res.kind).toBe('refused');
  });
});
