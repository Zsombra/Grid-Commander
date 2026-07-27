# Grid-Commander — Idea Brief

Created 2026-07-27. Feeds `/spec`, `/solutions`, and `checklist-generator`.

Grounded in a live survey of the BattleGrid MCP server — see
`docs/BATTLEGRID_MCP_REFERENCE.md` (110 tools), `docs/BATTLEGRID_SURFACE_MAP.md`,
and `docs/battlegrid-mcp-capabilities.json`.

---

## 1. Product Definition

```
PRODUCT:        Grid-Commander
ONE-LINER:      A web workbench for building, tuning, and understanding
                BattleGrid trading agents and the strategies that drive them.
TARGET USER:    BattleGrid players who want to build serious agents — people
                who have outgrown the in-app defaults and want to author
                strategies deliberately rather than pick a preset.
PROBLEM:        BattleGrid exposes a deep, well-designed configuration surface
                — 110 MCP tools, a revisioned strategy model, a compile →
                review → apply authoring pipeline — and the only ways to reach
                it are the first-party app or raw tool calls. There is no
                purpose-built surface for the work that actually decides
                whether an agent is any good: comparing strategy revisions,
                understanding why a signal fired, and iterating on a
                configuration with the consequences visible before you commit.
VALUE PROP:     Make agent and strategy authoring legible. Show what a change
                will do before it does it, keep the history of what you tried,
                and eventually close the loop by measuring whether it worked.
```

### Why now

The platform's own framing is *"the best agents weren't born great, they were
trained."* That is an iteration loop, and iteration loops need tooling: a place
to see the current state, change one thing, and observe the result. BattleGrid
ships the mechanism; Grid-Commander is the workbench around it.

---

## 2. Market Context

```
COMPETITORS / ALTERNATIVES:

- The BattleGrid web app itself — the incumbent, and a good one. It covers
  configuration well. Grid-Commander differentiates on depth of authoring and
  on cross-agent, cross-revision comparison, not on doing the same thing again.

- A generic MCP client (Claude Desktop, Cursor, any chat client with MCP) —
  already works today and is free. Fully general, and that is exactly its
  weakness: it has no memory of your strategy revisions, no diff view, no
  guard rails around the money line, and it will happily call a destructive
  tool because a sentence was ambiguous.

- DIY scripts against the MCP server — what a technical player does today.
  Works, and is unshareable, untested, and forgotten in a month.

- Broader algo-trading tooling (TradingView strategies, QuantConnect,
  Freqtrade) — mature, and aimed at a different substrate. None of them speak
  to BattleGrid's grid-drafting game or its agent model.

DIFFERENTIATION:
  1. It is BattleGrid-shaped. The compile → review → apply pipeline, the
     revision model, and the persona/personality split are load-bearing product
     concepts here, not generic CRUD.
  2. It is safe by construction. A generic client cannot distinguish
     "read-only" from "will rebind your agent"; Grid-Commander can, because the
     distinction is mapped and enforced.
  3. It remembers. Revisions, past configurations, and eventually measured
     outcomes accumulate into something a chat session cannot hold.
```

---

## 3. Business Model

> **Unresolved, and deliberately flagged.** The stated intent is *exploring, no
> deadline*, and no revenue model has been chosen. What follows is a structure
> to react to, not a decision. See Open Questions.

```
REVENUE MODEL:   Undecided. Freemium subscription is the most natural fit.
WHO PAYS:        The serious player — someone running multiple agents who wants
                 comparison, history, and eventually backtesting.
PRICING SIGNAL:  Free    — connect one account, author strategies, read-only
                           observability. The whole MVP.
                 Paid    — multi-agent comparison, retained history, the
                           assistant, and (later) backtesting and optimization.
                 The natural paywall sits at compute and retention, because
                 that is where real cost begins.

KEY COST DRIVERS:
  - LLM inference for the assistant. Dominant variable cost. Also note
    `generate_agent_grid` spends a *billed LLM call on BattleGrid's side* even
    though it wagers nothing — a "free" preview is not free.
  - Backtesting compute (deferred, but the eventual cost centre).
  - Storage for retained revisions, signal logs, and outcome history — cheap
    per user, unbounded over time.
  - Credential custody. Not a dollar cost; an operational and liability one,
    and the reason §6 leans on OAuth rather than stored keys.
```

---

## 4. Feature Scoping

### 4.1 Feature Brainstorm

```
 1. OAuth connect to BattleGrid       — authorize via DCR + PKCE, no pasted keys
 2. Scope management                  — request mcp:read; step up to mcp:wager
 3. Agent roster                      — list, status, health at a glance
 4. Agent creation                    — the five faces, bounds-validated
 5. Agent editing                     — revision-safe updates
 6. Strategy browser                  — SYSTEM catalog + owned private
 7. Strategy fork                     — the sanctioned path to a private variant
 8. Strategy authoring                — compile → review → apply, with a real diff
 9. Signal rule editing               — focused single-rule edits
10. Blast-radius display              — which bound agents a change reaches
11. Agent journals                    — thoughts, activity, decisions
12. Signal log explorer               — why it fired, what it saw
13. Grid preview                      — draft a grid without submitting
14. Assistant (read-only)             — conversational discovery over the map
15. Assistant (write-capable)         — proposes changes, human applies
16. Deployment policy editor          — scheduled autonomous play
17. Public agent comparison           — benchmark against other players
18. Backtesting                       — replay a strategy over history
19. Optimization                      — search the parameter space
20. Auth & accounts                   — Grid-Commander's own identity layer
21. Billing                           — subscription management
22. Audit log                         — every write this product made, per user
```

### 4.2 MVP Prioritization

| # | Feature | Reach | Impact | Conf | Effort | Priority |
|---|---------|:-----:|:------:|:----:|:------:|----------|
| 1 | OAuth connect | H | H | M | M | **MVP** |
| 2 | Scope management | H | H | M | M | **MVP** |
| 20 | Auth & accounts | H | H | H | M | **MVP** |
| 3 | Agent roster | H | H | H | L | **MVP** |
| 4 | Agent creation | H | H | H | M | **MVP** |
| 5 | Agent editing | H | H | H | M | **MVP** |
| 6 | Strategy browser | H | H | H | L | **MVP** |
| 7 | Strategy fork | H | M | H | L | **MVP** |
| 8 | Strategy authoring | H | H | M | H | **MVP** |
| 10 | Blast-radius display | H | H | H | L | **MVP** |
| 22 | Audit log | H | H | H | L | **MVP** |
| 11 | Agent journals | H | M | H | L | **MVP** |
| 14 | Assistant (read-only) | M | M | M | M | **MVP** |
| 9 | Signal rule editing | M | M | M | M | V2 |
| 12 | Signal log explorer | M | H | M | M | V2 |
| 13 | Grid preview | M | M | H | L | V2 |
| 15 | Assistant (write) | M | H | L | H | V2 |
| 17 | Public comparison | M | M | H | M | V2 |
| 16 | Deployment policies | L | H | M | H | V2 |
| 21 | Billing | L | M | H | M | V2 |
| 18 | Backtesting | M | H | L | H | Future |
| 19 | Optimization | L | H | L | H | Future |

### 4.3 MVP Definition

```
MVP SCOPE:
  - Sign up for Grid-Commander and connect a BattleGrid account by OAuth
  - Read-only by default; wager scope is a separate, explicit step-up
  - See your agents; create and edit them with server-validated bounds
  - Browse the strategy catalog; fork one to a private variant
  - Author a strategy through compile → review → apply, with the diff,
    the viability verdict, and the bound-agent blast radius shown before
    anything is applied
  - Read agent journals
  - Ask a read-only assistant questions about your setup
  - Every write Grid-Commander performs is recorded in an audit log

MVP EXIT CRITERIA:
  A user can connect their BattleGrid account without ever handling a raw
  credential, fork a system strategy, change it through the review pipeline
  while seeing exactly which agents the change will reach, bind an agent to
  it — and afterwards read back a complete record of every write made on
  their behalf.

EXPLICITLY DEFERRED:
  - Backtesting and optimization — the eventual point of the product, and
    the part with the most unknowns. Building it before the authoring loop
    exists would be optimizing something nobody can yet configure.
  - Write-capable assistant — an LLM holding tools that rebind agents needs
    the human-readable review surface to exist first. That surface is the MVP.
  - Deployment policies — grant autonomous wager authority. Not a first
    feature for a product still earning trust.
  - Billing — no revenue model chosen yet.
  - Signal log explorer — high value, but it observes a loop the MVP only
    just closes.
```

---

## 5. Technical Requirements

```
- [x] Authentication            Grid-Commander's own accounts
- [x] Authorization             OAuth client against BattleGrid; scope step-up
- [ ] Payments / Billing        deferred with the revenue model
- [x] Database                  relational — users, connections, revisions, audit
- [ ] File Storage              nothing to store yet
- [x] Real-time                 streaming assistant responses; light polling for
                                agent state. No push channel from BattleGrid was
                                found, so this is client-driven.
- [x] AI Integration            the assistant, over the mapped MCP surface
- [x] Background Jobs           token refresh, snapshot polling; later the
                                backtesting seam
- [ ] Email                     not needed for MVP
- [x] API                       internal only; no public API in MVP
- [ ] Embeddable Widget         n/a
- [ ] Admin Dashboard           deferred
- [x] Analytics / Metrics       product analytics, and cost attribution per user
                                because LLM spend is the variable cost
- [x] Rate Limiting             both directions — protect BattleGrid's limits
                                (10 wagers/day, $500/day) and our own LLM spend
- [x] Secrets management        OAuth tokens per user, encrypted at rest
- [x] Audit logging             a hard requirement, not a nice-to-have
```

### The dominant constraint

This is a **multi-tenant product holding credentials that configure other
people's trading agents.** The mapped scope model makes the risk concrete:

- 27 of 110 tools mutate state, but only 16 require `mcp:wager`.
- **11 tools mutate on `mcp:read` alone — 6 of them flagged destructive**,
  including `rebind_intelligence_agent`, which replaces an agent's entire
  configuration, and `apply_strategy_plan`, whose changes reach every bound
  agent immediately.

A credential a user thinks is "read-only" can rebuild their agents. Grid-Commander
must therefore treat `mcp:read` as **configuration authority**, present it that
way in the consent flow, and never rely on scope alone as a safety boundary.

---

## 6. Recommended Tech Stack

You asked for a recommendation rather than picking, with an eye on future-proofing.
**One stack: TypeScript end to end, with a deliberate seam reserved for Python.**

```
- Language:   TypeScript — the MVP is I/O-bound MCP orchestration and UI, not
              computation. One language across the MCP client, the server, and
              the interface means one set of types for tool schemas that are
              already JSON Schema.
- Framework:  Next.js (App Router) — server components for data-heavy config
              screens, server actions for the write path so credentials never
              reach the browser, and streaming for the assistant. It is also
              what BattleGrid itself is built on, so idioms and payload shapes
              translate.
- Database:   PostgreSQL — the domain is relational (users → connections →
              agents → strategy revisions → audit entries) and the audit log
              wants transactional integrity with the write it records.
- ORM:        Drizzle — SQL-first with real types, and migrations that read as
              intent. Light enough not to fight the schema.
- Auth:       Auth.js for Grid-Commander's own accounts; a hand-rolled OAuth
              client for BattleGrid, because DCR + PKCE + incremental scope is
              specific enough that a generic connector abstraction would hide
              the part that matters.
- Secrets:    Tokens encrypted at rest with envelope encryption; refresh handled
              server-side only.
- Hosting:    Vercel for the app, Neon for Postgres — the exploring-phase choice.
              Both have exits if this grows.
- AI:         Claude via the Anthropic SDK, with the BattleGrid MCP server
              attached as the tool surface. Read-only scope in MVP.
- Jobs:       Start with Vercel cron for token refresh and polling. The
              backtesting phase will outgrow this — see the seam below.

ARCHITECTURE PATTERN: Clean Architecture, lightly applied.

  The domain (agents, strategies, revisions, scopes) is genuinely richer than
  CRUD, and it is owned by someone else's server. Keeping a domain layer that
  does not import the MCP client — with BattleGrid behind a port — buys three
  things that matter here: the platform can change its tool list under us
  without the domain moving, the whole surface can be faked in tests without a
  live account, and the money line stays enforceable in one place instead of
  being scattered through UI handlers.

  Lightly applied: no ceremony for the sake of it. One adapter, one domain
  layer, no abstraction that exists only to satisfy the pattern.
```

### Why not Python now, and how it stays available

Your instinct toward Python is right *about the future*. Backtesting and
parameter optimization are genuinely better served by numpy/pandas/vectorbt
than by anything in the TS ecosystem, and that work is coming.

But it is coming **later** — it is the one thing explicitly deferred to Future —
and none of the MVP is computational. Introducing a second language, deployment
target, CI pipeline, and type boundary now would cost every day between now and
then, in exchange for a capability nothing in the MVP uses.

The future-proof move is not to build both. It is to **build one and leave a
clean seam**: MVP work is queued through a job interface, so the backtesting
phase adds a Python worker consuming that queue rather than a rewrite. The seam
is cheap now and load-bearing later.

If you want that trade examined properly rather than asserted, run `/solutions` —
comparing stacks is its job, not this document's.

---

## 7. Proposed Folder Structure

```
grid-commander/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # sign-in, OAuth callback
│   ├── (app)/
│   │   ├── agents/               # roster, create, edit
│   │   ├── strategies/           # browse, fork, author
│   │   ├── assistant/            # conversational surface
│   │   └── audit/                # what this product did on your behalf
│   └── api/
├── src/
│   ├── domain/                   # imports nothing outward
│   │   ├── agent/                # the five faces; revision rules
│   │   ├── strategy/             # compile → review → apply as a domain flow
│   │   ├── scope/                # the money line, in one place
│   │   └── audit/
│   ├── application/              # use cases; orchestrates domain + ports
│   ├── ports/                    # interfaces the domain depends on
│   │   ├── battlegrid.ts         # the platform, abstracted
│   │   └── jobs.ts               # ← the seam Python will consume later
│   └── infrastructure/
│       ├── battlegrid/           # MCP client, OAuth, token custody
│       ├── db/                   # Drizzle schema + migrations
│       ├── ai/                   # assistant
│       └── jobs/                 # cron now, queue later
├── docs/                         # the BattleGrid surface map lives here
├── tools/                        # generate_mcp_reference.py
└── openspec/                     # the spec layer
```

---

## 8. Risks & Unknowns

### 8.1 Technical Risks

| Risk | Prob | Impact | Mitigation |
|------|:----:|:------:|------------|
| A destructive tool is called on a user's agents by mistake | M | **H** | Route every mutation through one scope-aware layer; require explicit confirmation for the 6 destructive tools; audit-log every write |
| The MCP surface changes under us — the server says its list goes stale after a deployment | **H** | M | Rediscover capabilities at runtime, never ship a hard-coded tool list; `tools/generate_mcp_reference.py` already diffs the surface |
| The 5-minute strategy plan token expires mid-review | **H** | L | Treat expiry as a normal path, not an error; recompile transparently and re-present the diff |
| OAuth DCR behaves differently than advertised | M | **H** | Validate the whole flow against the live server before building on it — this is the first thing to prove |
| Token custody breach | L | **H** | Envelope encryption, server-side-only refresh, per-user revocation via the documented `/revoke` endpoint |
| Rate limits hit mid-session | M | M | Respect published caps; back off; surface remaining budget in the UI |
| LLM cost runs away | M | M | Per-user budgets and cost attribution from day one, not retrofitted |
| Optimistic-concurrency conflicts as users edit in two places | M | L | `expectedRevision` is already the platform's model — surface conflicts honestly rather than retrying blindly |

### 8.2 Business Risks

| Risk | Prob | Impact | Mitigation |
|------|:----:|:------:|------------|
| BattleGrid ships the same features first-party | **H** | **H** | Compete on depth and memory, not parity. Stay close enough to be complementary; a companion that the platform likes is safer than one it races. |
| The addressable market is small | M | **H** | Validate with real players before building the expensive parts. Nothing in the MVP is wasted if the answer is "few but keen". |
| Trust — asking players to connect an account that can move money | **H** | **H** | Read-only by default, wager scope as a deliberate step-up, visible audit log, honest consent copy. Trust is the product's foundation, not a feature. |
| Terms of service may restrict third-party clients | M | **H** | **Check before building.** Cheapest possible risk to retire. |
| No revenue model chosen | **H** | M | Fine while exploring; becomes urgent the moment costs are real |

### 8.3 Open Questions

```
1. Does BattleGrid permit third-party clients?  — gates the entire product.
   Ask before writing application code.
2. What is the revenue model?  — shapes billing, tenancy, and cost controls.
   Deferrable while exploring; not deferrable before launch.
3. Does DCR issue durable client credentials, and what is the token lifetime?
   — determines the whole connection model.
4. Can scope be stepped up incrementally without re-consenting everything?
   — decides whether read-only-by-default is pleasant or annoying.
5. Is there any push channel for agent state?  — none was found; if polling is
   the only option, it constrains how live the UI can feel.
6. What does BattleGrid charge for `generate_agent_grid`?  — a "preview" that
   costs money changes how freely the UI can offer it.
7. What historical data is reachable for backtesting?  — gates the Future
   phase entirely, and is worth answering early because it may change the
   architecture.
```

---

## Handoff

- `/spec` — take the MVP scope and write user stories and business logic
- `/solutions` — compare stack options properly if the recommendation above
  should be challenged rather than accepted
- `checklist-generator` — generate review checklists for Clean Architecture +
  TypeScript

**Before any of those**: retire open question 1. Everything else is
recoverable; that one is not.

**IDEA BRIEF COMPLETE ✓**
