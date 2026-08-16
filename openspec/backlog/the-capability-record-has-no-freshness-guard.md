---
id: the-capability-record-has-no-freshness-guard
title: The capability record is the one artifact no check compares to the live server, and it went stale again
type: debt
status: open
priority: p2
created: 2026-08-16
updated: 2026-08-16
change: ""
capability: platform-mapping
github: "328"
blocked_by: []
tags: [battlegrid, records-accuracy, staleness, validate, live-probe]
---

# The capability record has no freshness guard

## What

This repository keeps three records of the BattleGrid surface. On 2026-08-16,
before any refresh, they read:

```
docs/battlegrid-mcp-surface.json        19.2.0    <- guarded
docs/battlegrid-vocabulary.json         19.1.0    <- guarded, by content
docs/battlegrid-mcp-capabilities.json   19.1.0    <- NOT GUARDED
```

`tests/live/surface-freshness.test.ts` — whose own header calls it *"the only
check in the repository that can discover a BattleGrid deployment"* — passed
**all 23 assertions** in that state. It reads the surface record and the
vocabulary record. **It never opens the capability record**, which is the
artifact that holds every `outputSchema`.

## Why it matters

This is #198 exactly, and #198 is the reason `tools/diff_output_schemas.py`
exists. That tool works — run by hand on 2026-08-16 it correctly reported
`19.1.0 -> 19.2.0`, one output schema changed, seven leaves added on
`get_account_state`. **But nothing runs it, and nothing asserts the record's
version**, so the same gap that let 188 leaves move unseen at v18 is still open
at v19.

It is p2 because the failure mode is the one this project treats as most
serious everywhere else: a green check standing in for a fact nobody measured.
The count agreed, the surface record agreed, the guard was green — and the
output schemas were a deployment behind.

## Evidence

Measured 2026-08-16 with a keyed session. `capture_mcp_dump.py` reported
`captured battlegrid v19.2.0` while `docs/battlegrid-mcp-capabilities.json`
still said 19.1.0, and the live freshness suite reported
`recorded battlegrid 19.2.0 - live battlegrid 19.2.0` and passed — because the
19.2.0 it compared was the surface record, refreshed minutes earlier by
`probe_mcp_surface.py`.

All three records were brought to 19.2.0 in the same session, so the instance
is closed and the gap is not.

## What would settle it

1. **Cheapest**: add the capability record to
   `tests/live/surface-freshness.test.ts` — one more version assertion beside
   the two it already makes.
2. **Better**: have the live suite run `diff_output_schemas.py`'s comparison and
   fail on any output-schema movement, so a drift is named rather than merely
   detected as a version mismatch.
3. **Offline half**: `tests/architecture/surface-freshness.test.ts` can assert
   that all three records carry the *same* version as each other without a
   network call. That alone would have caught this instance.

(3) is the one worth doing first — it is offline, it needs no key, and the
divergence it catches is exactly the one that occurred.

Related: [[v19-moved-thirty-four-output-schemas]] (#301),
[[the-write-paths-are-unverified-at-v19]] (#306),
[[the-mirror-is-checked-one-way]] (#309) — the same shape again: two of three
things compared, the third trusted.
