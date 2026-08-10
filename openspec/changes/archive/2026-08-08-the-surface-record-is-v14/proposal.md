# The surface record is v14

## Why

BattleGrid redeployed again the same day the record reached v13: a live
`initialize` during operator-requested platform work answered **v14.0.0**
against a record probed at v13 that morning. This deploy is the first one
ever to move the tool count — **110 → 114** — and it changed the two
agent-write schemas this session was about to compose against.

## What Changes

- `docs/battlegrid-mcp-surface.json` re-probed at v14.0.0 (70 reads
  called, 0 failed; writes filtered by classification as always).
- `docs/BATTLEGRID_MCP_REFERENCE.md` regenerated from a fresh v14 dump
  (114/114 documented, coverage check green).
- `docs/battlegrid-mcp-capabilities.json` refreshed from the same dump —
  it had been sitting at v9 while record and reference moved, the exact
  record/reference divergence the v13 round warned about, one artifact over.
- `tools/generate_mcp_reference.py` categorises the four new tools so its
  coverage assertion holds.
- `docs/BATTLEGRID_SURFACE_MAP.md` header + what-moved row; `HANDOFF.md`
  version line.
- Backlog item `agent-create-composes-fields-v14-refuses` (p1) filed for
  the product-facing break.
- Journal entry.

## What the diff actually says

- **Four tools added, none removed**: `get_agents_hub`,
  `get_agent_conviction_calibration` (per-agent calibration of stated
  conviction against realized outcomes — directly useful to the operator's
  new agents), `get_radar_activity`, `list_deployment_policies`. All four
  are reads.
- **`create_intelligence_agent` and `update_intelligence_agent` moved
  underneath the product**: `tradingConfig.atrTimeframe` and
  `atrMatchesStrategyTimeframe` are no longer accepted (the config object
  is 20 → 18 fields), and a CUSTOM brain now **requires** a
  `behavior: {risk, outlook, conviction}` object. Established live, not
  from the schema: the app's own create path was refused with
  `unrecognized_keys` + three `behavior.*: Required` issues during this
  session's agent build.
- The radar, strategy-plan and qualification schemas the session's other
  writes used are unchanged v13 → v14.

## No behavior changes

Record and docs only. The create-path break is filed as a p1 backlog item,
not fixed here — `TRADING_CONFIG_FIELDS` and the brain model are product
behavior with tests hanging off them, and changing them deserves its own
change with the field list re-derived from the record rather than patched.
