---
id: lifecycle-actions-swallow-a-failed-reread
title: Restore's repair-required branch outranks its isActive check, and fork's revision comment disagrees with fork's code
type: risk
status: done
priority: p3
created: 2026-08-12
updated: 2026-08-13
change: "what-the-page-shows-is-what-happens"
capability: strategy-authoring
github: "165"
blocked_by: []
tags: [refusal, spec-tension, writes, stale-comment]
---

# Lifecycle actions: what the outcome sweep left behind

> **Reopened and narrowed 2026-08-13.** The titled defect — the silent
> redirect — **shipped** under `the-outcome-reaches-the-person` and the item was
> closed with it. Two findings recorded in its Notes were declared *Out of
> Scope* by that same change, so closing the item left them with no open home.
> They are what this item is now about, and one of the two was **stated wrong**.
> The original title was *"Strategy archive/restore/fork actions silently
> redirect when their re-read fails"*; the original text is kept below.

## What shipped, and is not this item any more

All three lifecycle actions now bounce a failed pre-perform re-read back to
their ceremony page with `?problem=` naming what happened and that nothing was
attempted. Verified in the tree 2026-08-13:

```
archive/page.tsx:124,130   redirect(`…/archive?problem=…`)
restore/page.tsx:146,152   redirect(`…/restore?problem=…`)
fork/page.tsx:162,171      redirect(`…/fork?${query}`)   + typed name preserved
```

## What is left

### 1. Restore checks a bookmark before it checks the state

`app/(app)/strategies/[id]/restore/page.tsx` reads `outcome === 'repair-required'`
at **line 69** and `strategy.isActive` at **line 92**. A stale
`?outcome=repair-required` URL on a strategy that has since been restored
therefore renders "needs rebuilding first" instead of "not archived" — a
bookmark that misdescribes current state, with the state read available and
unconsulted.

Unchanged since filing. Swapping the two checks is the whole fix.

### 2. The fork's revision comments say something the fork does not do

**The original note was wrong.** It read:

> The fork action's missing `expectedRevision` (staleness rides on the
> confirmationToken alone) is recorded in the fork manifest.

Fork has **no confirmation token at all**, deliberately, and says so at
`fork/page.tsx:12` (DL-105): *"Forking creates something new and changes
nothing that exists — there is no blast radius to name."* So staleness rides on
nothing, and the sentence describing what it rides on is false.

The real gap is one layer down, and sharper. Two comments assert the fork is
pinned to what the operator saw:

```
fork/page.tsx:18   "The fork is taken at the revision the user was looking at,
                    not at 'latest': copying whatever happens to be current
                    would copy a version they never saw."
fork/page.tsx:150  "The use case takes the whole strategy, not an id: it forks
                    at the revision that was on screen, which only the loaded
                    object knows."
```

The action carries only `strategyId` and `name` from the form. It then re-reads
the roster and forks from `listing.strategy` — the **fresh** read —
and `strategy-lifecycle.command.ts:46` sends `sourceRevision: req.strategy.revision`.
That is the revision current at submit time, not the one rendered.

So a parent edited between render and click is forked at its new revision,
which is exactly what the comment says the design refuses to do. The comment
and the code disagree, and the comment is the one making the promise.

## Why it matters

p3 on both, and for different reasons.

**(1)** is a wrong sentence on a real state, cheap to fix, no write involved.

**(2)** claims nothing false *to the operator* — no surface renders fork
lineage — so today it is a comment defect. It becomes p2 the moment any surface
tells someone their fork is "based on" what they were looking at, because the
payload cannot back that (see [[a-fork-cannot-say-which-revision-it-came-from]],
#97: no `forkedFromRevision` comes back).

The lasting cost is that the comments are load-bearing. They are the reason the
use case takes a whole strategy object instead of an id, and a future reader
refactoring toward an id would think they were preserving a guarantee that is
not there.

## Evidence

- `app/(app)/strategies/[id]/restore/page.tsx:69` vs `:92`
- `app/(app)/strategies/[id]/fork/page.tsx:12`, `:18`, `:150`, and the action's
  `requiredText(formData, 'strategyId')` / `optionalText(formData, 'name')`
- `src/application/use-cases/strategy-lifecycle.command.ts:46`
- Out-of-scope declaration: `openspec/changes/archive/2026-08-12-the-outcome-reaches-the-person/proposal.md`

## Notes

**Decide (2) before fixing it.** Two coherent answers, and the comment picked
one without the code following:

- **Pin it** — carry the rendered revision in the form and fork at that,
  making the comments true. Costs a hidden field and a decision about what to do
  when the parent has moved (refuse, or fork the old revision silently).
- **Un-pin it** — fork at current and correct the comments to say so. Cheaper,
  and arguably right: the fork page already re-reads for a reason, and a fork of
  a *newer* parent is rarely the surprise the comment implies.

Do not leave them disagreeing. Original text follows.

---

<details>
<summary>As filed 2026-08-12 — the silent-redirect item, now shipped</summary>

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

</details>
