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

/** Shaped after the live `SKIP/SKIPPED` row of 2026-08-03, checklist and all. */
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
  // All three verdicts the platform sends, so the middle one cannot be
  // silently folded into either edge.
  checklist: [
    {
      signalId: 'rsi_overbought',
      label: 'RSI(14) Overbought',
      verdict: 'CONFIRM',
      interpretation: 'RSI deep in overbought territory, pulling back from peak',
    },
    {
      signalId: 'ema_alignment',
      label: 'EMA Alignment',
      verdict: 'WARN',
      interpretation: 'Trend still points up on the higher timeframe',
    },
    {
      signalId: 'cvd_divergence',
      label: 'CVD Divergence',
      verdict: 'REJECT',
      interpretation: 'Spot buyers are absorbing every push down',
    },
  ],
  positionSizePct: null,
  positionSizePreset: null,
  timeHorizon: '1h',
  atrPct: 0.5063,
  expiresAt: '2026-06-21T13:53:33.397Z',
  executedAt: null,
  executedOrderId: null,
  stopLossOrderId: null,
  takeProfitOrderId: null,
  at: '2026-06-21T13:52:30.000Z',
};

/** An ENTER that reached the exchange — the only shape carrying order ids. */
const EXECUTED = {
  ...DECISION,
  id: 'd2',
  coinTicker: 'MOODENG',
  decision: 'ENTER',
  conviction: 0.55,
  entryPrice: 0.041374,
  stopLoss: 0.04079148,
  takeProfit: 0.04312158,
  riskRewardRatio: 3.831,
  status: 'EXECUTED',
  positionSizePct: 30,
  positionSizePreset: 'SMALL',
  executedAt: '2026-06-21T13:52:10.793Z',
  executedOrderId: '475192822193',
  stopLossOrderId: '475192822195',
  takeProfitOrderId: '475192822194',
};

/** The platform sending a decision with nothing recorded behind it. */
const NO_EVIDENCE = { ...DECISION, id: 'd3', checklist: [] };

beforeEach(() => {
  current = actingWith({ agents: new FakeAgentsPort([AGENT]) });
});

describe('the pipeline page, branch by branch', () => {
  it('a gate block shows its code and the numbers behind it', async () => {
    const agents = world();
    agents.gateBlocks = { kind: 'entries', entries: [BLOCK], total: 1, refused: null };
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

  it('a decision shows the evidence behind it, verdict by verdict', async () => {
    const agents = world();
    agents.entryDecisions = { kind: 'entries', entries: [DECISION], total: 1 };
    const r = await pipelineRendered();
    // The spread, before any interpretation is read.
    expect(r.text).toContain('1 CONFIRM');
    expect(r.text).toContain('1 WARN');
    expect(r.text).toContain('1 REJECT');
    // `across`, the count and the noun are three JSX children, and the render
    // harness joins text nodes with a space — so the assertion splits where
    // the JSX does rather than pretending the markup is one string.
    expect(r.text).toContain('across');
    expect(r.text).toContain('3');
    // Each signal, named, with the platform's own reading.
    expect(r.text).toContain('RSI(14) Overbought');
    expect(r.text).toContain('Spot buyers are absorbing every push down');
  });

  it('a WARN is shown as itself, not folded into confirm or reject', async () => {
    const agents = world();
    agents.entryDecisions = { kind: 'entries', entries: [DECISION], total: 1 };
    const r = await pipelineRendered();
    // Same JSX-boundary split: label, dash and verdict are separate children.
    expect(r.text).toContain('EMA Alignment');
    expect(r.text).toMatch(/EMA Alignment\s+—\s+WARN/);
  });

  it('a decision with no recorded evidence still shows its reasoning', async () => {
    const agents = world();
    agents.entryDecisions = { kind: 'entries', entries: [NO_EVIDENCE], total: 1 };
    const r = await pipelineRendered();
    expect(r.text).toContain('overwhelmingly bearish');
    // No empty evidence list, and no zero-count summary implying none were read.
    expect(r.text).not.toContain('What it read');
  });

  it('an executed decision links to the orders it placed', async () => {
    const agents = world();
    agents.entryDecisions = { kind: 'entries', entries: [EXECUTED], total: 1 };
    const r = await pipelineRendered();
    expect(r.text).toContain('Size 30%');
    expect(r.text).toContain('SMALL');
    expect(r.text).toContain('475192822193');
    expect(r.text).toContain('475192822195');
  });

  it('frames the stages with what the agent looks at versus acts on', async () => {
    const agents = world();
    agents.ownFunnel = {
      kind: 'funnel',
      funnel: {
        totalEvaluations: 245,
        totalDecisions: 102,
        enterDecisions: 73,
        skipDecisions: 29,
        skippedTerminal: 0,
        executed: 51,
        failed: 9,
        expired: 13,
        cancelled: 0,
        blocked: 0,
        pending: 0,
        fillRatePercent: 76,
        avgAggregateScorePercent: 63,
        avgConvictionPercent: 49,
        avgRiskRewardRatio: 2.26,
        outcomeCount: 51,
        winCount: 23,
        lossCount: 28,
        winRatePercent: 45.1,
        avgNetPnl: 0.98,
        totalNetPnl: 50.06,
        avgDurationSeconds: 33937,
        topCoins: [{ coinTicker: 'ENA', count: 21 }],
      },
    };
    const r = await pipelineRendered();
    expect(r.text).toMatch(/245\s+evaluations/);
    expect(r.text).toMatch(/73\s+entered/);
    // A percentage the platform already expressed as one. 7600% would mean
    // it went through the 0..1 helper the stage reads use.
    expect(r.text).toContain('76%');
    expect(r.text).not.toContain('7600%');
    expect(r.text).toContain('ENA (21)');
  });

  it('says an agent has evaluated nothing rather than showing zeros', async () => {
    world();
    const r = await pipelineRendered();
    expect(r.text).toContain('evaluated nothing yet');
  });

  it('an empty stage says what its emptiness means', async () => {
    world();
    const r = await pipelineRendered();
    expect(r.text).toContain('No candidate was stopped by a gate');
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
