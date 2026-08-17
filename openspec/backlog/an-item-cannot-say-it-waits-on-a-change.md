---
id: an-item-cannot-say-it-waits-on-a-change
title: blocked_by names items and external waits, but not the active change an item is waiting for
type: debt
status: open
priority: p3
created: 2026-08-17
updated: 2026-08-17
change: ""
capability: harness-integrity
github: "345"
blocked_by: []
tags: [openspec, validate, backlog, vocabulary]
---

# The vocabulary got wider today and still cannot say this

`blocked_by` took backlog item ids only, so an item waiting on BattleGrid or on
another person had no way to say so. **#342's change added three namespaces** —
`upstream:`, `external:`, `operator:` — and four items moved onto them.

One shape is still unsayable: **an item waiting on an active change.**

```
an-approval-expires-while-nobody-is-looking
  blocked_by: [the-approval-can-be-answered]      ← a change, not an item

WARNING backlog_blocked_by_unknown: blocked_by 'the-approval-can-be-answered'
        is not a backlog item
```

`a-confirmation-that-cannot-name-the-amount` carries the same. Both have been
part of the standing 15-warning baseline for as long as it has existed.

## What would settle it

A fourth namespace, `change:<id>`, validated against active **and archived**
changes — archived matters, because the wait ends when the change lands and the
item should then read as unblocked rather than as naming something that no
longer exists.

## Why it was not done in the same pass

Deliberate. Widening a vocabulary twice in one change is how the second half
stops being read, and the four items that needed the external namespaces were
the ones costing board time. This one costs two warnings in a baseline everybody
already knows.

## Notes

- Filed at the 2026-08-17 close-out. The decision to defer is recorded in that
  session's journal and in #342's PR body; this item is the deferral itself.
- Cheap when taken: the parser change is one regex and one lookup, and the two
  items above are the test cases.
