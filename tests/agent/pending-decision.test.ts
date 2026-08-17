import { describe, expect, it } from 'vitest';

import {
  ANSWERABLE_STATUS,
  checkAnswerable,
  isAnswerable,
  levelsOf,
  movedLevels,
} from '@/domain/agent/pending-decision.js';
import { confirmationTarget } from '@/domain/capability/confirmation.js';
import type { EntryDecision } from '@/ports/agents.js';

/**
 * The binding that stands in for the revision BattleGrid does not publish.
 *
 * Every field below is from the payload observed live on 2026-08-15 and
 * recorded in `openspec/backlog/approvals-have-no-write-side.md` — including
 * the two the tool description got wrong.
 */

const LIVE: EntryDecision = {
  id: '6c11b3dc-28ea-4648-ab83-b4d5f14522e1',
  coinTicker: 'HYPE',
  decision: 'ENTER',
  direction: 'SHORT',
  conviction: 0.55,
  entryPrice: 57.176,
  stopLoss: 57.73495777,
  takeProfit: 55.5,
  riskRewardRatio: 2.998,
  status: 'PENDING',
  reasoning: 'HYPE is pinned at its swing high…',
  checklist: [],
  positionSizePct: 10,
  positionSizePreset: 'SMALL',
  timeHorizon: '1h',
  atrPct: 0.6517,
  expiresAt: '2026-08-15T17:16:39.869Z',
  closedAt: null,
  executedAt: '2026-08-15T17:01:39.869Z',
  executedOrderId: null,
  stopLossOrderId: null,
  takeProfitOrderId: null,
  at: '2026-08-15T17:01:39.869Z',
};

const shown = levelsOf(LIVE);

describe('the status the platform actually sends', () => {
  it('is PENDING, not the AWAITING_APPROVAL the tool description names', () => {
    // The description for list_pending_approvals says it returns decisions
    // "awaiting your approval (status AWAITING_APPROVAL)". The live payload
    // says PENDING. Matching the declared string would match nothing, ever.
    expect(ANSWERABLE_STATUS).toBe('PENDING');
    expect(LIVE.status).toBe(ANSWERABLE_STATUS);
  });
});

describe('isAnswerable', () => {
  it('accepts a live decision', () => {
    expect(isAnswerable(LIVE)).toBe(true);
  });

  it('refuses one the platform has closed, even while it still reads PENDING', () => {
    // Both halves are load-bearing: neither implies the other.
    expect(isAnswerable({ ...LIVE, closedAt: '2026-08-15T17:05:44.219Z' })).toBe(false);
  });

  it('refuses a cancelled decision', () => {
    expect(
      isAnswerable({ ...LIVE, status: 'CANCELLED', closedAt: '2026-08-15T17:05:44.219Z' }),
    ).toBe(false);
  });

  it('refuses an expired decision', () => {
    expect(isAnswerable({ ...LIVE, status: 'EXPIRED', closedAt: '2026-08-15T17:16:40.000Z' })).toBe(
      false,
    );
  });
});

describe('movedLevels', () => {
  it('sees nothing when all three match', () => {
    expect(movedLevels(shown, levelsOf(LIVE))).toEqual([]);
  });

  it.each(['entryPrice', 'stopLoss', 'takeProfit'] as const)('catches a moved %s', (field) => {
    const moved = movedLevels(shown, levelsOf({ ...LIVE, [field]: 99 }));
    expect(moved).toHaveLength(1);
    expect(moved[0]?.field).toBe(field);
    expect(moved[0]?.now).toBe(99);
  });

  it('has no tolerance — a hundredth of a cent is a different stop', () => {
    expect(movedLevels(shown, levelsOf({ ...LIVE, stopLoss: 57.73495778 }))).toHaveLength(1);
  });

  it('reports every level that moved, not just the first', () => {
    expect(movedLevels(shown, levelsOf({ ...LIVE, entryPrice: 1, takeProfit: 2 }))).toHaveLength(2);
  });
});

describe('checkAnswerable — all five conditions on one re-read', () => {
  it('passes only when the levels match and it is still answerable', () => {
    expect(checkAnswerable(shown, LIVE)).toEqual({ kind: 'answerable' });
  });

  it('refuses when the decision cannot be read at all', () => {
    expect(checkAnswerable(shown, null)).toEqual({
      kind: 'refused',
      refusal: { kind: 'gone' },
    });
  });

  it('refuses when the levels match but it is no longer answerable', () => {
    // The case that motivated adding liveness to a levels-only binding.
    const settled = { ...LIVE, status: 'CANCELLED', closedAt: '2026-08-15T17:05:44.219Z' };
    const check = checkAnswerable(shown, settled);
    expect(check.kind).toBe('refused');
    expect(check.kind === 'refused' && check.refusal.kind).toBe('not-answerable');
  });

  it('names liveness before levels when both are wrong', () => {
    // "Somebody already cancelled this" is the true account of what happened;
    // "the stop changed" would be a true statement about the wrong event.
    const check = checkAnswerable(shown, { ...LIVE, status: 'EXPIRED', closedAt: 'x', stopLoss: 1 });
    expect(check.kind === 'refused' && check.refusal.kind).toBe('not-answerable');
  });
});

describe('the accepted decision of 2026-08-15, observed', () => {
  /**
   * Vanguard's AVAX entry. Recorded because it falsified two assumptions that
   * looked safe after the cancel: that `status` and `tradeStatus` move
   * together, and that a decision's fields do not change.
   */
  const ACCEPTED: EntryDecision = {
    ...LIVE,
    id: 'ec5d1d33-0164-48c1-b02f-8f086058ed46',
    coinTicker: 'AVAX',
    direction: 'LONG',
    status: 'EXECUTED',
    closedAt: null,
    executedOrderId: '517280812849',
    expiresAt: '2026-08-15T18:34:00.258Z',
    executedAt: '2026-08-15T18:19:00.258Z',
    at: '2026-08-15T18:05:54.293Z',
  };

  it('is not answerable, even though nothing closed it', () => {
    // closedAt is null on an EXECUTED decision, so closedAt alone would call
    // this live. `status` is what refuses it.
    expect(ACCEPTED.closedAt).toBeNull();
    expect(isAnswerable(ACCEPTED)).toBe(false);
  });

  it('is refused by the binding as not-answerable, not as levels-moved', () => {
    const check = checkAnswerable(shown, { ...ACCEPTED, ...shown });
    expect(check.kind === 'refused' && check.refusal.kind).toBe('not-answerable');
  });

  it('had its expiresAt rewritten — decision fields are not immutable', () => {
    // Created 18:05:54 with a 15-minute window, so it was due at 18:20:54.
    // It reads 18:34:00.258 — executedAt + 15 minutes exactly. This is why
    // the three price levels stay in the binding (DL-1).
    const created = Date.parse(ACCEPTED.at ?? '');
    const executed = Date.parse(ACCEPTED.executedAt ?? '');
    const expires = Date.parse(ACCEPTED.expiresAt ?? '');
    const fifteenMinutes = 15 * 60 * 1000;

    expect(expires - created).not.toBe(fifteenMinutes);
    expect(expires - executed).toBe(fifteenMinutes);
  });
});

describe('confirmationTarget.decisionAnswer', () => {
  it('binds accept and cancel to DIFFERENT targets', () => {
    // The whole point. A token agreeing to decline a trade must never be
    // spendable on buying it — the agentDeploy/agentUndeploy precedent, with
    // money on one side of the pair.
    expect(confirmationTarget.decisionAnswer('cancel', LIVE.id, shown)).not.toBe(
      confirmationTarget.decisionAnswer('accept', LIVE.id, shown),
    );
  });

  it('binds the levels, so an agreement about one trade cannot carry to another', () => {
    expect(confirmationTarget.decisionAnswer('accept', LIVE.id, shown)).not.toBe(
      confirmationTarget.decisionAnswer('accept', LIVE.id, { ...shown, stopLoss: 1 }),
    );
  });

  it('binds the decision id', () => {
    expect(confirmationTarget.decisionAnswer('accept', LIVE.id, shown)).not.toBe(
      confirmationTarget.decisionAnswer('accept', 'another-decision', shown),
    );
  });

  it('is stable for the same verb, decision and levels', () => {
    expect(confirmationTarget.decisionAnswer('cancel', LIVE.id, shown)).toBe(
      confirmationTarget.decisionAnswer('cancel', LIVE.id, { ...shown }),
    );
  });
});
