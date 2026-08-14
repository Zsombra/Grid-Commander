# Proposal: A Refusal Lands Where Someone Reads It

## Why

#232 gave every confirmation refusal a road back to the person, and two of
those roads do not arrive (backlog
`two-refusal-redirects-land-where-nothing-reads-them`, #240, found reviewing
PR #235). The strategy editor redirects a refused apply to
`?problem=` and then never reads the parameter — on that route #232 converted
a loud crash into silence, which is harder to diagnose than what it replaced.
The agent-archive refusal redirects to a page that does read `problem`, but
mounts it only on the `proposal` branch; after a spent confirmation the
describe declines to re-mint, so the refusal lands on the other branch — by
construction — and the sentence is discarded. Both violate the standing
requirement "A Refused Confirmation Reaches The Person Who Spent It"; the
spec is right and the product is wrong, which is why nothing here is a new
promise and one thing is a new check.

## What Changes

- `app/(app)/strategies/[id]/edit/page.tsx` reads `problem` from its
  `searchParams` and renders it through `CarriedProblem` on every branch the
  refusal redirect can land on.
- The refused apply carries the review back, not just the reason: the apply
  form gains hidden `tagline` / `sections` inputs (via `PlanReviewPanel`,
  whose only consumer is this page), and the `onRefused` redirect rebuilds
  `compile=1&tagline=…&sections=…` alongside `problem` — so the operator
  lands on a recompiled review with the refusal above it, the way
  `agents/[id]/edit` carries every submitted field. (An expired confirmation
  means "review again and nothing is wrong" — the recompile *is* the next
  step the spec's refusal taxonomy names.)
- `app/(app)/agents/[id]/archive/page.tsx` mounts `CarriedProblem` on its
  non-proposal branch too, the way `/pending/[id]`'s `Shell` mounts it on
  every branch and says why.
- A new gating check derives every `?problem=` mint in the UI, resolves each
  to the page that serves the target route, and fails when that page does not
  read `problem` or does not mount `CarriedProblem` on every render branch.
  Derived, never pinned — the existing `CARRY_PROBLEM` list's own comment
  records how a pinned list got here ("written from the pages one change
  happened to touch"). Per the requirement "A Gating Check Fails When Its Own
  Scan Goes Blind", the check runs twice: production roots expecting zero
  offenders, and a planted fixture expecting exactly the plant.
- Whatever the new check's first honest run names beyond the two known
  instances is fixed in this change or filed with evidence — the loud first
  run is the finding, not a regression.

## Capabilities

**New**: none
**Modified**: `app-access` — MODIFIED requirement "A Refused Confirmation
Reaches The Person Who Spent It": one added scenario making the landing
surface a checked property rather than a remembered one.

## Out of Scope

- **Retiring the pinned `CARRY_PROBLEM` list**
  (`tests/agent/refusals-reach-the-operator.test.ts`). It stays: it is a
  pinned list, loud on drift, and cheap. The derived check covers a superset
  by a different mechanism; removing the list is cleanup that risks reach and
  buys a few lines.
- **The rule editor's mint-side params** (`strategies/[id]/rules/[signalId]`)
  — the item's third suspect, that the mint drops `edit=1` / `p_*`, was
  checked during the item's own review and does not hold; recorded there so
  it is not re-raised. (The page's *landing* branches were a separate gap the
  new check found on its first honest run, and were fixed under task 2.3 —
  that is coverage the check earned, not this suspect re-raised.)
- **Refusals that do not travel as `?problem=`** — `repair-required` rides
  `outcome=` deliberately (guidance, not a problem banner) and keeps its
  dedicated rendering; the check keys on the `problem` convention only.
- **Changing `spending()`'s signature or the refusal taxonomy.** The roads
  are wrong at their ends, not in the middle.

## Impact

- `app/(app)/strategies/[id]/edit/page.tsx` — reads `problem`, mounts the
  banner per branch, carries the compile params through the refusal.
- `src/presentation/components/plan-review.tsx` — the apply form gains two
  hidden inputs fed by new optional props (one consumer).
- `app/(app)/agents/[id]/archive/page.tsx` — the non-proposal branch mounts
  `CarriedProblem`.
- `tests/architecture/` — one new scan with a fixture under
  `tests/architecture/fixtures/`, mutation-tested per the vacuity
  requirement.
- `openspec/specs/app-access/spec.md` at archive.
