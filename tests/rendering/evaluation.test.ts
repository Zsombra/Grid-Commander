import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';
import {
  aConsultedSignal,
  anEvaluationDetail,
  FakeExplorerPort,
} from '../support/explorer-fakes.js';

/**
 * The evaluation page, branch by branch. The property that matters most:
 * the signals that did *not* fire are shown, because what an agent looked
 * at and dismissed is as much its strategy as what triggered it.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const params = Promise.resolve({ agentId: 'b731d127', logId: '96b4f817' });

async function evaluationRendered() {
  const Page = (await import('../../app/(app)/explorer/[agentId]/evaluations/[logId]/page.js'))
    .default;
  return rendered(await Page({ params }));
}

function world() {
  const explorer = new FakeExplorerPort();
  current = actingWith({ explorer });
  return explorer;
}

beforeEach(() => {
  current = actingWith({ explorer: new FakeExplorerPort() });
});

describe('the evaluation page, branch by branch', () => {
  it('shows the signals that did not fire alongside those that did', async () => {
    world();
    const r = await evaluationRendered();
    expect(r.text).toContain('Fired');
    expect(r.text).toContain('Did not fire');
    // The platform's own sentence: the reading and the bar it missed.
    expect(r.text).toContain('RSI(14) at 38.1 — not oversold (threshold 30)');
  });

  it('counts how many of the consulted signals fired', async () => {
    world();
    const r = await evaluationRendered();
    expect(r.text).toMatch(/2\s+of\s+3\s+fired/);
  });

  it('groups the signals by module', async () => {
    world();
    const r = await evaluationRendered();
    expect(r.text).toContain('MACD');
    expect(r.text).toContain('RSI');
    expect(r.text).toContain('TREND_STRENGTH');
  });

  it('shows the raw indicator values behind each sentence', async () => {
    world();
    const r = await evaluationRendered();
    expect(r.text).toContain('rsi14: 38.0982344');
  });

  it('marks a primary or required signal as such', async () => {
    world();
    const r = await evaluationRendered();
    expect(r.text).toContain('primary');
    expect(r.text).toContain('required');
  });

  it('shows how the score was attributed', async () => {
    world();
    const r = await evaluationRendered();
    expect(r.text).toContain('Bull Divergence');
    expect(r.text).toContain('13%');
  });

  it('shows the chain from gate to outcome', async () => {
    world();
    const r = await evaluationRendered();
    expect(r.text).toContain('ROUTED');
    expect(r.text).toContain('LLM_APPROVED');
    expect(r.text).toContain('ENTER');
    expect(r.text).toContain('CLOSED');
    expect(r.text).toContain('LOSS');
  });

  it('omits a stage the platform did not record', async () => {
    const explorer = world();
    const d = anEvaluationDetail();
    explorer.evaluationDetail = {
      kind: 'value',
      value: {
        ...d,
        chain: {
          ...d.chain,
          executionStatus: 'EXPIRED',
          expiryReason: 'INDICATOR_FLIP',
          tradeOutcome: null,
          netPnl: null,
        },
      },
      total: null,
    };
    const r = await evaluationRendered();
    expect(r.text).toContain('INDICATOR_FLIP');
    // No outcome line at all, rather than an outcome of nothing.
    expect(r.text).not.toContain('Outcome:');
  });

  it('says nothing is published rather than reporting a failure', async () => {
    const explorer = world();
    explorer.evaluationDetail = { kind: 'none' };
    const r = await evaluationRendered();
    expect(r.text).toContain('publishes nothing further');
    expect(r.text).not.toContain('could not be read');
  });

  it('reports an unreadable evaluation as unreadable', async () => {
    const explorer = world();
    explorer.evaluationDetail = {
      kind: 'unreadable',
      reason: 'BattleGrid timed out',
      cause: 'unreachable',
    };
    const r = await evaluationRendered();
    expect(r.text).toContain('could not be read');
    expect(r.text).toContain('BattleGrid timed out');
  });

  it('says so when the scorecard itself is empty', async () => {
    const explorer = world();
    explorer.evaluationDetail = {
      kind: 'value',
      value: { ...anEvaluationDetail(), signals: [] },
      total: null,
    };
    const r = await evaluationRendered();
    expect(r.text).toContain('no signal scorecard');
  });

  it('renders a signal with no module under a named group', async () => {
    const explorer = world();
    explorer.evaluationDetail = {
      kind: 'value',
      value: {
        ...anEvaluationDetail(),
        signals: [aConsultedSignal({ module: null, signalId: 'orphan' })],
      },
      total: null,
    };
    const r = await evaluationRendered();
    expect(r.text).toContain('unnamed module');
    expect(r.text).toContain('orphan');
  });

  it('offers the way back to the competitor', async () => {
    world();
    const r = await evaluationRendered();
    expect(r.text).toContain('Back to the competitor');
  });

  it('an unauthenticated request is offered the path to connect', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await evaluationRendered();
    expect(r.text).toContain('connect');
  });
});
