---
id: lifecycle-actions-swallow-a-failed-reread
title: Strategy archive/restore/fork actions silently redirect when their re-read fails
type: risk
status: done
priority: p3
created: 2026-08-12
updated: 2026-08-12
change: "the-outcome-reaches-the-person"
capability: strategy-authoring
github: "165"
blocked_by: []
tags: [refusal, spec-tension, writes]
---

# Lifecycle actions swallow a failed re-read

## What

The three strategy lifecycle server actions (archive, restore, fork) re-read
the roster before performing. When that re-read comes back `unreadable`, or
the strategy is no longer in the listing, each silently `redirect('/strategies')`
— the submitted intent is dropped and no problem message is shown. The
operator lands on the list with no sign their click did nothing, or why.

## Why it matters

p3: the write did not happen, so nothing is inconsistent on the platform — but
the operator asked for a write and got silence, which sits badly against
"The Outcome Of A Write Reaches The Person Who Asked For It" (the
agent-authoring spec's requirement; strategy-authoring's writes follow the
same doctrine). A flaky read at exactly the submit moment turns a deliberate
act into an unexplained no-op.

## Evidence

The three lifecycle actions in `app/(app)/strategies/[id]/{archive,restore,fork}/page.tsx`
— each has the silent-redirect branch on a failed roster re-read / missing
listing. Found by the 2026-08-12 ceremony survey (`strategy-archive-confirm`,
`strategy-restore-confirm`, `strategy-fork-confirm` manifests; the pattern is
recorded per-surface in their action components).

## Notes

The decided message shape exists: bounce back to the ceremony page with
`?problem=` naming the failed re-read, as a refusal would. The fork action's
missing `expectedRevision` (staleness rides on the confirmationToken alone) is
recorded in the fork manifest — the same visit could consider both.

Also from the same survey, same family, restore only: the
`?outcome=repair-required` branch is checked before the `isActive` check, so a
stale repair-required URL on a strategy that has since been restored says
"needs rebuilding first" instead of "not archived" — a bookmark misdescribing
current state.
