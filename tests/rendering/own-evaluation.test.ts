import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';
import { FakeStrategiesPort } from '../support/strategy-fakes.js';
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

async function ownEvaluationRendered(query: Record<string, string> = {}) {
  const Page = (await import('../../app/(app)/agents/[id]/pipeline/[logId]/page.js')).default;
  return rendered(await Page({ params, searchParams: Promise.resolve(query) }));
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
    // This live shape predates v17.2.0's condition block; the populated
    // case is exercised where a test is about it.
    conditions: null,
    ...over,
  };
}

/** A platform that declines the simulation, as it does past twenty signals. */
function refusingStrategies() {
  const strategies = new FakeStrategiesPort();
  strategies.simulation = { kind: 'refused', reason: 'too many signals' };
  return strategies;
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

  it('offers a what-if seeded at the weightings that were in force', async () => {
    world();
    const r = await ownEvaluationRendered();
    expect(r.text).toContain('What if it had weighted these differently');
    // The signal that fired is offered; the one that did not is not.
    expect(r.text).toContain('rsi_overbought');
  });

  it('never shows a simulated score as what happened', async () => {
    const agents = world();
    agents.ownEvaluation = { kind: 'evaluation', evaluation: scorecard() };
    const r = await ownEvaluationRendered({ 'alloc:rsi_overbought': '3', gate: '50' });
    expect(r.text).toContain('This did not happen');
    // The real score sits beside the simulated one.
    expect(r.text).toContain('It really scored');
    expect(r.text).toContain('would route');
  });

  it('carries a refusal rather than inventing a score', async () => {
    const agents = world();
    current = actingWith({ agents, strategies: refusingStrategies() });
    const r = await ownEvaluationRendered({ 'alloc:rsi_overbought': '2' });
    expect(r.text).toContain('would not score that');
    expect(r.text).toContain('too many signals');
    expect(r.text).not.toContain('This did not happen');
  });

  it('says an over-cap evaluation cannot be re-scored, and does not truncate', async () => {
    const agents = world();
    // Twenty-one fired: one more than BattleGrid's simulator accepts.
    const many = Array.from({ length: 21 }, (_, i) => ({
      ...scorecard().signals[0]!,
      signalId: `sig_${i}`,
      triggered: true,
    }));
    agents.ownEvaluation = {
      kind: 'evaluation',
      evaluation: scorecard({ signals: many }),
    };
    const r = await ownEvaluationRendered();
    expect(r.text).toContain('cannot be');
    expect(r.text).toMatch(/fired\s+21\s+signals/);
    // No form offered at all — a partial simulation would score a different
    // composition than the one that ran.
    expect(r.text).not.toContain('Score it');
  });

  it('says there is nothing to re-weight when nothing fired', async () => {
    const agents = world();
    const none = scorecard().signals.map((s) => ({ ...s, triggered: false }));
    agents.ownEvaluation = { kind: 'evaluation', evaluation: scorecard({ signals: none }) };
    const r = await ownEvaluationRendered();
    expect(r.text).toContain('nothing to re-weight');
  });

  it('an unauthenticated request is offered the path to connect', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await ownEvaluationRendered();
    expect(r.text).toContain('connect');
  });
});

describe('what the strategy’s conditions said', () => {
  /** The live observation of 2026-08-11 (#133), as the domain carries it. */
  const observed = () => ({
    outcomes: [
      {
        conditionKey: 'FUNDING_STRETCHED',
        name: 'Funding stretched in either direction',
        outcome: 'TRUE',
        required: false,
        provisional: true,
        evidence: [
          {
            kind: 'clause',
            sectionKey: 'includeFundingRates',
            header: 'rate',
            op: 'gte',
            operand: '0.0013',
            literal: '0.0004',
            outcome: 'TRUE',
          },
          {
            kind: 'clause',
            sectionKey: 'includeFundingRates',
            header: 'rate',
            op: 'lte',
            operand: '0.0013',
            literal: '-0.0004',
            outcome: 'FALSE',
          },
        ],
      },
    ],
    trueCount: 1,
    total: 1,
    unresolvedCount: 0,
    strategyRevision: 3,
    provisional: true,
    verdict: null,
    decidedBy: null,
  });

  it('shows each condition with the observed value beside the threshold', async () => {
    const agents = world();
    agents.ownEvaluation = {
      kind: 'evaluation',
      evaluation: scorecard({ conditions: observed() }),
    };
    const r = await ownEvaluationRendered();
    expect(r.text).toContain('Funding stretched in either direction — TRUE');
    // The platform's comparison, not a recomputation: demanded, observed, went.
    expect(r.text).toContain('rate ≥ 0.0004 — observed 0.0013 — TRUE');
    expect(r.text).toContain('rate ≤ -0.0004 — observed 0.0013 — FALSE');
    expect(r.text).toContain('from includeFundingRates');
    expect(r.text).toContain('1 of 1 true');
    expect(r.text).toContain('strategy revision 3');
    expect(r.text).toContain('provisional');
    // The never-observed deciding branch renders nothing while null.
    expect(r.text).not.toContain('Verdict');
    expect(r.text).not.toContain('decided by');
  });

  it('renders an op it has never seen verbatim rather than guessing a symbol', async () => {
    const agents = world();
    const c = observed();
    c.outcomes[0]!.evidence = [{ ...c.outcomes[0]!.evidence[0]!, op: 'N_OF' }];
    agents.ownEvaluation = { kind: 'evaluation', evaluation: scorecard({ conditions: c }) };
    const r = await ownEvaluationRendered();
    expect(r.text).toContain('rate N_OF 0.0004');
  });

  it('renders the deciding branch verbatim the day the platform populates it', async () => {
    const agents = world();
    agents.ownEvaluation = {
      kind: 'evaluation',
      evaluation: scorecard({
        conditions: { ...observed(), verdict: 'BLOCKED', decidedBy: 'FUNDING_STRETCHED' },
      }),
    };
    const r = await ownEvaluationRendered();
    expect(r.text).toContain('Verdict: BLOCKED');
    expect(r.text).toContain('decided by FUNDING_STRETCHED');
  });

  it('shows no condition section when the platform published none', async () => {
    world();
    const r = await ownEvaluationRendered();
    // `scorecard()` carries `conditions: null` — a real state, and neither
    // an empty list nor a claim that anything passed appears for it.
    expect(r.text).not.toContain('conditions said');
    expect(r.text).not.toContain('of 0 true');
  });
});
