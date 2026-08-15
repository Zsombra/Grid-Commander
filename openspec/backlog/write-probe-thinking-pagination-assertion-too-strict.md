---
id: write-probe-thinking-pagination-assertion-too-strict
title: the thinking-log probe demands more than one page and fails a healthy agent that has exactly one
type: bug
status: done
priority: p3
created: 2026-08-15
updated: 2026-08-16
change: the-record-says-what-was-actually-checked
capability: platform-mapping
github: "293"
blocked_by: []
tags: [live-probe, test-robustness, pr-82-refile]
---

# A probe that needs the data to be big enough

Re-filed 2026-08-15 from draft PR #82's stranded backlog (issue #289,
original filed 2026-08-11 and fixed *on that branch only*). Of the three
probe repairs that branch carried, this is the only one whose defect still
exists on `main` — the other two assertions were removed when the probe
suite was rebuilt.

## What

`tests/live/write-probe.test.ts:575` asserts, on the agent thought/decision
log:

```
expect(log.total, 'the server reports more than one page holds').toBeGreaterThan(
```

Observed live 2026-08-11: it failed `expected 17 to be greater than 17` —
the agent had exactly 17 decisions and the server returned all 17 in one
page. The product read was correct; the assertion encodes a data
precondition (a second page exists) that a healthy agent need not satisfy.

## Why it matters

A live probe that fails a working platform gets ignored, and then it guards
nothing — the exact rationale of the branch's `the-probes-catch-up-to-v17`
change. This is the last survivor of that class on `main`.

## Evidence

- `tests/live/write-probe.test.ts:575` on `main` today, message string
  `'the server reports more than one page holds'`.
- The live failure: operator-approved write-probe run, 2026-08-11
  (recorded in the original item on tag
  `archive/claude/agent-creation-data-strategies-fw6av8`).

## What would settle it

Assert `log.total >= log.decisions.length` and that `decisions.length` is
bounded by the page size — or skip the multi-page check when `total` fits
one page. The property worth guarding is that the product never invents
decisions beyond what the server reports; it should not depend on the agent
having accumulated two pages of history. The probe is key-gated, so the fix
lands blind and is proven at the next keyed run.

---

## Settled 2026-08-16 — already fixed; the record was the only thing left open

**Nothing was changed in the test.** The repair landed on `main` in `0c10bc4`
("the record catches up two majors, and the platform's prose comes home",
#287/#294/**#293**, PR #303) on 2026-08-15, and GitHub issue #293 was closed the
same day. Only this item stayed `open`, which is why it was still on the board.

Read from `tests/live/write-probe.test.ts` at `HEAD` (`e48a083`), not inferred
from the commit subject:

```ts
// :539  const PAGE = 20;  — and the same PAGE is the requested `limit` on :540
expect(log.decisions.length, 'the page honours the requested limit').toBeLessThanOrEqual(PAGE);
expect(log.total, 'the total covers everything the page returned').toBeGreaterThanOrEqual(
  log.decisions.length,
);
```

That is exactly the pair this item asked for: the page honours its bound, and
the reported total never undercounts what arrived. `grep 'more than one page
holds'` returns nothing anywhere under `tests/` — the assertion that failed
`expected 17 to be greater than 17` is gone, and the comment above the new pair
records the 2026-08-11 failure and this item's number.

**The proof is still owed, and the fix is still blind.** The probe is key-gated,
so nothing above has been exercised against the live platform. What is verified
today is that the assertion no longer *encodes a data precondition*; what is not
verified is the read itself. **The first real evidence comes at the next
operator-approved keyed run** — which is what this item predicted when it said
"the fix lands blind and is proven at the next keyed run", and that sentence is
still true.

**The lesson is the gap, not the defect.** A fix can land with its issue closed
and leave the canonical record open, because closing the issue and closing the
item are two acts and only one of them is visible in a PR. This is the same
family as `the-mirror-is-checked-one-way` (#309) — the mirror was checked from
item to issue, and this is the direction that was not checked.
