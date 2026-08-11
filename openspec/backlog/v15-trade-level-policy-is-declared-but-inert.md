---
id: v15-trade-level-policy-is-declared-but-inert
title: v15 moved stop bounds and the RR floor onto the strategy, and the compiler ignores them — no write path exists
type: risk
status: open
priority: p1
created: 2026-08-09
updated: 2026-08-09
change: ""
capability: strategy-authoring
blocked_by: []
tags: [battlegrid, v15, platform-regression, money, live]
---

# Trade-level policy has no working write path at v15

## What

BattleGrid v15.0.0 moved three fields off the agent and onto the strategy:

| field | v14 home | v15 home |
|---|---|---|
| `maxStopLossPct` | `tradingConfig` (agent) | strategy |
| `minStopLossPct` → **`minStopLossAtrMultiple`** | `tradingConfig` (agent) | strategy |
| `minRiskRewardRatio` | `tradingConfig` (agent) | strategy |

`tradingConfig` went 18 → 15 keys and now **rejects** all three
(`unrecognized_keys`). The strategy side declares them on all three
`compile_strategy_plan` branches (CREATE/UPDATE/RESTORE), on
`apply_strategy_plan`'s plan, and reads them back on `get_strategy`,
`fork_strategy`, `archive_strategy`, `restore_strategy` and
`update_strategy_signal_rule`. `compile_strategy_plan`'s output even gained
a whole `approvedPlan.diff.tradeLevelPolicy` axis.

**But the compiler does not process them.** Sent on an UPDATE with real
value changes (RR 1.5 → 2.5, ATR floor 1 → 1.5, ceiling 5 → 4):

- no validation error — the fields are accepted
- `approvedPlan.diff.changedAxes` = `['IDENTITY']` (only the paired tagline edit)
- `approvedPlan.diff.tradeLevelPolicy` = **null**
- after apply, `get_strategy` still reports RR 1.5 / 1× ATR / 5%
- policy fields sent **alone** are refused with
  `"Strategy update contains no effective changes"` — the no-op guard does
  not count them as changes either

Reproduced on all three owned strategies (Trafalgar, Cannae, Salamis),
twice each.

## Why it matters (p1)

**No write path exists for stop bounds or the risk:reward floor.** The
agent no longer accepts them and the strategy silently drops them, so the
entire fleet is pinned to platform defaults — **RR 1.5, stop floor 1× ATR,
stop ceiling 5%** — with no way to change any of it.

Concretely: Undertow was deliberately built with `minRiskRewardRatio: 2.0`
and Breakwater with 1.5, chosen per family. v15 discarded both without any
action on our side.

### It is one dial, not three — and it is the fleet's central defect

Sharpened 2026-08-10 against the platform's own design rationale, and
against 26 live trades. Of the three inert fields, **only
`minStopLossAtrMultiple` currently costs anything.**

**`maxStopLossPct` is costlessly stuck.** There are two ceilings and the
effective cap is `min(yours, 3 × ATR)`. Every coin the fleet has traded had
ATR 0.38–0.82%, so the 3×ATR cap (1.1–2.5%) has been binding the whole time
and our 5% has never once come into play. It is insurance, dormant by
design on calm tape, and it only matters in a storm.

**`minRiskRewardRatio` is not binding either.** It deletes candidate rows
below its value; placed RRs have run 2.14–4.61, all clear of 1.5.

**`minStopLossAtrMultiple: 1` is the problem, and it is the minimum.** The
tightest stop the generator can produce is always 1×ATR, so at a floor of
1.0 the fleet takes a stop exactly one average bar range from entry —
**a 1×ATR stop is not a stop outside the noise, it is the noise.** The live
record is unambiguous:

| agent | strategy | `minAtrPct` gate | stops taken |
|---|---|---|---|
| Undertow | Cannae | 0.50% | TRUMP 0.51%, HYPE 0.51%, WIF 0.63% |
| Breakwater | Salamis | 0.25% | SKHX 0.38%, BNB 0.40%, ENA 0.82% |

Every stop equals its coin's ATR, and TRUMP and HYPE sit **one basis point
above Cannae's ATR gate** — the fleet is selecting the least volatile coins
that clear the filter and then stopping one average bar away. Four of five
positions in one book died within **0.07pp of their own stop**; 10 of 11
losers closed on a sub-1% move.

### This also corrects an earlier conclusion recorded here

The 2026-08-10 journal argued the geometry was self-defeating — that
widening the stop past the noise collapses the RR, since SKHX at a 1.0%
stop falls from 3.09 to 1.16. **That arithmetic held the take-profit fixed,
and the platform does not.** The TP ladder is generated as multiples of the
tightest *surviving* stop: raise the floor and the anchor moves, so the
1.5R/2R/3R rungs move with it and RR is preserved by construction.

So the fix that was called impossible is exactly what this dial does — and
this defect is what prevents it. At a floor of 2.0 the same coins would
carry ~1.0–1.6% stops instead of 0.38–0.82%, which is wider than almost
every move that has closed a trade so far.

**No numeric bounds are declared for any of the three fields**, so the
legal range for the floor cannot be read off the registry and will have to
be discovered against the platform once the write path works.

## Evidence

`build_log/pol2_compile_*.json` and `pol2_apply_*.json` from 2026-08-09:
compile responses with `changedAxes: ['IDENTITY']` and
`tradeLevelPolicy: null` while the request carried all three fields;
`get_strategy` read-backs unchanged at defaults. The refusal for
policy-only updates is in `pol_compile_*.json`.

**Retested 2026-08-09 11:2x with a full, correctly-shaped UPDATE envelope**
(the earlier runs are not the only evidence, and shape is no longer a
confound). `compile_strategy_plan` takes a whole `request` body, not a
patch, so the retest reads each strategy, projects the read onto the write
shape — `signalRules` → `rules`, `revision` → `expectedRevision` — and
changes only the three policy fields. Two schema refusals along the way
proved the envelope was reaching the validator (`request` required, then
`coinSelection.limit` required). With the envelope correct, all three
strategies answer:

    {"code": "VALIDATION_ERROR",
     "message": "Strategy update contains no effective changes."}

That is the stronger form of the finding: the payload **passes schema
validation** and reaches the semantic validator, which then sees no change
in RR 1.5 → 2.5 / 2.0 / 1.6, ATR floor 1 → 1.5 / 1.3 / 1.0, ceiling
5% → 4 / 3 / 2.5. The fields are parsed and discarded, not rejected.
Retest script: `scratchpad/v15_policy_retest.py` (compile only — a dry run
that mints a token and applies nothing).

## Notes

- The replacement design is *better* once it works: `minStopLossAtrMultiple`
  is volatility-adaptive, which fixes the day-one failure where a 1.5%
  stop floor was unreachable on BTC's 0.21% ATR tape
  (`MIN_STOP_LOSS_PCT: requested 1.5, reachable 0.62`).
- `update_intelligence_agent`'s `feasibilityAdvisory` gained
  `minStopLossAtrMultiple` and per-coin `requestedMinAtrMultiple` with
  `FEASIBLE` / `STRUCTURAL_ONLY` / `ATR_UNAVAILABLE` verdicts — a genuinely
  useful read once the write side works.
- Report to BattleGrid: schema advertises a capability the compiler does
  not implement. Until it lands, **nothing in this product can set stop
  bounds or the RR floor**, and any UI offering them would be a dead write
  path — the exact class of defect `HANDOFF.md` catalogues.
- Taglines were briefly edited to name the intended floors and were
  reverted the same hour: the tagline reaches the agent's prompt, so it must
  not claim policy the platform is not enforcing.

## 2026-08-11 — a new lead, from the platform's own authoring prompt

Connecting BattleGrid as an MCP connector exposed a `prompts/get` surface
this repo never read (see `three-quarters-of-the-mcp-surface-is-unrecorded`).
One of the five, `author-strategy`, is the platform's canonical sequence for
the exact workflow this item tests — and it describes the apply payload in
terms that bear directly on the "no effective changes" verdict.

Two clauses matter:

1. **"UPDATE must include at least one changed axis."** The compiler has a
   named notion of a changed axis, and a plan carrying none is a defined
   rejection rather than an anomaly.
2. **The apply plan must be copied "byte-identical from the compiled
   `approvedPlan`"**, and the enumerated fields to copy from `postState`
   include exactly the three dials in question — `minStopLossAtrMultiple`,
   `maxStopLossPct`, `minRiskRewardRatio`. The server "re-derives" the
   scorecard, diff and viability and **rejects `diff`/`viability`/
   `mismatches`/`signalRules`/`creationSeed`/`proposedRevision`/
   `bindingImpact`/`authoringCatalogDigest`/`reviewContext` as unknown keys.**

Every retest behind this item built its compile request by hand — and the
first attempts were malformed in exactly this area (the whole-`request`
envelope, then the missing `coinSelection.limit`). "No effective changes" is
the string I read as *the compiler discarding the fields*. It is also the
string a compiler would emit for *a plan whose dials never entered the
authoring axes in the first place*. Those two readings have not been
separated, and the difference is whether this p1 is a platform bug or a
client-side payload defect on our side.

**This does not retract the finding.** The verdict has reproduced across
v15 → v16 → v17 → v17.2 on all three strategies, and the fields do pass
schema validation before the semantic verdict. But the alternate explanation
is now specific enough to test, and it was not available before.

### Next test, in order

1. Re-read the live `author-strategy` prompt (do not cache it — it says so
   itself) and rebuild `scratchpad/v15_policy_retest.py` to follow the eight
   steps literally, especially the progressive discovery in step 2.
2. Compile with a dial change **plus** an unambiguously-recognised axis
   change. If the recognised axis reports as changed and the dials still do
   not, the platform-bug reading is confirmed on a payload built to the
   platform's own spec — much stronger evidence than the current retest.
3. Try the narrow path instead of the whole-plan path:
   `update_strategy_signal_rule({ request })`, described as "a thin unified
   update wrapper where `required` is mandatory, omitted params preserve the
   existing object, and present params replace it after strict validation."
   Different code path, same target.

Still compile-only. Nothing here authorises `apply_strategy_plan` — the
prompt is explicit that apply requires operator approval of the exact
reviewed plan, which is also this project's standing rule.

## 2026-08-11 05:40Z — the two readings separated: it is the platform, proven with a control

The sharpened retest ran (`scratchpad/v15_policy_retest_v2.py`, compile-only,
nothing applied). Design: change the three dials **and a control axis known
to register** (tagline) in one UPDATE compile, then inspect the compiler's
own `postState` — the object the platform's `author-strategy` prompt says an
apply would copy byte-identical.

Result on Salamis rev 3 and Trafalgar rev 3 (Cannae refused for an unrelated,
honest reason: tagline + " (control)" exceeded the 80-char cap):

- **The control registered.** `changedAxes: ["IDENTITY"]`, tagline
  before/after in the diff, control suffix present in `postState.tagline`.
  The request was well-formed and fully processed.
- **The compiler has a named axis for exactly these dials —
  `diff.tradeLevelPolicy` — and reported it `null`** while the request
  carried RR 1.5→2.5, ATR floor 1→1.5, ceiling 5→4.
- **`postState` carries the ORIGINAL dial values.** Not ours. The fields
  pass input validation and never enter the plan.

That last line is the discriminator. "Parsed but compared-equal" would have
put our values in postState; "malformed placement" would have refused at the
schema. Neither happened: the values are **dropped between validation and
planning**. And the old "no effective changes" refusals are now fully
explained — a dial-only update registers zero changed axes, which is the
defined rejection the author-strategy prompt names ("UPDATE must include at
least one changed axis").

The client-side reading raised on 2026-08-11 is **eliminated**. Also
eliminated: the `update_strategy_signal_rule` third leg — its schema accepts
only `signalId`/`allocation`/`required`, so it cannot carry the dials at all.

**Upstream report, now precise:** `compile_strategy_plan` declares
`minRiskRewardRatio` / `minStopLossAtrMultiple` / `maxStopLossPct` in its
input schema, declares a `tradeLevelPolicy` axis in its diff structure, and
populates neither from the request. Repro: any UPDATE compile carrying a
tagline change plus dial changes — tagline lands in postState, dials do not.
Axis vocabulary observed: IDENTITY, timeframeProfile, report, marketRead,
conditions, setupGates, tradeLevelPolicy, signalRules, lifecycle.

Verdict history: v15 ✗, v16 ✗, v17 ✗, v17.2 ✗ (dial-only compiles), and now
v17.2 ✗ with the control proving the payload sound. Nothing in this product
can set stop bounds or the RR floor until BattleGrid fixes the compiler.
