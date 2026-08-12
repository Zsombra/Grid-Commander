# Proposal: A refusal and an outage stop reading alike

## Why

The surface probe records every failed call as one `call_failed` string,
flattening a structured refusal (`VALIDATION_ERROR` — a schema gap worth
reporting upstream) and an `INTERNAL_ERROR` (a server bug) and a transport
failure into one bucket. `two-read-tools-do-not-answer` (#114) names this as
its optional Fix #3: the adapter already parses the code (`ToolRefusedError`),
so the probe flattening it is a gap on one side of a mirror.

## What Changes

- `tools/probe_mcp_surface.py` gains `code_of`, mirroring `codeOf` beside
  `ToolRefusedError` in `mcp-adapter.ts`, and records `call_failed_code`
  beside `call_failed` on every failed call — the platform's structured code
  on a refusal, `null` on prose refusals and transport failures. The fail
  line prints the code.

## Capabilities

None — probe tooling; no product behavior changes (`skip_specs: true`).

## Out of Scope

- Re-running the probe against the live server (writes committed artifacts;
  its own session ritual).
- Any change to how the *product* adapter classifies failures — it already
  does this.

## Impact

`tools/probe_mcp_surface.py` only. The artifact key is additive; nothing
consumes `call_failed` outside the probe itself.
