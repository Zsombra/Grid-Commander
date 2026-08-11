---
id: radar-first-deployment-refusal-drifted
title: the platform now refuses a first radar deployment with VALIDATION_ERROR, not the CONFLICT the record was built on
type: bug
status: done
priority: p3
created: 2026-08-11
updated: 2026-08-11
change: the-probes-catch-up-to-v17
capability: battlegrid-connection
blocked_by: []
tags: [battlegrid, radar, live-probe, drift]
---

# The refusal shape drifted under an unchanged surface

## What

Running the write-gated probes (operator-approved, 2026-08-11) surfaced one
genuine platform change. `radar-probe.test.ts` asserts that creating a *first*
deployment on a coin with no policy fails as a `RevisionConflictError`
(`actualRevision: null`). It now fails as a `ToolRefusedError` with
`{code: "VALIDATION_ERROR"}`:

```
expected ToolRefusedError {code: "VALIDATION_ERROR"} to be an instance of
RevisionConflictError
```

The restriction itself is intact — the platform still refuses first-deployment
creates through this surface. Only the **shape** of the refusal changed.

## Why it is only p3

**No user-facing path is affected.** `deploy-agent.command.ts:82` refuses an
unoccupied coin in the *describe* step, before any upsert is attempted, with a
written reason ("BattleGrid's API refuses to create a first one through this
surface"). A real operator never reaches the raw refusal. The probe reaches it
only because it deliberately bypasses describe to hold the platform to its
recorded behavior.

## The stale record

Decision log DL-3 (2026-07-31) states the platform "answers every value with
`CONFLICT … actualRevision: null`." That observation is now out of date. Note
it is a **response-behavior** drift, not a declared-schema one — the
surface-freshness guards (which read declarations) would not and did not catch
it, which is consistent with their design, and is a small live example of the
gap the `three-quarters-of-the-mcp-surface` work narrowed but did not close for
tool *responses*.

## Fix

1. Update `radar-probe.test.ts` to expect the current refusal
   (`ToolRefusedError`, `code: VALIDATION_ERROR`), and keep asserting that a
   first-deployment create is refused.
2. Correct the DL-3 note / the comment at `deploy-agent.command.ts:84-87` to
   describe the current refusal rather than the retired CONFLICT one.
3. No product-code change to the user path — describe already refuses first.
