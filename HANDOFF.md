# Grid-Commander — Session Handoff

**Date**: 2026-08-03  
**State**: green (1049 vitest + 62 db + 221 harness tests, all nine `./scripts/ci.sh` gates; 20 further vitest are key-gated live probes). No active changes. 19 open backlog items. PRs #8–#33 merged. The report-table grammar is mapped end to end in `docs/REPORT_TABLE_GRAMMAR.md` (live, 2026-08-02). The assistant roadmap (`an-assistant-over-the-use-cases`) is filed; **Phase 1 (strategy-maker) is complete** — signal vocabulary, metric/column workbench, the signal-rule write (live-proven), and the agent's-eye preview. **Phase 2 reads both halves of the record**: what an agent did with the money (`/agents/[id]/trades`) and why it did or didn't trade (`/agents/[id]/pipeline`).

---

## What This Project Is

Grid-Commander is a **multi-tenant web workbench** for building, tuning, and understanding BattleGrid trading agents over BattleGrid's MCP server (`https://mcp.battlegrid.trade/mcp`). It is a TypeScript / Next.js / PostgreSQL application using Clean Architecture — the domain never imports the MCP client; BattleGrid sits behind a port.

The idea brief is at `_IDEA/Grid-Commander_Idea_Brief.md`. The MVP feature spec is at `_PM/Grid-Commander-MVP_Feature_Specification.md`.

---

## Current State of `main`

All development branches have been merged. `main` is the single source of truth.

| Metric | Value |
|---|---|
| Capabilities (archived) | 9 |
| Changes (archived) | 76 |
| Vitest tests | 1049 (+20 key-gated live) + 62 db |
| Harness tests (Python) | 221 |
| Active changes | 0 |
| Open backlog items | 19 |
| Design tickets open | 0 |
| Open draft PRs | 0 (see PR list; #8–#33 merged) |

---

## Nine Capabilities

| Capability | What it covers |
|---|---|
| `market-grid` | The Market Grid arena, watched — sessions, schedules, entered state (reads only) |
| `agent-deployment` | Deploy/undeploy an agent's radar presence (guarded writes) |
| `spec-validation` | Automated spec layer validation in CI |
| `harness-integrity` | The `openspec.py` tooling itself (124 tests) |
| `battlegrid-connection` | OAuth + DCR + PKCE account connect/disconnect; audit; credential encryption |
| `agent-authoring` | Roster, create, rename, rebind, archive, reactivate, budget gauges |
| `agent-understanding` | Agent journal (thought log), budget limits, account-level capacity, **the trading record**, **the decision pipeline** |
| `strategy-authoring` | Fork, compile, review, apply; archive, restore |
| `app-access` | Multi-tenant session, route protection, OAuth callback, build gate |

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
- **Decision pipeline** (`/agents/[id]/pipeline`): why an agent did or didn't trade, at each of the three places a candidate can end — stopped before evaluation (the platform's reason code *and* its numbers: `INSUFFICIENT_EQUITY` with `{equityUsd: 2.18, thresholdUsd: 10}`), evaluated and skipped (aggregate score against the threshold **in force at the time**, dominant bias, whether signals disagreed), or decided, carrying the agent's own reasoning paragraph whole. Each stage is independently empty-or-unreadable, so one stage failing hides neither of the other two
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

**The pattern in all seven**: none was findable by reading code or schemas.
Each needed a real call to the real platform. That is why every capability
here ships with a key-gated probe in `tests/live/`.

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

**Recommended next move — pick one:**

- **The accept/cancel writes** (`accept_entry_decision`,
  `cancel_entry_decision`) — the read half now exists, so the human-in-the-
  loop is one change from complete. Both are `mcp:wager`, one destructive:
  full track, confirmation digest-bound to the decision and its price
  levels. `list_pending_approvals` answers `{approvals: []}` on this
  account, so **observe a real pending approval before modelling the row** —
  every one of the seven dead paths came from trusting a declaration.
- **`public-explorer-is-unmodelled`** — the Explorer the operator named:
  other people's agents and how they perform, which is where expected value
  gets a comparison class.
- What remains of `trading-telemetry-is-unread` (open orders, order status,
  trade charts, position audit history).

**The vision item**, when you want it: `an-assistant-over-the-use-cases`
(P2) — conversational control over the ~30 use-cases in `composition.ts`.
Two decisions gate it, both recorded in the item: whose Anthropic key pays
for conversations, and whether to prototype by exposing Grid-Commander as
an MCP server first (no second outbound host, no chat UI).

**Operator-side, not mine to close:**

- `image-never-built` (the only P1) — no Docker daemon in these sessions.
- `prove-token-lifetimes` — needs a human browser session.
- **The API key is unrotated.** Every write path is now live-proven and the
  table campaign is finished, so the reason for deferring it is gone.
  Rotating it is the recommended next operator action.

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

Twelve key-gated probes in `tests/live/` — each proves one capability
against the real platform and skips silently without a key:

```bash
BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/
```

| Probe | Proves |
|---|---|
| `write-probe` | agent create / rename / limits / archive / reactivate |
| `trading-record-probe` | real closed trades and the derived summary |
| `pipeline-probe` | the three decision stages, and a real score-vs-threshold skip |
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
