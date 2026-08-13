---
id: two-refusal-redirects-land-where-nothing-reads-them
title: Two confirmation refusals redirect to a page or branch that never shows the reason
type: risk
status: open
priority: p2
created: 2026-08-14
updated: 2026-08-14
change: ""
capability: app-access
github: "240"
blocked_by: []
tags: [confirmation, error-handling, operator-facing]
---

#232 gave every confirmation refusal a road. Two of those roads do not arrive.

Both were found reviewing PR #235. A third suspect — the rule editor dropping
`edit=1` and `p_*` — **was checked and does not hold**: `rules/[signalId]`
builds `{ a, req, problem }` for the confirmation refusal (lines 384–385) and
the identical set for the platform's own refused arm (lines 400–401). They agree.
Recorded here so it is not re-raised.

## 1. The strategy editor never reads `problem`

`app/(app)/strategies/[id]/edit/page.tsx:432` redirects to
`/strategies/<id>/edit?problem=…`.

`EditStrategyPage` types its `searchParams` at line 22 and destructures it at
line 33. Neither mentions `problem`, the file imports no `CarriedProblem`, and
the only occurrence of the word in the file is the redirect that sets it. So on
this route #232 converts a loud crash into **silence** — which is harder to
diagnose than what it replaced, because nothing at all appears to have happened.

## 2. The agent-archive refusal lands on the branch that drops it

`app/(app)/agents/[id]/archive/page.tsx:79` redirects to
`/agents/<id>/archive?problem=…`. The page reads `problem` (line 21) and mounts
`CarriedProblem` (line 42) — but only on the `result.kind === 'proposal'`
branch. The other branch renders:

```tsx
if (result.kind !== 'proposal') {
  return (
    <main …>
      <h1>Cannot archive</h1>
      <p role="alert" …>{result.reason}</p>
    </main>
  );
}
```

The redirect re-runs `describeArchive`. After a spent confirmation the agent is
usually already archived, so the describe declines to mint and this is the
branch taken — by construction, not by accident. The operator sees *"Cannot
archive: …"* and the confirmation's own sentence is discarded.

## The fix is already in this codebase

`/pending/[id]` gets this right and says why: its `Shell` mounts `CarriedProblem`
on *every* branch, precisely because "a refused agree redirects back here, and
the page it lands on may by then describe a different state". PR #235's own
description calls that out. The pattern just was not applied to archive.

For the strategy editor the page has to start reading `problem` at all; it is
also worth carrying the `compile` / `tagline` / `sections` parameters so the
reviewed plan survives, the way `agents/[id]/edit` carries every submitted field.

## Worth a guard

Every `onRefused` target should be a route whose page reads `problem` and mounts
it on the branch a re-run describe will take. The first half is statically
checkable from the redirect string plus the page's `searchParams` usage. This
product has repeatedly failed to notice this class by reading, and both instances
here are absences rather than wrong code.

## Why it matters

p2, not p1: each is an improvement on a framework crash page and neither loses a
write. But #232's stated purpose is that the product's sentence reaches the
person, and on these two it does not.
