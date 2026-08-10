# The surface record is v13

## Why

The keyed sweep after #78 tripped `surface-freshness` exactly as designed:
recorded `11.0.0`, live `13.0.0`. BattleGrid redeployed again — the fifth
recorded deployment with the tool count pinned at 110 — and nine
conformance guards read the record that had just gone stale. Worse, the
regenerated reference exposed that `BATTLEGRID_MCP_REFERENCE.md` was still
generated from **v9.0.0**: the record and the reference had quietly
diverged by a deploy, and the reference was describing parameters the
platform stopped accepting on 2026-08-06.

## What Changes

- `docs/battlegrid-mcp-surface.json` re-probed at v13.0.0 (67 reads
  called, 0 failed; writes filtered by classification as always).
- `docs/BATTLEGRID_MCP_REFERENCE.md` regenerated from a fresh v13 dump.
- `docs/BATTLEGRID_SURFACE_MAP.md` header updated with the v13 probe and
  the what-moved row.
- `HANDOFF.md` surface-record version line.
- Journal entry; backlog item `two-agent-owned-fields-no-tool-can-write`
  filed for the one product-facing finding.

## What the diff actually says

- **v11 → v13 is the quietest deploy on record**: declared schemas,
  constants and annotations byte-identical across all 110 tools; observed
  key-structure identical on all consumed tools; the only change is
  `get_market_context` growing from 23 to 25 selectable modules
  (`marketBreadth`, `referencePairs`) — an unconsumed tool.
- **v9 → v11 carried the real movement, and the stale reference hid it**:
  `arenaChallengeEnabled` dropped from create and update;
  `feasibilityAdvisory` added to create's declared output; a
  strategy-vocabulary enum shifted. The conformance guards never lied —
  they read the record, which was already v11 — but the human-facing
  reference described a server two deploys gone. Filed as the backlog item
  above; nothing renders or offers the dropped fields today.

## No behavior changes

Record and docs only. The one code-adjacent finding is filed, not fixed —
changing the proposable-field vocabulary is behavior and gets its own
change.
