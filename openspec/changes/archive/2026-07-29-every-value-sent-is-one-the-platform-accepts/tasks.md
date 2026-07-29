# Tasks

## Record what the platform permits

- [x] 1. `tools/probe_mcp_surface.py` — walk every input schema and collect
      `enum` / `const` at any depth as `dotted.path → [values]`. Unions merge
      onto one path, so `brain.kind` yields both `PRESET` and `CUSTOM`.
- [x] 1b. Retry with backoff in `rpc`, and SSE-frame parsing. One timeout used
      to abandon the whole probe, including the `tools/list` every later step
      depends on.
- [x] 1c. `shape()` records six levels deep, not two. The cap sat one level
      short of every answer: a paginated response nests `entries[] → {…}` before
      reaching a field, so every per-entry type in `get_user_thought_log`
      recorded as `…`. Names captured, not one type. Verified it still cannot
      leak a value — every leaf is `type(...).__name__`.
- [x] 2. Re-probed live. `docs/battlegrid-mcp-surface.json` carries
      `input_constants` for 49 tools — `brain.kind → [PRESET, CUSTOM]`,
      `sizingStrategy → [MANUAL, VOLATILITY_AUTO]`, `atrTimeframe` all thirteen
      values — and observed shapes now carry types instead of `…`.

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
- [x] 6c. `tests/architecture/wire-values.test.ts` restored and passing. The
      generic walk catches **both** defects against the live artifact — including
      `brain.kind`, which neither the source guards nor the prose reference could
      see. Re-injected: `'FIXED'` → 3 failures, lowercase `kind` → 2.
- [x] 7. Re-inject both defects, three ways, and watch the guards fail:
      lowercase `kind` → 3 failures; `'FIXED'` plainly → 3; `'FIXED'` behind the
      lookup → 4.

## Prove it

- [x] 8. Live probe passed. `create_intelligence_agent=succeeded` for the first
      time in the life of this product. Agent `86325fc8` created r1 ACTIVE, read
      back `mode=OFF dailyLoss=10 leverage=1`, archived to r2. Account verified
      after: probe agent ARCHIVED, slot returned (2 of 3 used), the operator's
      three agents untouched at their original revisions.
- [x] 9. `npm test` 673 passing, `npm run typecheck`, `npm run lint` all green.

## File what is deferred

- [x] 10. `preset-configs-are-discarded` — the catalog ships each preset's
      fourteen values and `mapPositionPresets` drops them.
- [x] 11. `brain-presets-are-hardcoded-and-short-one` — the schema pins eleven,
      the adapter lists ten.

## The outage, while it lasted

BattleGrid's MCP backend went down mid-session (~09:50Z) and came back ~12:35Z.
Recorded because the shape was diagnostic and the next outage will look the same.

```
GET  /health              504 Gateway Time-out (nginx)
POST /mcp   no auth       401 in 0.9s
POST /mcp   garbage key   timeout
POST /mcp   real key      timeout
battlegrid.trade          200 — the game site was never affected
```

nginx was up and answering; the service behind it was not. That explains the
auth split exactly: an unauthenticated request is rejected at the edge and never
touches the upstream, while *validating* a token requires it — so any bearer
token, valid or invented, hung identically. The key was never implicated, and
neither was the network.

`GET /health` is the cheap signal: ~1s, unambiguous, versus waiting 25s for a
`tools/call` to time out. Worth reaching for first next time.

Two tools failed on the recovery probe, neither of which this product calls:

- `get_market_context` — `VALIDATION_ERROR: Provide sessionId or primaryTimeframe`.
  Its schema declares **no** required arguments, so this is a declared-vs-actual
  divergence rather than an outage symptom.
- `get_open_orders` — `INTERNAL_ERROR: Internal server error` on a read tool that
  takes no arguments.

Both filed as `two-read-tools-do-not-answer`. Both answered on the previous
probe, when all 21 succeeded.
