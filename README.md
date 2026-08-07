# Grid-Commander

A web workbench for building, tuning, and understanding **BattleGrid** trading
agents and the strategies that drive them — a third-party, multi-tenant client
speaking to `https://mcp.battlegrid.trade/mcp` and to nothing else.

TypeScript · Next.js (App Router) · PostgreSQL · Drizzle · Clean Architecture
(the domain never imports the MCP client; BattleGrid sits behind a port).

**Starting a session as the operator? Read `docs/FIRST_SESSION.md`.**
**Continuing development? Read `HANDOFF.md`, then run `/board`.**

---

## What it does

Against a connected BattleGrid account:

| Area | Surfaces |
|---|---|
| **Agents** | Roster · create / rename / limits / position management · rebind · archive / reactivate · deploy & undeploy radar presence |
| **Understanding** | What keeps stopping it (`/agents/[id]`) · thought log · limits **and spend** · trading record (`/trades`) · decision pipeline with per-signal evidence (`/pipeline`, `/pipeline/[logId]`) · open positions and exposure · the prospective **qualification screen** (`/qualification`) |
| **Strategies** | Fork (nameable) · edit sections & tagline · compile → review → apply · retune any signal rule · **conditions: compose, try live, save** · preview what the agent reads · signal library (82) · metric index (75) · section library & column editor |
| **The field** | `/explorer` — every other agent on the platform, the leaderboard with this account's row marked, one competitor's whole record, any evaluation's 72-signal scorecard |
| **The arena** | `/arena` — every Market Grid session, schedule, entry fee, the money split. Watch-only by decision; a CANCELLED session is promised nothing |
| **Any model** | `docs/MCP_SERVER.md` — the product as an MCP server: 18 read tools, no writes, enforced by a guard rather than a convention |
| **Audit** | Every write made on the user's behalf: actor, tool, outcome |

Every write goes through **describe → confirm → perform**: the consequence is
stated against the account as it is *now*, the confirmation token is
digest-bound to the exact values agreed to, and the perform submits exactly
what was reviewed. Every write path has been walked against the live platform.

## Three facts that shape every decision

1. **`mcp:read` is write-capable.** 27 of BattleGrid's 110 tools mutate; only
   16 need `mcp:wager`. Scope is never treated as a safety boundary.
2. **The tool surface goes stale after a BattleGrid deployment, and the tool
   count never moves.** Six major versions observed; always 110 tools while
   enums and semantics changed underneath. Vocabulary is discovered at
   runtime, never written into source, and CI fails on a stale surface record.
3. **This product holds credentials that configure other people's agents.**
   Read-only by default, explicit step-up, every write audited.

And one house rule learned the hard way, visible on every surface:
**unreadable is not empty.** A failed read never renders as an absence —
"you have no agents" and "your agents could not be read" are different facts,
and only one of them is true.

## Running it

```bash
# Prerequisites: Node 20+, PostgreSQL 16
npm install
cp .env.example .env        # DATABASE_URL + encryption secrets

npx drizzle-kit generate && npx drizzle-kit migrate

npm run dev                  # use next dev, NOT --turbopack (see next.config.ts)

# The whole CI, locally — ten gates (see docs/CI_WITHOUT_BILLING.md)
DATABASE_URL=… CI_SERVING=1 ./scripts/ci.sh

# With a key, two more things run: the freshness gate (fails if BattleGrid
# has deployed since the surface was recorded) and the live probes.
BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/
```

A credential is not consent to mutate: probes that write require
`BATTLEGRID_LIVE_WRITES=1` as well, and an architecture test fails any probe
that forgets to ask.

## Documentation map

| Read | For |
|---|---|
| `docs/FIRST_SESSION.md` | The operator's first session — connect, look around, act |
| `HANDOFF.md` | Current state, platform behaviours that bite, what is open and why |
| `openspec/specs/<capability>/spec.md` | What the system does — the behavior contract, 12 capabilities |
| `openspec/JOURNAL.md` | What happened, newest first |
| `docs/MCP_SERVER.md` | Driving the product from any MCP client |
| `docs/BATTLEGRID_MCP_REFERENCE.md` + `SURFACE_MAP.md` | The full 110-tool platform surface |
| `docs/REPORT_TABLE_GRAMMAR.md` | How report tables are authored, live-established |
| `docs/PIPELINE.md` | SKILLMOREL — the development pipeline this repo runs on |
| `docs/checklists/` | The engineering standards every change is held to |
| `CLAUDE.md` | Project rules for agent sessions |

## Development

This repo runs on the SKILLMOREL pipeline (`docs/PIPELINE.md`): every change
is a folder with a proposal, delta specs and tasks; `openspec/specs/` is the
merged source of truth (122 changes archived across 12 capabilities); the
backlog holds everything deferred, each item with its evidence and first step.

```
/board     — everything at a glance (start here)
/propose   — start a change        /verify — does the code match it?
/archive   — merge it into truth   /handoff — close out the session
```
