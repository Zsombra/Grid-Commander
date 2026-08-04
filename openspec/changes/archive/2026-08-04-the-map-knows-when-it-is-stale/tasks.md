# Tasks

## 1. The probe records what it probed

- [x] 1.1 `tools/probe_mcp_surface.py` captures `serverInfo` from `initialize`
- [x] 1.2 It writes `server: {name, version}` and `probed_at` into
      `docs/battlegrid-mcp-surface.json`
- [x] 1.3 Re-run the probe live and confirm both fields land

## 2. The guard

- [x] 2.1 Structural check: the record names a server and a version — runs
      offline, in the normal suite
- [x] 2.2 Live check: compare recorded version against `serverInfo.version`,
      fail on mismatch naming both versions and the regeneration command
- [x] 2.3 A record missing its version fails the live check rather than
      skipping it — absent is not matching
- [x] 2.4 Skips without a credential, and says so
- [x] 2.5 Tool count agreeing does not suppress a version mismatch

## 3. Regenerate against v5

- [x] 3.1 `docs/battlegrid-mcp-surface.json` — re-probed
- [x] 3.2 `docs/BATTLEGRID_MCP_REFERENCE.md` — regenerated
- [x] 3.3 `docs/battlegrid-mcp-capabilities.json` — regenerated
- [x] 3.4 `docs/BATTLEGRID_SURFACE_MAP.md` — updated, including the tools-called
      count and the v3→v5 note

## 4. File the v5 additions

- [x] 4.1 `conditions` — the new authoring layer (own item, capability-sized)
- [x] 4.2 The smaller additions: `price` metric family, `bars`, `ordering`,
      `priceAction` becoming selectable, `entryStrategy` on policy slots

## 5. Gates

- [x] 5.1 `./scripts/ci.sh` green
- [x] 5.2 `openspec.py validate the-map-knows-when-it-is-stale`
- [x] 5.3 No credential in the diff

## 6. Found while doing it

- [x] 6.1 `apply_strategy_plan` was broken on v5: `conditionVerdicts` removed
      from a schema that is `additionalProperties: false`, so the whole payload
      was rejected. Dropped from the projection — the tenth dead write path,
      and the first one found by the freshness work rather than by a live call.
- [x] 6.2 `generate_mcp_reference.py` stamped a hardcoded `2026-07-27` as its
      generation date. Now uses the real date.
