# Tasks — the-surface-record-is-v14

- [x] 1.1 Re-probe: `tools/probe_mcp_surface.py` at v14.0.0 — 70 called,
      0 failed, record written.
- [x] 1.2 Regenerate `BATTLEGRID_MCP_REFERENCE.md` from a fresh v14 dump;
      add the four new tools to the generator's category map
      (114/114 documented, coverage check green).
- [x] 1.3 Refresh `docs/battlegrid-mcp-capabilities.json` from the same
      dump — it was still v9, a record/reference divergence one artifact
      over from the one v13 fixed.
- [x] 1.4 Diff v13→v14; record findings in the proposal and the surface
      map's deployment table.
- [x] 1.5 `BATTLEGRID_SURFACE_MAP.md` header + what-moved row;
      `HANDOFF.md` version line.
- [x] 1.6 File `agent-create-composes-fields-v14-refuses` (p1): the app's
      create/edit config paths compose two fields v14 refuses and omit the
      now-required brain behavior object.
- [x] 1.7 Suite green; journal; archive.
