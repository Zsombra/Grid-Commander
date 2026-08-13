---
id: battlegrid-is-returning-internal-errors
title: list_gate_blocks serves old rows and 500s on new ones — poisoned at the head, not broken
type: risk
status: open
priority: p2
created: 2026-08-05
updated: 2026-08-13
change: ""
capability: ""
github: "100"
blocked_by: []
tags: [battlegrid, live, platform]
---

# list_gate_blocks answers INTERNAL_ERROR for every agent

> **Retitled 2026-08-13.** Filed 2026-08-05 as platform-wide flapping at v9.0.0;
> at v18.2.0 it is one tool, deterministically, and everything else answers.
> Original title: *"BattleGrid is flapping — it came back as v9.0.0 and per-tool
> INTERNAL_ERRORs returned with it"*. The whole history is kept below — the
> outage, the four majors in a day, and the 504s are all real records of what
> this platform does.

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


## 2026-08-13 — retitled, because the title was nine majors stale

Re-confirmed in the read-only verification sweep. `list_gate_blocks` on
Undertow, `limit: 50`:

    list_gate_blocks → {"code":"INTERNAL_ERROR","message":"Internal server error"}

Fifth independent call, third agent-and-page-size combination, second day.
Deterministic.

**Everything else this item was filed about answers.** In the same session:
`get_account_state`, `list_intelligence_agents`, `list_user_active_positions`,
`get_agent_performance`, `get_agent_fund_allocation`, `get_open_orders`,
`list_pending_approvals`, `list_market_grid_sessions`, `list_radar_deployments`,
`get_strategy` ×3 — every one answered normally. Including
`list_intelligence_agents`, which is one of the two tools the original
`INTERNAL_ERROR` observation named.

So the item is renamed. It read *"BattleGrid is flapping — it came back as
v9.0.0 and per-tool INTERNAL_ERRORs returned with it"*, which described
2026-08-05 accurately and now describes nothing: the platform is at **v18.2.0**,
nine majors on, and it is not flapping. One tool is broken, and it is the tool
v18 rewrote.

**The title mattered more than it looks.** This is the item a session reaches
for when a live probe fails, and a p2 named *"BattleGrid is flapping"* invites
reading any single failure as more of the same — which is the opposite of what
the evidence now says. A deterministic single-tool failure and an unstable
platform call for different responses, and only one of them is happening.

### What it blocks

[[open-position-conflict-churn-tripled]] (#146) outright: gate-block churn can
only be counted through this tool. That item cannot be re-measured until this
clears, and should not be read as stale in the meantime.

### Unchanged

Nothing to do here. It is upstream, it is not intermittent, the product renders
its unreadable branch honestly against live, and a re-probe will show when it
returns. It becomes p1 only if it starts costing a write path.

---

# Re-probed 2026-08-13 at v18.2.0 — it is not broken, it is poisoned at the head

The title says "answers INTERNAL_ERROR for every agent". That is true of every
call anyone had made, and it is the wrong conclusion. The tool works. It fails
only on the **newest** rows, and the failure is contiguous from the head.

## The bisection

`limit: 1` isolates one row, so `page: N` reads row N, newest first.

**Undertow** — `total: 5437`

| page | row timestamp | |
|---|---|---|
| 1, 10, 50, 53, 55 | — | **INTERNAL_ERROR** |
| 56 | 2026-08-12T09:29:04 | ok |
| 62 | 2026-08-12T09:20:04 | ok |
| 75 | 2026-08-12T08:57:04 | ok |
| 100 | 2026-08-12T08:38:04 | ok |
| 999 | 2026-08-12T00:09:30 | ok |

**Breakwater** — `total: 617`

| page | row timestamp | |
|---|---|---|
| 1, 15, 18 | — | **INTERNAL_ERROR** |
| 22 | 2026-08-12T04:58:01 | ok |
| 30 | 2026-08-12T04:50:01 | ok |
| 200 | 2026-08-11T15:52:28 | ok |

**Vanguard** — `total: 2`, and **both rows fail** individually.

Nine passing probes and nine failing ones. The boundary is clean: every row
above it fails, every row below it reads.

## Two things that rule out the obvious explanations

**It is not the agent lookup.** A UUID belonging to no agent answers
`{"entries": [], "total": 0}` — cleanly, no error. So the query path, the
pagination and the empty-result serialization are all fine, and a bad id does
not even 404.

**It is not one global cutoff.** Undertow's boundary sits after 09:29 and
Breakwater's after 04:58 — more than four hours apart on the same day. A
deployment-time cutoff would put them together. This is a **per-agent data
condition**, reached at different times by different agents.

## What the poison probably is, stated as the guess it is

Every row that *can* be read carries `gateStage: "TOKEN"` and
`reasonCode: "OPEN_POSITION_CONFLICT"`. Not one readable row anywhere in 5437
carries the two values v18 added, which
[[the-capabilities-record-was-a-major-version-stale]] (#198) recorded as new:

```
gateStage  : ACCOUNT, TOKEN, CONDITIONS, EVALUATION   <- EVALUATION is v18
reasonCode : ..., EVALUATION_FAULTED                  <- v18
```

The rows that cannot be read are exactly the rows written since v18 landed.
**That is consistent with the new enum values being what fails to serialize —
and it is not proof**, because the failing rows cannot be read to check. It is
recorded as a hypothesis with its evidence, not as a finding.

`get_radar_activity` was tried as a second route and does not settle it:
`screenReason` is null on all five recent events and `evaluationOutcome` shows
`BLOCKED_BEFORE_EVALUATION` once, which says evaluation is being blocked before
the model is called but not what the gate rows contain.

## Why this is worse than a broken tool

The tool's own description: *"This is the first place to look when an agent
isn't trading."*

None of these three agents is trading. All twenty deployments read `SCANNING`
with `qualified: false`, most on `AGGREGATE_BELOW_MIN`, and `inPosition` is 0.
So the diagnostic that exists to answer "why is nothing happening" is broken
**precisely on the rows that would answer it**, while cheerfully serving the
history from before the question arose.

## What can be done, here and upstream

- **There is a read-around.** `page: N, limit: 1` reaches any older row, and the
  data is intact — nothing is lost, only the recent window is unreachable. A
  surface that needed history could use it. A surface that needs *what just
  happened* cannot.
- **Upstream this is now reportable.** "It 500s" is not actionable; "it 500s on
  rows newer than X per agent, serves everything older, and returns empty for an
  unknown id" is. Carry it with `fork_strategy` (#102) and the refresh 500
  ([[refresh-rejection-is-indistinguishable-from-an-outage]], #204) as one
  report — three deterministic INTERNAL_ERRORs, all of them refusals or data
  wearing a crash.
- **Nothing to fix in this product.** It classifies the answer correctly as
  `unreadable`, which is what the platform said. That remains right.

---

# Re-bisected 2026-08-13 (evening) — the boundary is not clean, and the head has grown

`list_gate_blocks` re-probed against Undertow (`total` 5437 → **5483**). Two of
this item's claims survive and one does not.

## The head is contiguous, and it grew

Twelve rows sampled across 1–56, **all twelve fail**. The first readable row is
now between 100 (fails) and 105 (`2026-08-12T09:25:04`).

    row   1 … 56   FAIL  (12 of 12 sampled)
    row 100        FAIL
    row 105        2026-08-12T09:25:04   ok
    row 130        2026-08-12T08:52:04   ok

The earlier bisection had row 56 = `09:29:04` **readable**. With 46 rows added
since, that same row now sits at ~102 — inside the failing head. So a row that
served yesterday does not serve today: the head is a time window, and it has
eaten roughly four more minutes of history rather than staying put.

## But the boundary is not clean — there are poisoned rows far below it

This item states: *"The boundary is clean: every row above it fails, every row
below it reads."* **That is false.**

    row 284   06:15:02 TRUMP   ok
    row 285   06:14:03 TRUMP   ok
    row 286   06:14:03 HYPE    ok
    row 287   FAIL  ← three reads, three failures
    row 288   06:13:03 HYPE    ok
    row 289   06:13:03 TRUMP   ok

**Row 287 fails on its own, deterministically, with working rows either side**,
190 rows below the head. It is also why `limit: 50` behaves oddly — page 4 and
page 5 serve 50 rows each while pages 3 and 6 refuse: a page fails if it
*contains* a poisoned row, so a larger limit fails more often.

That reframes the upstream report. It is not "a recent window is unreachable".
It is **specific rows are unreadable — a dense block at the head, plus isolated
ones scattered below** — which is a different fault and a much sharper thing to
hand BattleGrid.

## The read-around still works, and it is how #146 became observable

Everything readable in the sampled range is `OPEN_POSITION_CONFLICT` at
`gateStage: TOKEN`. Measured over rows 151–250 — a 2h01m window,
`06:32:05 → 08:33:05` — **100 blocks, 100 of them `OPEN_POSITION_CONFLICT`,
86 of them HYPE.** See [[open-position-conflict-churn-tripled]] (#146).

## A correction about how this was found

The first three passes of this sweep reported "empty" pages and a zero-length
agent field. Both were wrong: the payload key is `entries`, and the probe was
reading `blocks` / `agents`. Nothing was empty. The reading error is recorded
because it is this repository's own recurring defect arriving in the probe
written to look for it — and because "the tool returns empty" would have been
filed upstream as a fact.
