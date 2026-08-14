# Design: A Refusal Lands Where Someone Reads It

## Technical Approach

Two page fixes apply an in-codebase pattern; the new check derives the
relation those fixes restore. The scan extracts every `problem=` mint from
redirect strings in the UI tree, resolves each template to the route it
targets (the `[seg]`-matching walk `reachability.test.ts` already uses),
locates the `page.tsx` serving that route, and reports it unless the page
reads `problem` from its `searchParams` and mounts `<CarriedProblem` on every
render branch (branches counted by `<main`, the `CARRY_PROBLEM` property).
The scan is a function of its roots and runs twice — production expecting
zero, a planted fixture tree expecting exactly the plant.

## Decisions

### Decision: The check derives the set; the pinned CARRY_PROBLEM list stays

Derived, because the pinned list's own comment records the failure mode this
change exists for: it "was written from the pages one change happened to
touch, which is not the same as the pages the rule applies to" — and indeed
neither defective page is on it. The list stays anyway: it is loud, cheap,
and pins pages the derivation might one day stop seeing. Rejected: replacing
the list with the derivation — losing a redundant loud guard to save lines is
the wrong direction in the week this repo wrote the vacuity requirement.

### Decision: The refused apply recompiles the review rather than preserving the dead one

The `onRefused` redirect carries `compile=1`, `tagline`, `sections` (from the
apply form's new hidden inputs) alongside `problem`. The compile is
effect-free by platform design, and the spec's refusal taxonomy already names
"review again" as the next step for the commonest causes — so landing on a
fresh review with the refusal above it *is* the recovery, not a detour.
Rejected: carrying the old compiled plan back for re-display — it would show
a review whose confirmation is known-dead, inviting a second press of a
button that cannot succeed.

### Decision: Fixture mechanics follow `a-floor-fails-when-its-scan-goes-blind`

The fixture lives under `tests/architecture/fixtures/problem-redirects/` as a
miniature app tree: one page that mints `?problem=` to its own route and does
not read it. Only this scan walks it; two invocations, never a merged root
with a path filter. The fixture's comments must not spell the idioms the scan
matches (`problem=`, the redirect shape) — measured lesson M0 of that change.

### Decision: Per-branch regions with fragment resolution, not a bare count

(Revised during execution — the first cut counted `<main` against
`<CarriedProblem` textually, the `CARRY_PROBLEM` property.) The first honest
run showed that count punishing good design: `conditions/save` factors its
heading and banner into one `const head` fragment rendered on seven branches,
which a textual count reads as one carrying branch and six bare. So the check
extracts each `<main`…`</main>` region and accepts it when it contains the
component *or* renders a local `const` fragment that does. `CarriedProblem`
renders null when there is nothing to say, so mounting unconditionally still
costs nothing.

### Decision: A KNOWN_SILENT ledger for the one non-mechanical target

The first honest run named `agents/[id]/edit`, which renders refusals through
`AgentEditForm`'s own hand-rolled banner — reconciling that with the shared
component is a design decision, not a mechanical mount, and mounting
page-wide would double-render beside the form. So it is filed
(`the-agent-editor-reads-a-refusal-its-own-way`, #255) and carried as a
ledger row in the scan, asserted in both directions the way
`write-results.test.ts` does: an unlisted silent target fails, and a row
whose page starts carrying fails until deleted. Rejected: fixing it in this
change — the reconciliation deserves its own review; and rejected: a path
exemption without a verdict — a claim about the code belongs where it is
checked.

## File Changes

- `app/(app)/strategies/[id]/edit/page.tsx` (modified) — reads `problem`;
  banner on every branch; refusal redirect carries the compile params.
- `src/presentation/components/plan-review.tsx` (modified) — optional
  `tagline` / `sections` props rendered as hidden inputs in the apply form.
- `app/(app)/agents/[id]/archive/page.tsx` (modified) — banner on the
  non-proposal branch.
- `tests/architecture/a-problem-redirect-is-read-where-it-lands.test.ts`
  (new) — the derived scan, run twice.
- `tests/architecture/fixtures/problem-redirects/**` (new) — the plant.
- No schema, no domain, no adapter changes.
