import { describe, expect, it } from 'vitest';
import { anAgent, FakeAgentsPort, liveTradingConfig } from './agent-fakes.js';
import { FakeClock, FakeConfirmationStore } from './fakes.js';
import {
  acquireProbeAgent,
  isReusableProbeAgent,
  namedAsProbeAgent,
  probeAgentCannotTrade,
  probeAgentName,
  probeAgentPrefix,
  releaseProbeAgent,
  selectProbeAgent,
} from './probe-agent.js';

/**
 * Whose agent a probe is about to write to, decided without a network.
 *
 * The live probes cannot assert this about themselves: they run against one
 * real account, under an opt-in, and the case that matters — *would it ever
 * pick one of the operator's own agents* — is the one case nobody may run to
 * find out. Every real agent on both accounts is in `FULL_EXECUTION`, and the
 * probes archive what they select in a `finally`.
 *
 * So the selection is a pure function over a roster, and this is the roster it
 * has to survive: the operator's live traders, a leftover from an earlier probe
 * run, an agent someone paused, and an agent wearing a probe's name.
 */

const who = { userId: 'owner', accessToken: 'at' };

/** The money a throwaway is created with: the platform's own minimums, off. */
const MONEY = {
  tradingMode: 'OFF',
  minAllocationUsd: 10,
  balanceThresholdUsd: 10,
  maxConcurrentExposureUsd: 10,
  maxCumulativeDrawdownUsd: 10,
  maxDailyLossUsd: 10,
};

/** A live trader, shaped like the ones these accounts actually carry. */
const aRealAgent = (overrides: Parameters<typeof anAgent>[0] = {}) =>
  anAgent({
    id: 'real-1',
    displayName: 'CONTRARIAN',
    status: 'ACTIVE',
    tradingConfig: liveTradingConfig({ tradingMode: 'FULL_EXECUTION' }),
    ...overrides,
  });

/** A leftover from an earlier run: archived, off, named by this repository. */
const aLeftoverProbe = (overrides: Parameters<typeof anAgent>[0] = {}) =>
  anAgent({
    id: 'probe-1',
    displayName: 'GC probe write renamed 1785333064996',
    status: 'ARCHIVED',
    tradingConfig: liveTradingConfig({ tradingMode: 'OFF' }),
    ...overrides,
  });

describe('a probe never selects an agent that could trade', () => {
  it('refuses every one of the operator’s agents', () => {
    // The whole roster of the second account as surveyed on 2026-08-06, minus
    // the probe litter: three real agents, all FULL_EXECUTION.
    const roster = [
      aRealAgent({ id: 'r1', displayName: 'CONTRARIAN' }),
      aRealAgent({ id: 'r2', displayName: 'Fade Master II' }),
      aRealAgent({ id: 'r3', displayName: 'CONFLUENCE', status: 'ARCHIVED' }),
    ];
    expect(selectProbeAgent(roster, 'write')).toBeNull();
    for (const agent of roster) expect(isReusableProbeAgent(agent, 'write')).toBe(false);
  });

  it('refuses an agent wearing a probe’s name that is not off', () => {
    /**
     * The load-bearing case, and the reason the two conditions are joined by
     * AND rather than OR. A display name is a string anybody can type — the
     * operator renaming a live trader `GC probe write` would otherwise hand it
     * to a probe that reactivates it, edits it and archives it.
     */
    const impostor = aRealAgent({
      id: 'r4',
      displayName: 'GC probe write — do not touch',
      tradingConfig: liveTradingConfig({ tradingMode: 'FULL_EXECUTION' }),
    });
    expect(namedAsProbeAgent(impostor, 'write'), 'the name matches').toBe(true);
    expect(probeAgentCannotTrade(impostor), 'and the mode does not').toBe(false);
    expect(selectProbeAgent([impostor], 'write')).toBeNull();
  });

  it('refuses an agent that is off but was never named by this repository', () => {
    // The other half of the AND. An operator's paused agent is off, and is not
    // ours to reactivate.
    const paused = aRealAgent({
      id: 'r5',
      displayName: 'VELOCITY',
      tradingConfig: liveTradingConfig({ tradingMode: 'OFF' }),
    });
    expect(probeAgentCannotTrade(paused)).toBe(true);
    expect(namedAsProbeAgent(paused, 'write')).toBe(false);
    expect(selectProbeAgent([paused], 'write')).toBeNull();
  });

  it('refuses an agent whose trading configuration did not arrive', () => {
    // A mode we could not read is not a mode we know to be off. `mapAgent`
    // leaves `tradingConfig` null when the payload carried none, and the cost
    // of guessing here is somebody's money.
    const unread = aLeftoverProbe({ id: 'probe-2', tradingConfig: null });
    expect(namedAsProbeAgent(unread, 'write')).toBe(true);
    expect(probeAgentCannotTrade(unread)).toBe(false);
    expect(selectProbeAgent([unread], 'write')).toBeNull();
  });

  it('refuses another slot’s throwaway, so two probes never share one agent', () => {
    // `vitest` runs the live files in parallel. Two probes on one agent would
    // trip its optimistic concurrency, which is the failure four probes caused
    // between them on 2026-08-04.
    const other = aLeftoverProbe({ id: 'probe-3', displayName: probeAgentName('proposal') });
    expect(selectProbeAgent([other], 'write')).toBeNull();
    expect(selectProbeAgent([other], 'proposal')?.id).toBe('probe-3');
  });
});

describe('a probe reuses the throwaway it left behind', () => {
  it('picks the leftover out of a roster it shares with real agents', () => {
    const leftover = aLeftoverProbe();
    const roster = [aRealAgent({ id: 'r1' }), leftover, aRealAgent({ id: 'r2' })];
    expect(selectProbeAgent(roster, 'write')?.id).toBe(leftover.id);
  });

  it('still recognises a throwaway the write probe renamed', () => {
    // `write-probe` renames its subject every run. The name it renames to has
    // to keep the slot prefix or the next run cannot find what it just used.
    const renamed = probeAgentName('write', 'renamed');
    expect(renamed.startsWith(probeAgentPrefix('write'))).toBe(true);
    expect(
      namedAsProbeAgent(aLeftoverProbe({ displayName: renamed }), 'write'),
    ).toBe(true);
  });

  it('prefers an already-active throwaway to an archived one', () => {
    // Only so a reuse does not perform a reactivation it does not need.
    const roster = [
      aLeftoverProbe({ id: 'archived', status: 'ARCHIVED' }),
      aLeftoverProbe({ id: 'active', status: 'ACTIVE' }),
    ];
    expect(selectProbeAgent(roster, 'write')?.id).toBe('active');
  });

  it('reactivates the leftover rather than creating a ninth agent', async () => {
    const port = new FakeAgentsPort([aRealAgent(), aLeftoverProbe()]);
    const acquired = await acquireProbeAgent({
      agents: port,
      who,
      slot: 'write',
      strategyId: 's1',
      money: MONEY,
    });

    expect(acquired.kind).toBe('reused');
    if (acquired.kind !== 'reused') return;
    expect(acquired.agent.id).toBe('probe-1');
    expect(acquired.reactivated).toBe(true);
    expect(port.created, 'nothing was minted').toEqual([]);
    expect(port.calls.map((c) => c.op)).toEqual(['lifecycle:ACTIVE']);
    // And it is the leftover that moved, not a real agent.
    expect(port.calls[0]?.agentId).toBe('probe-1');
    expect(port.agents.get('real-1')?.status).toBe('ACTIVE');
    expect(port.agents.get('real-1')?.revision).toBe(1);
  });

  it('does not reactivate one that is already active', async () => {
    const port = new FakeAgentsPort([aLeftoverProbe({ status: 'ACTIVE' })]);
    const acquired = await acquireProbeAgent({
      agents: port,
      who,
      slot: 'write',
      strategyId: 's1',
      money: MONEY,
    });
    expect(acquired.kind).toBe('reused');
    if (acquired.kind !== 'reused') return;
    expect(acquired.reactivated).toBe(false);
    expect(port.calls, 'a reuse of an active agent writes nothing').toEqual([]);
  });
});

describe('a probe creates only when it has none', () => {
  it('creates when the roster holds no throwaway of its own', async () => {
    const port = new FakeAgentsPort([aRealAgent()]);
    const acquired = await acquireProbeAgent({
      agents: port,
      who,
      slot: 'write',
      strategyId: 's1',
      money: MONEY,
    });

    expect(acquired.kind).toBe('created');
    expect(port.created).toHaveLength(1);
    expect(port.created[0]?.displayName.startsWith(probeAgentPrefix('write'))).toBe(true);
    // Created unable to trade — the invariant the selection then depends on.
    expect(port.created[0]?.tradingConfig?.fields['tradingMode']).toBe('OFF');
  });

  it('creates exactly one, and the next run reuses it', async () => {
    const port = new FakeAgentsPort([aRealAgent()]);
    const first = await acquireProbeAgent({
      agents: port,
      who,
      slot: 'write',
      strategyId: 's1',
      money: MONEY,
    });
    expect(first.kind).toBe('created');
    if (first.kind !== 'created') return;

    // What the probe does at the end of a run, which is what the next run has
    // to be able to find.
    const clock = new FakeClock();
    const released = await releaseProbeAgent({
      agents: port,
      confirmations: new FakeConfirmationStore(clock),
      clock,
      who,
      agentId: first.agent.id,
      confirmationToken: 'probe-release',
    });
    expect(released.kind).toBe('archived');
    if (released.kind !== 'archived') return;
    expect(released.agent.status).toBe('ARCHIVED');

    const second = await acquireProbeAgent({
      agents: port,
      who,
      slot: 'write',
      strategyId: 's1',
      money: MONEY,
    });
    expect(second.kind, 'the second run must not mint a second agent').toBe('reused');
    if (second.kind !== 'reused') return;
    expect(second.agent.id).toBe(first.agent.id);
    expect(port.created, 'one create, across two runs').toHaveLength(1);
  });

  it('refuses to compose a create that could trade', async () => {
    const port = new FakeAgentsPort([aRealAgent()]);
    const acquired = await acquireProbeAgent({
      agents: port,
      who,
      slot: 'write',
      strategyId: 's1',
      money: { ...MONEY, tradingMode: 'APPROVAL_REQUIRED' },
    });
    expect(acquired.kind).toBe('unavailable');
    expect(port.created).toEqual([]);
  });

  it('creates nothing when the roster could not be read', async () => {
    /**
     * The behaviour that stops the litter recurring, stated directly. A probe
     * that cannot see the roster cannot know whether its throwaway exists, and
     * creating on that ignorance is how eight of them accumulated. Blank is not
     * empty — the same distinction `RosterResult` keeps for the same reason.
     */
    const port = new FakeAgentsPort([aRealAgent(), aLeftoverProbe()]);
    port.rosterReadable = false;
    const acquired = await acquireProbeAgent({
      agents: port,
      who,
      slot: 'write',
      strategyId: 's1',
      money: MONEY,
    });

    expect(acquired.kind).toBe('unavailable');
    expect(port.created, 'an unreadable roster mints nothing').toEqual([]);
    expect(port.calls, 'and writes nothing at all').toEqual([]);
  });

  it('says why rather than throwing when the account is full', async () => {
    const port = new FakeAgentsPort([aRealAgent()]);
    port.slots = { limit: 3, used: 3, remaining: 0, rankName: 'Recruit III' };
    const acquired = await acquireProbeAgent({
      agents: port,
      who,
      slot: 'write',
      strategyId: 's1',
      money: MONEY,
    });
    expect(acquired.kind).toBe('unavailable');
    if (acquired.kind !== 'unavailable') return;
    // The reason a probe prints beside its skip. "Recruit III allows 3" is
    // actionable; "could not create" is not.
    expect(acquired.reason).toContain('Recruit III');
  });
});
