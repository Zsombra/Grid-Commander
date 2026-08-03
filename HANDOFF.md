# Grid-Commander — Session Handoff

**Date**: 2026-08-03  
**State**: green (1164 vitest + 62 db + 221 harness tests, all nine `./scripts/ci.sh` gates; 25 further vitest are key-gated live probes). No active changes. 20 open backlog items. PRs #8–#39 merged. The report-table grammar is mapped end to end in `docs/REPORT_TABLE_GRAMMAR.md` (live, 2026-08-02). The assistant roadmap (`an-assistant-over-the-use-cases`) is filed; **Phase 1 (strategy-maker) is complete** — signal vocabulary, metric/column workbench, the signal-rule write (live-proven), and the agent's-eye preview. **Phase 2 reads both halves of the record**: what an agent did with the money (`/agents/[id]/trades`) and why it did or didn't trade (`/agents/[id]/pipeline`).

---

## What This Project Is

Grid-Commander is a **multi-tenant web workbench** for building, tuning, and understanding BattleGrid trading agents over BattleGrid's MCP server (`https://mcp.battlegrid.trade/mcp`). It is a TypeScript / Next.js / PostgreSQL application using Clean Architecture — the domain never imports the MCP client; BattleGrid sits behind a port.

The idea brief is at `_IDEA/Grid-Commander_Idea_Brief.md`. The MVP feature spec is at `_PM/Grid-Commander-MVP_Feature_Specification.md`.

---

## Current State of `main`

All development branches have been merged. `main` is the single source of truth.

| Metric | Value |
|---|---|
| Capabilities (archived) | 10 |
| Changes (archived) | 82 |
| Vitest tests | 1164 (+25 key-gated live) + 62 db |
| Harness tests (Python) | 221 |
| Active changes | 0 |
| Open backlog items | 20 |
| Design tickets open | 0 |
| Open draft PRs | 0 (see PR list; #8–#39 merged) |

---

## Ten Capabilities

| Capability | What it covers |
|---|---|
| `market-grid` | The Market Grid arena, watched — sessions, schedules, entered state (reads only) |
| `agent-deployment` | Deploy/undeploy an agent's radar presence (guarded writes) |
| `spec-validation` | Automated spec layer validation in CI |
| `harness-integrity` | The `openspec.py` tooling itself (124 tests) |
| `battlegrid-connection` | OAuth + DCR + PKCE account connect/disconnect; audit; credential encryption |
| `agent-authoring` | Roster, create, rename, rebind, archive, reactivate, budget gauges |
| `agent-understanding` | Agent journal (thought log), budget limits, account-level capacity, **the trading record**, **the decision pipeline**, **one evaluation's full scorecard and what it cost** |
| `strategy-authoring` | Fork, compile, review, apply; archive, restore; **score a re-weighting before saving it** |
| `app-access` | Multi-tenant session, route protection, OAuth callback, build gate |
| `agent-comparison` | The public field — other people's agents, the leaderboard, where this account stands, one competitor's whole public record, and any one evaluation's full scorecard |

---

## What the App Can Do (as of `main`)

Against a real connected BattleGrid account a user can:

- **Connect** their account (OAuth/DCR/PKCE, no raw credential ever touches the browser)
- **Agents**: view roster, create, rename, update trading limits, edit position management (a preset with the platform's own values or fourteen custom fields, drift between label and values said plainly), rebind to a strategy, archive, reactivate
- **Agent understanding**: read the agent's thought log (reasoning, confidence, decision outcomes), view how close it is to each configured limit, see which limits have no cap set vs which are at risk, and see whether it is acting at all — each radar deployment's market, timeframe and standing, or a plain statement that it is configured but scanning nothing
- **Agent deployment**: deploy an agent onto a market that already carries a deployment (the replacement is named before agreement; timeframes come from the platform's runtime declaration) and undeploy it (the confirmation names what stops). A market's *first* deployment cannot be created — BattleGrid's API refuses every `expectedRevision` when no policy exists (`radar-first-deployment-not-creatable-over-mcp`), so that one act still lives on battlegrid.trade
- **Strategies**: fork a system strategy, edit its tagline and compose which report sections it includes, compile it (BattleGrid-side dry run showing blast radius), review it, apply it; archive and restore; browse the signal library (`/strategies/signals`) — all 82 signals a rule can reference, each with the platform's own authoring card (what it detects, when it fires, examples, parameters with bounds and defaults); browse the metric index (`/strategies/metrics`) — 75 metrics across ten families with per-transform formulas — and check any composed column against the platform's contract, where a refusal renders as the platform's own lesson (offending path, received value, legal domain); **retune any signal rule the strategy carries** (allocation, Required, declared params) through the full describe→confirm→perform ceremony, the token digest-bound to the exact values at the revision read (live-proven 2026-08-01: allocation 0→1 on a zero-bound fork, r1→r2 read back); **preview what an agent reads** (`/strategies/[id]/preview`) — the report rendered live over a bounded coin selection with token estimate, budget gauges, and which of the 82 signals the composition can feed, all without saving anything
- **Arena** (`/arena`): watch every Market Grid session — schedule, coin pool, player count, and whether this account has entered (read from `check_market_grid_submission` alone; the player-grid tool 500s for "not played" and is never called). Playing stakes a real entry fee and is deliberately not offered yet
- **Trading record** (`/agents/[id]/trades`): every trade an agent closed — net P&L, both fees, slippage each side, leverage, the conviction it opened on, why and by whom it closed, how long it was held — with a summary *derived from those trades* and labelled as such, because BattleGrid's own performance figures read zero for accounts with real losses
- **Decision pipeline** (`/agents/[id]/pipeline`): why an agent did or didn't trade, at each of the three places a candidate can end — stopped before evaluation (the platform's reason code *and* its numbers: `INSUFFICIENT_EQUITY` with `{equityUsd: 2.18, thresholdUsd: 10}`), evaluated and skipped (aggregate score against the threshold **in force at the time**, dominant bias, whether signals disagreed), or decided, carrying the agent's own reasoning paragraph whole **and the per-signal checklist behind it** — each signal named, with the platform's verdict (`CONFIRM` / `WARN` / `REJECT`, three states kept as three) and its written interpretation, plus what the agent would have staked and the exchange order ids it placed. Each stage is independently empty-or-unreadable, so one stage failing hides neither of the other two. Framed by **the funnel** (how much it evaluated against how much it acted on), and each evaluation opens to **its full scorecard** (`/agents/[id]/pipeline/[logId]`): every signal consulted with the platform's sentence and raw readings, the score attribution, the whole chain — and **what the decision cost to think** (model, price, duration), which BattleGrid nulls on public reads and this product shows for agents you own. Each evaluation also carries a **what-if**: change any fired signal's weighting and see what the candidate would have scored and whether it would cross the gate — seeded from the real weightings, so the unchanged form reproduces the evaluation's own score, and always labelled as not having happened
- **The field** (`/explorer`): the population this account competes against — its totals (37 agents, 31% win rate, **−$162.07 net**: the field as a whole loses money), the ranked agent resumes with the platform's own subtitle and objective, a per-model-vendor breakdown of who is actually profiting, and where this account stands from both tools (rank 7 by profit / 97th percentile, and its own agents' places in the field). Three platform behaviours it is built around: the returned list can be shorter than the field it reports and no limit widens it (**intermittently** — 5 of 37 four runs running, then 37 of 37 an hour later), so both counts are always stated; an absent win rate is shown as not measured rather than 0%; and every rate is printed beside its trade count, because sorting by win rate promotes the smallest sample
- **A competitor's record** (`/explorer/[agentId]`, opened from any field row): what one public agent looks at versus what it acts on — the funnel from evaluations through decisions to executions (`Market Predator`: 245 → 102 → 73 entered → 51 executed, fill rate 76%, 23W/28L, +$50.06), its closed trades with the platform's own win verdict, its evaluations against the threshold in force, and what it holds now. Two counters the platform names alike are kept apart (`skipCount` = SKIP decisions, `skippedCount` = SKIPPED terminal status), and open-position *rows* are carried but not interpreted — no agent in the field has ever held one, so the shape is unobserved and not guessed (`open-position-rows-are-unobserved`)
- **One evaluation's scorecard** (`/explorer/[agentId]/evaluations/[logId]`): every signal a competitor consulted on one candidate — **72 of them**, across seventeen modules, the ~60 that did *not* fire included, each with its score, bias, primary/required flags, raw indicator values and the platform's own sentence ("RSI(14) at 38.1 — not oversold (threshold 30)"). Plus how the aggregate was attributed across the ones that fired, and the chain from gate → attempt → decision → execution → outcome, with stages the platform did not record omitted rather than shown empty. A listed evaluation that publishes no detail says so, distinctly from one that could not be read
- **Audit log**: every write made on the user's behalf, with actor, tool, and outcome

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
- A market's **first** radar deployment cannot be created over MCP — every `expectedRevision` is refused when no policy exists (`radar-first-deployment-not-creatable-over-mcp`); that one act still happens on battlegrid.trade
- Playing a Market Grid session stakes a real entry fee (10), so the submit tools stay unoffered until the full confirmation ceremony covers them; the arena is watch-only by decision
- **Custom report tables are created by definition, not by key** — the platform mints `custom:<uuid>`; inventing one is refused. Modifying means restating the table *with* the minted key. Full grammar in `docs/REPORT_TABLE_GRAMMAR.md`
- An archived strategy is listed by `list_strategies` but its detail answers `NOT_FOUND`

---

## P1 Backlog Items

| Item | What | Fix path |
|---|---|---|
| `image-never-built` | Docker image build never proven | Needs a Docker daemon; not resolvable in this environment. |

(`ci-startup-failure` — the old framing of the CI issue — was closed 2026-07-31 as superseded by `ci-creates-no-runs`.)

---

## Start Here — Where The Next Session Picks Up

Run `/board` first; it prints live counts. Then:

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

**Recommended next move** — no single item stands out now that the
reporting and comparison arc is closed. In rough order of value:

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
| `CLAUDE.md` | Project rules, pipeline commands, the three load-bearing domain facts |
| `HANDOFF.md` (this file) | Session-start state and what to do next |
| `openspec/JOURNAL.md` | What happened, newest first — the narrative record |
| `openspec/specs/<capability>/spec.md` | What the system does today (source of truth, archiver-written) |
| `docs/BATTLEGRID_MCP_REFERENCE.md` | The full 110-tool surface, regenerable via `tools/generate_mcp_reference.py` |
| `docs/BATTLEGRID_SURFACE_MAP.md` | Orientation over that surface |
| `docs/REPORT_TABLE_GRAMMAR.md` | **How report tables are authored** — column grammar, the two laws (unit commensurability, timeframe inertia), the create-by-definition/modify-by-key loop. Every claim live-established 2026-08-02 |
| `docs/BATTLEGRID_PRODUCT_MODEL.md` | The operator's description of what BattleGrid *is* |
| `docs/CI_WITHOUT_BILLING.md` | Why CI is local, and the option chosen |
| `docs/specs/*_REVIEW_CHECKLIST.md` | Engineering standards every change is held to |
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
docs/specs/              Review checklists (engineering standards)
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

Seventeen key-gated probes in `tests/live/` — each proves one capability
against the real platform and skips silently without a key:

```bash
BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/
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
| `radar-probe` | deploy replacement (r1→r2) through describe→confirm→perform |
| `restore-probe` | archive → roster check → restore |
| `apply-probe` | fork → compile → **apply** (the widest blast radius write) |
| `retune-probe` | the scorecard write, digest-bound, on a zero-bound fork |
| `signal-vocabulary-probe` | the 82-signal library and one authoring card |
| `column-grammar-probe` | the metric index, a metric card, and a teaching refusal |
| `preview-probe` | the agent's-eye report with cost and budget gauges |
| `custom-table-probe` | **create and modify a custom table** end to end |
| `oauth-metadata` | the connect path's discovery documents |

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
