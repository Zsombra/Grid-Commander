# Proposal: The Record Learns The Other Three Surfaces

## Why

Connecting BattleGrid as a first-class MCP connector showed the server
declaring four capability surfaces — tools, instructions, prompts, resources —
while `docs/battlegrid-mcp-surface.json`, the artifact every conformance guard
reads, records exactly one. The other three carry constraints no JSON schema
can express (scope semantics, per-tool pagination, authoring deadlines, a
copy-don't-construct rule), several of which this product has already paid to
learn the hard way. Three of the last five deploys broke a write path and the
guards caught every one — because those breaks were expressed in tool schemas.
A break expressed in prose is currently invisible.

The same prose also publishes a request budget (`RateLimit-*` headers on every
response) that the client never reads; it reacts to HTTP 429 only after one
lands, which the server itself warns "arrives too late to steer a batch you
have already dispatched."

## What Changes

- The surface probe fetches and records all four declared surfaces:
  `instructions` from `initialize`, prompt bodies via `prompts/get`, resource
  bodies via `resources/read`, each with a content digest. It also regenerates
  `docs/battlegrid-mcp-capabilities.json` (the verbatim dump), which today is
  produced by an unversioned scratchpad script.
- The reference generator emits the server instructions it already loads and
  discards (`tools/generate_mcp_reference.py:14`), plus prompt and resource
  bodies, and can read the committed dump directly so regeneration is
  self-contained in the repo.
- The offline surface-freshness guard asserts the record carries the three new
  surfaces; the live guard compares their digests against the running server,
  so prose drift fails a test the way schema drift already does.
- The MCP adapter parses `RateLimit-Limit` / `RateLimit-Remaining` /
  `RateLimit-Reset` into a request-budget snapshot it exposes, and a 429
  failure carries the server's `Retry-After` wait in the operator's sentence.

Nothing breaking. The record gains fields; no existing field moves.

## Capabilities

**New**: none
**Modified**: `platform-mapping` — the record and its freshness guards widen
to all four declared surfaces (ADDED requirements only).
`battlegrid-connection` — the transport reads the platform's declared request
budget and names the wait on a rate-limited request (ADDED requirements only).

## Out of Scope

- **Pacing fan-outs against the budget.** Reading the meter is this change;
  sizing batches by it (the arena watch, the probe) is the remainder of
  backlog item `the-request-budget-is-published-and-discarded`, which stays
  open, rescoped to consumption.
- **The product client calling `prompts/get` or `resources/read` at runtime.**
  The adapter stays tools-only by design; this change is about the record and
  the guards.
- **Subscribing to `notifications/*/list_changed`.** The server advertises it
  on all three listable surfaces, but the adapter opens a session per request,
  so a subscription helps nothing yet. Noted in the backlog item; not built.
- **Automatic retry on 429.** The failure names the wait; deciding to wait
  stays with the caller.

## Impact

- `tools/probe_mcp_surface.py` — new fetches (all read-only JSON-RPC:
  `prompts/list`, `prompts/get`, `resources/list`, `resources/read`,
  `resources/templates/list`), new record blocks, writes the capabilities dump.
- `tools/generate_mcp_reference.py` — new sections; accepts the committed dump
  as input; writes `docs/BATTLEGRID_MCP_REFERENCE.md` directly in that mode.
- `tests/architecture/surface-freshness.test.ts`,
  `tests/live/surface-freshness.test.ts` — widened.
- `src/infrastructure/battlegrid/mcp-adapter.ts`, `src/domain/errors.ts` —
  budget snapshot, Retry-After on the 429 sentence. The domain still never
  imports the MCP client; the error gains a number, not a dependency.
- `docs/battlegrid-mcp-surface.json`, `docs/battlegrid-mcp-capabilities.json`,
  `docs/BATTLEGRID_MCP_REFERENCE.md` — regenerated live at the current server
  version.
- Backlog: `three-quarters-of-the-mcp-surface-is-unrecorded` is implemented by
  this change; `the-request-budget-is-published-and-discarded` is partially
  implemented and rescoped.
