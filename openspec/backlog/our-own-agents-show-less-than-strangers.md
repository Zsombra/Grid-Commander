---
id: our-own-agents-show-less-than-strangers
title: A stranger's evaluation is more legible in this product than our own
type: question
status: done
priority: p2
created: 2026-08-03
updated: 2026-08-03
change: "your-own-agent-is-as-legible"
capability: agent-understanding
blocked_by: []
tags: [battlegrid, asymmetry, pipeline, scorecard]
---

# A stranger's evaluation is more legible than our own

`the-scorecard-is-legible` (archived 2026-08-03) built
`/explorer/[agentId]/evaluations/[logId]`, which shows **every signal a
competitor consulted** — 72 of them, fired or not, each with its module,
score, bias, raw indicator values and a written sentence, plus how the
aggregate score was attributed across them.

`/agents/[id]/pipeline` — our *own* agents — shows `signalChecklist`: a
verdict and an interpretation for the signals that **fired**, and no
attribution.

So this product currently explains a stranger's agent better than the
user's own. That is backwards.

## What is not yet known

Whether the asymmetry is BattleGrid's or ours. Two candidates, and they
have different fixes:

1. **The owner-side tools carry it and we do not read it.** This would be
   the eighth instance of `the-payload-carries-more-than-is-read` — the
   pattern that has already produced one shipped bug this month
   (`the-decision-shows-its-work`: 35 fields on the wire, 11 mapped). Check
   `get_signal_log` / `list_signal_logs` for a `scorecard` and
   `attributions` the mapper drops.
2. **The public projection is genuinely richer.** Odd, but possible: the
   public profile is a product surface BattleGrid built deliberately, while
   the owner tools may predate it.

## Why P2 rather than P3

Every other item in this area is additive. This one says a user gets less
insight into the agent they own and pay for than into a stranger's. If (1)
is true it is close to a defect, and the fix is a mapper change.

## First step when taken

Call `get_signal_log` (owner-side) on one of this account's own evaluations
and diff its key set against `get_public_agent_signal_log_detail` on a
competitor's. Print both key counts side by side — the discipline that
found the 35-vs-11 gap. Do not assume; the whole point of this item is that
the answer has not been observed.

## Done (2026-08-03)

**Cause (1) confirmed by calling it.** The owner-side tools carried it all
along:

| | keys |
|---|---|
| `list_signal_logs` row — what `ReadPipelineQuery` read | **23** |
| `get_signal_log` detail — never called | **31** |

The eight unread: `scorecard`, `attributions`, `pipeline`,
`linkedEntryDecision`, `challenge`, `agentName`, `agentAvatarUrl`,
`agentModelName`. The eighth instance of
`the-payload-carries-more-than-is-read`, and the second this month caught
after shipping.

`your-own-agent-is-as-legible` (archived) closed it:
`/agents/[id]/pipeline/[logId]` shows every consulted signal grouped by
module, the attribution, and the chain — and `/agents/[id]/pipeline` gained
the funnel from `get_signal_performance`, also unused until now.

**And it went further than parity.** `pipeline.attempt.ownerView` is nulled
on every public read and **populated on your own**: model, provider,
billing type, price and duration. Live on "Flow State": one SKIP on ENA
cost **$0.047775 and 20.7 seconds** of Claude Opus 4.6, over 64 signals
consulted and 13 fired. No surface in this product had ever shown what a
decision cost to reach, and no competitor page ever can.

**A shared-shape refactor came with it.** `ConsultedSignal`,
`ScoreAttribution` and `EvaluationChain` moved to
`src/domain/agent/scorecard.ts`, and one `mapEvaluationScorecard` serves
both readers with an `owned` flag deciding whether the cost is reached for
at all. Two copies would have drifted, and the copy that drifted would have
been the one nobody was looking at.

**Two guards caught real mistakes on the way**: the boundaries test refused
a route importing the domain directly (fixed by re-exporting through the
port, as `ExplorerPort` already did), and the reachability walker refused a
three-level-deep page that could not get back to the agent it was about.
