import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ReadBudgetQuery } from '@/application/use-cases/read-budget.query.js';
import type { Budget } from '@/domain/agent/budget.js';
import { aBudget, FakeAgentsPort } from '../support/agent-fakes.js';

/**
 * The fill side of the exposure cap.
 *
 * The cap is not a ceiling that trips: BattleGrid sizes each entry from what is
 * left beneath it, so the remainder governs whether the agent can act at all.
 * These pin the three states that must never be confused — a cap with room, a
 * cap that does not exist, and a read that failed — plus the figure this
 * surface is forbidden from inventing.
 */

const REQ = { userId: 'u1', accessToken: 't1', agentId: 'a1' };

function reading(budget: Budget) {
  const agents = new FakeAgentsPort();
  agents.budgetResult = { kind: 'budget', budget };
  return new ReadBudgetQuery(agents).execute(REQ);
}

describe('what is left under the cap', () => {
  it('carries the committed margin, the headroom, and what it authorizes', async () => {
    const result = await reading(
      aBudget({
        gauges: {
          exposure: { used: 8.55, remaining: 36.45, ceiling: 45, breached: false },
        },
        capitalAtRiskUsd: 8.55,
        headroomUsd: 36.45,
        effectiveNotionalUsd: 36.45,
      }),
    );

    expect(result.kind).toBe('budget');
    const sizing = result.kind === 'budget' ? result.sizing : null;
    expect(sizing).toEqual({
      configured: true,
      committedUsd: 8.55,
      headroomUsd: 36.45,
      authorizedNotionalUsd: 36.45,
    });
  });

  /**
   * The state that would otherwise read as "about to stop". The platform sends
   * `remaining: 0` for a cap that does not exist, so an unconfigured gauge must
   * produce no fill at all rather than a full one.
   */
  it('shows no fill for a cap the platform reports unconfigured', async () => {
    const result = await reading(
      aBudget({
        gauges: { exposure: { used: 0, remaining: null, ceiling: null, breached: false } },
        headroomUsd: null,
        effectiveNotionalUsd: null,
      }),
    );

    const sizing = result.kind === 'budget' ? result.sizing : null;
    expect(sizing?.configured).toBe(false);
    expect(sizing?.headroomUsd).toBeNull();
    expect(sizing?.authorizedNotionalUsd).toBeNull();
  });

  it('tells an absent exposure gauge apart from an unconfigured one', async () => {
    const result = await reading(aBudget({ gauges: {} }));
    expect(result.kind === 'budget' && result.sizing).toBeNull();
  });

  /**
   * A budget the platform did not report headroom for is not a budget with no
   * headroom. Absent must stay absent all the way to the surface.
   */
  it('never turns an absent figure into zero', async () => {
    const result = await reading(
      aBudget({
        gauges: { exposure: { used: 0, remaining: 45, ceiling: 45, breached: false } },
        headroomUsd: null,
        effectiveNotionalUsd: null,
      }),
    );

    const sizing = result.kind === 'budget' ? result.sizing : null;
    // Both stay null. An earlier version fell back to the gauge's own remainder
    // here — two platform fields, so nothing was computed, but a disagreement
    // between them would have shown one labelled as the other.
    expect(sizing?.headroomUsd).toBeNull();
    expect(sizing?.authorizedNotionalUsd).toBeNull();
  });

  it('states a failed budget read rather than rendering an empty one', async () => {
    const agents = new FakeAgentsPort();
    agents.budgetResult = { kind: 'unreadable', reason: 'upstream 500', cause: 'unreachable' };

    const result = await new ReadBudgetQuery(agents).execute(REQ);

    expect(result.kind).toBe('unreadable');
    expect(result.kind === 'unreadable' && result.cause).toBe('unreachable');
  });
});

describe('a budget-side block the platform names', () => {
  it('carries the platform reason and when it started', async () => {
    const result = await reading(
      aBudget({ blockedReason: 'DAILY_LOSS_LIMIT', blockedSince: new Date('2026-08-16T04:00:00Z') }),
    );

    const block = result.kind === 'budget' ? result.block : null;
    expect(block?.reason).toBe('DAILY_LOSS_LIMIT');
    expect(block?.since?.toISOString()).toBe('2026-08-16T04:00:00.000Z');
  });

  /**
   * Where the platform blocked an agent and said nothing about why, the honest
   * surface says it was blocked and stops. Supplying the likeliest explanation
   * is how a guess acquires the platform's authority.
   */
  it('reports a block with no reason without inventing one', async () => {
    const result = await reading(
      aBudget({ blockedReason: null, blockedSince: new Date('2026-08-16T04:00:00Z') }),
    );

    const block = result.kind === 'budget' ? result.block : null;
    expect(block).not.toBeNull();
    expect(block?.reason).toBeNull();
  });

  it('reports over-subscription even with no block', async () => {
    const result = await reading(aBudget({ overSubscribed: true }));
    expect(result.kind === 'budget' && result.block?.overSubscribed).toBe(true);
  });

  it('reports nothing where the platform reports nothing', async () => {
    const result = await reading(aBudget());
    expect(result.kind === 'budget' && result.block).toBeNull();
  });
});

// -- the guard that keeps PE-2 from being overturned by a later edit ---------

describe('no order size is projected on this path', () => {
  /**
   * `headroom x sizePct x effectiveLeverage` reconstructs observed fills
   * exactly. That is precisely why it must not be rendered: the preset is this
   * product's to apply, the platform publishes no per-preset projection, and
   * `the-approval-can-be-answered` refused the same formula as **PE-2** on the
   * neighbouring money surface.
   *
   * The open product question — whether a clearly-labelled estimate beats no
   * figure — lives on `a-confirmation-that-cannot-name-the-amount` (#305) and
   * governs both surfaces. It should be answered once, deliberately, not
   * arrived at by a well-meaning edit here.
   */
  const FILES = [
    'src/application/use-cases/read-budget.query.ts',
    'src/presentation/components/ceilings.tsx',
  ];

  /**
   * Comments are stripped before scanning, and that is not a loophole — it is
   * the difference between naming a forbidden thing and doing it. Both files
   * explain at length *why* the projection is refused, and a guard that could
   * not tell explanation from use would force the explanation out, leaving the
   * rule enforced and unexplained. That is how a later reader deletes a rule as
   * mysterious.
   */
  const code = (file: string): string =>
    readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

  it.each(FILES)('computes no per-preset size in %s', (file) => {
    // The size presets, and the leverage term that turns headroom into notional.
    expect(code(file)).not.toMatch(/smallPct|mediumPct|largePct|positionSizePreset/);
    expect(code(file)).not.toMatch(/maxLeverage|effectiveLeverage/);
  });

  it.each(FILES)('compares nothing against the exchange minimum in %s', (file) => {
    // The floor test is NOT DETERMINED — whether it reads live headroom or the
    // static cap is unsettled, so a surface asserting either would assert an
    // unknown.
    expect(code(file)).not.toMatch(/minEquityUsd|EXCHANGE_MIN_NOTIONAL/);
  });

  it('is scanning real files, not silently reading nothing', () => {
    // An empty scan passes every assertion above. This is the tripwire.
    for (const file of FILES) expect(code(file).length).toBeGreaterThan(500);
  });
});
