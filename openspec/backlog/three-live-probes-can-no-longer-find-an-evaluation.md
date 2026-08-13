---
id: three-live-probes-can-no-longer-find-an-evaluation
title: Three live probes can no longer find an evaluation to read
type: risk
status: open
priority: p3
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: agent-understanding
github: "207"
blocked_by: []
tags: [live, battlegrid, probes, account-state]
---

# Three live probes can no longer find an evaluation to read

## What

The live suite was run twice on 2026-08-13 against the operator's account
(`CI_LIVE`-equivalent, `BATTLEGRID_LIVE_WRITES` unset). Both runs: **3 failed,
20 passed, 8 skipped** across 31 files. The same three, with the same reasons:

```
evaluation-probe      Error: evaluations unreadable
own-evaluation-probe  Error: no agent on this account has an evaluation to read
simulate-probe        Error: no evaluation on this account was within the
                             simulator's range
```

The 2026-08-13 (CI) journal entry records the previous full run as **twelve
gates, all ok, nothing skipped**, including ~9 minutes of serial live probes. So
these three have started failing since that run.

## Why it matters

p3, and the priority is a judgement about which of two causes this is — the item
exists because **nobody has established which**:

- **Account state** (likely): two of the three say so almost in words — *"no
  agent on this account has an evaluation"*, *"no evaluation … within the
  simulator's range"*. Agents that have not evaluated recently leave these
  probes nothing to read. Nothing is broken; the probes are simply
  data-dependent and the data moved.
- **A platform read failing** (possible): the first says *"evaluations
  unreadable"*, which is the product's `unreadable` outcome — a read that did
  not answer, not an empty one. That is the same shape as
  [[battlegrid-is-returning-internal-errors]] (#100), where a tool serves older
  rows and 500s on the newest.

The consequence if left alone is not a broken product — it is three probes that
fail for reasons nobody has written down, which is how a suite stops being read.
A probe that fails on account state and a probe that fails on a platform
regression must not look the same from the outside.

## Not caused by `the-connection-asks-who-it-is`

Established by reachability rather than asserted:

- Files that change touches under `src/` and `app/`: 11.
- Files the three failing probes import: none of those 11 **except**
  `src/infrastructure/battlegrid/mcp-adapter.ts`.
- That file's entire diff is three hunks between lines 420 and 441 — all inside
  `tokenRequest`, the OAuth token exchange.
- `grep -c "exchangeCode|\.refresh("` over all three probes returns **0, 0, 0**.
  None of them can reach the changed code.

## Evidence

- Full run captured 2026-08-13, 394s, `--reporter=basic`:
  `3 failed | 20 passed | 8 skipped (31)` files,
  `3 failed | 41 passed | 17 skipped (61)` tests
- `tests/live/evaluation-probe.test.ts` — reads a *public* competitor's
  evaluation, so its failure is not about this account's agents
- `tests/live/own-evaluation-probe.test.ts:133`
- `tests/live/simulate-probe.test.ts:107`
- Previous known-good: journal `2026-08-13 (CI)`

## Notes

Settling it costs one read, not a build: call `list_signal_logs` for an agent on
the account and see whether it answers with rows, answers empty, or fails. If it
answers empty, this is account state and the probes should say *skipped for want
of data* rather than fail — a probe that cannot tell "nothing to test" from
"the platform is down" has the same defect the product is built to avoid. If it
fails, this belongs to #100.

Found while running the live suite as extra assurance for
`the-connection-asks-who-it-is`; it is not a gate for that change and did not
block it.
