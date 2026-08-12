---
id: a-gate-block-is-no-longer-only-pre-evaluation
title: v18 broadened gate blocks past "before it was evaluated", which the product states as fact
type: risk
status: open
priority: p2
created: 2026-08-12
updated: 2026-08-12
change: ""
capability: agent-understanding
github: "185"
blocked_by: []
tags: [battlegrid, v18, semantics, live]
---

# A gate block is no longer only pre-evaluation

## What

BattleGrid v18.2.0 rewrote `list_gate_blocks`'s description, and the change is
semantic rather than editorial.

**v17.2.0**: "Paginated **pre-signal** pipeline rejections … for each candidate
that **never reached signal evaluation**."

**v18.2.0**: "Paginated pipeline rejections … for each evaluation that ended
without a trade decision. **Most are pre-model admission gates; EVALUATION-stage
rows ended after the model was called** and carry its terminal rejection text."

So a gate block may now describe something that happened *after* the agent
reasoned. Grid-Commander asserts the opposite, in two places, as fact:

- `src/ports/agents.ts:419` — `/** A candidate stopped before it was ever
  evaluated. */` on the `GateBlock` interface itself.
- `app/(app)/agents/[id]/pipeline/page.tsx:120` — "A candidate can end at three
  places: **stopped before it was evaluated**, evaluated and skipped, or decided
  against."

The pipeline page's whole frame is those three stages being distinct. If
EVALUATION-stage rows arrive in the first bucket, the page tells the operator a
candidate was stopped before evaluation when the model was in fact called — and
the three counts stop partitioning anything.

## Why it matters

p2. Nothing crashes, and no money moves on it. But `/agents/[id]` leads with
"what has actually been stopping it" and the pipeline page exists to explain
why an agent did or did not trade. Being confidently wrong about *where* in the
pipeline an agent stopped is a direct hit on the one question those surfaces
answer, and the product has no way to notice: the field is a string it renders,
not a value it validates.

## Evidence

- Live tool description at v18.2.0, read 2026-08-12 (full text above; the
  surface record truncates descriptions to 200 characters, which is why the
  diff showed it clipped mid-sentence).
- The two assertions in our source, quoted with line numbers.
- `docs/battlegrid-mcp-surface.json` now records v18.2.0.

**Not yet observed in data.** `list_gate_blocks` returns `INTERNAL_ERROR` for
every agent right now (see `battlegrid-is-returning-internal-errors`, #100), so
no live row could be inspected to see whether `gateStage` actually carries
`EVALUATION`. The platform says it can; we have not yet seen one.

## First step

When the tool answers again, read a page of rows for a busy agent and count
`gateStage` values. If `EVALUATION` appears, this needs a change: the port's
contract sentence, the pipeline page's three-stage framing, and whatever the
mapper does with `gateStage` all describe a world that no longer exists.

If it does not appear in practice, the description still says it can, and the
honest fix is smaller — stop asserting "before it was evaluated" and let the
stage speak for itself.

## Notes

Found by the freshness probe the operator suggested running: the record was a
major version stale, and the only tool whose *description* moved is the one the
product makes a claim about. The tool count did not move (114 → 114), which is
the third time this project has caught a version change that a count would have
missed.
