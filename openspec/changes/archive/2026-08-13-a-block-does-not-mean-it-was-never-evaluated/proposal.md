# A block does not mean it was never evaluated

## Problem

BattleGrid **v18.2.0** rewrote what `list_gate_blocks` returns, and the change
is semantic:

- **v17.2.0** — "Paginated **pre-signal** pipeline rejections … for each
  candidate that **never reached signal evaluation**."
- **v18.2.0** — "Paginated pipeline rejections … for each evaluation that ended
  without a trade decision. Most are pre-model admission gates; **EVALUATION-stage
  rows ended after the model was called** and carry its terminal rejection text."

A gate block may now describe something that happened *after* the agent
reasoned. This product asserts the opposite as fact in **five** places:

```
src/ports/agents.ts:419                 "A candidate stopped before it was ever evaluated."
src/infrastructure/battlegrid/agent-mapper.ts:627   "A candidate stopped before evaluation"
src/mcp/tools.ts:220                    "stopped before evaluation (with the platform's reason code…)"
app/(app)/agents/[id]/pipeline/page.tsx:120         "stopped before it was evaluated"
app/(app)/agents/[id]/pipeline/page.tsx:178         "Nothing was stopped before evaluation"
```

And the spec carries it too — `agent-understanding/spec.md:290` describes
"candidates blocked before signal evaluation", with the scenario at `:310`
saying "an agent whose candidates were blocked before evaluation".

**`src/mcp/tools.ts:220` is the sharpest of the five.** That is Grid-Commander's
own MCP surface: the description of `read_decision_pipeline` that any model
calling this product reads. The product is republishing a claim the platform
now contradicts, to consumers who have no way to check it.

## Intent

**Stop asserting where a candidate stopped, and let the stage the platform names
speak for itself.**

The product carries `gateStage` through and renders it. It does not need to know
what the stages mean in order to show them — and being confidently wrong about
where an agent stopped is a direct hit on the only question those surfaces
answer.

## Capabilities touched

- **agent-understanding** — MODIFIED (*Why An Agent Did Not Trade Is Readable*:
  its prose and one scenario stop naming the pipeline position, and it gains the
  rule that the product does not assert one)

## Scope

### In scope

- The five source assertions, replaced with stage-neutral wording
- The port's contract comment on `GateBlock`
- Our own MCP tool description for `read_decision_pipeline`
- The pipeline page's framing sentence and its empty state
- The test assertion pinning the empty-state wording
  (`tests/rendering/pipeline.test.ts:260`)

### Out of scope

- **Validating `gateStage` against a known set.** The product renders it as an
  opaque string, and an unrecognised stage should render as unrecognised — but
  making that a checked contract is a larger change and needs the vocabulary
  observed first. Recorded on #185, which is narrowed rather than closed.
- **Re-partitioning the pipeline page into different stages.** Whether
  EVALUATION rows should move to a different bucket cannot be decided without
  seeing one, and none can be seen: `list_gate_blocks` returns `INTERNAL_ERROR`
  for every agent (#100). This change stops the product *claiming* the
  partition; it does not redesign it.
- **Waiting for observation.** Deliberately not deferred to #100 clearing. The
  platform states the behaviour in its own description, five places state the
  opposite as fact, and one of them is a contract this product publishes to
  other models.

## Why standard, not lite

It modifies a capability requirement and changes a published MCP tool
description — a contract other software reads. No behaviour changes, no
migration, no money. Not `full`.
