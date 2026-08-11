# Design: The Record Learns The Other Three Surfaces

## Technical Approach

The probe already owns the live connection and the record; it gains four
read-only JSON-RPC calls (`prompts/list`, `prompts/get` per prompt,
`resources/list`, `resources/read` per resource) and keeps the
`instructions` field `initialize` already returns. The record gains three
top-level blocks beside `tools`, each entry carrying the raw text and a
sha256. The same run rewrites `docs/battlegrid-mcp-capabilities.json`, which
until now was assembled by an unversioned scratchpad script — after this, one
command owns both committed artifacts.

The generator stops discarding what it loads: `## Server instructions` and
per-prompt / per-resource body sections, emitted fenced so the server's own
markdown headings cannot collide with the reference's structure. Given a
directory it behaves as today (dump-dir mode); given a file — the default is
the committed dump — it writes `docs/BATTLEGRID_MCP_REFERENCE.md` directly.

Guards split the same way the existing freshness pair does: the offline test
asserts the record and reference carry the surfaces at all; the live test
digests what the running server returns and compares.

The adapter's `rpc` is the one place every response passes through; it reads
the three `RateLimit-*` headers into a `RequestBudget` snapshot exposed by a
getter, and hands `Retry-After` to `PlatformUnavailableError` so the 429
sentence can name the wait.

## Decisions

### Decision: normalise the instructions' addressee before digesting

The instructions open "You are connected to BattleGrid as ⟨account⟩". Chosen
because the record is shared but the greeting is per-account: digesting raw
text would fail the live guard for every operator except the one who probed.
Rejected: digesting raw text (spurious drift), and stripping the whole first
sentence (would also hide a real rewrite of it). The normalisation replaces
only the account token; everything else still counts.

### Decision: the budget lives on the adapter, not the port

Chosen because nothing consumes it yet — the pacing work is deliberately out
of scope — and a port method with no caller is an unread control, the exact
defect class this repo catalogues (a dial nothing reads). The getter is real,
tested behavior at the transport; it is promoted to the port in the pacing
change, arriving together with its first consumer. Rejected: adding the port
method now (dead surface), and skipping header parsing entirely (leaves the
429 sentence unable to name the wait, and the pacing change without a
foundation).

### Decision: per-answer budget, not a merged running estimate

`RateLimit-Remaining` is a fact about one answer. An answer without the
headers exposes `unstated` rather than repeating the previous numbers,
mirroring how `generatedAtMs` treats a snapshot with no timestamp: absence is
information. Rejected: interpolating the bank refill locally — the platform
already publishes the number; modelling it invites the drift the headers
exist to prevent.

### Decision: keep the domain free of the MCP client

`RequestBudget` is a plain readonly value defined in the infrastructure
module beside the adapter; `PlatformUnavailableError` gains an optional
`retryAfterSeconds: number` — data, not a dependency. The domain still
imports nothing from the MCP layer.

## File Changes

- `tools/probe_mcp_surface.py` (modified) — fetch + record the three prose
  surfaces; write the capabilities dump
- `tools/generate_mcp_reference.py` (modified) — emit instructions and
  bodies; file-input mode defaulting to the committed dump
- `tests/architecture/surface-freshness.test.ts` (modified) — record and
  reference carry the surfaces
- `tests/live/surface-freshness.test.ts` (modified) — digest comparison
  against the running server
- `src/infrastructure/battlegrid/mcp-adapter.ts` (modified) — parse headers,
  expose `lastRequestBudget()`, pass Retry-After
- `src/domain/errors.ts` (modified) — 429 sentence names the wait when given
  one
- `tests/connection/request-budget.test.ts` (new) — budget + Retry-After
  unit coverage with a fake fetch, beside the other adapter-behavior tests
- `docs/battlegrid-mcp-surface.json`, `docs/battlegrid-mcp-capabilities.json`,
  `docs/BATTLEGRID_MCP_REFERENCE.md` (regenerated)
- `tests/concurrency/conflict.test.ts` (modified) — the P4 no-retry scan now
  excuses the quoted literal `'Retry-After'` only; found during gates, not
  planned. Reading the platform's named wait is surfacing, not retrying.
