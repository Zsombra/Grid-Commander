---
id: write-probe-thinking-pagination-assertion-too-strict
title: the thinking-log probe demands more than one page and fails a healthy agent that has exactly one
type: bug
status: done
priority: p3
created: 2026-08-11
updated: 2026-08-11
change: the-probes-catch-up-to-v17
capability: agent-introspection
blocked_by: []
tags: [live-probe, test-robustness]
---

# A probe that needs the data to be big enough

## What

`write-probe.test.ts:575` asserts, on the agent thought/decision log:

```
expect(log.total, 'the server reports more than one page holds')
  .toBeGreaterThan(log.decisions.length)
```

It failed `expected 17 to be greater than 17`: the agent has exactly 17
decisions and the server returned all 17 in one page. The product read is
correct — it read every decision. The assertion encodes a data precondition
(more than one page exists) that a healthy agent need not satisfy.

## Fix

Make the assertion tolerant of a single page: assert
`log.total >= log.decisions.length` and that `decisions.length` is bounded by
the page size, or skip the multi-page check when `total` fits one page. The
property worth guarding — the product never invents decisions beyond what the
server reports — should not depend on the agent having accumulated two pages of
history.

## Note

Found during the operator-approved write-probe run, 2026-08-11. Same run left
two write tests SKIPPED because the account is at 3/3 agent slots
(`write-probe` agent-create and `proposal-probe`'s write test both need to
create a throwaway agent). Those are not failures; they need a slot temporarily
freed, which was not done to a live trading agent without a specific decision.
