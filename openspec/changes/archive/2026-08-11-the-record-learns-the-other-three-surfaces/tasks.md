# Tasks

## 1. The record carries all four surfaces

- [x] 1.1 Probe: keep `instructions` from the `initialize` result (text +
      sha256 + normalised-addressee sha256), instead of discarding it
- [x] 1.2 Probe: `prompts/list`, then `prompts/get` per prompt; record name,
      description, arguments, body text + sha256; a failed fetch records the
      reason on that entry
- [x] 1.3 Probe: `resources/list`, then `resources/read` per resource; record
      name, uri, mimeType, content + sha256; same failure handling; include
      `resources/templates/list`
- [x] 1.4 Probe: write the three new top-level blocks beside `tools`; extend
      the record's `note` to name them
- [x] 1.5 Probe: write `docs/battlegrid-mcp-capabilities.json` (verbatim
      merged dump, bodies included) in the same run

## 2. The reference renders what the record carries

- [x] 2.1 Generator: accept a merged-dump file as input, defaulting to
      `docs/battlegrid-mcp-capabilities.json`; keep dump-dir mode working
- [x] 2.2 Generator: emit `## Server instructions` verbatim, fenced
- [x] 2.3 Generator: emit each prompt's body and each resource's content,
      fenced, under the existing Prompts / Resources sections
- [x] 2.4 Generator: in file mode write `docs/BATTLEGRID_MCP_REFERENCE.md`
      directly

## 3. Guards

- [x] 3.1 Offline freshness: the record carries instructions, every prompt
      with a body, every resource with content — failure names the re-probe
      command
- [x] 3.2 Offline freshness: the reference contains the instructions section
      and a body section per recorded prompt and resource
- [x] 3.3 Live freshness: instructions digest compared with the addressee
      normalised; prompt bodies and resource contents digest-compared; failure
      names the surface that moved
- [x] 3.4 Live freshness: still skips without a credential; offline half
      still runs

## 4. The request budget

- [x] 4.1 Adapter: parse `RateLimit-Limit` / `RateLimit-Remaining` /
      `RateLimit-Reset` in `rpc`; retain as a `RequestBudget` snapshot;
      absent headers expose `unstated` rather than the previous numbers
- [x] 4.2 Adapter: expose `lastRequestBudget()`; unstated before any answer
- [x] 4.3 429: pass `Retry-After` seconds into `PlatformUnavailableError`;
      the sentence names the wait only when the platform named one
- [x] 4.4 Unit tests with a fake fetch: headers present, headers absent after
      a stated answer, nothing answered yet, 429 with and without Retry-After

## 5. Verification

- [x] 5.1 Re-probe live (read-only), regenerating record, capabilities dump,
      and reference at the current server version
- [x] 5.2 Full gates: typecheck, lint, vitest, build, spec validation
- [x] 5.3 Keyed run of `tests/live/surface-freshness.test.ts` against the
      regenerated record passes
- [x] 5.4 Backlog: `three-quarters-of-the-mcp-surface-is-unrecorded` linked
      to this change; `the-request-budget-is-published-and-discarded` rescoped
      to the pacing remainder
