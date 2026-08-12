# What the strategy pages show is what happens

## Problem

Three defects on three strategy surfaces, one shape: **the page states
something, and something else is true.**

**1. A fork may not be the revision the page named** (#165). The fork page tells
the operator their copy "starts identical to revision {strategy.revision}"
(`fork/page.tsx:98`), a number from the page's own read. The action then
re-reads the roster and sends `sourceRevision: req.strategy.revision` from the
**fresh** read (`strategy-lifecycle.command.ts:46`). If the parent moved between
render and click, the page named one revision and the fork took another. Two
comments assert the opposite is guaranteed — `fork/page.tsx:18` ("the revision
the user was looking at, not at 'latest'") and `:150` ("it forks at the revision
that was on screen").

**2. A restored strategy is told it needs rebuilding** (#165). `restore/page.tsx`
reads `outcome === 'repair-required'` at line 69 and `strategy.isActive` at line
92. A stale `?outcome=repair-required` bookmark on a strategy that has since
been restored therefore renders "needs rebuilding first" — with the state read
sitting available and unconsulted.

**3. Duplicate entries disappear from the conditions list** (#167).
`conditions/save/page.tsx` keys React lists by display strings: every key-less
entry maps to the literal `'(an entry with no key)'` (`:279`), and the problem,
inexpressible-reason and drift-reason lists key by the reason text itself
(`:193`, `:230`, `:250`). Two entries sharing a key collide, and React renders
one where the operator should see two.

## Intent

**Make each of the three say only what is so.**

The fork is taken at the revision the page named, by carrying it rather than
re-deriving it. The restore page consults the strategy's state before it
consults a bookmark. The conditions lists key on identity rather than on what
they happen to display.

## Capabilities touched

- **strategy-authoring** — ADDED (a fork is taken at the revision shown; a
  listing shows every entry it was given) + MODIFIED (the restore page's state
  precedence)

## Scope

### In scope

- Carry the rendered revision through the fork form and send it as
  `sourceRevision`; correct the two comments to describe what the code does
- Consult `isActive` before `?outcome=` on the restore page
- Key the four conditions-save lists on position or identity, not display text
- Tests for all three — the conditions-save page has none today

### Out of scope

- **The `ConditionCard` duplication** (#167's second finding). The listing state
  near-duplicates the shared component inline with a differing annotation, and
  collapsing them is a refactor on a page with no test coverage. The keys are
  the half that can lose a row; the duplication is a drift trap. It stays on
  #167, which is narrowed rather than closed.
- **`editQuery`'s multi-value truncation** (#167's third finding). It needs a
  repeated query parameter the composer does not emit, so nothing can currently
  trigger it. Stays recorded on #167.
- **What happens when the parent moved.** Pinning means the platform is asked
  for a revision that is no longer current, which `fork_strategy` accepts by
  design — `sourceRevision` is its parameter. No new refusal path is invented
  for a case the platform already handles.
- **Fork lineage on any surface.** The platform returns no `forkedFromRevision`
  (#97), so no surface may state which revision a fork came from. This change
  makes the *act* honest, not the record of it.

## Why standard, not lite

Two of the three change observable behavior and need requirements to say so —
which revision a fork takes is a product contract, not an implementation
detail. Not `full`: no migration, no money, no auth, single package, reversible.
