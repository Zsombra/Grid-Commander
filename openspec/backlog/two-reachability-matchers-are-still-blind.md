---
id: two-reachability-matchers-are-still-blind
title: Two reachability matchers still pass with their rules dead, and the vacuity check retypes one of them
type: debt
status: open
priority: p2
created: 2026-08-10
updated: 2026-08-10
change: ""
capability: harness-integrity
github: "87"
blocked_by: []
tags: [guards, mutation-testing, tests]
---

# Two reachability matchers are still blind

## What

`a-guard-nobody-has-seen-fail` repaired seven architecture guards and proved each
by mutation. It did **not** scope `tests/architecture/reachability.test.ts`,
because the audit in #87 classified that file as the best-defended in the
directory — 14 of 17 kills caught. That classification is right and the three
survivors it names are still real.

Measured 2026-08-10, after the seven repairs landed:

| mutation | result |
|---|---|
| the `<form …>` tag scan → matches nothing | **SURVIVED** |
| the server-action extractor (`export async function …`) → matches nothing | **SURVIVED** |

Two rules go quiet:

- **`binds every form to a function rather than a URL`** — the rule that no form
  renders and submits nowhere. With the tag scan dead, `unbound` is `[]` and it
  passes having examined no forms at all.
- **`leaves no server action that nothing submits to`** — with the extractor
  dead, no action is ever enumerated, so none can be found orphaned.

#87 also records a third, subtler one: the vacuity check near L976 **retypes the
form regex** rather than calling the one the scan uses. That is the same
guards-its-own-copy defect `identifiers.test.ts` had, and repairing it is the
same move — one declaration, both callers.

## Why it matters

Not safety-critical, which is why it is p2 rather than p1: a blind form check
costs a dead button, not a write to somebody's account. But it is the last known
place where a green suite asserts something it is not checking, and the file is
the one everything else was told to copy for its structure.

The cost is also known and bounded now. The other seven took one session, and
`tools/mutate-guard.mjs` makes verifying the repair a single command per rule:

```
node tools/mutate-guard.mjs tests/architecture/reachability.test.ts \
  'src.matchAll(/<form\b[^>]*>/g)' 'src.matchAll(/ZZZNEVER/g)'
```

## What would close it

Both mutations above returning KILLED, and the L976 vacuity check calling the
live form matcher instead of a transcription of it. The file is 996 lines with
17 rules, so it is its own change rather than a tail on someone else's — half
the reason it was left out.

## Also still open

`confirmation-is-human.test.ts` has one narrow residual, described in #87: a
narrowing of `MINTS` to a form occurring only in page render keeps the L123
assertion green while the server-action scan goes blind. Left alone deliberately
— that file is the one whose approach worked, it asserts both its patterns
against real source, and the residual is materially harder to reach by accident
than anything repaired here. Recorded so it is a decision rather than an
oversight.
