---
id: the-agent-editor-reads-a-refusal-its-own-way
title: The agent editor renders refusals through a hand-rolled banner, and four branches drop a bounced one
type: risk
status: done
priority: p2
created: 2026-08-14
updated: 2026-08-14
change: "a-bounced-reason-survives-the-agent-editor"
capability: app-access
github: "255"
blocked_by: []
tags: [confirmation, error-handling, operator-facing, vacuity]
---

Found by `a-problem-redirect-is-read-where-it-lands.test.ts` on its first
honest run (the derived scan `a-refusal-lands-where-someone-reads-it` built
for #240). The page is that scan's only `KNOWN_SILENT` ledger row; the row's
deletion is enforced, so closing this item and clearing the ledger are the
same act.

## Evidence

- `app/(app)/agents/[id]/edit/page.tsx` — seven `<main` branches; the bounced
  `query['problem']` reaches only the compose branch (line ~108). The
  roster-unreadable, no-such-agent, no-catalog, and confirm branches never
  see it; the unresolvable-preset (~152) and describe-refused (~192) branches
  pass their own fresher sentence as `problem`, replacing the bounced one.
- `src/presentation/components/agent-edit.tsx:125` —
  `{problem && <p role="alert" …>}` — a hand-rolled banner without the
  "Refused:" prefix, predating `CarriedProblem`.
- `tests/agent/refusals-reach-the-operator.test.ts:124` — `HAND_ROLLED`
  matches `{problem ? [(<]` only, so the `&&` spelling evades the
  product-wide one-banner rule. A guard matching one spelling of an idiom,
  live on the one page that styles refusals its own way.

## What would settle it

Reconcile the form onto the shared component (or render it inside the form),
mount on all seven branches, keep a bounced reason distinct from a
branch-local refusal (`/pending/[id]` renders both facts), delete the ledger
row, and widen `HAND_ROLLED` to the `&&` spelling.

## Notes

Not swept into #240's change deliberately: mounting `CarriedProblem`
page-wide would double-render beside the form's own banner on three
branches — the reconciliation is a design decision, not a mechanical mount.
Related: [[two-refusal-redirects-land-where-nothing-reads-them]] (#240).

## Resolution (2026-08-14)

Done by change `a-bounced-reason-survives-the-agent-editor` (standard,
archived): all seven branches mount `CarriedProblem` for the bounced reason;
the form's `problem` prop narrowed to branch-local refusals and its
hand-rolled banner became the shared component (the double-render trap the
Notes named is resolved by that split, not by dropping either fact — the
`app-access` requirement gained the scenario "a fresher refusal does not
replace a carried one", with a rendering test). `KNOWN_SILENT` is empty and
its deletion enforced both ways; `HAND_ROLLED` widened to the `&&` spelling
in both matcher copies, in the same change per the roads entry's ordering.
Mutation-tested: the restored `&&` banner and a dropped mount both go red.
