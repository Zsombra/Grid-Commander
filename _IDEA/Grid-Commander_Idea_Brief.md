# Grid Commander — Idea Brief

Greenfield foundation document. Feeds `/spec`, `/solutions`, and
`checklist-generator`. The technical map of the data source lives in
`_IDEA/battlegrid-mcp-architecture.md`; this brief is the product, business,
and scope layer over it.

## Assumptions (Phase 0 — stated, not asked)

You've described the concept in depth across the session, so rather than gate on
a questionnaire I've made the following calls. **Correct any and I'll revise —
none is load-bearing enough to block on.**

| Question | Assumption | Why |
|---|---|---|
| Who is it for | **You first** — a personal cockpit for your own BattleGrid account(s), built with clean tenancy seams so it *could* productize later | Matches "an application to fully work with this website" + a single live account; keeps MVP small without foreclosing a product |
| Revenue | **None initially.** Cost = your own LLM/infra spend | Personal tool; productization is a later, deliberate pivot |
| Timeline | **Exploring, built properly** — the full tiered plan, no artificial clock | You framed the trading features as "ideas," which reads as building to learn the platform |
| Tech | **Recommend** (Phase 3 lands on one, with reasoning) | You asked the process to decide, not me in a popup |

---

## 1. Concept Definition

```
PRODUCT: Grid Commander
ONE-LINER: A control cockpit for BattleGrid — observe the market and your
           trading agents, author and simulate strategies, and (eventually)
           run autonomous execution, all over BattleGrid's MCP control plane.
TARGET USER: You — a BattleGrid trader running Intelligence Agents who wants
           command, memory, and synthesis the raw tool API doesn't give.
PROBLEM: BattleGrid exposes 110 MCP tools but no cockpit. Reading them one call
           at a time in a chat window has no memory, no cross-tool synthesis,
           no dashboards, and no safety rail around the 16 that move real money.
VALUE PROPOSITION: Turn a raw tool surface into a cockpit — regimes and
           performance at a glance, strategies you can simulate before risking
           anything, and a hard, auditable boundary around real-money actions.
```

### 1.2 Market Context

```
COMPETITORS / ALTERNATIVES:
- BattleGrid's own web app — plays the game and manages agents, but it is the
  vendor's surface; no custom analytics, no cross-agent synthesis, no strategy
  R&D workflow of our own.
- Claude chat + the MCP connector — works for one-off questions, but stateless:
  no persistence, no dashboards, no backtest memory, no safety envelope.
- DIY: calling tools by hand / scripts — what we do today; no memory or cockpit.

DIFFERENTIATION: A persistent, synthesis-first cockpit with a real strategy
  simulation loop and a structural money-safety boundary — none of which the
  vendor UI or a stateless chat provides.
```

### 1.3 Business Model

```
REVENUE MODEL: none initially (personal tool)
WHO PAYS: n/a — you run it for your own account
COST DRIVERS (as your own spend, not billing):
  - LLM inference: generate_agent_grid and agent auto-play are billed by
    BattleGrid; our own analysis LLM calls (if any) are separate
  - Infra: trivial at single-user scale — a small always-on process + a DB
PRODUCTIZATION PATH (deferred, not designed now): per-user OAuth to BattleGrid
  instead of a shared key, tenant isolation, usage-based or flat SaaS pricing.
  The MVP keeps tenancy seams clean so this stays open.
```

---

## 2. Feature Scoping

### 2.1 Feature list

```
FOUNDATION
1. MCP client — typed access to all 110 tools, read/wager scope split enforced
2. Config & secrets — API key from env, endpoint config, connection health

OBSERVE (read-only)
3. Regime Radar — regime, conviction, run-length, flips across the coin universe
4. Market & signal dashboard — context modules, MACD heatmap, top-ranked, previews
5. Performance tracker — P&L, win rate, signal performance, trade charts, drawdown
6. Competitor intelligence — mine public agents' signals, coins, win rates

AUTHOR & SIMULATE (read + preview)
7. Strategy maker — compile → review → apply, over the platform's authoring tools
8. Agent maker — create/configure agents on approved LLMs + a strategy
9. Backtest / what-if — simulate_aggregate_score, signal previews, scheduler dry-runs

OPTIMIZE
10. Performance optimizer — read outcomes → propose rule changes → simulate → forward-test

EXECUTE (real money — mcp:wager)
11. Deployment cockpit — presets/radar policies, approve/deny entries, halt, close
12. Safety envelope — two-client split, confirmations, limit invariants, kill switch

CROSS-CUTTING
13. Local persistence — cache reads, keep history/journals the platform paginates away
14. Notifications/alerts — regime flips, pending approvals, drawdown breaches
```

### 2.2 MVP prioritization (RICE)

Reach here = "how often *I* need it." Score = (R×I×C)/E.

| Feature | Reach | Impact | Conf | Effort | Priority |
|---|---|---|---|---|---|
| 1. MCP client (read) | H | H | H | M | **MVP** |
| 2. Config & secrets | H | H | H | L | **MVP** |
| 3. Regime Radar | H | H | H | L | **MVP** |
| 5. Performance tracker | H | H | H | M | **MVP** |
| 13. Local persistence | H | M | M | M | **MVP** (thin) |
| 4. Market/signal dashboard | H | M | H | M | V2 |
| 6. Competitor intelligence | M | M | H | M | V2 |
| 9. Backtest / what-if | M | H | M | H | V2 |
| 7. Strategy maker | M | H | M | H | V2 |
| 8. Agent maker | M | M | M | M | V2 |
| 10. Performance optimizer | M | H | L | H | Future |
| 11. Deployment cockpit (wager) | M | H | M | H | Future |
| 12. Safety envelope | H | H | M | M | **gate on 11** |
| 14. Notifications | M | M | M | M | Future |

### 2.3 MVP definition

**DECISIONS (resolved with the user):** headless-first (no UI until a later
Tier-1 surface); the first product on top of the client is **agent creation +
strategy creation**, not the read dashboards. Both are `mcp:read`-scoped, so
they mutate the account (slots, credits, persistent agents) but move **no
money** — they live in the **manage** tier, below the wager boundary.

This means the two-client (read | wager) model from the architecture review is
refined into **three capability tiers** — observe / manage / wager — and the
client (Tier 0) must expose `manage` so agent/strategy creation can ride on it,
while `wager` stays walled off.

```
MVP SCOPE (revised):
- Typed MCP client with the three-tier capability boundary (observe + manage
  exposed; the 16 wager tools not reachable without an explicit wager client)
- Config & connection health (key from env, endpoint, a "connected as X" check)
- Agent creation — create/update/configure Intelligence Agents: pick an
  approved LLM model, bind a strategy, set budget/behavior characteristics
- Strategy creation — author a strategy via the platform's compile → review →
  apply flow (and fork/adapt existing ones)
- Thin local persistence — cache reads, keep history the API paginates away

MVP EXIT CRITERIA: "Headless, I can create and configure a trading agent end to
  end — model, strategy, budget — and author or fork a strategy through
  compile→apply, all against my live account, with no code path able to place a
  wager."

DEFERRED FROM MVP (were the earlier recommendation): Regime Radar, performance
  tracker, market dashboard — still valuable Tier-1 read products, now sequenced
  after agent/strategy creation.

EXPLICITLY DEFERRED:
- Every mcp:wager tool — deferred until Tiers 0–3 are solid AND the safety
  envelope (feature 12) is built. This is the single most important deferral.
- Strategy/agent authoring — high value, but larger; V2 once the client and
  read products prove the shapes.
- Backtest engine — V2; depends on a solid client and understood data shapes.
- Multi-user / billing — not designed now; seams kept clean, nothing built.
```

---

## 3. Technical Foundation

### 3.1 Technical requirements

```
- [x] AI Integration — BattleGrid's MCP is the core integration (110 tools)
- [x] Real-time — tools.listChanged; regimes/positions poll or stream
- [x] Database — cache reads, retain history the platform paginates away (thin)
- [x] Background Jobs — polling regimes/positions; later, watching deployments
- [x] Rate Limiting — respect platform caps (10 wagers/day, $500/day) as invariants
- [x] Secrets management — a real-money Bearer key, env-only, never in repo
- [ ] Auth (own) — NONE for MVP: static key, single user. (OAuth = productization)
- [ ] Payments — none
- [ ] Embeddable widget — none
- [x] Admin/cockpit UI — eventually; MVP may start headless/CLI, UI as a Tier-1+ surface
```

### 3.2 Tech stack recommendation — **TypeScript**

The process, not a popup, lands here — and it lands on TypeScript on the merits:

```
RECOMMENDED TECH STACK:
- Language: TypeScript — the MCP SDK's reference implementation is TS; BattleGrid
  is itself a TS/Next.js platform so payload shapes line up; and the eventual
  cockpit is a web UI that can share these exact types end-to-end.
- MCP client: @modelcontextprotocol/sdk (official) over streamable-HTTP
- Runtime: Node ≥ 20 (matches the harness's own tooling and BattleGrid's)
- Auth: static Bearer key from env — NO OAuth/DCR in our client (that flow is
  only what claude.ai's connector needed; settled during the auth investigation)
- Persistence: SQLite (better-sqlite3) for MVP — zero-ops, single-user, upgradeable
  to Postgres if productization ever happens
- UI (Tier 1+): Next.js — same language, same types, natural home for dashboards
- Package manager: pnpm (matches the harness conventions)

ARCHITECTURE PATTERN: Clean-ish Ports & Adapters, deliberately light —
  because the one architectural fact that matters is the read/wager boundary,
  and Ports/Adapters lets us make it a structural seam (a read port that cannot
  express a wager call) without a heavyweight DDD build the project doesn't need.
```

The Python counter-case (backtest/regime numerics) is real but weak here: the
platform computes regimes and aggregate scores **server-side**
(`get_regime_snapshot`, `simulate_aggregate_score`), so we orchestrate rather
than crunch — and a Python client plus a TS cockpit would make this a
two-language project. Full comparison in `/solutions` (run this session).

### 3.3 Proposed folder structure

```
grid-commander/
├── packages/
│   └── battlegrid-mcp/          # Tier 0 — the typed client (first change)
│       ├── src/
│       │   ├── transport.ts     # SDK connect, Bearer from env, session
│       │   ├── scopes.ts        # the 16 wager tool names — THE boundary
│       │   ├── read-client.ts   # 94 read tools, typed
│       │   ├── wager-client.ts  # 16 tools, factory-gated (later)
│       │   └── generated/       # from live tools/list; regenerated, not edited
│       └── scripts/gen-tools.ts
├── apps/
│   └── cockpit/                 # Tier 1+ — Next.js UI (later)
├── openspec/                    # the spec layer (already here)
├── docs/reference/battlegrid-mcp-tools.json   # the 110-tool inventory
└── .env                         # BG_API_KEY — git-ignored
```

---

## 4. Risks & Unknowns

### 4.1 Technical risks

| Risk | P | I | Mitigation |
|---|---|---|---|
| A wager tool called by accident → real loss | M | **H** | Two-client split; wager tools absent from the read type; runtime allow-list fails closed; every wager call a spec-level behavior |
| Tool surface drifts on BattleGrid deploys (server warned us) | H | M | Runtime allow-list is the safety truth; `gen:tools` regenerates types; unknown tool → rejected, not silently callable |
| Platform limits hit mid-operation (10 wagers/$500 day) | M | M | Read limits from get_account_state/get_agent_budget; treat as invariants, surface before acting |
| API key leak (it moves real money) | L | **H** | Env-only, git-ignored, rotate on exposure (already done once this session) |
| MCP session/streaming quirks under load | M | L | Lean on the official SDK; health check on connect |

### 4.2 Business risks

| Risk | P | I | Mitigation |
|---|---|---|---|
| BattleGrid changes/removes tools we depend on | M | M | Depend on read ports, not raw calls; regen catches surface changes early |
| Building features the vendor ships natively | M | L | Focus on synthesis/memory/safety the vendor UI lacks, not parity |

### 4.3 Open questions

```
1. [RESOLVED] Headless-first. No UI until a later Tier-1 surface.
2. [RESOLVED] First product = agent creation + strategy creation (manage tier),
   not the read dashboards. Those follow.
3. How much history to persist locally, and when to prune? — affects the DB;
   less urgent now that the first product is authoring, not analytics.
4. [NEW] Exact agent + strategy "characteristics" to expose — the full config
   surface (models, strategy binding, budget, behavior, signal rules). This is
   the /spec conversation for the agent-strategy-creation change.
```

---

## Handoff

- `/spec` — write user stories + behavior for the MVP read features (Regime
  Radar, performance tracker) when ready.
- `/solutions` — done this session: TypeScript, typed facade + runtime scope
  gate, migration complexity 2/10. This brief adopts its recommendation.
- `checklist-generator` — takes TypeScript + Ports/Adapters to generate the
  `docs/specs/` review checklists, which unblocks the `full` track needed for
  any wager work.

**IDEA BRIEF COMPLETE ✓**
