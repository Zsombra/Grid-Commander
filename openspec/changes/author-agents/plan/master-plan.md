# Master Plan: author-agents

| | |
|---|---|
| **Change** | `author-agents` |
| **Track** | full |
| **Phase** | Planning |
| **Base ref** | `6ba8948` (archive of `connect-battlegrid-account`) |
| **Last updated** | 2026-07-27 |

---

## Objective

Deliver the agent-authoring capability on top of `battlegrid-connection`: roster,
create, edit, rebind, lifecycle and journal — the first change that changes a
user's BattleGrid account — and close the fail-open scope stub before it does.

---

## Requirement Coverage Matrix

Delta: 10 ADDED (`agent-authoring`) + 1 MODIFIED (`battlegrid-connection`).
21 + 3 = **24 scenarios**, each with a named verification.

| Req | Requirement | Delta op | Implementing file(s) | Scenario → verification |
|---|---|---|---|---|
| A1 | The Roster Reflects The Live Account | ADDED | `list-agents.query.ts` (create), `agent-repository.ts` (create), `mcp-adapter.ts` (modify) | Viewing the roster → `tests/agent/roster.test.ts::shows_live_agents`<br>No agents yet → `::empty_is_not_failure`<br>Cannot be loaded → `::unreadable_is_not_empty` |
| A2 | Agent Fields Are Offered Only From Values The Platform Confirms | ADDED | `catalog.ts` (create), `create-agent.command.ts` (create) | Choosing a brain → `tests/agent/catalog.test.ts::models_come_from_the_server`<br>Setting trading config → `::bounds_come_from_the_registry`<br>Catalog unreadable → `::no_form_without_a_catalog` |
| A3 | Capacity Limits Are Explained Before The Work | ADDED | `list-agents.query.ts`, `create-agent.command.ts` | No slots remain → `tests/agent/capacity.test.ts::refuses_before_the_form` |
| A4 | Editing Changes Only What The Agent Owns | ADDED | `field-ownership.ts` (create), `update-agent.command.ts` (create) | Editing an agent → `tests/agent/ownership.test.ts::agent_owned_fields_only`<br>Changing inherited config → `::inherited_is_not_editable` |
| A5 | Rebinding States That It Replaces, Not Merges | ADDED | `rebind.ts` (create), `rebind-agent.command.ts` (create), `describe-rebind.query.ts` (create) | Rebind requested → `tests/agent/rebind.test.ts::names_the_replacement`<br>Confirmation withheld → `::nothing_changes`<br>Token reused → `::refuses_a_token_for_another_pair` |
| A6 | Retiring An Agent Is Reversible And Described As Such | ADDED | `lifecycle.command.ts` (create), `agent.ts` (create) | Archiving → `tests/agent/lifecycle.test.ts::archive_is_recoverable`<br>Reactivating → `::reactivate_restores`<br>Permanent deletion → `::no_delete_affordance` |
| A7 | Agents The Platform Owns Are Not Presented As Editable | ADDED | `agent.ts`, `agent-actions.tsx` (create) | Platform-owned agent → `tests/agent/ownership.test.ts::immutable_offers_no_actions` |
| A8 | Every Agent Mutation Carries The Revision It Was Formed Against | ADDED | all four agent commands, `agent-repository.ts` | Changed underneath → `tests/agent/concurrency.test.ts::conflict_names_the_agent`<br>Composed without a revision → `::structurally_impossible` |
| A9 | An Agent's Reasoning Is Readable | ADDED | `read-agent-journal.query.ts` (create), `journal-view.tsx` (create) | Reading the journal → `tests/agent/journal.test.ts::reads_agent_record`<br>Telling the two apart → `::journal_is_not_the_audit_log` |
| A10 | Agent Operations That Commit Funds Are Not Reachable | ADDED | `call-path.ts` (existing guard), `agent-tools.ts` (create) | Operation that would spend → `tests/agent/wager.test.ts::refused_and_recorded_as_refusal` |
| C3 | Read Scope Is Requested And Wager Scope Is Not | **MODIFIED** | `mcp-adapter.ts` (modify — replaces `scopesFor`), `connect.commands.ts` (modify) | Connecting → existing `connect.test.ts::requests_read_only` (must still pass)<br>Wager tool reached → existing `call-path.test.ts::refuses_before_attempting` (must still pass)<br>**Grant narrower than requested** → `tests/connection/scope.test.ts::measures_against_the_grant` |

**Infrastructure, serving no single requirement**: `agent-mapper.ts` (payload →
domain, D-A), test fakes extended in `tests/support/fakes.ts`.

---

## Non-Negotiable Constraints

From `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md` Quick Reference Card, plus the
two this change adds.

| Constraint | Enforcement in this change |
|---|---|
| Domain imports nothing outward | `src/domain/agent/**` — extended boundary test |
| BattleGrid only through `BattleGridPort` | agent tool calls live in `src/infrastructure/battlegrid/` only |
| Scope is never a safety signal | classification still precedes the scope check; the scope check now reads the grant (D-I) |
| Unknown tools fail closed | unchanged from change 1; agent tools classify through the same path |
| Audit written before the attempt | every agent mutation goes through `beginGuardedCall` |
| `expectedRevision` always; surface, never retry | structural test: no agent mutation reaches the adapter without a revision |
| Drizzle builder only, scoped by `userId` | no new tables — D-G stores no agent state |
| **No value is offered that the platform did not confirm** (new) | `catalog.ts` is the only source of enums and bounds; a hard-coded preset list fails review |
| **`canDelete` is never read** (new) | D-B; auditor scan |
| Quality gate | `npm run typecheck && npm run lint && npm test` |

---

## Architectural Boundaries

```
app/                    → presentation (Next.js App Router)
src/presentation/       → components
src/application/        → use cases (CQRS: *.command.ts / *.query.ts)
src/domain/             → entities, value objects, rules — imports NOTHING
src/ports/              → interfaces the domain and application depend on
src/infrastructure/     → adapters implementing ports
```

Unchanged. This change adds `src/domain/agent/` and extends
`src/infrastructure/battlegrid/`; it introduces no new layer and no new
direction of dependency.

---

## File & Responsibility Inventory

| # | File | Action | Layer | Responsibility |
|---|---|---|---|---|
| 1 | `src/domain/agent/agent.ts` | create | domain | The agent as the rules need it: identity, revision, lifecycle, binding, capabilities (D-A) |
| 2 | `src/domain/agent/brain.ts` | create | domain | `Brain` as a discriminated union — preset XOR custom (D-D) |
| 3 | `src/domain/agent/field-ownership.ts` | create | domain | Which fields the agent owns and which it inherits, as data |
| 4 | `src/domain/agent/rebind.ts` | create | domain | Rebind as a named destructive operation carrying agent + target |
| 5 | `src/domain/agent/trading-config.ts` | create | domain | Trading config and its validation against supplied bounds |
| 6 | `src/domain/agent/catalog.ts` | create | domain | Approved models, presets and bounds as read from the platform (D-C) |
| 7 | `src/ports/agents.ts` | create | ports | The agent port: roster, get, create, update, rebind, lifecycle, journal |
| 8 | `src/application/use-cases/list-agents.query.ts` | create | application | Roster + capacity, three-state result (D-H) |
| 9 | `src/application/use-cases/create-agent.command.ts` | create | application | Capacity check, catalog validation, guarded create |
| 10 | `src/application/use-cases/update-agent.command.ts` | create | application | Read-modify-write of agent-owned fields (D-E) |
| 11 | `src/application/use-cases/rebind-agent.command.ts` | create | application | Confirmation-gated rebind |
| 12 | `src/application/use-cases/describe-rebind.query.ts` | create | application | The consequence text the confirmation is issued against |
| 13 | `src/application/use-cases/lifecycle.command.ts` | create | application | Archive / reactivate |
| 14 | `src/application/use-cases/read-agent-journal.query.ts` | create | application | The agent's own record |
| 15 | `src/infrastructure/battlegrid/agent-adapter.ts` | create | infrastructure | Agent tool calls, all through `beginGuardedCall` |
| 16 | `src/infrastructure/battlegrid/agent-mapper.ts` | create | infrastructure | BattleGrid payload → domain agent (D-A, D-B) |
| 17 | `src/infrastructure/battlegrid/mcp-adapter.ts` | modify | infrastructure | Replace `scopesFor()` with a read of the connection (D-I) |
| 18 | `src/domain/connection/connection-repository.ts` | modify | domain | Expose recorded scopes for the guard |
| 19 | `app/(app)/agents/page.tsx` | create | presentation | Roster, three states |
| 20 | `app/(app)/agents/new/page.tsx` | create | presentation | Create form, catalog-driven, capacity-checked |
| 21 | `app/(app)/agents/[id]/page.tsx` | create | presentation | Agent detail + edit |
| 22 | `src/presentation/components/agent-actions.tsx` | create | presentation | Affordances gated by `capabilities` (D-B) |
| 23 | `src/presentation/components/rebind-confirm.tsx` | create | presentation | Names the agent, the target, and the replacement |
| 24 | `src/presentation/components/journal-view.tsx` | create | presentation | Visually distinct from the audit log |
| 25–33 | `tests/agent/*.test.ts` (8 files), `tests/connection/scope.test.ts` | create | test | One test per scenario |
| 34 | `tests/support/fakes.ts` | modify | test | In-memory agent port |
| 35 | `tests/architecture/boundaries.test.ts` | modify | test | Extend to `src/domain/agent/`; add the `canDelete` and revision scans |

---

## Dependency / Call-Tree Sketch

```
app/(app)/agents/*            (presentation)
   └── use cases              (application)
         ├── AgentsPort       (ports)          ── implemented by ──┐
         └── domain/agent/*   (domain — pure, imports nothing)     │
                                                                   ▼
                                        infrastructure/battlegrid/agent-adapter
                                                   └── beginGuardedCall   ← change 1
                                                         ├── classify()   (domain)
                                                         ├── scope check  (now reads the grant — D-I)
                                                         ├── confirmation (D-F)
                                                         └── audit.begin()
                                                   └── agent-mapper → domain agent
```

No agent write reaches BattleGrid except through `beginGuardedCall`. That is the
single property the whole safety model rests on, and it is asserted structurally,
not by review.

---

## Checklist Coverage Matrices

### Architecture checklist coverage

| Rule | Files | How satisfied |
|---|---|---|
| Dependency direction | #1–#6, #15–#16 | Domain pure; adapter maps at the boundary |
| One responsibility per file | all | Each use case is one verb |
| No dual runtime paths | #9–#13 | One create path, one update path; no "legacy" branch |
| Ports for external systems | #7, #15 | `AgentsPort` implemented once |
| No hard-coded platform vocabulary | #6 | Catalog is read; a literal preset list fails review (F-3) |
| Errors are domain errors at the boundary | #15 | Reuses `toDomainError` |

### Data pipeline checklist coverage

| Rule | Files | How satisfied |
|---|---|---|
| Iron Rule — source of truth | #16, D-G | BattleGrid owns agent state; nothing is stored locally |
| No client-side recomputation | #19–#24 | Bounds validated in the domain against server-supplied values; the UI renders the verdict |
| No silent defaults | #10, D-E | Read-modify-write; a partial config is never sent |
| Missing data is a state, not a zero | #8, D-H | `unreadable` is its own case |

### UI checklist coverage

| Rule | Files | How satisfied |
|---|---|---|
| Components do not fetch | #19–#24 | Server components call use cases |
| Consequence before action | #23 | Rebind copy names agent, target and replacement |
| Distinguish empty from broken | #19 | Three states rendered separately |
| No affordance for an impossible action | #22 | `canDelete` ignored (D-B) |
| Accessibility | #19–#24 | Labelled controls; confirmation is not colour-only |

---

## Phase-by-Phase Tasks

See `tasks.md`. Six phases: facts (done), scope debt, domain, application,
infrastructure, presentation, verification.

Order matters in one place: **phase 1 (scope debt) lands before any agent
write.** Adding mutations on top of a check that reports authority the connection
may not hold is the wrong order (D-I).

---

## Phase 1 Review Checklist (Planner)

- [x] Every ADDED/MODIFIED requirement has a coverage-matrix row
- [x] Every scenario has a named verification
- [x] Live facts established before the form was designed (`findings-agents.md`)
- [x] Design decisions recorded with reasoning (`design.md`, D-A…D-I)
- [x] No file in the inventory serves no requirement, or is declared infrastructure
- [x] Out-of-scope boundary stated in the proposal and not crossed by the plan

## Phase 2 Review Checklist (Executor)

- [ ] Phase 1 (scope debt) landed before any agent write
- [ ] All 24 scenarios have passing tests
- [ ] `npm run typecheck` PASS
- [ ] `npm run lint` PASS
- [ ] `npm test` PASS
- [ ] `python3 .claude/tools/openspec.py validate author-agents --strict` clean
- [ ] Review artifacts filled with path-level evidence
- [ ] Deviations logged in the decision log
- [ ] Backlog item `scopes-from-connection` closed

## Phase 3 Review Checklist (Auditor — production gate)

- [ ] Spec parity: 10 ADDED delivered, 1 MODIFIED delivered **and** the old
      behavior gone (the constant `scopesFor` must not survive anywhere)
- [ ] `battlegrid-connection` requirements this change does not modify still hold
- [ ] Scan: no occurrence of `canDelete` in `src/` or `app/` (D-B)
- [ ] Scan: no hard-coded model id, brain preset or position-management preset
- [ ] Scan: every agent mutation carries a revision
- [ ] Scan: no `mcp:wager` tool name reachable from any call path
- [ ] Fallback-masking scan on touched paths — the scan that found PG-001/PG-003
- [ ] All quality gates re-run in full

---

## Artifacts

| File | Purpose |
|---|---|
| `proposal.md` | why + what + scope |
| `specs/agent-authoring/spec.md` | 10 ADDED requirements, 21 scenarios |
| `specs/battlegrid-connection/spec.md` | 1 MODIFIED requirement, 3 scenarios |
| `design.md` | D-A…D-I |
| `findings-agents.md` | live server facts, tasks 0.1–0.3 |
| `tasks.md` | executable checklist |
| `plan/master-plan.md` | this file |
| `plan/architecture-review.md` | executor fills |
| `plan/data-review.md` | executor fills |
| `plan/uiux-review.md` | executor fills |
| `plan/decision-log.md` | all phases |
| `plan/production-gate.md` | auditor creates |

---

PLAN READY FOR REVIEW
