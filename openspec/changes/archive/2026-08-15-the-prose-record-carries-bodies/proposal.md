# Proposal: The prose record carries bodies

## Why

The platform's prose carries constraints no JSON schema can express —
scope semantics, copy-don't-construct rules, per-tool pagination,
authoring deadlines — each already paid for at least once here. Yet
(#294, all verified on main 2026-08-15): prompt bodies and resource
contents are recorded nowhere (`capture_mcp_dump.py` fetches lists only;
the `author-strategy` prompt alone was ~5,900 chars of binding authoring
sequence with no copy in the repo); the server instructions are loaded by
`generate_mcp_reference.py` and rendered nowhere; and prose drift under
an unchanged version is invisible — the live freshness gate compares the
version and the vocabulary values, never the prose.

The contract sketch is the three declined requirements on tag
`archive/claude/agent-creation-data-strategies-fw6av8`, declined then
because the spec must not claim unbuilt behavior. This change builds the
behavior and lands the requirements re-fit to the current three-record
architecture.

## What Changes

- `tools/capture_mcp_dump.py` grows two dump files: `promptbodies.json`
  (`prompts/get` per listed prompt) and `resourcebodies.json`
  (`resources/read` per listed resource). Each entry holds the server's
  raw envelope; a refusal is recorded as a **named failure on that
  entry** — never as an absent body, because an absent body and a
  never-fetched body are different facts and only one of them is a
  finding. A failed entry does not abort the capture.
- `generate_mcp_reference.py` folds the bodies into
  `battlegrid-mcp-capabilities.json` (`promptBodies`,
  `resourceContents` — verbatim, no digests: normalisation is a
  comparison-time concern and lives in one implementation, in the gate)
  and renders three new things in the reference: a **Server
  instructions** section (verbatim), each prompt's body, each resource's
  content.
- `tests/architecture/surface-freshness.test.ts` gains the offline half:
  the record carries instructions and a body-or-named-failure per listed
  prompt and resource; the reference renders what the record carries.
- `tests/live/surface-freshness.test.ts` gains the prose digest gate:
  sha256 over normalised prose, recorded vs live, failing by surface
  name. The instructions greet the connected account by name
  (`…connected to BattleGrid as Fibonacci —`), so the comparison
  normalises the addressee before digesting; two operators holding the
  same record must not see different verdicts.

## Capabilities

**Modified**: `platform-mapping` — three ADDED requirements (see delta).

## Out of Scope

- The declined sketch's "reference regenerable from the committed record
  alone" clause — the generator still reads the dump directory; the
  offline check compares reference to record directly instead. Narrowed
  deliberately, said here.
- Reading any of the prose in product UI.

## Impact

`tools/capture_mcp_dump.py`, `tools/generate_mcp_reference.py`,
`docs/battlegrid-mcp-capabilities.json`, `docs/BATTLEGRID_MCP_REFERENCE.md`,
`tests/architecture/surface-freshness.test.ts`,
`tests/live/surface-freshness.test.ts`. Needs the keyed session it is
being built in (capture + live gate proof).
