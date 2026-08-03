---
id: our-own-agents-show-less-than-strangers
title: A stranger's evaluation is more legible in this product than our own
type: question
status: open
priority: p2
created: 2026-08-03
updated: 2026-08-03
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
