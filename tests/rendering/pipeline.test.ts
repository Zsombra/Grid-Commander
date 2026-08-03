import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The pipeline page, branch by branch. The property that matters: each
 * stage stands alone — empty says what its emptiness means, unreadable
 * says so, and neither hides a stage that answered.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const AGENT = anAgent();
const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);

async function pipelineRendered() {
  const Page = (await import('../../app/(app)/agents/[id]/pipeline/page.js')).default;
  return rendered(await Page({ params: params({ id: AGENT.id }) }));
}

function world() {
  const agents = new FakeAgentsPort([AGENT]);
  current = actingWith({ agents });
  return agents;
}

const BLOCK = {
  id: 'b1',
  coinTicker: null,
  gateStage: 'ACCOUNT',
  reasonCode: 'INSUFFICIENT_EQUITY',
  reasonDetail: { equityUsd: 2.179006, thresholdUsd: 10 },
  at: '2026-06-26T11:51:18.218Z',
};

const EVAL = {
  id: 'e1',
  coinTicker: 'ETH',
  aggregateScore: 0.993,
  minAggregateScore: 0.45,
  minRequiredCount: 2,
  triggeredSignalCount: 12,
  dominantBias: 'BEARISH',
  assessmentDirection: 'UP',
  hasConflictingSignals: true,
  gateStatus: 'ROUTED',
  gateReason: null,
  terminalStatus: 'SKIPPED',
  at: '2026-06-21T13:52:07.202Z',
};

const DECISION = {
  id: 'd1',
  coinTicker: 'ETH',
  decision: 'SKIP',
  direction: 'LONG',
  conviction: 0.2,
  entryPrice: null,
  stopLoss: null,
  takeProfit: null,
  riskRewardRatio: null,
  status: 'SKIPPED',
  reasoning: 'The weight of evidence is overwhelmingly bearish.',
  at: '2026-06-21T13:52:30.000Z',
};

beforeEach(() => {
  current = actingWith({ agents: new FakeAgentsPort([AGENT]) });
});

describe('the pipeline page, branch by branch', () => {
  it('a gate block shows its code and the numbers behind it', async () => {
    const agents = world();
    agents.gateBlocks = { kind: 'entries', entries: [BLOCK], total: 1 };
    const r = await pipelineRendered();
    expect(r.headings[0]).toBe("Why it did or didn't trade");
    expect(r.text).toContain('INSUFFICIENT_EQUITY');
    expect(r.text).toContain('account-wide');
    // The quantified detail is the answer, not the label.
    expect(r.text).toContain('equityUsd');
    expect(r.text).toContain('thresholdUsd');
  });

  it('an evaluation shows its score against the threshold in force', async () => {
    const agents = world();
    agents.signalLogs = { kind: 'entries', entries: [EVAL], total: 1 };
    const r = await pipelineRendered();
    expect(r.text).toContain('99%');
    expect(r.text).toContain('45%');
    expect(r.text).toContain('SKIPPED');
    expect(r.text).toContain('BEARISH');
    expect(r.text).toContain('Signals disagreed');
  });

  it('a decision shows the agent’s own reasoning', async () => {
    const agents = world();
    agents.entryDecisions = { kind: 'entries', entries: [DECISION], total: 1 };
    const r = await pipelineRendered();
    expect(r.text).toContain('SKIP');
    expect(r.text).toContain('20% conviction');
    expect(r.text).toContain('overwhelmingly bearish');
  });

  it('an empty stage says what its emptiness means', async () => {
    world();
    const r = await pipelineRendered();
    expect(r.text).toContain('Nothing was stopped before evaluation');
    expect(r.text).toContain('No signal evaluation has run');
    expect(r.text).toContain('has not reached a decision');
  });

  it('one unreadable stage hides neither of the others', async () => {
    const agents = world();
    agents.gateBlocks = { kind: 'unreadable', reason: 'BattleGrid timed out', cause: 'unreachable' };
    agents.signalLogs = { kind: 'entries', entries: [EVAL], total: 1 };
    agents.entryDecisions = { kind: 'entries', entries: [DECISION], total: 1 };
    const r = await pipelineRendered();
    expect(r.text).toContain('could not be read');
    expect(r.text).toContain('BattleGrid timed out');
    // Still there.
    expect(r.text).toContain('SKIPPED');
    expect(r.text).toContain('overwhelmingly bearish');
  });

  it('an unauthenticated request is offered the path to connect', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await pipelineRendered();
    expect(r.text).toContain('connect');
  });
});
