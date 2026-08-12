---
id: battlegrid-is-returning-internal-errors
title: BattleGrid is flapping — it came back as v9.0.0 and per-tool INTERNAL_ERRORs returned with it
type: risk
status: open
priority: p2
created: 2026-08-05
updated: 2026-08-12
change: ""
capability: ""
github: "100"
blocked_by: []
tags: [battlegrid, live, platform]
---

# BattleGrid is flapping, and the outage was a deployment

## Update 2026-08-06 (later): **v11.0.0**, and the count still has not moved

Two more majors landed during a single working day — v9.0.0 in the morning,
**v11.0.0** by 15:12, both at **110 tools**. Six majors observed in total and
the number has never changed once. The surface record and the `freshness` gate
now read v11.0.0.

One `./scripts/ci.sh` run failed `freshness` mid-afternoon and passed on the
next attempt with no change to the record — a deployment landing between two
runs of the same suite. That is the gate working, not a flake, and it is the
second time in a day the platform moved under a running suite.

## Update 2026-08-06: back on **v9.0.0**, and unstable

The outage was a deployment. **v5.1.0 → v9.0.0**, four majors, and the tool
count is **110 — again**. Fourth time a major version moves and that number
does not; it proves nothing and never has.

The edge recovered and the backend did not, fully. There was a real working
window — the surface re-probed cleanly, `./scripts/ci.sh` went green with a key
across all ten gates, and the live write walk completed end to end. Twenty
minutes later:

| tool | |
|---|---|
| `list_strategies` | ok |
| `get_trading_config_catalog` | ok |
| `get_agent_explorer` | ok |
| `list_intelligence_agents` | **INTERNAL_ERROR** |
| `list_strategy_vocabulary` | **INTERNAL_ERROR** |

**Read the envelope, not the status.** These come back **HTTP 200** with
`isError: true` and `{"code":"INTERNAL_ERROR"}` inside — so a check that reads
only the transport sees a healthy platform. `A Refused Tool Call Is A Failure`
exists for exactly this, and the product classifies them correctly as
`unreadable`. A hand-rolled `curl` check does not: an earlier status call here
reported "back" on the strength of one 200 whose body was an error.

Live probes touching the roster fail while their neighbours pass. Not a
regression in this product — the same per-tool pattern as 2026-08-05, on a
platform that has replaced itself underneath.

### What v9 actually brought

A **perp/spot flow** module, cleanly: context source `includePerpSpotFlow`,
market-context module `perpSpotFlow`, signal module `FLOW_DIVERGENCE` with two
signals, and metrics `PERP_SPOT_FLOW`, `PERP_SPOT_STRENGTH`,
`PERP_SPOT_CONFIRMS`, `SPOT_CVD`, plus `BB_WIDTH_PCT` and `RVOL`.

**One removal: `VOLUME_RATIO` is gone** from every metric enum. Nothing in this
product names it — vocabulary is read at runtime and `structure.test.ts` forbids
writing it into source, which is the design paying for itself. Also
`preview_strategy_report` dropped `estimatedTokenCount`,
`list_strategy_vocabulary` gained `previewExecutionLimits`, and the catalog
gained two bounds: `agentMinConfidenceFloorPercent` and
`agentMinTradeConvictionFloorPercent`.

All 1347 tests pass against the re-probed record. No tool was added, removed, or
reclassified — 23 tools' schemas moved underneath.

## Update, 2026-08-05 evening: a full outage

Every request now comes back **502 Bad Gateway from nginx** — HTML, not JSON,
so nothing reaches the MCP layer at all. Both keys, repeated calls, `tools/call`
on a plain read.

```
HTTP 502 text/html
<html><head><title>502 Bad Gateway</title></head>
<body><center><h1>502 Bad Gateway</h1></center><hr><center>nginx</center></body>
</html>
```

That settles what the evidence below could only suggest: this is BattleGrid's
infrastructure, not any per-tool logic and nothing about our payloads. The
INTERNAL_ERRORs recorded first were the same failure earlier in its progression
— a backend already unwell behind an edge that was still answering.

**Nothing live can be run until it returns.** The probes fail on their first
read now rather than deep in a sequence, which is at least an unambiguous
signal.

## What (as first observed)

Earlier on 2026-08-05 the platform was degraded, not broken in one place. Four live
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

## Observed again 2026-08-06 ~22:50Z — the explorer subsystem, as a raw gateway 504

Two key-gated live probes failed in the keyed CI run:

```
× a competitor answers through the product path > opens the top agent in the field
× the field answers through the product path > reads the field and this account's place in it
  → field BattleGrid is not answering right now (HTTP 504)
```

Both are the same underlying read and both took ~122s. Checked directly, with
raw `fetch` rather than through the product, to rule the product out:

```
get_agent_explorer   HTTP 504   120606ms   <html>…504 Gateway Time-out…
get_leaderboard      HTTP 504   120217ms   <html>…504 Gateway Time-out…
```

**An HTML error page from the gateway, not an MCP envelope.** The request never
reached the MCP layer, so no argument this product could send would change the
outcome. A flat two-minute timeout on both is a backend that is hanging rather
than refusing.

The pointed detail: **`get_leaderboard` answered normally roughly an hour
earlier in the same session** — ten rows on every metric, which is what
`the-players-above-you-are-shown` was built from. So this is an outage that
began mid-session, not a standing condition, and the explorer subsystem
(`get_agent_explorer` + `get_leaderboard`) went down together.

**The product degrades correctly**, which is the one reassuring part.
`ReadFieldQuery` reads the field and the leaderboard in a `Promise.all` and they
fail independently; `/explorer` says the standing could not be read, names the
cause, and renders no ranked players rather than claiming there are none. That
is the behaviour `tests/rendering/explorer.test.ts` pins with *"claims no
players at all when the leaderboard did not answer"*.

So: nothing to fix here, and the keyed CI's `vitest` gate is red for a reason
that is entirely BattleGrid's. Worth re-running the two probes once the
subsystem recovers rather than treating them as a standing failure.

## Recovered 2026-08-07 ~04:20Z — outage lasted under six hours

Both reads answer normally again (`get_agent_explorer` 200 in ~4.1s,
`get_leaderboard` 200 in ~2.5s), and the two red live probes pass:

```
✓ field-probe       reads the field and this account's place in it   (4.8s)
✓ competitor-probe  opens the top agent in the field                 (9.5s)
```

So the keyed CI failure of 2026-08-06 ~22:50Z is fully accounted for as a
transient platform outage of the explorer subsystem, roughly bounded between
22:00Z and 04:20Z. Nothing in this product changed between red and green.

## 2026-08-07 — per-call flapping under a keyed serial sweep

The serial read sweep (26/28 green) caught the per-call shape again, twice
in one file: `column-grammar-probe`'s "a valid column compiles" answered
`unreadable` at 16:13Z and passed on rerun at 16:2xZ, while its neighbour
"a metric card carries transforms with formulas" did the reverse. Same key,
same serial pacing, platform 11.0.0 throughout, and calls running 30–180s.
Consistent with the standing record: individual tools flap `isError`/slow
while neighbours answer. No product action; recorded so the next phantom
failure costs a lookup instead of a diagnosis.

## 2026-08-12 — still live, and now on one named tool

Re-probed against **v18.2.0** (the record had v17.2.0; see
`the-surface-record-was-a-major-version-stale`). One tool fails, reproducibly:

    list_gate_blocks → {"code":"INTERNAL_ERROR","message":"Internal server error"}

Four independent calls: `tools/probe_mcp_surface.py`'s own run (its single
failure of 69 calls), and three by hand — Undertow at limit 100 and 20,
Breakwater at limit 5. Two different agents, three different page sizes, same
answer. Not load, not pagination, not one bad agent.

This is narrower than the 2026-08-05 flapping this item was filed for. Then it
was several tools intermittently; now it is **one tool, deterministically**,
and that tool is the one whose description v18.2.0 rewrote — so the most
likely reading is that the v18 change to gate-block semantics shipped broken
rather than that the platform is unstable again.

**What it costs us**: `readStoppages` feeds `/agents/[id]` ("what has actually
been stopping it") and the pipeline page. Both currently render their
unreadable branch against live. That branch now explains itself properly —
today's refusal work — so the failure is visible and honest rather than
silent, but the answer is unavailable.

Nothing to do here but watch: it is upstream, it is not intermittent, and a
re-probe will show when it returns.

