# Tasks

- [x] 1.1 `ReadExposureQuery` reads entry decisions alongside the two reads it
      already makes, at the platform's page maximum, and keeps all three
      independent
- [x] 1.2 Per position, the stop and target as decided — matched on the
      `decisionId` the position already carries — with which way the stop
      travelled computed against the side of the trade
- [x] 1.3 `exposure.tsx` shows the drift where it exists, names which value is
      which, and states the decided values as unknown where no decision matched
- [x] 1.4 Tests: drift shown, no drift when equal, decision missing, decision
      list unreadable while the position renders
- [x] 1.5 `npx tsc --noEmit`, `npx eslint .`, the touched vitest files green

## Notes from the build

**The join needed no new read and no new field.** `OpenPosition.decisionId`
and `EntryDecision.id` have both existed since the two features that carry
them; the drift is one `Map` lookup away and was never made.

**The target was never moved, and the arithmetic proves it.** Against an entry
of 56.233 the live decision's stop and target sit at exactly 2.0 risk-reward —
0.55843474 of risk against 1.11686948 of reward. Walking the stop to 55.954
takes the same pair to 4.0, because trailing shrinks the risk and leaves the
reward alone. That is why `anEntryDecision()` drifts on the stop only: it is
the observed case, and it makes a test that moves the target say something.

**Direction is the reading, not the numbers.** A long is protected by a stop
that rises and a short by one that falls, so `protects` is computed in the use
case against `position.direction` rather than left to JSX. A surface
subtracting for itself would get the sign backwards on exactly half the market
— and backwards on a stop reads as *covered* when the truth is *exposed*.
`direction` is matched against BattleGrid's declared `LONG`/`SHORT` and
anything else claims no direction at all.

**`incomparable` is a third state on purpose.** A decision that recorded no
stop and a position that reports none are two different absences, and neither
is agreement. Folded into "as decided", a stop that has vanished from a live
position would have rendered as a stop that never moved.

**Window.** `list_entry_decisions` defaults to ten rows and accepts fifty. Ten
is a few hours of `THE .0`'s history, so the join would answer *unknown* for
the very positions it exists for. The fake now records the limit asked for, the
way it already records the gate-block window.
