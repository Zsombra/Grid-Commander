# Proposal: The Vocabulary Values Enter The Record

## Why

The probe records response *shapes*, deliberately — an account's data does
not belong in a committed artifact. For `list_strategy_vocabulary` that rule
strips the thing that matters: the vocabulary payload is the platform's
authoring contract, identical for every account, and it is almost entirely
values. Today `strategyConditions: 16` is recorded as `"int"`, the six
enabled timeframes (of thirteen in the enum) appear nowhere, `rel: regime`
resolving to null on low anchors appears nowhere, and transforms like
`efficiency` and `maxShare` are capability the product does not know it has.
Backlog p1 `the-surface-map-is-two-majors-stale` documents three of these
producing silently wrong output rather than a refusal — and the freshness
gate, which compares versions and (since
`the-record-learns-the-other-three-surfaces`) prose digests, cannot see a
budget number move.

Recon at v17.2.0: 10 categories, ~178KB verbatim, budgets 4× tighter than
the compile schema's `maxItems: 64`, and the platform's own authoring caps
(`estimatedTokens: 16000`, `maxResultBytes: 256000`, `deadlineMs: 15000`)
published in the payload.

## What Changes

- The probe fetches `list_strategy_categories`, then
  `list_strategy_vocabulary` per category, and records each payload
  **verbatim** with a sha256 in a new `authoring_vocabulary` block — the one
  stated exception to shapes-only, because these values are the platform's
  contract, not the account's data. Curation is how the values were lost the
  first time; none is applied.
- The offline freshness guard asserts the block exists, digests verify, and
  the values are values (a budget is a number, not `"int"`; the enabled
  timeframes are a non-empty list).
- The live freshness guard digest-compares every category against the
  running server and fails naming the category that moved.
- `docs/REPORT_TABLE_GRAMMAR.md`'s budget list grows from the four gauges
  observed in `budgetUsage` to the seven the vocabulary declares, sourced
  from the record.

## Capabilities

**New**: none
**Modified**: `platform-mapping` — ADDED requirements only.

## Out of Scope

- **Product consumers of the values** — a timeframe picker that offers only
  enabled timeframes, a condition budgeter, surfacing `efficiency`/`maxShare`
  in authoring UI. Each is its own change; the record and guards come first.
- **The `rel: regime` inertness as a product behavior** — recording it makes
  it visible; deciding what the product does about it is not record work.

## Impact

- `tools/probe_mcp_surface.py` — vocabulary fetch + record block
- `tests/architecture/surface-freshness.test.ts`,
  `tests/live/surface-freshness.test.ts` — widened
- `docs/battlegrid-mcp-surface.json` — regenerated live (+~180KB)
- `docs/REPORT_TABLE_GRAMMAR.md` — budget list corrected
- Backlog: closes `the-surface-map-is-two-majors-stale` (p1)
