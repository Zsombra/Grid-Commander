# The record says what was actually checked

## Why

Four p3 items, filed across three sessions, are the same defect wearing four
costumes: **a claim that outran its proof, and nothing noticed.**

- **#193** — `DT-0014` is `implemented`, and two of its seven acceptance lines
  became false on 2026-08-13 when an approved change removed the counts they
  ask for. The ticket still reads as unmet.
- **#242** — three binding records say *"the product has 19 live regions"*. 19
  is exactly the `role="status"` count. `role="alert"` is defined as
  `aria-live="assertive"`, so it is a live region too, and the sentence in
  `JOURNAL.md` says `role="status"`/`role="alert"` **while carrying the
  status-only number**.
- **#252** — `tools-write-lf.test.ts` proves its selector and not its
  predicates. Make either predicate permissive and the offender list empties
  forever; the suite stays green with the rule dead.
- **#293** — the item is open against an assertion that was repaired on
  2026-08-15.

Three of the four are bookkeeping. The fourth is a live hole in a guard that
799 committed carriage returns paid for.

## What

**#193 — `openspec/design/tickets/DT-0014.json`.** A `kind: "note"` reference
(all 32 existing references use `note` and the validator does not constrain the
field, so a new `supersession` kind would be schema nothing reads) recording that the receipt-content half of the acceptance was superseded
2026-08-13 by `the-receipt-states-what-remains`, and that the token ruling is
still live. The two affected acceptance lines are annotated in place, because a
reader checking acceptance top-down never reaches `references`. No token, state
or treatment is touched: the ticket's design ruling is correct and unchanged.

**#242 — the definition, then the three records.** The ruling: **a live region
is `aria-live`, `role="status"` or `role="alert"`** — the last two are implicit
live regions by ARIA definition, so all three count. The corrected figure is
carried **with the date it was measured**, because it moves: the item measured
130 on 2026-08-14 and the same three greps return **139 today**. Corrected in
`may-a-submit-disable-itself-while-it-is-in-flight.md`,
`the-checklist-and-the-button-disagree-about-disabling.md`, and the
2026-08-14 `JOURNAL.md` entry (as an inline correction — the entry is history,
so it is annotated, not rewritten). `UI_COMPONENT_REVIEW_CHECKLIST.md` row 8
gains the definition, so the next person to measure counts the same thing.

**#252 — `tests/architecture/tools-write-lf.test.ts`.** The two predicates move
out of the rule loops into named functions the loops call, and the matcher case
runs the **composed selector + predicate** over a known-offending write line and
a pinned clean one. Extracting first is the point: a proof that re-typed the
regex would assert against a copy and leave the live one unexercised — the
vacuity this directory exists to prevent.

**#293 — the record only.** `tests/live/write-probe.test.ts:583-586` already
asserts `total >= decisions.length` and bounds the page, landed in `0c10bc4`
(#303); issue closed 2026-08-15. The item alone was left open. It is closed
against that commit, and it records that the assertion is **key-gated and still
unproven** — a blind fix, whose first real evidence comes at the next keyed run.

## Verified

- `#252` — the matcher proof fails when either predicate is made permissive
  (`/newline\s*=/` → `/./`), which is the mutation the item names as surviving
  today. Recorded in the executor's notes with the observed output.
- `#293` — the assertion read from `main` at `HEAD`, not inferred from the
  commit subject.
- `#242` — all four counts re-measured from the working tree rather than copied
  from the item.

## Not in scope

- **Adding a live region to `perform-button.tsx`.** #242 explicitly does not
  decide it, and the two items whose argument rests on the absence stay open
  and unchanged in their conclusions — only the denominator is corrected.
- **The design-contract rule #193 muses about** (a restyle ticket's acceptance
  should describe treatment and structure, not content). That is a change to
  the contract, not to one ticket, and it is filed rather than written here.
- **Sweeping the other architecture tests for the same vacuity.** #241 did that
  inventory; this closes its named residual only.

## Track

`lite`, `skip_specs: true`. Records, one review checklist, and one test's
internal structure. No product code, no observable behavior, and no spec
describes any of it.
