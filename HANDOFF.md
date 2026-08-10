# Grid-Commander — Session Handoff

**Date**: 2026-08-10  
**State**: green (1968 vitest + 81 db + 235 harness tests, eight of ten `./scripts/ci.sh` gates — `freshness` and `serving` skip without a key; further vitest are key-gated live probes). No active changes. 31 open backlog items. PRs #8–#82 merged; **#83 open as a draft**. **The surface record is v16.0.0**, re-probed 2026-08-10 — v16 made `conditions[].required` a required path on all three condition-carrying writes, the twelfth dead write path and the second caught by the guards before a live refusal. **Grid-Commander is an MCP server** — `docs/MCP_SERVER.md`; any model the operator runs can read the product, and none can write through it. The report-table grammar is mapped end to end in `docs/REPORT_TABLE_GRAMMAR.md`. **Phase 1 (strategy-maker) is complete**; **Phase 2 reads both halves of the record** — what an agent did with the money (`/agents/[id]/trades`) and why it did or didn't trade (`/agents/[id]/pipeline`) — and now asks the question forward: **`/agents/[id]/qualification`** screens coins against an agent's gates before it acts, and **`/agents/[id]`** now leads with what has actually been stopping it. v14 had moved the tool count for the first time ever (110 → 114) and v15 moved the trade-level policy from the agent onto the strategy — which the platform declares and still does not apply, retested against v16: `v15-trade-level-policy-is-declared-but-inert`, p1. **The signal recorder ships** (13th capability, 2026-08-07): `bin/grid-commander-record.ts` captures what every signal says, forward — start its cron on day one, because the platform serves current readings only and a gap can never be backfilled. **A closed trade tells its story** (2026-08-08): `/agents/[id]/trades/[logId]` draws the platform's frozen chart with the levels *as placed* and lists every move position management made — the trail where a trailed stop is finally visible acting on real money.

---

## What This Project Is

Grid-Commander is a **multi-tenant web workbench** for building, tuning, and understanding BattleGrid trading agents over BattleGrid's MCP server (`https://mcp.battlegrid.trade/mcp`). It is a TypeScript / Next.js / PostgreSQL application using Clean Architecture — the domain never imports the MCP client; BattleGrid sits behind a port.

The idea brief is at `_IDEA/Grid-Commander_Idea_Brief.md`. The MVP feature spec is at `_PM/Grid-Commander-MVP_Feature_Specification.md`.

---

## Current State of `main`

All development branches have been merged. `main` is the single source of truth.

| Metric | Value |
|---|---|
| Capabilities (archived) | **13** |
| Changes (archived) | **132** |
| Vitest tests | **1968** (+ key-gated live) + 81 db |
| Harness tests (Python) | 235 |
| Active changes | none |
| Open backlog items | **31** |
| Design tickets open | 0 |
| Open draft PRs | **#83**; #8–#82 merged |
| Open GitHub issues | **#84–#87** — filed 2026-08-10, see below |

### Read this before anything else

**BattleGrid deploys often, and the tool count barely moves.** Three
deployments were observed in one session on 2026-08-05 — v3.0.0 → v5.0.0 →
v5.1.0 — and all three reported exactly **110 tools** while enums, required
arguments and semantics changed underneath. **v14 then moved it to 114**, the
first change in six major versions. So a count that has not moved proves
nothing, and one that has says only that *something* changed — neither is a
freshness check. **v16 is the current record** (2026-08-10): 114 tools, none
added or removed, three schemas changed, and one of those changes would have
refused every strategy write carrying a condition.

`./scripts/ci.sh` now runs a **`freshness`** gate. With `BATTLEGRID_API_KEY`
set it compares `docs/battlegrid-mcp-surface.json`'s recorded server version
against the live one and **fails** on a mismatch; without a key it prints a
named skip. If it fails, re-probe before doing anything else:

```bash
BATTLEGRID_API_KEY=bg_live_… python3 tools/probe_mcp_surface.py
```

**Three platform behaviours found on 2026-08-06, each of which will bite
again.**

- **`fork_strategy` answers `INTERNAL_ERROR` when a strategy of the fork's name
  already exists.** Not the quota — that refuses cleanly with
  `VALIDATION_ERROR: Strategy limit reached` and publishes
  `quota: {used, limit, remaining}`. Isolated by forking three sources with and
  without a name collision. Any repeated automation degrades, because each run
  leaves behind the name that breaks the next one; live probes must pick a
  source whose `<name> (fork)` is free. See `forking-a-name-that-exists-is-a-500`.
- **`last24hCostUsd` disagrees between `list_intelligence_agents` (0.09022839)
  and `get_intelligence_agent` (0)** for the same agent at the same moment,
  stable across repeated samples, with every other key identical. Read spend
  from the **list**. See `the-cost-of-an-agent-reads-differently-from-two-tools`.
- **A no-op UPDATE is refused** — `Strategy update contains no effective
  changes` — which is how the compiler proves it read the submitted list at all.
  Any probe that resubmits a strategy's own state must expect this rather than a
  plan.

**A credential in the environment is not consent to mutate.** Live probes
that can write require `BATTLEGRID_LIVE_WRITES=1` as well as a key, and
`tests/architecture/live-writes.test.ts` fails any ungated probe that names a
mutating tool **or** constructs a `*Command`. The condition sweep has its own
opt-in, `BATTLEGRID_CONDITION_SWEEP=1`, because it is slow enough to starve
its neighbours.

---

## Thirteen Capabilities

| Capability | What it covers |
|---|---|
| `market-grid` | The Market Grid arena, watched — sessions, schedules, entered state, the money split, and honest status copy (reads only; a CANCELLED session is promised nothing) |
| `agent-deployment` | Deploy/undeploy an agent's radar presence (guarded writes) |
| `spec-validation` | Automated spec layer validation in CI |
| `harness-integrity` | The `openspec.py` tooling itself (235 tests) |
| `battlegrid-connection` | OAuth + DCR + PKCE account connect/disconnect; audit; credential encryption |
| `agent-authoring` | Roster, create, rename, rebind, archive, reactivate, budget gauges |
| `agent-understanding` | Agent journal (thought log), budget limits + spend, account-level capacity, **the trading record**, **each trade's story — frozen chart + the audit trail of every stop move**, **the decision pipeline**, **one evaluation's full scorecard and what it cost**, what has been stopping it, open positions, and the prospective **qualification screen** |
| `strategy-authoring` | Fork (nameable), compile, review, apply; archive, restore; score a re-weighting before saving it; **the condition layer — composed, tried live, and saved through the full ceremony**; the section library and column editor |
| `app-access` | Multi-tenant session, route protection, OAuth callback, build gate |
| `mcp-control` | Grid-Commander exposed as an MCP server — 25 tools (24 reads + one proposal recorder), no writes to BattleGrid, any client |
| `agent-comparison` | The public field — other people's agents, the leaderboard, where this account stands, one competitor's whole public record, and any one evaluation's full scorecard |
| `platform-mapping` | The recorded model of BattleGrid's MCP surface, and the guarantee that it announces its own age |
| `signal-recording` | The forward record of what the signals said — capture (CLI, cron-owned schedule), the raw answer kept whole, coverage with gaps stated as gaps, history per coin and per signal, readable by the web and by a model |

---

## What the App Can Do (as of `main`)

Against a real connected BattleGrid account a user can:

- **Connect** their account (OAuth/DCR/PKCE, no raw credential ever touches the browser)
- **Agents**: view roster, create, rename, update trading limits, edit position management (a preset with the platform's own values or fourteen custom fields, drift between label and values said plainly), rebind to a strategy, archive, reactivate
- **Agent understanding**: read the agent's thought log (reasoning, confidence, decision outcomes), view how close it is to each configured limit, see which limits have no cap set vs which are at risk, and see whether it is acting at all — each radar deployment's market, timeframe and standing, or a plain statement that it is configured but scanning nothing
- **Agent deployment**: deploy an agent onto a market that already carries a deployment (the replacement is named before agreement; timeframes come from the platform's runtime declaration) and undeploy it (the confirmation names what stops). A market's *first* deployment is **creatable since v14** (`expectedRevision: null`, four proven live 2026-08-08) and the deploy surface does not yet offer it — `the-deploy-surface-cannot-create-first-deployments`
- **Strategies**: fork a system strategy, edit its tagline and compose which report sections it includes, compile it (BattleGrid-side dry run showing blast radius), review it, apply it; archive and restore; browse the signal library (`/strategies/signals`) — all 82 signals a rule can reference, each with the platform's own authoring card (what it detects, when it fires, examples, parameters with bounds and defaults); browse the metric index (`/strategies/metrics`) — 75 metrics across ten families with per-transform formulas — and check any composed column against the platform's contract, where a refusal renders as the platform's own lesson (offending path, received value, legal domain); **retune any signal rule the strategy carries** (allocation, Required, declared params) through the full describe→confirm→perform ceremony, the token digest-bound to the exact values at the revision read (live-proven 2026-08-01: allocation 0→1 on a zero-bound fork, r1→r2 read back); **preview what an agent reads** (`/strategies/[id]/preview`) — the report rendered live over a bounded coin selection with token estimate, budget gauges, and which of the 82 signals the composition can feed, all without saving anything
- **Arena** (`/arena`): watch every Market Grid session — schedule, coin pool, player count, and whether this account has entered (read from `check_market_grid_submission` alone; the player-grid tool 500s for "not played" and is never called). Playing stakes a real entry fee and is deliberately not offered yet
- **Trading record** (`/agents/[id]/trades`): every trade an agent closed — net P&L, both fees, slippage each side, leverage, the conviction it opened on, why and by whom it closed, how long it was held — with a summary *derived from those trades* and labelled as such, because BattleGrid's own performance figures read zero for accounts with real losses
- **Decision pipeline** (`/agents/[id]/pipeline`): why an agent did or didn't trade, at each of the three places a candidate can end — stopped before evaluation (the platform's reason code *and* its numbers: `INSUFFICIENT_EQUITY` with `{equityUsd: 2.18, thresholdUsd: 10}`), evaluated and skipped (aggregate score against the threshold **in force at the time**, dominant bias, whether signals disagreed), or decided, carrying the agent's own reasoning paragraph whole **and the per-signal checklist behind it** — each signal named, with the platform's verdict (`CONFIRM` / `WARN` / `REJECT`, three states kept as three) and its written interpretation, plus what the agent would have staked and the exchange order ids it placed. Each stage is independently empty-or-unreadable, so one stage failing hides neither of the other two. Framed by **the funnel** (how much it evaluated against how much it acted on), and each evaluation opens to **its full scorecard** (`/agents/[id]/pipeline/[logId]`): every signal consulted with the platform's sentence and raw readings, the score attribution, the whole chain — and **what the decision cost to think** (model, price, duration), which BattleGrid nulls on public reads and this product shows for agents you own. Each evaluation also carries a **what-if**: change any fired signal's weighting and see what the candidate would have scored and whether it would cross the gate — seeded from the real weightings, so the unchanged form reproduces the evaluation's own score, and always labelled as not having happened
- **The field** (`/explorer`): the population this account competes against — its totals (37 agents, 31% win rate, **−$162.07 net**: the field as a whole loses money), the ranked agent resumes with the platform's own subtitle and objective, a per-model-vendor breakdown of who is actually profiting, and where this account stands from both tools (rank 7 by profit / 97th percentile, and its own agents' places in the field). Three platform behaviours it is built around: the returned list can be shorter than the field it reports and no limit widens it (**intermittently** — 5 of 37 four runs running, then 37 of 37 an hour later), so both counts are always stated; an absent win rate is shown as not measured rather than 0%; and every rate is printed beside its trade count, because sorting by win rate promotes the smallest sample
- **A competitor's record** (`/explorer/[agentId]`, opened from any field row): what one public agent looks at versus what it acts on — the funnel from evaluations through decisions to executions (`Market Predator`: 245 → 102 → 73 entered → 51 executed, fill rate 76%, 23W/28L, +$50.06), its closed trades with the platform's own win verdict, its evaluations against the threshold in force, and what it holds now. Two counters the platform names alike are kept apart (`skipCount` = SKIP decisions, `skippedCount` = SKIPPED terminal status), and open-position *rows* are carried but not interpreted — no agent in the field has ever held one, so the shape is unobserved and not guessed (`open-position-rows-are-unobserved`)
- **One evaluation's scorecard** (`/explorer/[agentId]/evaluations/[logId]`): every signal a competitor consulted on one candidate — **72 of them**, across seventeen modules, the ~60 that did *not* fire included, each with its score, bias, primary/required flags, raw indicator values and the platform's own sentence ("RSI(14) at 38.1 — not oversold (threshold 30)"). Plus how the aggregate was attributed across the ones that fired, and the chain from gate → attempt → decision → execution → outcome, with stages the platform did not record omitted rather than shown empty. A listed evaluation that publishes no detail says so, distinctly from one that could not be read
- **Drive it from any model** (`docs/MCP_SERVER.md`): Grid-Commander runs as an MCP server over stdio, so Claude Desktop, Claude Code, or any MCP-speaking client — with whatever model the operator chooses — can ask it the questions the web surfaces answer. Twenty-five tools, all but one a read: the product's derived figures and its `unreadable`-vs-`empty` distinctions cross the boundary intact, and a failed read is never an MCP error, because a model told a tool failed will often say "you have no agents". **No writes**, enforced by a guard rather than a convention — the confirmation ceremony assumes a human reads the consequence, and a model is not one
- **Audit log**: every write made on the user's behalf, with actor, tool, and outcome

Added in the final three rounds (2026-08-06 → 08-07):

- **What keeps stopping it** (`/agents/[id]` now leads with this): the platform's gate blocks folded into standing reasons with the platform's own field names and units — `AGENT_APPROVAL_EXPIRED` 97×, `INSUFFICIENT_EQUITY` with `{equityUsd, thresholdUsd}` — so the first thing an operator reads is why nothing has been happening
- **What it holds** (on the agent page): open positions with entry/mark/P&L/ROE as the platform prices them, the exposure totals, what could not be placed, and drift since the decision (`SinceTheDecision`) — a snapshot that states when it was priced
- **Qualification** (`/agents/[id]/qualification`): the only prospective read — would this agent take these coins right now, and which gate stops it; coins from the request, its own deployments, or the platform's ranked list, with the source always stated
- **Conditions, end to end** (`/strategies/[id]/conditions` → `/save`): compose a condition in the platform's own grammar, have BattleGrid resolve it against live market state, then save it through describe→confirm→perform — the whole list is what is agreed to, dangling references are named first, and the write is live-proven (Tobruk fork, r1→r2→r3, 2026-08-06)
- **The section library** (`/strategies/sections`): every section template with its declared columns, and a column editor that validates a composed column against the platform's contract — including the v5 `bars` and `ordering` controls, read from the discovered schema
- **The ranked players** (`/explorer`): the leaderboard rows beside this account's standing, its own row marked by the platform's `userId` and nothing else
- **The brain's human name and the spend**: `GLM-5.2` instead of the flattened `CUSTOM`; the 24-hour spend on `/limits`, read from the list (the copy that answers), with no gauge because no read publishes the ceiling
- **A nameable fork**: the fork form takes an optional name, and a refused fork renders the platform's words instead of crashing — the operator's account has 22 strategies named `Dunkirk (fork)`, which is also the platform's duplicate-name 500 trigger

There is **no assistant**. It was removed in `3d54fab` (2026-07-29, merged via PR #5): the product is MCP-control only, and the application's single outbound host is `mcp.battlegrid.trade`. Earlier versions of this file described a read-only assistant — that description outlived the code.

**Proven live**: an agent was created, renamed, had its limits updated, archived, and reactivated (reactivate proven 2026-07-31 on a throwaway: ARCHIVED→ACTIVE→ARCHIVED through the guarded path). A strategy was forked, compiled, archived, restored, and — 2026-08-01 — APPLIED: the full fork→compile→apply pipeline ran live (the first apply found and fixed the sixth dead write path: toApplyPlan omitted expectedRevision/conditions/conditionVerdicts, and the conformance pass-through exemption that hid it is deleted). Every write the product offers is now live-proven. The agent's thought log and budget gauges were read. A radar deployment was replaced-in-place through the deploy flow (HYPE r1→r2, describe→confirm→perform). All against a real BattleGrid account. Key-gated live probes live in `tests/live/` (`BATTLEGRID_API_KEY=… npx vitest run tests/live/`).

---

## What Was Fixed on the Way Here (Key Findings)

These were bugs that existed in the application that sessions discovered and fixed through live probing. Worth knowing for anyone continuing:

1. **MCP envelope bug** — `tools/call` wraps every BattleGrid response. Both adapters were passing the envelope through instead of unwrapping it. The product showed "no agents" and "nothing listed" on accounts with live data.
2. **`apply_strategy_plan` refused every request** — `refuseLocally` compared a BattleGrid account ID against the local user ID (which is `'owner'` or a random token, never a BattleGrid ID). Applying a plan was structurally impossible since the feature was written.
3. **Budget gauges** — `remaining: 0` on an unconfigured gauge means "no cap", not "at the limit". `fill` is an amount consumed, not a fraction. Displaying them naively misstates the truth exactly where being wrong costs money.
4. **Agent create** — `brain.kind` was `'preset'` where the schema pins `const: "PRESET"`; `sizingStrategy` used a catalog key that doesn't exist so the fallback fired every time.
5. **Agent update** — the read returns 23 `tradingConfig` keys; the write accepts 20 with `additionalProperties: false`. Sending all 23 back fails every time.
6. **`apply_strategy_plan` could never succeed (again)** — `toApplyPlan` omitted three fields the live schema requires; the conformance guard's pass-through exemption for `request.plan` is exactly where it hid. Found by the first live apply (2026-08-01), fixed, and the exemption deleted.
7. **The preview surface refused every strategy holding a custom table** — the platform returns a saved custom section whole (title, timeframe, columns) but `StrategySection` carried only kind and key, and `preview_strategy_report` rejects a custom section given by key alone while accepting a platform section that way. Found hours after shipping, by building a real table on a real strategy (2026-08-02).

8. **The pipeline page threw away its best data on the day it shipped** — `list_entry_decisions` returns 35 fields per row and `mapEntryDecision` kept 11. Dropped among them was `signalChecklist`: eight per-signal verdicts with written interpretations, already on the wire. Found hours later by reading a raw payload instead of a type (2026-08-02 → fixed in `the-decision-shows-its-work`). The near-miss is instructive too — the obvious fix was to add a `get_entry_decision` detail fetch, and that tool returns the same 35 keys the list row already sends.

9. **Our own agents were less legible than strangers'** — `list_signal_logs` returns 23 keys per row and `get_signal_log` returns 31; the product read the 23 and never called the detail. So `/explorer` explained a competitor's evaluation (72 consulted signals, attribution, the full chain) while `/agents/[id]/pipeline` showed a verdict for the ones that fired. Found by diffing the two key sets after the public surface shipped (2026-08-03 → fixed in `your-own-agent-is-as-legible`, which also surfaced `ownerView`: what each decision cost to think).

**The pattern in all nine**: none was findable by reading code or schemas.
Each needed a real call to the real platform — and the eighth needed
looking at what came *back* from a call the product was already making.
That is why every capability here ships with a key-gated probe in
`tests/live/`, and why a new adapter should print the raw payload's key
count next to the mapper's. **Two of the nine were the same mistake twice**
— 35-vs-11 on entry decisions, 23-vs-31 on signal logs — so when a list
tool and a detail tool exist for the same entity, diff their key sets
before assuming the list row is enough.

---

## What Is NOT Done / Known Hard Limits

| Item | Type | Notes |
|---|---|---|
| `image-never-built` | P1 debt | No Docker daemon in sessions; image build never proven |

Resolved since this table was first written: `rebind-is-not-bound-to-the-revision-it-read` (closed 2026-07-31 — the confirmation binds agent+destination+revision, and the perform re-reads the destination), `confirmation-is-not-bound-to-values` (closed 2026-07-31 — every value-carrying flow binds a digest into the token's target; re-triage table in the item), `strategy-section-editor` (built and archived 2026-07-30, PR #7 — section checklist on the edit page), `assistant-unverified-against-live-api` (closed by the assistant's removal in `3d54fab`).

**Hard limits** (not bugs — these are constraints imposed by BattleGrid's API):

- Agent edit form only exposes rename and trading limits — the read and write schemas for `tradingConfig` differ (3 fields come back on read, are rejected on write with `additionalProperties: false`)
- Position-management preset is a label alongside 14 independent values, not a shorthand — the edit surface therefore offers the fourteen fields and says when the label and values disagree (shipped 2026-07-31)
- ~~A market's **first** radar deployment cannot be created over MCP~~ — **this limit lifted at v14.** `upsert_radar_deployment` documents `expectedRevision: null` as the first-deploy signal, proven live 2026-08-08 with four created deployments (XRP, AVAX, xyz_jpy, xyz_gold; radar filled to its 20/20 cap). The *product* still types `expectedRevision: number` and describes replacements only, so the act is in scope and not yet offered: `the-deploy-surface-cannot-create-first-deployments`
- Playing a Market Grid session stakes a real entry fee (10), so the submit tools stay unoffered until the full confirmation ceremony covers them; the arena is watch-only by decision
- **Custom report tables are created by definition, not by key** — the platform mints `custom:<uuid>`; inventing one is refused. Modifying means restating the table *with* the minted key. Full grammar in `docs/REPORT_TABLE_GRAMMAR.md`
- An archived strategy is listed by `list_strategies` but its detail answers `NOT_FOUND`

---

## P1 Backlog Items

| Item | What | Fix path |
|---|---|---|
| `image-never-built` | Docker image build never proven | Needs registry egress or a pre-seeded cache. Not resolvable in this environment — the daemon starts, the network policy denies Docker Hub's blob host. |
| `v15-trade-level-policy-is-declared-but-inert` | The stop bounds and R:R floor v15 moved onto the strategy are ignored by the compiler, with no working write path | **Upstream.** Retested against v16 on 2026-08-10 — still `"Strategy update contains no effective changes"` on all three strategies. A whole major version came and went, so this is not a half-shipped feature. |
| `the-surface-map-is-two-majors-stale` | Mis-titled and corrected in the item: the record is current. The real gap is that the probe records payload *shapes*, not values, so the authoring vocabulary's contents are in no committed artifact | Extend `tools/probe_mcp_surface.py` to record enum members and declared defaults, not just types. |

(`a-stop-inside-the-noise-looks-like-a-tight-stop` — the p1 this table carried
for four days — **closed 2026-08-10** by `a-number-alone-says-nothing`. Two of
its six rows turned out to be shipped already, one moved onto the strategy at
v15, and one asked for a read whose premise was wrong. What remains is carried
by GitHub #84 and #85.)

(`agent-create-composes-fields-v14-refuses` — v14 dropped two `tradingConfig`
fields the write paths still composed, breaking agent create wholesale — was
filed and closed the same session by `the-agent-write-follows-v14`.)

(`ci-startup-failure` — the old framing of the CI issue — was closed 2026-07-31 as superseded by `ci-creates-no-runs`.)

---

## Start Here — Where The Next Session Picks Up

Run `/board` first; it prints live counts. Then **run `./scripts/ci.sh` with a
key** — if `freshness` is red, BattleGrid has deployed and the map needs
re-probing before any other work is trustworthy.

### Everything proposed is built. Most of the backlog waits on other people.

All 132 changes are archived, including `the-model-can-propose-and-only-a-human-agrees`
(2026-08-06): a model can record an intent through the MCP server, and only a
human — at `/pending/<id>`, through the ordinary describe→confirm→perform
ceremony, against the account as it is *then* — can perform it.
`tests/architecture/proposals-are-inert.test.ts` holds that as a property.

**Four GitHub issues were opened on 2026-08-10** and are the sharpest thing to
pick up, because three of them are fully unblocked:

| | | |
|---|---|---|
| **#84** | The balance **is** readable — `get_account_state` publishes it and nothing calls it | Establish whether "play balance" is the perps wallet (one live read), then the exposure-vs-balance comparison is an ordinary `/propose` |
| **#85** | The stop-vs-noise comparison has no home — wrong subject since v15, inert where it lives, needs history | Blocked upstream; the cheapest opening is reading `minStopLossAtrMultiple` as the platform's own volatility-relative answer |
| **#86** | Five stale claims in the summary docs | **Closed by this session's refresh** |
| **#87** | Architecture guards prove their corpus, not their matcher | Unblocked. 16 guards, 77 negative assertions; audit each for whether anything fails when the matcher matches nothing |

The 31 open backlog items split cleanly:

- **Waiting on the operator**: `prove-token-lifetimes` and
  `oauth-path-may-be-dead-weight` (a human browser consent),
  `approval-expired-on-a-full-execution-agent` (funding three agents past the
  $10 equity threshold), `preset-custom-in-the-preset-branch-is-unestablished`
  (one create that takes an agent slot on an account with no readable cap),
  `approvals-have-no-write-side` (putting a real agent into
  `APPROVAL_REQUIRED` changes how a live account trades).
- **Waiting on BattleGrid**: `forking-a-name-that-exists-is-a-500` (report it —
  a duplicate name should refuse, not 500), `battlegrid-is-returning-internal-errors`
  (the standing outage record),
  `market-grid-payloads-that-only-fill-once-someone-plays` (nobody on the
  platform has ever entered a session this listing can see),
  `two-read-tools-do-not-answer` (`get_market_context`'s schema understates its
  precondition, third observation across two major versions).
- **Waiting on evidence**: `performance-and-allocation-are-unmodelled`
  (`get_agent_fund_allocation` all zeros on a budgeted, trading agent),
  `a-fork-cannot-say-which-revision-it-came-from`.
- **Genuinely buildable, none urgent**: the open-orders slice of
  `trading-telemetry-is-unread` (one discovery read on account 2 first),
  `the-button-primitive-has-no-tokens` (a `/surface` + `/design` pass),
  `the-payload-carries-more-than-is-read`'s four remaining fields,
  `market-grid-standings-need-a-gametype-not-a-second-mapper` (deferred until
  the arena wants the panel), and `image-never-built` (needs registry egress).

### Two things that will cost a session if rediscovered

**`FakeAgentsPort` records what a write bound its confirmation to and does not
check it.** `enforce()` is the guard and it lives in the adapter. So a test that
calls `update.execute`, sees `updated`, and concludes the binding works has
proven nothing — drive the store's own `consume` against the target the write
composed, the way `edit-binding.test.ts` does. Two drafts of
`two-edits-in-a-row.test.ts` passed vacuously this way.

**`docker` exists in these environments and cannot pull.** The daemon starts
clean; the network policy denies `production.cloudfront.docker.com`, where
Docker Hub serves layer blobs, so every build fails at the first `FROM`.
Manifests resolve (401), blobs 403. `image-never-built` needs registry egress or
a pre-seeded cache — not just a daemon. Do not spend the setup time again
without one.

### The lesson that keeps recurring, now six times

**A check that matches how something is *spelled* rather than what it
*reaches* is the defect shape this codebase produces.** The read-only guard
matched a tool-name prefix; the live-writes guard matched tool names in test
source and missed a file that mutated through `ForkStrategyCommand`; a
rendering assertion searched text for a URL the harness never emitted;
`readOnlyHint: true` was served for every tool because every tool used to be a
read; the live-writes guard's *replacement* assumed one gate per file and
broke on the first probe that honestly needed two; and **the sixth was a guard
written against this very lesson** — `no-population-constants.test.ts` shipped
with a regex whose mandatory leading `[A-Za-z_$]` consumed the first letter of
its own alternation, so it matched nothing, ever, and passed green against a
constant planted in a rendered component.

Corollary, learned the same day: **when a rule and an honest new case
disagree, suspect the rule.** Every one of those was fixed by deriving from
reachability — the surface record's own classification, the composition root's
wiring, what a block actually calls — never by adding an exemption.

**And the distinction the sixth adds, which the first five did not:** a corpus
check proves the sweep read files. It proves *nothing* about whether the
pattern can match. Fifteen of the sixteen guards making negative assertions
already assert their corpus is non-empty, and that protection is real — but the
corpus here was 231 files and entirely healthy while the pattern was dead. The
only thing that proves a matcher works is feeding it a violation, which
`identifiers.test.ts` has done all along: *a guard nobody has seen fail is a
guard nobody knows works.* Audit filed as GitHub **#87**.

---

### Older context

**Phase 2 of the assistant roadmap — reporting and expected value — has
shipped both halves of the record.** Both started with a discovery read,
the way every capability this month began:

1. ~~`trading-telemetry-is-unread`~~ — **the outcomes slice shipped
   2026-08-03** (`/agents/[id]/trades`). The known risk proved real:
   `get_agent_performance` answers zeros on an agent that lost $9.64, so
   the record is derived from `list_trade_outcomes` and labelled as
   derived. What remains of the item is separate surfaces: open orders,
   order status, trade charts, position audit history.
2. ~~`entry-decisions-have-a-read-side`~~ — **the decision pipeline shipped
   2026-08-03** (`/agents/[id]/pipeline`). Three stages, read
   independently: gate blocks, signal evaluations, entry decisions. Live:
   "Flow State" scored ENA at 0.397 against a 0.55 threshold → SKIPPED.

3. ~~The decision's evidence~~ — **shipped 2026-08-03**
   (`the-decision-shows-its-work`). The pipeline page renders each
   decision's per-signal checklist. Found by reading the raw payload: the
   list row carries 35 fields and the mapper kept 11.

4. ~~`public-explorer-is-unmodelled`~~ — **the field shipped 2026-08-03**
   (`the-field-is-visible`, a tenth capability). Both entry points, and the
   denominator every other number in the product was missing.

5. ~~`public-agent-detail-is-unread`~~ — **the competitor page shipped
   2026-08-03** (`a-competitor-can-be-opened`). Four of the seven reads;
   every field row opens. The declaration's contradiction was settled by
   calling it, not reading it.

6. ~~`a-competitors-scorecard-is-unread`~~ — **the scorecard shipped
   2026-08-03** (`the-scorecard-is-legible`). 72 consulted signals per
   evaluation, the ~60 dismissed ones included, with attribution and the
   full gate→outcome chain.

7. ~~`our-own-agents-show-less-than-strangers`~~ — **closed 2026-08-03**
   (`your-own-agent-is-as-legible`). It was the mapper gap: 23 keys read of
   31 available. Now at parity *and past it* — an owned evaluation shows
   what it cost to think, which no public read carries.

8. ~~`the-what-if-calculator-is-unused`~~ — **shipped 2026-08-03**
   (`the-what-if-is-answerable`). The correctness check came back clean
   five for five, so the what-if lives on each evaluation, seeded from what
   really fired.

9. ~~`an-assistant-over-the-use-cases`~~ — **shipped 2026-08-03** as an MCP
   server (`grid-commander-is-an-mcp-server`), which is the form the
   operator chose and the one that needs no model of our own.

**Recommended next move:**

- **`the-assistant-cannot-be-trusted-with-a-write` (P2)** — the MCP server
  reads and cannot write, because the confirmation ceremony assumes a human
  reads the consequence and a model in that seat is not one. The item lays
  out the three ways that seat could be provided and rules one of them out.
  Deciding between "the model acts" and "the model drafts" is the
  operator's call and shapes the design.

Then, in rough order of value:

- What remains of `trading-telemetry-is-unread` (open orders, order status,
  trade charts, position audit history) — the last unread slice of an
  agent's own record.
- `market-grid-is-an-unmodelled-module` — the arena is watch-only, and
  `get_public_agent_game_history` (left open twice now) belongs with it.
- **`an-assistant-over-the-use-cases` (P2)** — the operator's original
  vision. Worth revisiting now: there are ~40 use-cases in `composition.ts`
  and the surfaces beneath them are far richer than when the item was
  filed. Still gated on the two decisions recorded in it (whose Anthropic
  key pays, and whether to prototype as an MCP server first).
- `open-position-rows-are-unobserved` — one call away whenever any agent in
  the field is holding something; the item has the recipe.

**Blocked on the operator, not on us**: `approvals-have-no-write-side` (the
accept/cancel writes). The read half exists and the tool contracts are
mapped, but `list_pending_approvals` has never returned a row — no agent on
this account, active or archived, has ever been `APPROVAL_REQUIRED` (9 are
`OFF`, 6 `FULL_EXECUTION`). Observing one means putting a real agent into
that mode, which changes how a live trading account behaves. The item says
exactly what is needed. Until then the mode selector warns that
Grid-Commander cannot answer what such an agent proposes.

**The vision item**, when you want it: `an-assistant-over-the-use-cases`
(P2) — conversational control over the ~30 use-cases in `composition.ts`.
Two decisions gate it, both recorded in the item: whose Anthropic key pays
for conversations, and whether to prototype by exposing Grid-Commander as
an MCP server first (no second outbound host, no chat UI).

**Operator-side, not mine to close:**

- `image-never-built` (the only P1) — no Docker daemon in these sessions.
- `prove-token-lifetimes` — needs a human browser session.
- **The API key**: the operator confirmed on 2026-08-03 that key handling is
  theirs and the current key stays in use. Not a standing recommendation
  any more — do not re-raise it.

**Platform weather worth knowing**: 2026-08-01 brought three BattleGrid
outages, the last roughly ten hours with authenticated calls returning zero
bytes while the edge answered 401. Every surface renders that honestly as
unreadable-with-reason, and the live probes say so in their headers — a
`tools/call failed with 504` in a probe run is the platform, not a
regression.

---

## The Documentation Map

| Read this | For |
|---|---|
| `docs/FIRST_SESSION.md` | **The operator's first session** — boot, connect with a personal key, the reading tour, first writes |
| `README.md` | The product's front door — what it does, how to run it, the doc map |
| `docs/PIPELINE.md` | SKILLMOREL — the development pipeline itself (moved from the root README 2026-08-07) |
| `docs/MCP_SERVER.md` | Pointing a model at the product: setup, the tool list, and why it cannot write |
| `CLAUDE.md` | Project rules, pipeline commands, the three load-bearing domain facts |
| `HANDOFF.md` (this file) | Session-start state and what to do next |
| `openspec/JOURNAL.md` | What happened, newest first — the narrative record |
| `openspec/specs/<capability>/spec.md` | What the system does today (source of truth, archiver-written) |
| `docs/BATTLEGRID_MCP_REFERENCE.md` | The full 110-tool surface, regenerable via `tools/generate_mcp_reference.py` |
| `docs/BATTLEGRID_SURFACE_MAP.md` | Orientation over that surface |
| `docs/REPORT_TABLE_GRAMMAR.md` | **How report tables are authored** — column grammar, the two laws (unit commensurability, timeframe inertia), the create-by-definition/modify-by-key loop. Every claim live-established 2026-08-02 |
| `docs/BATTLEGRID_PRODUCT_MODEL.md` | The operator's description of what BattleGrid *is* |
| `docs/CI_WITHOUT_BILLING.md` | Why CI is local, and the option chosen |
| `docs/checklists/*_REVIEW_CHECKLIST.md` | Engineering standards every change is held to |
| `openspec/backlog/*.md` | Everything deferred, each with why and the first step when taken |

---

## Architecture Quick Reference

```
app/                     Next.js App Router pages and API routes
src/
  domain/                Pure domain types; no imports from outside domain/
  application/use-cases/ One file per command/query; imports ports only
  ports/                 Interfaces: BattleGridPort, AgentsPort, StrategiesPort, etc.
  infrastructure/        Drizzle repos, BattleGrid MCP adapters, crypto
  presentation/          Shared UI helpers, require-connection guard
src/composition.ts       Single composition root — the only place that wires infrastructure to ports
openspec/                Spec layer (behavior contract, journal, backlog, changes)
docs/checklists/              Review checklists (engineering standards)
tests/                   Vitest (unit + architecture) + Vitest DB (real PostgreSQL) + Python unittest (harness)
scripts/check.sh         All local gates in one script (replaces CI while Actions is blocked)
```

**Three facts that shape every decision** (from `CLAUDE.md`):
1. `mcp:read` is write-capable — 11 tools mutate on read scope alone, 6 flagged destructive
2. The tool list goes stale after a BattleGrid deployment — rediscover at runtime, never hard-code
3. This product holds credentials that configure other people's agents — read-only by default, explicit step-up, audit every write

---

## Running the Project

```bash
# Prerequisites: Node 20+, PostgreSQL 16
npm install
cp .env.example .env  # fill in DATABASE_URL and encryption secrets

# Database
npx drizzle-kit generate
npx drizzle-kit migrate

# The whole CI, locally (the verification story — see docs/CI_WITHOUT_BILLING.md)
DATABASE_URL=… ./scripts/ci.sh          # add CI_SERVING=1 for the serving probe

# Just the python harness + spec validation
./scripts/check.sh

# Dev server
npm run dev

# Build
npm run build && npm run start
```

PostgreSQL stops on its own in ephemeral containers — restart with: `pg_ctlcluster 16 main start`

To probe BattleGrid live after connecting an account: `./scripts/check-serving.sh` runs the served-application verification.

**Use `next dev`, not `next dev --turbopack`.** Turbopack (Next 15.1) cannot
resolve this repo's `.js`→`.ts` specifiers through the `@/` alias and offers
no `extensionAlias` equivalent to teach it; webpack is the supported path
for dev and build alike. Proven and recorded in `next.config.ts`.

### The live probes

Twenty-six key-gated probe files in `tests/live/` — each proves one capability
against the real platform and skips silently without a key. The table below
names the load-bearing ones; `all-controllers-probe` walks **every** read
controller against one account and asserts the row count, so a silently
skipped controller fails:

```bash
BATTLEGRID_API_KEY=bg_live_… npm run test:live   # serial on purpose — the platform rate-limits
```

| Probe | Proves |
|---|---|
| `write-probe` | agent create / rename / limits / archive / reactivate |
| `trading-record-probe` | real closed trades and the derived summary |
| `pipeline-probe` | the three decision stages, a real score-vs-threshold skip, and the per-signal evidence behind it |
| `field-probe` | the field, the per-vendor breakdown, and this account's rank in it |
| `competitor-probe` | opening the top agent in the field — funnel, trades, evaluations, holdings |
| `evaluation-probe` | a real scorecard: 72 signals consulted, the dismissed ones included |
| `own-evaluation-probe` | the same depth on an agent we own, plus what the thinking cost |
| `simulate-probe` | that the what-if calculator still reproduces the pipeline's own score |
| `mcp-server-probe` | the MCP server spawned as a subprocess and driven by a real client |
| `radar-probe` | deploy replacement (r1→r2) through describe→confirm→perform |
| `restore-probe` | archive → roster check → restore |
| `apply-probe` | fork → compile → **apply** (the widest blast radius write) |
| `retune-probe` | the scorecard write, digest-bound, on a zero-bound fork |
| `signal-vocabulary-probe` | the 82-signal library and one authoring card |
| `column-grammar-probe` | the metric index, a metric card, and a teaching refusal |
| `preview-probe` | the agent's-eye report with cost and budget gauges |
| `custom-table-probe` | **create and modify a custom table** end to end |
| `oauth-metadata` | the connect path's discovery documents |
| `all-controllers-probe` | every read controller, one account, 28 asserted rows |
| `condition-probe` / `condition-write-probe` | the condition layer: resolution, and the save walked fork→apply→remove→restore |
| `qualification-probe` | the prospective screen: gates, verdicts, and the coin-source fallback |
| `stoppages-probe` | gate blocks folded into standing reasons with the platform's own units |
| `exposure-probe` | open positions, totals, and the unplaced remainder |
| `proposal-probe` | a model's recorded intent performed only by a human |
| `surface-freshness` | the recorded surface version against the live server |

Several use the operator-authorized **slot shuffle**: the account sits at
its 25-active-strategy cap, so a probe parks an unbound PRIVATE strategy,
works on a throwaway fork, then archives the fork and restores what it
parked. Every one of them restores the account in a `finally`.

---

## Pipeline Commands

```
/board     — Everything at a glance (run this first every session)
/propose   — Start a new change
/verify    — Check if an implementation matches its change spec
/archive   — Merge a verified change into openspec/specs/ and archive
/handoff   — Close out a session and write the journal entry
/backlog   — View, file, or triage backlog items
```

The pipeline spec is in `.claude/` — skills, tools, references, commands.

---

## Design System

`openspec/design/system.json` is the token source. `tailwind.theme.json` is generated from it by `tools/generate-theme.mjs`. Both design tickets (DT-0001 global tokens, DT-0002 strategy editor) are implemented and closed. The design layer is clean.
