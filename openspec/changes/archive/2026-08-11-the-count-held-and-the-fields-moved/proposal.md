# The count held and the fields moved

## Why

The live freshness gate did its job this morning: recorded `battlegrid
16.0.0` (probed 2026-08-10), live `battlegrid 17.2.0`. The tool count is
still 114 — zero names added, zero removed — and **17 tools changed schemas
underneath it**, the exact pattern the project's own domain notes warn
about: a count that has not moved proves nothing.

The headline change is a redesign of `positionManagement`. Four fields are
gone (`breakEvenTriggerTpProgressPct`, `trailingType` with its `ATR|FIXED`
enum, `trailingAtrMultiple`, `trailingFixedPct`) and two arrived
(`breakEvenTriggerR`, 0.5–2; `trailingGivebackPct`, 25–55): break-even now
triggers on an R-multiple rather than take-profit progress, and trailing is
a single giveback model rather than a typed pair. The block went 15 keys to
13 — label plus twelve behavioural values. The same reshape appears in both
agent writes, in all three agent reads, and in the catalog, which renamed
its three matching defaults. Until the product follows, every create it
composes carries a field the platform rejects (`additionalProperties:
false` rejects the whole payload) and misses two the platform requires —
the create path is broken at v17 until this lands.

The deployment also re-opens #92's still-unbuilt ask from the same angle.
The strategy vocabulary payload *is* the authoring contract and is almost
entirely values — budgets, enabled timeframes, transform ids — which the
shape-only probe records as `"int"`. A deployment that moves those values
without touching a schema is invisible to every gate this repo has. v17
just demonstrated the move-the-values-not-the-names deployment is
BattleGrid's habit; #92's fix is to record the vocabulary verbatim and
compare values, and this change lands it.

## What Changes

1. **The surface record follows the platform.** Regenerate
   `docs/battlegrid-mcp-capabilities.json` and
   `docs/BATTLEGRID_MCP_REFERENCE.md` from the v17.2.0 listings (already
   dumped, read-only), re-run `tools/probe_mcp_surface.py` to rewrite
   `docs/battlegrid-mcp-surface.json`, and update the version facts in
   `docs/BATTLEGRID_SURFACE_MAP.md`, `HANDOFF.md` and `CLAUDE.md` by hand.

2. **The product re-learns position management.**
   `src/domain/agent/trading-config.ts` is the epicenter: `OURS` loses
   `trailingType` (the field no longer exists to default),
   `positionManagementFrom()` assembles the thirteen-key v17 block from the
   catalog's renamed defaults, `POSITION_MANAGEMENT_FIELDS` becomes the
   twelve v17 fields, `positionFieldKind()` drops its `trailingType`
   special case, and the prose counts follow. `agent-mapper.ts` needs no
   change — its default-prefix strip and verbatim preset configs already
   carry the new names. Tests and fakes move to the v17 shape.

3. **The vocabulary's values become a recorded, compared artifact (#92).**
   A probe records `list_strategy_vocabulary` verbatim into
   `docs/battlegrid-vocabulary.json` — platform-owned, account-independent,
   the stated carve-out from the shape-only rule — carrying the server
   version and probe time. The live freshness suite gains a comparison of
   transform ids, budget values and enabled timeframes against the live
   platform, so a values-only deployment fails a named gate instead of
   passing quietly.

4. **What v17 offers but nothing consumes is filed, not built.**
   `get_signal_log` grew a `conditionEvaluation` evidence block;
   the positions reads grew per-position `breakEvenStatus` /
   `trailingStatus`; radar deployments grew `blockedReason` and a
   `BLOCKED` state; `override_agent_protection` reports
   `observedLiveStopLoss`. Each becomes a backlog item with a GitHub
   issue.

## Out of scope

- Consuming any of the new v17 read surfaces (filed instead).
- The stop-bounds / RR-floor write path — `compile_strategy_plan` and
  `apply_strategy_plan` declarations did not change at v17.2.0, so
  `v15-trade-level-policy-is-declared-but-inert` (#95) stands as filed.
- Any UI offering the two new fields as editable knobs beyond what the
  existing preset/CUSTOM edit flow already carries.

## Capabilities

- `platform-mapping` — the vocabulary artifact and the value-comparing
  gate (ADDED).
- `agent-authoring` — the two position-management requirements stop
  pinning a field count the platform just moved (MODIFIED).
