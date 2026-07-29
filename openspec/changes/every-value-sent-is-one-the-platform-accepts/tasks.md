# Tasks

## Record what the platform permits

- [x] 1. `tools/probe_mcp_surface.py` — walk every input schema and collect
      `enum` / `const` at any depth as `dotted.path → [values]`. Unions merge
      onto one path, so `brain.kind` yields both `PRESET` and `CUSTOM`.
- [x] 1b. Retry with backoff in `rpc`, and SSE-frame parsing. One timeout used
      to abandon the whole probe, including the `tools/list` every later step
      depends on.
- [ ] 2. **Blocked — BattleGrid auth is down.** Re-probe so
      `docs/battlegrid-mcp-surface.json` carries `input_constants`.

## Fix the two defects

- [x] 3. `brainToArgument` emits `PRESET` / `CUSTOM` via `WIRE_KIND`.
- [x] 4. `positionSizePresetsFrom` emits `sizingStrategy: 'MANUAL'` from `OURS`,
      stated as this product's choice with the reason.
- [x] 5. `positionManagementFrom` — the four values the catalog does not default
      come from `OURS`, not from `?? literal`.

## Close the class

- [x] 6a. `tests/agent/brain.test.ts` — the wire spelling, which had no test of
      any kind before this.
- [x] 6b. `tests/agent/unprompted-values.test.ts` — the six values no operator
      chooses, and a source check banning the lookup-shaped disguise.
- [ ] 6c. **Blocked on 2.** `tests/architecture/wire-values.test.ts` — the
      generic walk of every wire value against `input_constants`. Written and
      held out of the tree; it fails today only because the artifact is stale.
- [x] 7. Re-inject both defects, three ways, and watch the guards fail:
      lowercase `kind` → 3 failures; `'FIXED'` plainly → 3; `'FIXED'` behind the
      lookup → 4.

## Prove it

- [ ] 8. **Blocked — BattleGrid auth is down.** Live probe: create → read back →
      archive, `tradingMode: OFF`.
- [x] 9. `npm test` 667 passing, `npm run typecheck`, `npm run lint` all green.

## File what is deferred

- [x] 10. `preset-configs-are-discarded` — the catalog ships each preset's
      fourteen values and `mapPositionPresets` drops them.
- [x] 11. `brain-presets-are-hardcoded-and-short-one` — the schema pins eleven,
      the adapter lists ten.

## Blocked: what the platform is doing

`POST /mcp` with **no** `Authorization` header returns 401 in 1.2s. The same
request carrying **any** bearer token — a valid key or the literal string
`bg_live_notarealkey` — hangs until the client gives up. Measured four ways:

```
no auth        401 in 1.2s
GET /mcp       401 in 1.2s
garbage key    000 in 20.0s   (timeout)
real key       000 in 20.0s   (timeout)
```

`battlegrid.trade` serves 200 and `mcp.battlegrid.trade/` serves 404, so the
host and TLS are fine and the egress proxy reports no relay failures. The hang
is BattleGrid's token-validation path, and it is not specific to this key: a key
that cannot exist hangs identically to one that works.

It worked earlier in the same session — the strategy write probe, the schema
dumps, and `get_trading_config_catalog` all returned normally — so this began
mid-session. Tasks 2, 6c and 8 resume the moment it answers.
