import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';
import type { EvaluationScorecard } from '@/ports/agents.js';

/**
 * The user's own evaluation page. The property that matters: it shows at
 * least what a competitor's page shows, plus the cost — which is the one
 * thing a public read can never carry.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const AGENT = anAgent();
const params = Promise.resolve({ id: AGENT.id, logId: 'l-1' });

async function ownEvaluationRendered() {
  const Page = (await import('../../app/(app)/agents/[id]/pipeline/[logId]/page.js')).default;
  return rendered(await Page({ params }));
}

/** Shaped from this account's own live evaluation of 2026-08-03. */
function scorecard(over: Partial<EvaluationScorecard> = {}): EvaluationScorecard {
  return {
    coinTicker: 'ENA',
    evaluatedAt: '2026-08-03T05:00:00.000Z',
    timeframesUsed: ['1h'],
    aggregateScorePercent: 40,
    dominantBias: 'BEARISH',
    hasConflictingSignals: true,
    terminalStatus: 'SKIPPED',
    signals: [
      {
        signalId: 'rsi_overbought',
        module: 'RSI',
        triggered: true,
        scorePercent: 100,
        bias: 'BEARISH',
        direction: 'SHORT',
        isPrimary: true,
        required: false,
        effectiveAllocation: 1,
        details: 'RSI(14) at 76.2 — overbought',
        indicatorValues: { rsi14: 76.2 },
      },
      {
        signalId: 'rsi_oversold',
        module: 'RSI',
        triggered: false,
        scorePercent: 0,
        bias: 'BULLISH',
        direction: 'LONG',
        isPrimary: false,
        required: false,
        effectiveAllocation: 1,
        details: 'RSI(14) at 76.2 — not oversold',
        indicatorValues: { rsi14: 76.2 },
      },
    ],
    attributions: [
      { signalId: 'rsi_overbought', name: 'Overbought', scorePercent: 100, attributionPercent: 22 },
    ],
    chain: {
      gateStatus: 'ROUTED',
      gateReason: null,
      attemptResult: 'LLM_DECLINED',
      attemptReasonCodes: [],
      decision: 'SKIP',
      decisionDirection: 'SHORT',
      convictionPercent: 20,
      entryPrice: null,
      stopLoss: null,
      takeProfit: null,
      riskRewardRatio: null,
      executionStatus: null,
      failureReason: null,
      expiryReason: null,
      executionMessage: null,
      tradeOutcome: null,
      netPnl: null,
    },
    cost: {
      modelDisplayName: 'Claude Opus 4.6',
      provider: 'Anthropic',
      billingType: 'PLATFORM',
      costUsd: 0.047775,
      durationMs: 20711,
      errorMessage: null,
    },
    ...over,
  };
}

function world() {
  const agents = new FakeAgentsPort([AGENT]);
  agents.ownEvaluation = { kind: 'evaluation', evaluation: scorecard() };
  current = actingWith({ agents });
  return agents;
}

beforeEach(() => {
  current = actingWith({ agents: new FakeAgentsPort([AGENT]) });
});

describe('the user’s own evaluation page', () => {
  it('shows what the decision cost to think', async () => {
    world();
    const r = await ownEvaluationRendered();
    expect(r.text).toContain('Claude Opus 4.6');
    expect(r.text).toContain('$0.0478');
    expect(r.text).toContain('20.7s');
  });

  it('says a cost was not reported rather than showing zero', async () => {
    const agents = world();
    agents.ownEvaluation = { kind: 'evaluation', evaluation: scorecard({ cost: null }) };
    const r = await ownEvaluationRendered();
    expect(r.text).not.toContain('$0.00');
    expect(r.text).not.toContain('cost to think');
  });

  it('shows the signals that did not fire', async () => {
    world();
    const r = await ownEvaluationRendered();
    expect(r.text).toContain('Fired');
    expect(r.text).toContain('Did not fire');
    expect(r.text).toContain('RSI(14) at 76.2 — not oversold');
    expect(r.text).toMatch(/1\s+of\s+2\s+fired/);
  });

  it('shows how the score was attributed', async () => {
    world();
    const r = await ownEvaluationRendered();
    expect(r.text).toContain('Overbought');
    expect(r.text).toContain('22%');
  });

  it('omits the stages a skip never reached', async () => {
    world();
    const r = await ownEvaluationRendered();
    expect(r.text).toContain('LLM_DECLINED');
    expect(r.text).toContain('SKIP');
    expect(r.text).not.toContain('Execution:');
    expect(r.text).not.toContain('Outcome:');
  });

  it('says nothing is published rather than reporting a failure', async () => {
    const agents = world();
    agents.ownEvaluation = { kind: 'none' };
    const r = await ownEvaluationRendered();
    expect(r.text).toContain('publishes nothing further');
    expect(r.text).not.toContain('could not be read');
  });

  it('reports an unreadable evaluation as unreadable', async () => {
    const agents = world();
    agents.ownEvaluation = { kind: 'unreadable', reason: 'BattleGrid timed out', cause: 'unreachable' };
    const r = await ownEvaluationRendered();
    expect(r.text).toContain('could not be read');
    expect(r.text).toContain('BattleGrid timed out');
  });

  it('an unauthenticated request is offered the path to connect', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await ownEvaluationRendered();
    expect(r.text).toContain('connect');
  });
});
