---
id: the-write-paths-are-unverified-at-v19
title: Nine live write probes have never run against v19 — the writes are conformant on paper only
type: risk
status: blocked
priority: p3
created: 2026-08-15
updated: 2026-08-17
change: ""
capability: platform-mapping
github: "306"
blocked_by: [operator:live-write-authorization]
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

## Run 2026-08-16 — eight of nine executed against v19.2.0, seven green

Operator supplied the key and authorised the run by name. **The platform had
moved again**: the probe found **v19.2.0**, not the v19.1.0 the record held, so
these are the first write paths ever exercised against v19 *and* they were
exercised against a deployment newer than the one they were audited on.

Run with `BATTLEGRID_LIVE_WRITES=1` via `vitest.live.config.ts`:

```
apply-probe            PASS  64.0s  frees a slot, forks, compiles, applies, restores
restore-probe          PASS  40.4s  forks, archives, restores, cleanup archived
retune-probe           PASS  72.2s  parks Alesia, forks, retunes, restores Alesia
recorder-probe         PASS  39.2s  run-1 - platform 19.2.0 - 20 recorded, 0 failed
custom-table-probe     PASS
proposal-probe         PASS
write-probe            PASS
condition-write-probe  FAIL         see below - a real refusal, not a flake
radar-probe            NOT RUN      held back deliberately - see below
```

### The one failure is a finding

```
VALIDATION_ERROR  [condition] condition 'GC_PROBE_DRAFT':
  operator 'gt' is not legal for 'regTrend_now' (output kind 'classification')
  - legal operators are is, in
```

Filed separately as [[a-classification-metric-refuses-comparison-operators]] —
the question it raises is whether the product's own authoring surface can
compose the same illegal pairing.

### Why radar-probe was held back

It is the one probe that mutates something the operator is actively running.
Step 1 is `delete_radar_deployment` against a **real** deployed coin, followed
immediately by `expect(deleted.deleted).toBe(true)`, and only then the restoring
`upsert`. **The file has no `finally`.** If that assertion trips, a live
deployment is deleted and nothing puts it back.

The account state at run time made that unacceptable: **radar was at its cap,
`coinsDeployed: 20` of `coinCap: 20`**, with TRUMP, AIXBT and SKHX `IN_POSITION`
carrying real margin. Held pending either a `finally` that restores, or a
deliberate run when the fleet is below cap and flat.

### The account was verified clean afterwards

| | before | after |
|---|---|---|
| agents | 16 (3 ACTIVE) | 16 (3 ACTIVE) — none created, archived or changed |
| agent slots | 3/3 | 3/3 |
| radar | 20/20, 3 in position | 20/20, all policyIds and revisions identical |
| strategy quota | 5/25 | 5/25 — Alesia parked and restored (r9) |

`inPosition` moved 3 → 4 during the window because Breakwater opened ENA at
00:50:49Z — normal trading, not the probes.

**No probe agent was minted.** That is `a-probe-agent-is-archived-on-the-first-account`
(#201)'s fixture working on every path that routes through it.

**Five archived strategy forks were minted**, which is the same residue pattern
one level down — recorded on #201 rather than here.

### What stays open

Eight of nine paths are now observed against a running v19.2.0 server, one is a
confirmed refusal with its own item, and one is unrun by choice. This item stays
open until `radar-probe` has either a `finally` or a safe window.

## 2026-08-16 — one of the named risks is now covered, by a read rather than a write

**No write probe was run.** This item is explicit that running them needs a keyed
environment *and* the operator's go-ahead, and neither was assumed. It stays open
and stays the operator's call.

What did happen is that the single risk this item names most concretely got
covered from the read side.

### `preview_strategy_report` is exercised live at v19.2.0, post-fix

The Why says *"`custom-table-probe` is the only place the preview fix from
`the-preview-matches-the-live-contract` is exercised live at all"* — and that
probe is behind the writes flag, so the fix was unexercised.

`preview_strategy_report` **is a read tool**. It was called twice today at
v19.2.0 with the post-fix argument shape (no `regimeAutoDerive`, no
`regimeTimeframe`), on `{timeframe, coinSelection, sections}` plus the two new
market-read inputs, and it **answered 200 both times** with fully rendered
sections. Working details are on [[the-preview-cannot-carry-a-market-read]]
(#302).

So the preview fix is now observed against the running server, not merely
conformant against the record — **and it needed no write flag, no operator
authorization, and no mutation.** The probe that was thought to be the only
route was not the only route.

### Correction — written against a stale reading of this item

**The paragraph that stood here was wrong and is withdrawn.** It said the nine
gated probe files were "unchanged and unrun" and that `apply_strategy_plan` and
`compile_strategy_plan` "remain unobserved at v19". Both claims are false: the
**Run 2026-08-16** section above records eight of nine executed against v19.2.0
with the operator's authorisation, seven green, and `apply-probe` PASS exercises
both of those tools. The error came from reading this item's opening and Notes
without reading its own run record — the exact failure this repository keeps
filing about.

What is actually true of *this* session: **it ran no write probe and sought no
authorisation to.** That is all the note below was entitled to say.

**Note the version drift**: this item was filed against v19.1.0. The server is
now **v19.2.0** (confirmed today by the `initialize` handshake:
`serverInfo battlegrid 19.2.0`). Whatever run eventually happens will be against
a version later than the record the offline guard passes on, so the run should
re-check the version first rather than assume the record still matches.

### The ask, stated once

Running the nine needs the operator to say so, in the session, at the moment.
They fork strategies, create and archive agents, and write deployments on the
live account — self-cleaning by design, but real writes on a real account.
Nothing in this session sought that authorization, and nothing should be run
until it is given.

## Re-statused 2026-08-17 — `blocked`, on an authorisation only the operator can give

The item states the ask in its own words: *"Running the nine needs the operator
to say so, in the session, at the moment."* They fork strategies, create and
archive agents, and write deployments on the live account. That is not work
waiting to be picked up off a board, and `open` said it was.

**Tripwire — two conditions, and they are separate:**

1. The operator authorising a live write run, in-session and by name.
2. For `radar-probe` specifically, a **flat fleet below cap**. The account stands
   at 20/20 with open positions. Its `finally` guard landed 2026-08-17, so it is
   safe to say yes to whenever that window opens — which is a different fact from
   it being runnable now.

Re-check the server version first when the run happens. The item was filed
against v19.1.0 and the handshake now reports **v19.2.0**, so the offline guard
passes against a record already one deployment behind the running server.

Not withdrawn by this: eight of the nine probes **did** execute against v19.2.0
on 2026-08-16, seven green. What stays open is the ninth and the re-run, not the
whole set — the correction above says so and this status does not reopen it.
