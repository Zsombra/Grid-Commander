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
action on our side. RR asymmetry is the core of the whole design (the field
loses money at a 30% win rate; only asymmetry pays), and it is now
un-settable.

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
