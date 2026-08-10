import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  anAgent,
  aTradeOutcome,
  FakeAgentsPort,
  liveTradingConfig,
} from '../support/agent-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * A setting rendered against the thing that makes it safe or unsafe.
 *
 * Rendered rather than asserted on the query, for the reason `binding.test.ts`
 * gives: the property is what a person reads. Three claims here are copy
 * claims and only exist on the page — that a derived figure says it is derived,
 * that a window is stated rather than implied, and that a stop-out is not
 * described as a loss.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);

function world(agents: FakeAgentsPort) {
  current = actingWith({ agents }) as typeof current;
  return current;
}

/**
 * The page's text with runs of whitespace collapsed.
 *
 * The resolver joins adjacent text nodes with a space, so `against a default of{' '}
 * {10}` arrives as `of  10`. That is an artefact of how the tree is walked, not
 * of what a reader sees, and asserting on it would make every test here a test
 * of the harness's spacing.
 */
async function limitsPage(id: string) {
  const Page = (await import('../../app/(app)/agents/[id]/limits/page.js')).default;
  const r = rendered(await Page({ params: params({ id }) }));
  const resolved = await r;
  return { ...resolved, text: resolved.text.replace(/\s+/g, ' ') };
}

/** `maxDailyTrades: 30` against the catalog's declared default of 10. */
function withTrades(outcomes: ReturnType<typeof aTradeOutcome>[] = []): FakeAgentsPort {
  const agents = new FakeAgentsPort([anAgent({ id: 'a1', tradingConfig: liveTradingConfig() })]);
  if (outcomes.length > 0) {
    agents.tradeOutcomes = { kind: 'outcomes', outcomes, total: outcomes.length };
  }
  return agents;
}

const stopped = (id: string, exit: number, net: number) =>
  aTradeOutcome({
    id,
    closeReason: 'STOP_LOSS',
    direction: 'LONG',
    entryFillPrice: 100,
    exitFillPrice: exit,
    netPnl: net,
    closedAt: '2026-08-05T00:00:00.000Z',
    durationSeconds: 5400,
  });

beforeEach(() => {
  world(withTrades());
});

describe('a ceiling against the platform’s own default', () => {
  it('sets the agent’s value beside the default and states the multiple', async () => {
    const r = await limitsPage('a1');
    expect(r.text).toContain('maxDailyTrades');
    expect(r.text).toContain('against a default of 10');
    expect(r.text).toContain('3 ×');
  });

  it('names the fields BattleGrid declines to default, rather than comparing them', async () => {
    const r = await limitsPage('a1');
    expect(r.text).toContain('BattleGrid declares no default for');
    expect(r.text).toContain('maxDailyLossUsd');
    // The reason, not just the fact — it will not decide how much may be lost.
    expect(r.text).toContain('how much an agent may lose');
  });

  /**
   * The item's own headline, and the trap underneath it.
   *
   * `maxStopLossPct: 1` against a declared default of 5 is exactly the reading
   * this panel exists to give — and since v15 it is set on the *strategy*. The
   * comparison stays; what must not happen is it sitting among the settings an
   * operator can change from this page.
   */
  it('shows a field the agent cannot set apart, and says where it is set', async () => {
    const r = await limitsPage('a1');
    expect(r.text).toContain('maxStopLossPct');
    expect(r.text).toContain('against a default of 5%');
    expect(r.text).toContain('set on its strategy');
    expect(r.text).toContain('changing them here is not possible');
  });
});

describe('how its trades ended', () => {
  it('states the share and the median move for the ending that repeats', async () => {
    world(withTrades([stopped('a', 99, -1), stopped('b', 99, -1), stopped('c', 98, -2)]));
    const r = await limitsPage('a1');
    expect(r.text).toContain('STOP_LOSS');
    expect(r.text).toContain('100 %');
    expect(r.text).toContain('Median move');
    // −1, −1, −2 → median −1. A real minus sign, U+2212.
    expect(r.text).toContain('−1%');
  });

  /**
   * The claim the whole surface rests on. BattleGrid publishes an aggregate of
   * its own that has answered zeros on agents with real losses, so a figure
   * this product added up and a figure the platform published are different
   * claims and the page must not blur them.
   */
  it('says the figures are its own arithmetic, not BattleGrid’s', async () => {
    world(withTrades([stopped('a', 99, -1), stopped('b', 99, -1), stopped('c', 98, -2)]));
    const r = await limitsPage('a1');
    expect(r.text).toContain('Computed by Grid-Commander');
    expect(r.text).toContain('not published by BattleGrid');
  });

  it('states the window it summarised rather than implying a whole history', async () => {
    world(withTrades([stopped('a', 99, -1), stopped('b', 99, -1), stopped('c', 98, -2)]));
    const r = await limitsPage('a1');
    expect(r.text).toContain('from 3 closed trades');
    expect(r.text).toContain('2026-08-05');
  });

  it('withholds a median below the threshold instead of implying a statistic', async () => {
    world(withTrades([stopped('a', 99, -1)]));
    const r = await limitsPage('a1');
    expect(r.text).toContain('Too few measurable trades');
    expect(r.text).not.toContain('Median move');
  });

  it('states how many trades carried no measurable move', async () => {
    world(
      withTrades([
        stopped('a', 99, -1),
        stopped('b', 99, -1),
        stopped('c', 98, -2),
        aTradeOutcome({ id: 'd', closeReason: 'STOP_LOSS', entryFillPrice: null }),
      ]),
    );
    const r = await limitsPage('a1');
    expect(r.text).toContain('carried no measurable move');
  });

  /**
   * `HYPE` closed at +$0.0731 with `closeReason: STOP_LOSS`, because position
   * management had trailed the stop into profit. The page must count it under
   * its ending and as a win — reporting a protected winner as a loss, on the
   * screen built to explain losses, is the failure this holds against.
   */
  it('shows a stop-out that closed in profit as a win under its own ending', async () => {
    world(withTrades([stopped('hype', 101, 0.0731), stopped('b', 99, -1)]));
    const r = await limitsPage('a1');
    expect(r.text).toContain('STOP_LOSS');
    expect(r.text).toContain('1 W/ 1 L');
  });

  it('says an agent has closed nothing, rather than showing an empty fold', async () => {
    const r = await limitsPage('a1');
    expect(r.text).toContain('closed nothing yet');
  });
});

describe('what ends a position early', () => {
  it('names the two switches when management is on', async () => {
    const agents = new FakeAgentsPort([
      anAgent({
        id: 'a1',
        tradingConfig: liveTradingConfig({
          positionManagement: {
            positionManagementPreset: 'WALTHER',
            enabled: true,
            trailingEnabled: true,
            timeDecayEnabled: false,
          },
        }),
      }),
    ]);
    world(agents);
    const r = await limitsPage('a1');
    expect(r.text).toContain('Trailing stop:');
    expect(r.text).toContain('Time decay:');
  });

  it('says the values govern nothing when management is off', async () => {
    const r = await limitsPage('a1');
    expect(r.text).toContain('govern nothing');
  });
});

/**
 * The load-bearing property, at the surface.
 *
 * One read failing must not take the page's other answers with it — otherwise
 * an operator with a slow catalog read is told their agent has nothing to
 * report, which is the "unreadable is not empty" rule failing in the one place
 * it was written for.
 */
describe('one read failing hides neither of the others', () => {
  it('still shows the trade geometry when the catalog cannot be read', async () => {
    const agents = withTrades([stopped('a', 99, -1), stopped('b', 99, -1), stopped('c', 98, -2)]);
    agents.catalogReadable = false;
    world(agents);

    const r = await limitsPage('a1');
    expect(r.text).toContain('This could not be read');
    // The shared explanation, not a hand-rolled one.
    expect(r.text).toContain('This does not mean');
    // And the trades still answer.
    expect(r.text).toContain('Computed by Grid-Commander');
    expect(r.text).toContain('STOP_LOSS');
  });

  it('still compares the ceilings when the trade record cannot be read', async () => {
    const agents = withTrades();
    agents.tradeOutcomes = {
      kind: 'unreadable',
      reason: 'BattleGrid did not respond',
      cause: 'unreachable',
    };
    world(agents);

    const r = await limitsPage('a1');
    expect(r.text).toContain('BattleGrid did not respond');
    expect(r.text).toContain('against a default of 10');
  });

  it('keeps the gauges above it when every new section fails', async () => {
    const agents = withTrades();
    agents.catalogReadable = false;
    agents.tradeOutcomes = {
      kind: 'unreadable',
      reason: 'BattleGrid did not respond',
      cause: 'unreachable',
    };
    world(agents);

    const r = await limitsPage('a1');
    // The budget read is untouched by any of it, so what would stop the agent
    // still renders — the panel is an addition to that page, not a gate on it.
    expect(r.text).toContain('Loss in a day');
  });
});
