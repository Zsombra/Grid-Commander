# Tasks — the count held and the fields moved

## 1. The record follows the platform

- [x] 1.1 Regenerate `docs/battlegrid-mcp-capabilities.json` and
      `docs/BATTLEGRID_MCP_REFERENCE.md` from the v17.2.0 listings via
      `tools/generate_mcp_reference.py` (dumps already taken, read-only).
- [x] 1.2 Re-run `tools/probe_mcp_surface.py` (read-annotated tools only)
      to rewrite `docs/battlegrid-mcp-surface.json` at 17.2.0.
- [x] 1.3 Update the version facts written by hand:
      `docs/BATTLEGRID_SURFACE_MAP.md` header (+ any position-management
      prose it carries), `HANDOFF.md`, `CLAUDE.md`.

## 2. The product re-learns position management

- [x] 2.1 Read the live catalog once (scratch probe, deleted after) to
      learn the platform's own defaults for `breakEvenTriggerR` and
      `trailingGivebackPct`; record the observed values in this file.
      **Observed 2026-08-11 at v17.2.0**:
      `defaultPositionMgmtBreakevenTriggerR: 1`,
      `defaultPositionMgmtTrailingGivebackPct: 40`, and — a quiet move —
      `defaultPositionMgmtTimeDecayStaleThresholdTpProgressPct` is now
      **25** (was 50 when the old fallback literal was written). All five
      presets carry complete twelve-value configs; the ATR/FIXED trailing
      fields are gone from every one.
- [x] 2.2 `src/domain/agent/trading-config.ts`: drop `trailingType` from
      `OURS` (and its docstring bullet); rebuild `positionManagementFrom()`
      to the thirteen-key v17 block against the renamed catalog defaults;
      set `POSITION_MANAGEMENT_FIELDS` to the twelve v17 fields; remove the
      `trailingType` case from `positionFieldKind()`; prose counts follow.
- [x] 2.3 `src/domain/agent/catalog.ts`: prose counts ("fourteen
      behavioural values") follow reality without pinning a new count where
      the sentence does not need one.
- [x] 2.4 Tests and fakes to the v17 shape: `tests/agent/position-edit.test.ts`,
      `tests/agent/position-presets.test.ts`,
      `tests/agent/unprompted-values.test.ts`,
      `tests/architecture/wire-values.test.ts`,
      `tests/support/agent-fakes.ts`.

## 3. The vocabulary's values are recorded and compared (#92)

- [x] 3.1 `tools/probe_vocabulary.py`: record `list_strategy_vocabulary`
      verbatim per category into `docs/battlegrid-vocabulary.json`, with
      server name/version and probe time. Nothing account-derived.
- [x] 3.2 Run it at v17.2.0 and commit the artifact.
- [x] 3.3 Extend the live freshness suite: compare recorded transform ids,
      budget values and enabled timeframes against the live answer; fail
      naming what differed and the regeneration command; skip without a
      credential.
- [x] 3.4 Offline structural check: the vocabulary artifact names its
      server (fails as uncomparable when absent, alongside the existing
      surface-record structural check).

## 4. What v17 offers but nothing consumes is filed

- [x] 4.1 Backlog item + GitHub issue: `get_signal_log` grew a
      `conditionEvaluation` evidence block (~102 schema leaves).
- [x] 4.2 Backlog item + GitHub issue: positions reads grew per-position
      `breakEvenStatus` / `trailingStatus`.
- [x] 4.3 Backlog item + GitHub issue: radar deployments grew
      `blockedReason` / `blockedSince` and a `BLOCKED` section state;
      `override_agent_protection` reports `observedLiveStopLoss`.

## 5. Close-out

- [x] 5.1 Full offline suite + `./scripts/ci.sh` green.
- [x] 5.2 Live freshness suite green at 17.2.0 (version gate and the new
      vocabulary gate), via `vitest.live.config.ts`.
- [x] 5.3 Close #92 with the evidence; mark
      `the-surface-map-is-two-majors-stale` done (its "two records
      disagree" section was already resolved by the v16 regeneration —
      say so).
