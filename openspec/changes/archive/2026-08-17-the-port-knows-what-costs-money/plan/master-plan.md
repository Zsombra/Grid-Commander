# Master Plan: The Port Knows What Costs Money

## Status

| Field | Value |
|---|---|
| Slug | `the-port-knows-what-costs-money` |
| Change | `openspec/changes/the-port-knows-what-costs-money/` |
| Phase | **2 — Execution** |
| Base ref | `origin/main` (`86ee8fa`) |
| Track | `full` |
| Last updated | 2026-08-17 |
| Issue | **#340** |

Checklists read from `docs/checklists/` (**not** `docs/specs/` — the planner
skill names a path this project does not use; CLAUDE.md is authoritative). Plan
artifacts live in `openspec/changes/<id>/plan/`, not `docs/plan/`, for the same
reason. Both deviations are the same ones the `the-approval-can-be-answered` plan
recorded on 2026-08-16.

## Objective

Give the port the fact it is missing — **which operations commit the user's
funds** — from the judgement this product already wrote down, so that both the
scope gate and the confirmation gate fire on `accept_entry_decision`.

## The measured starting state

Driven through the real `buildClassificationMap` and the real `beginGuardedCall`,
from `docs/battlegrid-mcp-capabilities.json`:

```
accept_entry_decision -> {"mutating":true,"destructive":false,"requiredScope":"mcp:read"}
cancel_entry_decision -> {"mutating":true,"destructive":true, "requiredScope":"mcp:read"}

accept admitted on mcp:read alone, no token. audit id issued: true
audit row destructive: false
cancel refused with: ConfirmationRequiredError
```

Section 0 of `tasks.md` reproduces this as throwaway tests so the diff shows it.

## Non-Negotiable Constraints

From `docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md` Quick Reference Card, the
rows this change touches:

| # | Constraint | Why it binds here |
|---|---|---|
| C1 | **Scope is never a safety signal. Classify the tool.** | The checklist already names classification as the mechanism. This change makes the classification correct; it does not promote scope to a safety signal |
| C2 | **Unknown tools fail closed** — mutating and destructive until proven otherwise | `UNKNOWN_TOOL` must not be weakened. A newly deployed money-committing tool stays safe before anyone classifies it |
| C3 | **BattleGrid always through `BattleGridPort`**; the MCP client exists only at the composition root | The producer goes in the adapter, which is already the only place that may know tool names |
| C4 | **Domain imports no infrastructure** | `classify.ts` stays name-free and keeps reading `declaredScope`; the adapter supplies it |
| C5 | **Audit written before the attempt**, updated with the outcome | Unchanged. Only what the row *records* changes, never when |
| C6 | **A10** — no `WAGER_TOOLS` name in `src/`/`app/`; answer pair confined to `src/infrastructure/battlegrid/` | Decides the producer's location, and forbids the domain option |

From `docs/checklists/DATA_PIPELINE_REVIEW_CHECKLIST.md`:

| # | Constraint | Why it binds here |
|---|---|---|
| C7 | **Iron Rule** — every displayed value traces to a BattleGrid response, a database column, or a server-side computation returned as a first-class DTO field | The audit badge is a displayed value. Once the row records both the platform's claim and ours, the surface must render a stored column, never re-derive the judgement client-side |

## Planned Exceptions

**None.** The first draft carried two open questions; both were settled before
planning against evidence in the repository, and are recorded as PD-1 and PD-2 in
the decision log rather than as exceptions.

## Architectural Boundaries

```
PRESENTATION   app/ , src/presentation/          audit-list.tsx renders the flag
      │
APPLICATION    src/application/use-cases/        UNTOUCHED — no second opinion
      │
DOMAIN         src/domain/capability/            classify.ts — stays name-free
      │
INFRASTRUCTURE src/infrastructure/battlegrid/    the producer lives here (A10, C3)
```

The change moves **downward only**: a fact the test layer holds becomes a fact
the adapter supplies. Nothing moves up into the application layer, which is what
`answer-decision.command.ts:16-20` forbids.

## File & Responsibility Inventory

| Action | File | Layer | Responsibility |
|---|---|---|---|
| create | `src/infrastructure/battlegrid/money-tools.ts` | infrastructure | The single home for which BattleGrid operations commit funds, partitioned into **forbidden** (unreachable) and **reachable**. The only module permitted to name them (A10) |
| modify | `src/infrastructure/battlegrid/mcp-adapter.ts` | infrastructure | `rawDiscoverTools` (~:387) sets `declaredScope` on reachable money-committing tools as it maps the discovered list |
| modify | `src/domain/capability/classify.ts` | domain | Distinguish the platform's claim from this product's conclusion; key the consequence to the conclusion; repair or remove `inferScope` and its comment |
| modify | `src/domain/capability/tool-class.ts` | domain | Carry the platform's raw claim alongside the product's judgement |
| modify | `src/infrastructure/battlegrid/call-path.ts` | infrastructure | Step 3 keys to the consequence; step 4 records both facts |
| modify | `src/domain/audit/audit-entry.ts` | domain | The second fact on the row |
| modify | `src/domain/audit/audit-repository.ts` | domain | Port shape for the second fact |
| modify | `src/infrastructure/db/schema/index.ts` | infrastructure | The column |
| create | `drizzle/<generated>` | infrastructure | Migration for the column |
| modify | `src/infrastructure/db/repositories/drizzle-audit-repository.ts` | infrastructure | Persist and read the second fact |
| modify | `src/presentation/components/audit-list.tsx` | presentation | Render **ours**, claiming nothing about rows written before this change |
| modify | `tests/agent/wager.test.ts` | test | A10 imports `money-tools.ts` instead of declaring its own copy; add `random_submit_market_grid` |
| modify | `tests/agent/answer-authority.test.ts` | test | Take the classification from the real map rather than hand-building it (:171-176) |
| modify | `tests/capability/call-path.test.ts` | test | Fixtures that describe real classifications |
| create | `tests/capability/money-tools.test.ts` | test | Partition, resolution against the surface, vacuity guard |

**Not in the inventory, deliberately**: every file under
`src/application/use-cases/`. If the executor finds itself editing one, the
"no second opinion" boundary has been crossed and it wants a decision-log entry
before proceeding.

## Dependency / Call-Tree Sketch

```
mcp-adapter.rawDiscoverTools
   └─ money-tools.ts            names, and only here
        └─ DiscoveredTool.declaredScope        ← the field that had no producer
             └─ classify.ts  buildClassificationMap
                  └─ ToolClass { requiredScope, consequence, platformClaim }
                       └─ call-path.beginGuardedCall
                            ├─ step 2  scope refusal        ← fires for the first time
                            ├─ step 3  confirmation consume ← fires on accept for the first time
                            └─ step 4  audit.begin          ← records both facts
                                 └─ drizzle-audit-repository → audit-list.tsx
```

## Checklist Coverage Matrices

### Architecture

| Rule | Files | How it is satisfied |
|---|---|---|
| C1 scope not a safety signal | `classify.ts`, `call-path.ts` | The gate keys to the **consequence**, not to scope. Scope remains the authority check it always was |
| C2 unknown fails closed | `classify.ts`, `tool-class.ts` | `UNKNOWN_TOOL` untouched; asserted by a test that fails if it is weakened |
| C3 / C4 dependency direction | `classify.ts`, `money-tools.ts` | Domain imports no infrastructure; the adapter pushes the fact down as data |
| C5 audit before the attempt | `call-path.ts` | Ordering unchanged; only the row's content changes |
| C6 A10 | `money-tools.ts`, `wager.test.ts` | Names confined to `src/infrastructure/battlegrid/`; A10 reads the same list it guards |

### Data pipeline

| Rule | Files | How it is satisfied |
|---|---|---|
| C7 Iron Rule | `audit-list.tsx`, `drizzle-audit-repository.ts` | The badge renders a stored column. The judgement is computed server-side once, at write time, and never re-derived for display |
| Source of truth | `money-tools.ts` | One home. `wager.test.ts` consumes it rather than duplicating it — two lists that can drift is the defect class |

### UI

In scope but minimal: `audit-list.tsx` renders one flag. Full matrix in
`plan/uiux-review.md`. No new surface, no new state, no layout change — so no
design ticket is required and no surface manifest should need re-pinning beyond a
digest refresh.

## Phase-by-Phase Tasks

Task detail lives in `tasks.md` (36 tasks, sections 0–8). Phases map to it:

| Phase | Sections | Gate |
|---|---|---|
| **A** Evidence | 0 | Both throwaway tests fail-as-expected and their output is in the decision log |
| **B** One home | 1 | Partition asserted; `random_submit_market_grid` added; A10 imports the shared list |
| **C** The producer | 2, 3 | `declaredScope` populated; `inferScope` no longer lies; list resolution guarded with a vacuity assertion |
| **D** The gates | 4, 5 | Both gates fire on accept; the fabricated-input tests are rewritten |
| **E** The audit | 6 | Both facts recorded; migration applied; no backfill |
| **F** Live | 7 | **7.2 is the operator's gate** |
| **G** Close-out | 8 | Section 0 tests deleted |

**Gate between D and E**: do not change the audit schema until both gates are
proven to fire. The schema change is the only irreversible-ish step here, and it
should follow the behaviour it describes.

## Phase 1 Review Checklist — Planner

- [x] Objective stated in two sentences
- [x] Constraints extracted from the checklists rather than invented
- [x] File inventory complete with responsibilities and layers
- [x] Both deferred questions settled before planning, with evidence
- [x] Dependency sketch shows the field that had no producer
- [x] Coverage matrices for architecture, data pipeline and UI
- [x] Review scaffolds and decision log created
- [x] No production file modified by this phase

## Phase 2 Review Checklist — Executor

- [x] Every file in the inventory created/modified as described, or the deviation logged — DE-1 logs the one deviation (two homes, not one)
- [x] Section 0 evidence recorded verbatim before any behaviour changed — DE-2
- [x] `npm run typecheck` clean — 2026-08-17, no output
- [x] `npm run lint` clean — 2026-08-17, no output
- [x] `npm test` — **2732 passed / 6 failed of 2738**, all six in `tests/recording/cli-spawn.test.ts` (pre-existing MODULE_NOT_FOUND). Baseline exactly, no new failures
- [x] `npm run build` clean — 2026-08-17, full route table emitted
- [x] `npm run db:generate && git diff --quiet drizzle/` — *"No schema changes, nothing to migrate"*, `drizzle/` clean
- [x] `npm run test:db` against a **disposable** database — **96/96** on `grid_commander_test`, `DB_TESTS_MAY_TRUNCATE` unset. **Preflight caught the inherited `DATABASE_URL` pointing at the working `grid_commander` (167,496 readings)**; it was overridden inline and the working database verified intact afterwards
- [x] Every new guard reverted once and shown to fail — task 5.3; DE-4 records the probe-file proof for the fabricated-input guard
- [x] Review artifacts filled with path-level evidence — **28 rows across the three reviews, all `file:line`**. They were empty scaffolds (`PENDING EXECUTION EVIDENCE`) until 2026-08-17; the execution leg had not filled them
- [x] Master plan final line set to `EXECUTION READY FOR PRODUCTION GATE`

## Phase 3 Review Checklist — Auditor

- [x] `accept_entry_decision` classifies as requiring wager authority, **driven from the real record**
- [x] A read-only connection is refused at the port, naming the authority
- [x] A confirmation is required **and spent** on accept
- [x] Cancel is unchanged and still gated
- [x] `UNKNOWN_TOOL` still fails closed
- [x] No `WAGER_TOOLS` name appears outside `src/infrastructure/battlegrid/` (A10 half 1)
- [x] No application-layer file was modified — the "no second opinion" boundary held
- [x] The audit records both facts; **no historical row was rewritten**
- [x] `inferScope` no longer describes a mechanism with no producer
- [x] No test asserts against a hand-built `ToolClass` without a stated reason

## Artifacts

| File | Purpose |
|---|---|
| `plan/master-plan.md` | This plan |
| `plan/data-review.md` | Data pipeline evidence — executor fills |
| `plan/architecture-review.md` | Architecture evidence — executor fills |
| `plan/uiux-review.md` | UI evidence — executor fills |
| `plan/decision-log.md` | Decisions across all phases |
| `plan/production-gate.md` | Created by the auditor, not by this plan |
| `proposal.md`, `design.md`, `tasks.md`, `specs/` | Written by the proposer |
| `openspec/backlog/accept-opens-a-position-without-spending-its-confirmation.md` | The measured evidence this rests on |

EXECUTION READY FOR PRODUCTION GATE
