---
id: battlegrid-is-returning-internal-errors
title: BattleGrid is answering INTERNAL_ERROR and 504 across several tools
type: risk
status: open
priority: p2
created: 2026-08-05
updated: 2026-08-05
change: ""
capability: ""
blocked_by: []
tags: [battlegrid, live, platform]
---

# BattleGrid is answering INTERNAL_ERROR and 504 across several tools

## What

On 2026-08-05 the platform is degraded, not broken in one place. Four live
probes that were green fail, and the one write this session needed could not be
performed at all.

**`create_intelligence_agent` returns `INTERNAL_ERROR` for every payload.** This
is the sharpest evidence because it was bisected all the way down:

| payload | result |
|---|---|
| the product's own, `tradingMode: OFF`, Dunkirk | INTERNAL_ERROR |
| same, against Leningrad / London / Tobruk | INTERNAL_ERROR |
| `positionManagement` from the COLT preset | INTERNAL_ERROR |
| **no `tradingConfig` key at all** | INTERNAL_ERROR |
| `brain` malformed on purpose | `-32602`, full field-by-field report |

The last row is the one that settles it: the server still validates, so the 500
happens *downstream* of a request the schema accepted. Both accounts, every
SYSTEM strategy, and `slotUsage` reads `limit: 24, used: 5, remaining: 19`, so
capacity is not it either.

The rest, with a key present, running one file at a time:

| probe | failure |
|---|---|
| `preview-probe` | `unreadable: INTERNAL_ERROR` from the preview |
| `field-probe` | `field tools/call failed with 504` |
| `competitor-probe` | `field tools/call failed with 504`, after 122s |
| `column-grammar-probe` | `expected 'unreadable' to be 'contract'` |

None of them touches anything this session changed — no proposals, no
`editArguments`, no `reconcile`, no `OpenProposalQuery`. They fail on reads the
platform did not answer.

`tests/live/surface-freshness` is **green** throughout, so the running server is
the one the surface record describes. Nothing has been renamed under us; the
tools are simply failing.

## Why it matters

Two consequences, and the second is the one that lasts.

1. `./scripts/ci.sh` with a key cannot be green while this holds, so
   `the-model-can-propose-and-only-a-human-agrees` task 7.1 is unverifiable
   today in its keyed half. The keyless run is green.
2. The propose → open → agree loop has never been closed against a real
   account. `tests/live/proposal-probe.test.ts` walks all of it and **skips the
   write**, naming this, because it creates its own throwaway agent and cannot.
   Everything up to the button is proven live; the write is not.

p2, not p1: it is the platform's to fix, the product has no workaround worth
building, and nothing a user does is broken by it. It becomes p1 if it is still
failing when the write path next needs proving.

## Evidence

```
BATTLEGRID_API_KEY=… BATTLEGRID_LIVE_WRITES=1 \
  npx vitest run tests/live/proposal-probe.test.ts
  SKIPPED: could not create a throwaway agent — {"code":"INTERNAL_ERROR",…}
  4 passed | 1 skipped
```

The read-only three in that file pass against the live account throughout, which
is what says the degradation is per-tool rather than total.

## Notes

**Do not walk the write against the operator's own agents to get around this.**
Every agent on both accounts is in `FULL_EXECUTION`; editing a live trading
agent to make a probe pass is not a trade a test gets to make on someone's
behalf. The probe creates its own subject or it skips.

There is no clone or fork tool for agents — `create_intelligence_agent` is the
only way to obtain a throwaway — so this blocks the write half completely rather
than making it awkward.

Re-check by running the four probes above and the proposal probe. When the write
test stops skipping, this item is done and task 6.1 can be closed.
