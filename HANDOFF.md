# Grid-Commander — Session Handoff

**Date**: 2026-07-31  
**State**: `main` is current and green (792 vitest + 124 harness tests, typecheck clean). No active changes. 36 open backlog items. One draft PR open: #8 (`brain-with-no-model` fix), merges clean.

---

## What This Project Is

Grid-Commander is a **multi-tenant web workbench** for building, tuning, and understanding BattleGrid trading agents over BattleGrid's MCP server (`https://mcp.battlegrid.trade/mcp`). It is a TypeScript / Next.js / PostgreSQL application using Clean Architecture — the domain never imports the MCP client; BattleGrid sits behind a port.

The idea brief is at `_IDEA/Grid-Commander_Idea_Brief.md`. The MVP feature spec is at `_PM/Grid-Commander-MVP_Feature_Specification.md`.

---

## Current State of `main`

All development branches have been merged. `main` is the single source of truth.

| Metric | Value |
|---|---|
| Capabilities (archived) | 7 |
| Changes (archived) | 47 |
| Vitest tests | 792 |
| Harness tests (Python) | 124 |
| Active changes | 0 |
| Open backlog items | 36 |
| Design tickets open | 0 |
| Open draft PRs | 1 — #8, `brain-with-no-model` fix |

---

## Seven Capabilities

| Capability | What it covers |
|---|---|
| `spec-validation` | Automated spec layer validation in CI |
| `harness-integrity` | The `openspec.py` tooling itself (124 tests) |
| `battlegrid-connection` | OAuth + DCR + PKCE account connect/disconnect; audit; credential encryption |
| `agent-authoring` | Roster, create, rename, rebind, archive, reactivate, budget gauges |
| `agent-understanding` | Agent journal (thought log), budget limits, account-level capacity |
| `strategy-authoring` | Fork, compile, review, apply; archive, restore |
| `app-access` | Multi-tenant session, route protection, OAuth callback, build gate |

---

## What the App Can Do (as of `main`)

Against a real connected BattleGrid account a user can:

- **Connect** their account (OAuth/DCR/PKCE, no raw credential ever touches the browser)
- **Agents**: view roster, create, rename, update trading limits, rebind to a strategy, archive, reactivate
- **Agent understanding**: read the agent's thought log (reasoning, confidence, decision outcomes), view how close it is to each configured limit, see which limits have no cap set vs which are at risk
- **Strategies**: fork a system strategy, edit its tagline and compose which report sections it includes, compile it (BattleGrid-side dry run showing blast radius), review it, apply it; archive and restore
- **Audit log**: every write made on the user's behalf, with actor, tool, and outcome

There is **no assistant**. It was removed in `3d54fab` (2026-07-29, merged via PR #5): the product is MCP-control only, and the application's single outbound host is `mcp.battlegrid.trade`. Earlier versions of this file described a read-only assistant — that description outlived the code.

**Proven live**: an agent was created, renamed, had its limits updated, and was archived. A strategy was forked, compiled, and archived. The agent's thought log and budget gauges were read. All against a real BattleGrid account.

---

## What Was Fixed on the Way Here (Key Findings)

These were bugs that existed in the application that sessions discovered and fixed through live probing. Worth knowing for anyone continuing:

1. **MCP envelope bug** — `tools/call` wraps every BattleGrid response. Both adapters were passing the envelope through instead of unwrapping it. The product showed "no agents" and "nothing listed" on accounts with live data.
2. **`apply_strategy_plan` refused every request** — `refuseLocally` compared a BattleGrid account ID against the local user ID (which is `'owner'` or a random token, never a BattleGrid ID). Applying a plan was structurally impossible since the feature was written.
3. **Budget gauges** — `remaining: 0` on an unconfigured gauge means "no cap", not "at the limit". `fill` is an amount consumed, not a fraction. Displaying them naively misstates the truth exactly where being wrong costs money.
4. **Agent create** — `brain.kind` was `'preset'` where the schema pins `const: "PRESET"`; `sizingStrategy` used a catalog key that doesn't exist so the fallback fired every time.
5. **Agent update** — the read returns 23 `tradingConfig` keys; the write accepts 20 with `additionalProperties: false`. Sending all 23 back fails every time.

---

## What Is NOT Done / Known Hard Limits

| Item | Type | Notes |
|---|---|---|
| `brain-with-no-model` | P3 bug | Mapper bug: an agent with neither `brainPreset` nor `modelId` maps to `{kind: 'custom', modelId: ''}`. Display-only. **Fix is open as draft PR #8** — maps to `unknown` instead; merges clean into `main`. Not an assistant issue (the assistant is gone; `wire-an-assistant-model` closed before its removal). |
| `ci-creates-no-runs` | P1 risk | GitHub Actions blocked at account level (billing). `./scripts/check.sh` is the local path. |
| `image-never-built` | P1 debt | No Docker daemon in sessions; image build never proven |
| `confirmation-is-not-bound-to-values` | P2 risk | Confirmation tokens authorise the *intent* but not the specific payload values |
| `rebind-is-not-bound-to-the-revision-it-read` | P3 risk | Rebind can clobber a concurrent change |

Resolved since this table was first written: `strategy-section-editor` (built and archived 2026-07-30, PR #7 — section checklist on the edit page), `assistant-unverified-against-live-api` (closed by the assistant's removal in `3d54fab`).

**Hard limits** (not bugs — these are constraints imposed by BattleGrid's API):

- Agent edit form only exposes rename and trading limits — the read and write schemas for `tradingConfig` differ (3 fields come back on read, are rejected on write with `additionalProperties: false`)
- Position-management preset is a label alongside 14 independent values, not a shorthand — a preset dropdown cannot be the edit surface

---

## P1 Backlog Items

| Item | What | Fix path |
|---|---|---|
| `ci-creates-no-runs` | GitHub Actions not running (account billing block) | Settle the account, or register a self-hosted runner. Not fixable by code. |
| `image-never-built` | Docker image build never proven | Needs a Docker daemon; not resolvable in this environment. |

(`ci-startup-failure` — the old framing of the CI issue — was closed 2026-07-31 as superseded by `ci-creates-no-runs`.)

---

## Immediate Next Steps

1. **Merge draft PR #8** (`brain-with-no-model`) — 3 commits on `claude/hand-off-file-review-3gpveo`: propose, fix (mapper falls back to `unknown` instead of `custom` with an empty model id), archive. Verified to merge into `main` with zero conflicts. Closing it takes the backlog to 35 open.
2. **Fix the CI** — either settle the account billing or register a self-hosted runner (`ci-creates-no-runs`). `validate.yml` pins `runs-on: ubuntu-latest` on all four jobs, so a self-hosted runner needs a matching label.
3. **Sweep conformance** (`conformance-sweep-for-required-and-accepted-params`, P2) — the live-probe found two read tools that always return empty; there may be more gaps.
4. **Live apply test** — needs the operator: a real key and a strategy they will let change. `restore-has-never-been-walked` (P2) is the same shape.
5. **Refresh stale design surfaces** — `strategy-editor`, `agent-roster`, `audit-log`, `strategy-catalog` all changed since their manifests were surveyed; run `/surface` before any design work.

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

# Local verification (replaces CI)
./scripts/check.sh

# Dev server
npm run dev

# Build
npm run build && npm run start
```

PostgreSQL stops on its own in ephemeral containers — restart with: `pg_ctlcluster 16 main start`

To probe BattleGrid live after connecting an account: `./scripts/check-serving.sh` runs the served-application verification.

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
