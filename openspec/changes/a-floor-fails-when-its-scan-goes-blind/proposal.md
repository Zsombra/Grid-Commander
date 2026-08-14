# Proposal: A Floor Fails When Its Scan Goes Blind

## Why

Three times this repo's offender-style scans stopped matching and reported a
clean tree (#230, and twice in the #232 / PR #235 round). The countermeasure —
anti-vacuity floors — cannot do its job wherever the floor counts a different
pattern than the rule: `every-perform-says-it-is-working.test.ts` walks an
`inAction` state machine over `<form action=`, while its floor counts files
containing the literal `<PerformButton`. If the state machine breaks on a
shape it does not expect, the offender scan silently finds nothing and the
floor still passes — it proves the files exist, not that the scanner still
reads them (backlog `a-vacuity-floor-that-does-not-exercise-its-own-scan`,
#241).

## What Changes

- Every offender-style scan under `tests/architecture/` — a scan whose pass
  state is "found zero offenders" — gains a guard that fails when the scan's
  own machinery goes blind. Two admissible mechanisms, per the item:
  1. **Positive fixture** (preferred): a known offender in a fixture tree the
     scan also walks, asserted *found*. The scanner breaking un-finds the
     fixture and the test fails.
  2. **Floor from the rule's own intermediate**: assert on what the scan
     itself produced ("the `inAction` walk saw ≥ N action forms"), never on an
     independent grep.
- The work starts with an inventory: classify every floor in
  `tests/architecture/` as (a) already counting with the rule's machinery,
  (b) counting an independent pattern, or (c) an offender scan with no floor
  at all. The classification table is recorded in the change; only (b) and
  (c) are converted. Known (b) on day one: `every-perform-says-it-is-working`.
  Known (a), left alone: `write-results` (its floor counts `executeSites()`).
- Each converted guard is mutation-tested the way it would actually break —
  the scanner's idiom mutated (a multi-line `<form` opening tag, an attribute
  order it does not expect), the guard confirmed to fail, the mutation
  reverted. Results recorded in `tasks.md`, as the #245 round did for its
  `satisfies never` tail.

## Capabilities

**New**: none
**Modified**: `app-access` — one ADDED requirement: a gating check that scans
for offenders fails when its own scan goes blind, not only when an offender
appears.

## Out of Scope

- **Pinned-list guards** (`SURFACES`, `CARRY_PROBLEM`, `KNOWN_DROPPED`
  ledgers): they assert named files against named properties and cannot go
  vacuous by the found-nothing route — an entry that stops matching fails
  loudly. Nothing to convert.
- **Scans outside `tests/architecture/`** (e.g. the pins in `tests/agent/`):
  same lesson, different directory; if the inventory turns up an offender-scan
  there, it is filed as its own item rather than swept in silently.
- **Raising or tightening any rule itself.** This change hardens the guards on
  the rules; every rule's scope stays exactly where it is.

## Impact

- `tests/architecture/*.test.ts` — guards added or converted per the
  inventory; no production code is touched.
- A fixture tree (location decided in `design.md`) holding deliberate
  offenders, walked only by the scans pointed at it — never by the production
  scans' default roots, so a planted offender cannot trip an unrelated rule.
- `openspec/specs/app-access/spec.md` at archive.
