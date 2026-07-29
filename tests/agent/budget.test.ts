import { describe, expect, it } from 'vitest';
import { ReadBudgetQuery } from '@/application/use-cases/read-budget.query.js';
import { binds, stoppableLimits, warnings } from '@/domain/agent/budget.js';
import { mapBudget } from '@/infrastructure/battlegrid/agent-mapper.js';
import { aBudget, FakeAgentsPort } from '../support/agent-fakes.js';

/**
 * How close an agent is to the ceilings that would stop it.
 *
 * The live payload, read before any of this was typed:
 *
 * ```
 *               configured   fill    remaining   ceiling
 * dailyTrades      true       21        13          34
 * exposure         true        0       250         250
 * drawdown        false        0         0           0
 * dailyLoss       false     0.07         0           0
 * ```
 *
 * Two traps in that table, neither in the declared schema. `fill` is the amount
 * used, not a fraction — 21 + 13 = 34. And an unconfigured gauge reports
 * `remaining: 0`, which as a bare number says *about to halt* and means *no cap
 * exists at all*, on the two limits that govern loss.
 */

const who = { userId: 'u1', accessToken: 'at', agentId: 'a1' };

describe('a limit nobody set is not a limit of zero', () => {
  const live = {
    budget: {
      agentId: 'a1',
      gauges: {
        dailyTrades: { configured: true, fill: 21, remaining: 13, breached: false },
        exposure: { configured: true, fill: 0, remaining: 250, breached: false },
        drawdown: { configured: false, fill: 0, remaining: 0, breached: false },
        dailyLoss: { configured: false, fill: 0.07, remaining: 0, breached: false },
      },
      maxDailyTrades: 34,
      maxConcurrentExposureUsd: 250,
      maxCumulativeDrawdownUsd: 0,
      maxDailyLossUsd: 0,
      budgetOverSubscribed: false,
      stopBelowSingleTradeLoss: false,
      stopEffectivelyUnbounded: false,
      haltedAt: null,
      haltReason: null,
      capitalAtRiskUsd: 0,
      headroomUsd: 250,
    },
  };

  it('does not carry the platform’s zero through as headroom', () => {
    // The defect this exists to prevent: "0 remaining on daily loss" reads as
    // about to be halted, and means nothing will ever halt it.
    const b = mapBudget(live);
    expect(b.gauges['dailyLoss']?.remaining).toBeNull();
    expect(b.gauges['drawdown']?.remaining).toBeNull();
  });

  it('keeps the headroom of a limit that does exist', () => {
    const b = mapBudget(live);
    expect(b.gauges['dailyTrades']?.remaining).toBe(13);
    expect(b.gauges['exposure']?.remaining).toBe(250);
  });

  it('reads fill as an amount used, not a proportion', () => {
    // used + remaining = ceiling. A surface treating 21 as a percentage would
    // draw a 21-of-34 bar at 2100%.
    const b = mapBudget(live);
    const trades = b.gauges['dailyTrades'];
    expect(trades?.used).toBe(21);
    expect((trades?.used ?? 0) + (trades?.remaining ?? 0)).toBe(trades?.ceiling);
  });

  it('still shows usage on a gauge with no ceiling', () => {
    // The agent really has lost $0.07 today. There is simply no cap on it.
    const b = mapBudget(live);
    expect(b.gauges['dailyLoss']?.used).toBe(0.07);
    expect(b.gauges['dailyLoss']?.ceiling).toBeNull();
  });

  it('puts each ceiling on the gauge it belongs to', () => {
    const b = mapBudget(live);
    expect(b.gauges['dailyTrades']?.ceiling).toBe(34);
    expect(b.gauges['exposure']?.ceiling).toBe(250);
  });

  it('knows which gauges can stop the agent', () => {
    expect(binds({ used: 0, remaining: 5, ceiling: 5, breached: false })).toBe(true);
    expect(binds({ used: 9, remaining: null, ceiling: null, breached: false })).toBe(false);
  });
});

describe('what would stop this agent, including nothing', () => {
  it('names the limits that cannot stop it', () => {
    // Four calm rows read as an agent inside its limits. Naming the unbounded
    // ones is the difference between that and the truth.
    const bounds = stoppableLimits(aBudget());
    expect(bounds.binding).toEqual(['dailyTrades', 'exposure']);
    expect(bounds.unbounded).toEqual(['dailyLoss', 'drawdown']);
  });

  it('reports an agent with no ceilings at all as entirely unbounded', () => {
    const none = aBudget({
      gauges: {
        dailyLoss: { used: 0, remaining: null, ceiling: null, breached: false },
        drawdown: { used: 0, remaining: null, ceiling: null, breached: false },
      },
    });
    expect(stoppableLimits(none).binding).toEqual([]);
    expect(stoppableLimits(none).unbounded).toHaveLength(2);
  });

  it('carries the platform’s own warnings rather than recomputing them', () => {
    // BattleGrid decides what "over-subscribed" means against state this
    // product cannot see; a local re-derivation would quietly diverge.
    const said = warnings(aBudget({ overSubscribed: true, stopEffectivelyUnbounded: true }));
    expect(said.some((w) => /more than the account can cover/i.test(w))).toBe(true);
    expect(said.some((w) => /will not bind/i.test(w))).toBe(true);
  });

  it('puts a halt first, with the reason the platform gave', () => {
    const said = warnings(
      aBudget({ haltedAt: new Date('2026-07-29T14:00:00Z'), haltReason: 'Drawdown breached.' }),
    );
    expect(said[0]).toBe('Drawdown breached.');
  });

  it('says an agent is halted even when the platform gave no reason', () => {
    const said = warnings(aBudget({ haltedAt: new Date('2026-07-29T14:00:00Z') }));
    expect(said[0]).toMatch(/halted/i);
  });

  it('is silent when there is nothing to warn about', () => {
    expect(warnings(aBudget())).toEqual([]);
  });
});

describe('reading a budget', () => {
  it('orders binding limits before unbounded ones', async () => {
    const port = new FakeAgentsPort();
    const res = await new ReadBudgetQuery(port).execute(who);
    expect(res.kind).toBe('budget');
    if (res.kind !== 'budget') return;

    expect(res.limits.slice(0, 2).every((l) => l.binds)).toBe(true);
    expect(res.limits.slice(2).every((l) => !l.binds)).toBe(true);
    expect(res.unbounded).toContain('Loss in a day');
    expect(res.unbounded).toContain('Loss in total');
  });

  it('keeps unreadable apart from unbounded', async () => {
    // A budget that failed to load is not an agent with no limits, and that
    // distinction is the whole subject of this surface.
    const port = new FakeAgentsPort();
    port.budgetResult = { kind: 'unreadable', reason: 'BattleGrid did not respond', cause: 'unreachable' };
    const res = await new ReadBudgetQuery(port).execute(who);
    expect(res.kind).toBe('unreadable');
  });
});
