import type { EntryDecision } from '@/ports/agents.js';

/**
 * Whether an answer still describes the decision it was agreed against.
 *
 * BattleGrid publishes **no revision on an entry decision** — 35 keys observed
 * on both a live `PENDING` and a settled `CANCELLED` payload, with no
 * `revision`, `version`, `updatedAt` or ETag, and both answer tools take the
 * decision id alone. It is the one mutation on the platform that departs from
 * `expectedRevision`, so the ordinary optimistic-concurrency guard is simply
 * unavailable here (architecture policy P4, excepted as PE-1).
 *
 * The two tools are deliberately not named anywhere in `src/`: `A10` in
 * `tests/agent/wager.test.ts` asserts structurally that no fund-committing tool
 * name appears in the product, and that assertion stays true until the phase
 * that actually performs the write amends it on purpose.
 *
 * What stands in its place is this module: the three price levels the operator
 * actually read and judged, plus the decision's own liveness. Both are checked
 * against a re-read taken immediately before the write.
 *
 * **What this does not cover, stated so nobody assumes otherwise**: a decision
 * that changes in a field not compared here — `conviction`, `reasoning`,
 * `positionSizePct` — passes. A decision replaced by a different one carrying
 * identical levels would also pass. No surface may claim a stronger guarantee
 * than the levels and the liveness actually provide.
 */

/**
 * The only status in which a decision can be answered.
 *
 * The tool description for `list_pending_approvals` names `AWAITING_APPROVAL`.
 * **That string does not exist.** A live pending decision read on 2026-08-15
 * carried `status: "PENDING"` and `tradeStatus: "PENDING"`; code matching the
 * declared value would have matched nothing, on every decision, forever.
 */
export const ANSWERABLE_STATUS = 'PENDING';

/** The levels an operator reads and judges, and therefore what they agree to. */
export interface DecisionLevels {
  readonly entryPrice: number | null;
  readonly stopLoss: number | null;
  readonly takeProfit: number | null;
}

/** One level that moved between being shown and being answered. */
export interface MovedLevel {
  readonly field: keyof DecisionLevels;
  readonly shown: number | null;
  readonly now: number | null;
}

/**
 * Why an answer was refused. Each cause needs different words, because each
 * leaves the operator somewhere different: `levels-moved` means the trade on
 * offer is not the one they judged; `not-answerable` means there is nothing
 * left to answer and no one did anything wrong; `gone` means the decision
 * cannot be read at all.
 */
export type AnswerRefusal =
  | { readonly kind: 'levels-moved'; readonly moved: readonly MovedLevel[] }
  | { readonly kind: 'not-answerable'; readonly status: string | null; readonly closedAt: string | null }
  | { readonly kind: 'gone' };

export type AnswerCheck =
  | { readonly kind: 'answerable' }
  | { readonly kind: 'refused'; readonly refusal: AnswerRefusal };

export function levelsOf(decision: EntryDecision): DecisionLevels {
  return {
    entryPrice: decision.entryPrice,
    stopLoss: decision.stopLoss,
    takeProfit: decision.takeProfit,
  };
}

/**
 * Still answerable: the platform says `PENDING` **and** has not closed it.
 *
 * Both halves are load-bearing and neither implies the other in a payload we
 * control. `closedAt` is set on cancel and on expiry alike, and a decision can
 * carry matching levels while already being closed — that is precisely the case
 * a levels-only binding would have forwarded to the platform after telling the
 * operator their answer was being performed.
 */
export function isAnswerable(decision: EntryDecision): boolean {
  return decision.status === ANSWERABLE_STATUS && decision.closedAt === null;
}

/**
 * Which levels differ, in the order an operator reads them.
 *
 * Compared with `!==` on numbers, deliberately: no tolerance, no rounding. A
 * stop that moved by a hundredth is a different stop, and a product that
 * decides how much drift is acceptable on someone else's money has appointed
 * itself to a judgement that is not its own.
 */
export function movedLevels(shown: DecisionLevels, now: DecisionLevels): readonly MovedLevel[] {
  const fields: readonly (keyof DecisionLevels)[] = ['entryPrice', 'stopLoss', 'takeProfit'];
  return fields
    .filter((field) => shown[field] !== now[field])
    .map((field) => ({ field, shown: shown[field], now: now[field] }));
}

/**
 * The whole binding, in one place: all five conditions against one re-read.
 *
 * Liveness is checked **before** the levels. A decision that has expired or
 * been answered elsewhere is not a decision whose price moved, and telling the
 * operator "the stop changed" when what actually happened is "somebody already
 * cancelled this" would be a true statement about the wrong event.
 */
export function checkAnswerable(shown: DecisionLevels, current: EntryDecision | null): AnswerCheck {
  if (current === null) return { kind: 'refused', refusal: { kind: 'gone' } };

  if (!isAnswerable(current)) {
    return {
      kind: 'refused',
      refusal: { kind: 'not-answerable', status: current.status, closedAt: current.closedAt },
    };
  }

  const moved = movedLevels(shown, levelsOf(current));
  if (moved.length > 0) return { kind: 'refused', refusal: { kind: 'levels-moved', moved } };

  return { kind: 'answerable' };
}
