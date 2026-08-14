# Design: A Floor Fails When Its Scan Goes Blind

## Technical Approach

Each conversion extracts the scan into a function of its root(s), then runs it
twice: over the production roots, expecting zero offenders (the rule,
unchanged), and over a fixture root, expecting exactly the planted offender
set. Where a fixture is impractical, the floor is re-expressed over an
intermediate the scan itself produces. No rule's scope moves.

## Decisions

### Decision: Fixtures live outside every production scan root

A planted offender inside `app/` or `src/` would be reported by the very rule
it exercises *and* by any neighbouring scan that walks the same tree — a
deliberate defect shipping in the product source. So fixtures live under
`tests/architecture/fixtures/<scan-name>/`, and only the scan being exercised
is pointed at its own fixture directory. Rejected: planting offenders in the
production tree behind ledger exemptions — every exemption ledger is itself a
list someone must keep honest, and it would teach every future scan to carry
one.

### Decision: The scan runs twice rather than once over a merged root

Running production roots and fixture root in one walk would make "zero
offenders at HEAD" unassertable — the fixture's hit is indistinguishable from
a real one without filtering by path, and a path filter is exactly the kind of
independent mechanism this change exists to remove. Two invocations keep both
assertions pure: clean tree, and found fixture.

### Decision: Inventory before conversion, and (a)-class floors are left alone

A floor that already counts the rule's own intermediate (`write-results`
counts `executeSites()`) is converted to nothing — churning it would be
rewriting a working guard to look like the new ones. The inventory table is
the record of which class each floor is in and why, so the next reader does
not re-derive it.

### Decision: Mutation evidence per converted guard, recorded in tasks.md

"The guard can fail" is a measurement, not a review opinion — the #245 round's
scratch-arm typecheck run is the template. Each converted guard gets one
mutation of its scanner's real weak point (the multi-line `<form` tag for the
`inAction` walk), a red run, a revert, and a line in the Results section.

## File Changes

- `tests/architecture/every-perform-says-it-is-working.test.ts` (modified) —
  the named (b)-class conversion.
- Further `tests/architecture/*.test.ts` per the inventory (modified).
- `tests/architecture/fixtures/**` (new) — deliberate offenders, one
  directory per scan, each with a header comment naming the scan it feeds.
- No production code.
