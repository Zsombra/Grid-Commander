---
id: the-deciding-branch-awaits-a-required-condition
title: conditionEvaluation's verdict/decidedBy have never been seen populated — observable once a required condition exists
type: question
status: done
priority: p3
created: 2026-08-11
updated: 2026-08-16
change: ""
capability: agent-understanding
github: "147"
blocked_by: []
tags: [battlegrid, v17, conditions, observation]
---

# The deciding branch awaits a required condition

## What

v17's `conditionEvaluation` block is rendered on the evaluation page
(#133, built 2026-08-11), and its `verdict` / `decidedBy` fields are
carried verbatim — but they have **only ever been observed null**,
because no condition yet read on this account is `required: true`, so the
condition system is never asked to decide. The outcome-level `counts`
(presumably the `N_OF` tally) is likewise unobserved populated.

As of 2026-08-13 that premise is no longer a handful of spot checks: it is
measured across 706 occurrences of `required` in eight of the account's 17
strategies. See "Re-checked 2026-08-13" below.

## Why it matters (p3)

The page renders the platform's words the day they appear — nothing is
broken and nothing needs building. But until the deciding branch is seen
once, its vocabulary is unknown, and any future surface that wants to
*explain* a condition-blocked evaluation is designing blind.

The 2026-08-13 counts change what kind of gap this is. It is not that the
deciding branch is rare and will show up in a wide enough read. On the eight
strategies read it cannot occur at all, so waiting for it to appear is waiting
for something the account's own configuration forbids.

## Re-checked 2026-08-13

Read-only, ~20:00 UTC, against the account whose `get_account_state` answers
`username: "Fibonacci"`, BattleGrid v18.2.0.

- `list_strategies` reports **17 strategies** on the account.
- **Eight** were read in full via `get_strategy`: Dunkirk, Leningrad, London,
  Tobruk, Midway, El Alamein, Bastogne, Kursk.
- Across those eight: **706** occurrences of the key `"required"`, of which
  **zero** carry the value `true`. Per strategy the counts were 86, 92, 90,
  89, 89, 86, 88, 86.
- **Nine strategies were not read.** Nothing here is a claim about them.

The 706 is measured: it is the count of the `"required"` key in those eight
payloads. That each occurrence is one condition slot is inferred from the
schema, not proven by the count.

What follows, stated at the width it was measured. Within those eight
strategies nothing requires anything, so the condition system is never asked
to decide, so `verdict` and `decidedBy` cannot be populated by reading. The
deciding branch is not rare there; it is unreachable from a read-only
position. The account-wide version of that sentence is inference, not
measurement, because the nine unread strategies are the one place an existing
`required: true` condition could still be sitting.

## What would unblock it

Two moves, cheapest first.

1. **Read the remaining nine strategies.** Nine `get_strategy` calls, no
   write. Either a `required: true` condition is already there and the branch
   opens for free, or the finding above becomes account-wide instead of
   eight-strategies-wide.
2. **Author a condition with `required: true`.** The path exists end to end:
   the condition composer can set `required` (#88, `a-draft-can-insist`,
   archived 2026-08-11). Then read a few evaluations under it and record what
   `verdict` and `decidedBy` say for a condition that held and one that did
   not. That closes this as an observation, and the evaluation page's
   rendering is confirmed against real words instead of carried on trust.

Move 2 is a write, and writes need `BATTLEGRID_LIVE_WRITES=1` on top of a key
(`HANDOFF.md:106`, enforced by `tests/architecture/live-writes.test.ts:211`).
That flag is unset by default.

So this is observable-in-principle by us, not blocked. BattleGrid does not
withhold the branch, and Grid-Commander can already author the condition that
reaches it. What stands in the way is a decision: set the flag and change a
real strategy on a real account. That is the operator's call, not something a
read-only sweep should make on its own. Calling this item "blocked" would
overstate it; calling it "one read away" would too. It is one deliberate write
away, and nobody has chosen to make it.

## Move 1 taken, 2026-08-15 — the nine were read, and the account-wide sentence is now measured

All nine remaining strategies read in full (Normandy, Stalingrad, Berlin,
Iwo Jima; Lepanto, Salamis, Cannae, Trafalgar, Alesia). Three findings, one
of them not the one this item predicted:

1. **No `required: true` CONDITION exists anywhere on the account.** The
   seventeen strategies carry 35 authored conditions between them (the four
   Full-Send SYSTEM strategies are rich: Normandy 9 with `conditionRef`
   groups, Stalingrad 10, Berlin 6 including the `N_OF` n-of-3 tally and a
   `NOT` group, Iwo Jima 6; four of the five private strategies carry one
   each) — and every one reads `required: false`. The eight-strategies-wide
   finding is now account-wide **measurement**. The deciding branch's
   `verdict`/`decidedBy` remain reachable only by the write.

2. **Two `required: true` SIGNAL RULES exist, and were live all along** —
   `trend_adx_ranging` on **Salamis** (bound 1) and `trend_adx_trending` on
   **Trafalgar** (bound 2), both at `minRequiredCount: 0`. The 2026-08-13
   census counted the eight SYSTEM strategies only; the account's own
   strategies were the unread nine. This is a different axis from the
   condition system, but it means **historical evaluations under required
   signal rules already exist** (the fleet fired through 08-13 18:01Z) — how
   the platform reports a required signal (the required-count tally, any
   per-signal marker) is readable NOW from a Trafalgar- or Salamis-bound
   agent's signal logs, no write needed. That read is the sharpened next
   step before the write, and also the first probe of what
   `minRequiredCount: 0` under a required rule even means.

3. **The strategy-side verdict vocabulary is observed**: `null`, `"NEITHER"`,
   `"UP"`, `"DOWN"` all appear on live condition payloads (the privates read
   NEITHER; Normandy/Berlin's directional composites carry UP/DOWN; most
   SYSTEM conditions read null). The *evaluation*-side `decidedBy` remains
   the unobserved half.

## The write landed, 2026-08-15 ~08:19Z — the account holds its first required condition

Authorized by the operator ("FINISH UP THE 147") and performed through the
platform's own compile→review→apply ceremony over MCP:

- Fresh read: Salamis revision 3, `RANGING_TAPE` `required: false`.
- Compile: `changedAxes: ["CONDITIONS"]` and nothing else — the diff shows
  exactly `required: false → true`; viability viable; `bindingImpact.
  boundAgentCount: 1`; proposedRevision 4; token bound to revision 3.
- Apply: `committedRevision: 4`, `propagatedAgentCount: 1`, read-back
  byte-identical everywhere but the one flag.

**The watch this arms**: once the platform unpauses and Salamis's bound
agent is evaluated, read a few evaluations and record what
`conditionEvaluation.verdict` and `decidedBy` say — for a capture where
ADX ≤ 20 held and one where it did not. That observation closes this item.

Checked 2026-08-15, later the same day (after an MCP-backend outage — 502
at the endpoint for 30+ minutes, site root 200 throughout, then recovered):
the fleet is still `PLATFORM_PAUSED` 20/20, `radarPaused: true`, nothing
fired since 2026-08-13T18:01:18Z. No evaluation under revision 4 can exist
yet; the watch stays armed and nothing here is observable.

**The apply itself produced a separate p2 finding**: the live server
rejected `regimeAutoDerive` and `regimeTimeframe` as *unrecognized keys* on
the plan — the same server's schema declared them required at session
start, and the product's own `toApplyPlan` still sends both, so every
strategy apply the product's UI composes is currently refused. The write
here succeeded only by dropping the two keys by hand. Filed as
[[every-apply-the-product-composes-is-refused]] (#285).

**The write, if taken, has a better shape than a test fixture.** Flipping
Salamis's own `RANGING_TAPE` (or Trafalgar's `TRENDING_TAPE`) to
`required: true` is not an artificial probe — it is the strategy becoming
more itself (a range-fade that refuses non-ranging tape), it targets a
bound strategy so evaluations arrive as soon as the platform unpauses, and
the propagation is the strategy's stated intent rather than a side effect.
The unbound alternative (a throwaway condition on Alesia) is zero-risk and
zero-observation until something binds it.


## OBSERVED 2026-08-16 (v19.2.0) — both branches, and a gate stage nobody had seen

The watch armed on 2026-08-15 fired. The fleet unpaused, Breakwater was
evaluated under Salamis revision 4, and **both halves of the observation this
item asked for are now on record** — the TRUE capture and the FALSE one. They
arrive through two different tools, which is itself the finding.

### The deciding branch, populated for the first time

`get_signal_log(Breakwater, 390ed557…)`, LDO, evaluated 2026-08-16T07:39:03Z:

```json
"conditionEvaluation": {
  "outcomes": [{
    "conditionKey": "RANGING_TAPE",
    "name": "The tape is ranging (ADX ceiling)",
    "outcome": "TRUE",
    "required": true,
    "evidence": [{ "kind": "clause", "sectionKey": "includeTrendStrength",
                   "header": "ADX_now", "op": "lte", "operand": "16.3",
                   "literal": "20", "outcome": "TRUE" }],
    "counts": null,
    "provisional": true
  }],
  "verdict": "NEITHER",
  "decidedBy": "RANGING_TAPE",
  "strategyRevision": 4,
  "provisional": true,
  "counts": { "trueCount": 1, "total": 1, "unresolvedCount": 0 }
}
```

**The vocabulary, no longer unknown:**

- `decidedBy` carries a **`conditionKey`** — the condition that decided it, not
  a stage name or an enum.
- `verdict` is **directional, not pass/fail**. It reads `NEITHER` while the
  required condition is `TRUE` and the evaluation routed. It mirrors the
  condition's own authored `verdict` field (`NEITHER` on this condition), so it
  answers *"which side does the condition system point at"*, not *"did it
  pass"*. **Anything that renders `verdict` as a success/failure signal would
  be wrong** — that is the trap this item existed to prevent.
- `counts` is `{trueCount, total, unresolvedCount}` at the outcome level and
  `null` per-condition. So the `N_OF` tally guessed at in the What is a
  three-field roll-up, and it sits beside the outcomes rather than inside them.
- `provisional: true` appears at both levels and in the gate-block detail
  below. Unexplained by anything read here; recorded, not interpreted.

### The FALSE branch is not a signal log at all — it is a new gate stage

The item expected to find the FALSE case "for a capture where ADX ≤ 20 did not
hold" among the evaluations. It is not there, and could not be:
`list_signal_logs(Breakwater, terminalStatus: BLOCKED)` and `INELIGIBLE` both
return **0 rows**. A failed required condition never becomes a signal log.

It becomes a gate block, at a stage this account had never produced:

```json
{ "coinTicker": "SKHX", "gateStage": "CONDITIONS",
  "reasonCode": "REQUIRED_CONDITION_FALSE",
  "reasonDetail": { "failedConditionKeys": ["RANGING_TAPE"],
                    "conditionVerdict": "NEITHER",
                    "strategyRevision": 4, "provisional": true },
  "createdAt": "2026-08-16T12:57:59.501Z" }
```

`list_gate_blocks(Breakwater)` summary: **`CONDITIONS` / `REQUIRED_CONDITION_FALSE`,
17 occurrences, latest 2026-08-16T12:57:59Z.** Both the gate stage and the
reason code are new to this account — every stage previously seen was `TOKEN`,
`EVALUATION` or `ACCOUNT`.

And unlike `OPEN_POSITION_CONFLICT`, whose `reasonDetail` is always `null`,
**this one carries a populated detail** naming the failed condition, the
verdict, the revision it was evaluated under and the same `provisional` flag.

### What this settles

The premise this item rested on — *"no condition on this account is
`required: true`, so the condition system is never asked to decide"* — was true
when measured across 706 occurrences on 2026-08-13, and was ended deliberately
by the 2026-08-15 apply that flipped Salamis's `RANGING_TAPE` to required. The
same day's platform pause deferred the payoff by one day. **The write was worth
making**, and the shape it bought is the record above.

**Closing.** Nothing here is broken and nothing was claimed falsely — the
evaluation page carries these fields verbatim, which is why the day they filled
they were correct.

### One thing this exposed, filed separately

`stoppages.tsx` renders any detail value that is an object or array as the
literal string `(detail)`. On this payload that hides `failedConditionKeys`,
which is the single most useful field in it — an array of plain strings that
would render perfectly. The rule was written for `rrRejectedPairs`, an array of
structured objects where `(detail)` is the right call. See
[[a-condition-block-hides-the-condition-that-failed]] (#337).
