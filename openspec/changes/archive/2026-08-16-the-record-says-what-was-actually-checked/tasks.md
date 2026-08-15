# Tasks

## 1. #193 — DT-0014's acceptance says which half expired

- [x] 1.1 Add a `supersession` reference to `openspec/design/tickets/DT-0014.json`
      naming `the-receipt-states-what-remains`, the date (2026-08-13), and which
      half of the acceptance it retired.
- [x] 1.2 Annotate acceptance lines 3 and 6 in place so a top-down reader sees
      it without reaching `references`.
- [x] 1.3 Leave `design.tokens`, `design.states` and `status` untouched — the
      visual ruling is live and correct.
- [x] 1.4 Confirm `validate --all` still reports the same 13 warnings (two of
      them are DT-0014's uncovered `receipt` states and must not move).

## 2. #242 — the live-region definition, then the records

- [x] 2.1 Re-measure all four counts from the working tree; record them with
      today's date.
- [x] 2.2 Write the ruling into `docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md`
      row 8 so the next measurement counts the same thing.
- [x] 2.3 Correct `openspec/backlog/may-a-submit-disable-itself-while-it-is-in-flight.md`.
- [x] 2.4 Correct `openspec/backlog/the-checklist-and-the-button-disagree-about-disabling.md`.
- [x] 2.5 Correct the 2026-08-14 `openspec/JOURNAL.md` entry inline — annotate,
      do not rewrite; it is history.
- [x] 2.6 Verify neither item's *conclusion* moved: the absence on
      `perform-button.tsx` is re-checked directly, and both items stay open.

## 3. #252 — the predicates get exercised

- [x] 3.1 Extract `namesNewline` and `namesEncoding` from the rule loops into
      named functions; have both loops call them.
- [x] 3.2 Add the matcher proof: the composed selector + predicate reports a
      known-offending write line and passes a pinned clean one, for both rules.
- [x] 3.3 Prove it is not vacuous — make `namesNewline` permissive, observe the
      new case fail, restore. Same for `namesEncoding`. Record the output.
- [x] 3.4 Confirm the existing four cases still pass unchanged.

## 4. #293 — the record catches up to the fix

- [x] 4.1 Read `tests/live/write-probe.test.ts` at `HEAD` and confirm both
      assertions the item asked for are present.
- [x] 4.2 Close the backlog item against `0c10bc4`, recording that the fix is
      key-gated and unproven until the next keyed run.
- [x] 4.3 Leave the test file untouched — nothing to change.

## 5. Backlog and mirrors

- [x] 5.1 Close #193, #242, #252 items; link `change:` on each before closing.
- [x] 5.2 Close GitHub issues 193, 242, 252 with the evidence. #293 is already
      closed — do not reopen.
- [x] 5.3 File the design-contract rule #193 raises (restyle acceptance
      describes treatment, not content) as its own item + issue.

## 6. Verification

- [x] 6.1 `npx tsc --noEmit`
- [x] 6.2 `npm run lint`
- [x] 6.3 `npm test` — 205 files / 2575 cases, plus the new cases
- [x] 6.4 `python3 .claude/tools/openspec.py validate --all` — 0 errors, 13 warnings
- [x] 6.5 `test:db` skipped — no schema change

## Notes from execution

**#193** — `design` block verified byte-identical to the previous version; only
`acceptance`, `references`, `updated` changed. 13 validate warnings unmoved.

**#242** — the item's 130 reproduces exactly at `ff5220d`, which proves the
method was the same and only the definition was narrow. The total took three
values inside 2026-08-14 (129/130/132) and is 139 at HEAD, so the records carry
the commit alongside the figure and the checklist carries the grep instead of a
number. Grep blind spot recorded: `role={...}` expressions
(`app/(app)/arena/page.tsx:130`).

**#252** — mutation proof run both ways: `namesNewline` → `/./` and
`namesEncoding` → `/./` each give **1 failed, 4 passed**, only the new case
catching it. That "4 passed" is the item's claim reproduced. Restored from a
scratchpad copy, verified 5 passed.

**#293** — no test file touched. Fix already on `main` in `0c10bc4`; read at
HEAD rather than inferred. Item reconciled to `done`; issue was already closed
and stays closed.

**Deferral filed**: `a-restyle-acceptance-can-pin-content-and-rot` (#320).

**Gates**: `tsc` clean · `eslint` exit 0 · **205 files / 2576 vitest** (2575
before) · `validate --all` 0 errors / 13 warnings · `test:db` skipped, no schema
change · `tests/live/**` excluded by config, unrun by design.
