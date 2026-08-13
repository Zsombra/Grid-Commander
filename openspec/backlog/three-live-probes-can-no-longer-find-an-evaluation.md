---
id: three-live-probes-can-no-longer-find-an-evaluation
title: Three live probes can no longer find an evaluation to read
type: risk
status: done
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

---

# Closed 2026-08-13 (evening) — all three pass, and it was transient

Re-run against the same account, unchanged code:

    own-evaluation-probe   PASS   Vanguard: 5 evaluations · AVAX 84 consulted,
                                  20 fired, 20 attributed -> SKIP (LLM_DECLINED),
                                  cost GLM-5.2 $0.02378971 reported
    simulate-probe         PASS
    evaluation-probe       PASS   Market Predator: 10 evaluations listed

Nothing was fixed. The condition cleared on its own.

**Both hypotheses this item carried are falsified.** It offered *account state*
or *a platform read failing* (#100). Neither holds: the account has evaluations
in quantity — `list_signal_logs` answers `total` 143 / 27 / 80 for the three
agents — and `get_signal_log` serves details for every one sampled. The public
field is populated too (`get_agent_explorer` → 38 entries).

So the failures were real — observed twice, identically, hours apart — and were
neither of the two things they looked like. The cause is unidentified and the
item closes anyway: it exists to record a red suite, the suite is green, and
inventing a third hypothesis to close it on would be worse than saying this.

**What to do if it recurs**: the diagnostic that settles it is
`list_signal_logs` → `get_signal_log` on the returned `entries[].id` with
**both** `agentId` and `logId` — the tool requires both, and calling it with
`logId` alone returns an argument-validation error that reads like a platform
fault and is not one. That mistake cost three passes of this sweep.

The reachability argument in the original filing stands unchanged: these probes
import nothing that `the-connection-asks-who-it-is` touched, and its diff inside
`mcp-adapter.ts` is confined to `tokenRequest`, which none of them reach.
