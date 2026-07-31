---
id: three-actions-silence-their-refusals
title: Reactivate, agent archive, and strategy archive drop their refusal arms
type: bug
status: done
priority: p2
created: 2026-07-31
updated: 2026-07-31
change: three-actions-silence-their-refusals
capability: agent-authoring
blocked_by: []
tags: [server-actions, refusals]
---

# Reactivate, agent archive, and strategy archive drop their refusal arms

## What

Found by the guard built for `no-action-may-discard-a-write-result`
(`tests/architecture/write-results.test.ts`). Three server actions call a
command whose result union carries a refusal arm, discard it, and redirect:

| Site | Command | Arm lost |
|---|---|---|
| `app/(app)/agents/[id]/reactivate/page.tsx` | `setLifecycle` | `{kind:'not-permitted', reason}` |
| `app/(app)/agents/[id]/archive/page.tsx` | `setLifecycle` | `{kind:'not-permitted', reason}` |
| `app/(app)/strategies/[id]/archive/page.tsx` | `setStrategyActive` | `{kind:'refused', reason}` and the `LifecycleResult` repair arms |

A not-permitted reactivate reloads the page unchanged — indistinguishable from
success, which is the exact defect the requirement "The Outcome Of A Write
Reaches The Person Who Asked For It" was written against after the rename
action shipped it. The strategy-archive drop also swallows the arm
`repair-required-cannot-be-detected` cares about, so even once that branch can
fire, this page would discard it.

## Fix

Branch on the result in each action; on a refusal, surface the returned reason
on the page acted from (the fixed rename/edit action on
`app/(app)/agents/[id]/page.tsx` and `rename.test.ts` are the pattern). Each
fix deletes its `KNOWN_DROPPED` row in `write-results.test.ts` — the guard
fails until the row is removed, so the ledger cannot silently keep a fixed
site, nor a fix land unverified.

No spec delta needed: the existing requirement already states the behavior and
its scenarios; these sites violate it.

## Related

- `no-action-may-discard-a-write-result` — the class; closed by the guard
- `repair-required-cannot-be-detected` — the branch the strategy-archive drop
  would swallow even after it becomes reachable
