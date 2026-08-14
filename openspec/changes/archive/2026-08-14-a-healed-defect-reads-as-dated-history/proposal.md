# Proposal: A healed defect reads as dated history

## Why

The `list_gate_blocks` row-level 500s (#100) healed upstream between
2026-08-13 and 2026-08-14 — re-probed read-only across both affected agents,
zero refusals (backlog item `the-read-around-outlived-the-poison`, #257). The
read-around fallback's comments still describe the poisoning in present tense
("refuses on **specific rows**, deterministically"), so the next reader
budgets for a live defect that is no longer live.

## What Changes

- Re-word the `readAroundRefusal` doc comment
  (`src/infrastructure/battlegrid/agent-adapter.ts`) into dated history:
  refused 2026-08-12→13, healed by 2026-08-14, fallback kept as defense.
- Re-word the clause in the `readGateBlocks` header comment that says the
  workaround "retires itself the day #100 is fixed" — #100 is now fixed and
  the fallback is deliberately kept, so the clause contradicts the decision.
- Re-word the `GateBlocksResult` doc comment (`src/ports/agents.ts`) the same
  way — its "was 500ing on specific rows" narration gains the healed-by date
  so the refusal-field rationale reads as history, not status.

## Capabilities

**New**: none
**Modified**: none — comment-only; no observable behavior changes
(`skip_specs: true`).

## Out of Scope

- **Removing the fallback.** It activates only when the whole read refuses,
  costs nothing while the platform is healthy, and this platform has regressed
  before. The item that sourced this change says keep it, and it stays.
- **Reading the new `summary` envelope** that `list_gate_blocks` now returns
  (per stage/reason counts with `latestAt`). That is new modelling of a
  now-observed shape — its own change when something asks for it. It remains
  recorded in backlog item `the-read-around-outlived-the-poison`'s body and
  needs no new filing.
- Any change to the fallback's window count, bounds, or refusal accounting.

## Impact

- `src/infrastructure/battlegrid/agent-adapter.ts` — two doc comments.
- `src/ports/agents.ts` — one doc comment.
- No runtime behavior, no tests, no schema, no API surface.
