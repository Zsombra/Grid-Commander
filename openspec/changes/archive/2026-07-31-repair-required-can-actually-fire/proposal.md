# Proposal: Repair-Required Can Actually Fire

## Why

`repair-required-cannot-be-detected` (P2 bug). `McpStrategyAdapter.setActive`
detects a restore that needs repair by reading `payload['status'] ??
payload['result']` — keys that `restore_strategy` and `archive_strategy`
never return: both declare an output whose only property is `strategy`
(`docs/battlegrid-mcp-surface.json`, asserted by `mcp-conformance.test.ts`).
The branch cannot fire, and everything built for it — the `LifecycleResult`
case, `REPAIR_REQUIRED_GUIDANCE`, the restore page's careful state — is
unreachable.

Worse, the state that *can* arrive is unhandled: a platform refusal
(REPAIR_REQUIRED or anything else) surfaces as a thrown `ToolRefusedError`,
which crashes the server action — the restore page's `?problem=` arm only
ever receives the command's own pre-checks.

## What Changes (lite, no spec delta)

The spec'd behavior already exists (`strategy-authoring`: repair-required is
its own outcome); this makes it reachable. Where a refusal can actually
arrive is the refusal channel — the platform answers with
`{"code": "...", "message": "..."}` in an `isError` envelope, which
`ToolRefusedError` already parses (`code`, message). Observed live the same
way for the radar's CONFLICT refusals.

1. `setActive` catches `ToolRefusedError` with `code === 'REPAIR_REQUIRED'`
   (message-text fallback) → `{kind: 'repair-required', reason: <platform's
   own words>}`. The dead payload read is removed.
2. `SetStrategyActiveCommand` catches the remaining refusals
   (`ToolRefusedError`, `RevisionConflictError`) → its existing `refused`
   arm, so the page's `?problem=` finally receives what the platform said.
3. The test that asserted the dead behavior (`mapper.test.ts` "reports
   REPAIR_REQUIRED as its own outcome" via a `status` payload) is rewritten
   to the refusal shape; a command-level test pins the refused mapping.

## Out of Scope

Where REPAIR_REQUIRED *actually* surfaces live remains unobserved (needs a
degraded strategy nobody can fabricate). The detection now sits on the only
channel the declared output leaves possible; if the platform ever answers
some other way, the restore walk in `tests/live/restore-probe.test.ts` is
where it will show.
