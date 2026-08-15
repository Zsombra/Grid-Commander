---
id: the-write-paths-are-unverified-at-v19
title: Nine live write probes have never run against v19 — the writes are conformant on paper only
type: risk
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-15
change: ""
capability: platform-mapping
github: "306"
blocked_by: []
tags: [battlegrid, v19, live-probes, needs-key, needs-authorisation]
---

# The write paths are unverified at v19

## What

The 2026-08-15 keyed session re-probed to v19.1.0 and ran the live suite
**read-only**. Nine probe files are gated behind `BATTLEGRID_LIVE_WRITES=1`
and therefore have never executed against v19:

`apply-probe` · `condition-write-probe` · `custom-table-probe` ·
`proposal-probe` · `radar-probe` · `recorder-probe` · `restore-probe` ·
`retune-probe` · `write-probe` (its write half)

So every write path this product has is conformant against the **refreshed
record** and unobserved against the **running server**.

## Why it matters

v19 changed the input schemas of `apply_strategy_plan` and
`compile_strategy_plan`, and `custom-table-probe` is the only place the
preview fix from `the-preview-matches-the-live-contract` is exercised
live at all.

The reason this is a risk and not a formality is that the same session
measured **declared and observed disagreeing in both directions** on one
field pair: `regimeAutoDerive` was deleted from all fifteen output schemas
*and* from the response, while `regimeTimeframe` is still returned though
nothing declares it. Conformance against a declaration is exactly the
assurance that failed there. The write side has had no equivalent check.

p3 rather than higher because the offline guard did pass against a record
that is genuinely current, and because the historical dead-write-path
defects were all caught by that guard once the record was fresh. This is
the residual, not a known break.

## Evidence

- `grep -l "BATTLEGRID_LIVE_WRITES" tests/live/*.test.ts` — the nine files
  above (verified 2026-08-15).
- The read-only run: 23 files passed, 8 skipped, 55 tests, exit 0.
- #293's fix was proven with a name-filtered run under the writes flag so
  only the thinking-log *read* executed — no mutation was made.
- The declared-vs-observed divergence that motivates this: #287's closing
  comment, and the `regimeAutoDerive`/`regimeTimeframe` note in
  `src/infrastructure/battlegrid/strategy-adapter.ts`.

## Notes

**This needs two things, not one**: a keyed environment *and* the
operator's explicit go-ahead, because the probes fork strategies, create
and archive agents, and write deployments on the live account. That is
why the keyed session did not simply run them — see
[[operator-workflow-rhythm]].

The probes are self-cleaning by design (fork → archive the fork; probe
agent acquired → released in a `finally`), and none of them calls a
`mcp:wager` tool. The residual cost of running them is objects that exist
briefly on the account, which the operator has authorised before on a
named basis.

Cheapest useful subset if the full set is too much: `custom-table-probe`
(covers the preview change directly) and `apply-probe` (covers the input
schema v19 actually moved).
