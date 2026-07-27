# Master Plan: connect-battlegrid-account

**Change ID**: `connect-battlegrid-account`
**Track**: full
**Phase**: 1 — Planning complete
**Base ref**: `origin/main`
**Last updated**: 2026-07-27

---

## Objective

Establish how Grid-Commander obtains, holds, scopes, and relinquishes authority
over a user's BattleGrid account — by OAuth, never by a pasted credential — and
build the classification and audit layer that every later feature reaches
BattleGrid through.

---

## Requirement Coverage Matrix

Every ADDED requirement and every scenario has an implementing file and a
verification. 10 requirements, 22 scenarios.

| # | Requirement | Op | Implementing file(s) | Scenario → verification |
|---|---|---|---|---|
| R1 | Users Connect By Authorization, Never By Credential | ADDED | `src/application/use-cases/start-connection.command.ts` (create), `complete-connection.command.ts` (create), `src/infrastructure/battlegrid/oauth-client.ts` (create), `app/api/auth/battlegrid/callback/route.ts` (create) | Connecting an account → `tests/connection/connect.test.ts::connects_by_authorization`<br>The user declines → `::declined_stores_nothing`<br>Response cannot be trusted → `::state_mismatch_refused`<br>Unreachable mid-flow → `::no_partial_connection` |
| R2 | The Connection Is The Identity | ADDED | `src/domain/connection/connection.ts` (create), `complete-connection.command.ts` (create), `src/infrastructure/db/schema/users.ts` (create) | Returning user → `tests/connection/identity.test.ts::returning_user_same_workspace`<br>Connection removed → `::history_survives_disconnect` |
| R3 | Read Scope Is Requested And Wager Scope Is Not | ADDED | `src/infrastructure/battlegrid/oauth-client.ts` (create), `src/infrastructure/battlegrid/mcp-adapter.ts` (create), `src/domain/connection/scope.ts` (create) | Connecting → `tests/connection/scope.test.ts::requests_read_only`<br>Wager tool reached → `::refuses_before_attempting` |
| R4 | Configuration Authority Is Described Honestly | ADDED | `src/application/use-cases/describe-grant.query.ts` (create), `src/presentation/components/consent-summary.tsx` (create) | Presenting the grant → `tests/connection/consent.test.ts::names_configuration_authority` + `::never_says_read_only` |
| R5 | Capabilities Are Discovered From The Live Connection | ADDED | `src/infrastructure/battlegrid/capability-cache.ts` (create), `src/domain/capability/classify.ts` (create) | Session start → `tests/capability/discovery.test.ts::discovers_at_session_start`<br>Platform changed → `::new_set_governs`<br>Discovery fails → `::degrades_to_readonly` |
| R6 | Unrecognised Operations Are Treated As Dangerous | ADDED | `src/domain/capability/classify.ts` (create) | Unknown classification → `tests/capability/classify.test.ts::unknown_is_destructive` |
| R7 | Destructive Operations Require Confirmation Naming The Consequence | ADDED | `src/domain/capability/confirmation.ts` (create), `src/infrastructure/battlegrid/mcp-adapter.ts` (create), `src/infrastructure/db/schema/confirmation-tokens.ts` (create) | Destructive requested → `tests/capability/confirmation.test.ts::requires_token_naming_consequence`<br>Confirmation withheld → `::nothing_changes` |
| R8 | Every Modifying Operation Is Recorded | ADDED | `src/domain/audit/audit-repository.ts` (create), `src/application/use-cases/record-audit.command.ts` (create), `src/infrastructure/db/repositories/drizzle-audit-repository.ts` (create), `list-audit.query.ts` (create) | Successful change → `tests/audit/audit.test.ts::records_success`<br>Failed change → `::records_failure`<br>Stops mid-operation → `::interrupted_reads_as_attempted`<br>Reading the record → `::user_reads_own_history_newest_first` |
| R9 | Conflicting Changes Are Surfaced, Never Silently Retried | ADDED | `src/domain/errors.ts` (create), `src/infrastructure/battlegrid/mcp-adapter.ts` (create) | State changed underneath → `tests/concurrency/conflict.test.ts::surfaces_and_does_not_retry` |
| R10 | A User Can Revoke Access | ADDED | `src/application/use-cases/disconnect.command.ts` (create), `src/infrastructure/battlegrid/oauth-client.ts` (create) | Disconnecting → `tests/connection/revoke.test.ts::revokes_at_battlegrid`<br>Revoked at BattleGrid → `::fails_cleanly_and_offers_reconnect` |

**Infrastructure files serving no single requirement** (declared, not scope creep):
`src/composition-root.ts`, `src/infrastructure/db/client.ts`, `src/ports/clock.ts`,
`src/infrastructure/crypto/envelope.ts` (serves R1/R10 token custody), project scaffolding.

---

## Non-Negotiable Constraints

From `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md` Quick Reference Card:

| Constraint | Enforcement in this change |
|---|---|
| Domain interfaces and ports only in use cases | `src/domain/**` imports nothing outward; lint rule |
| BattleGrid only through `BattleGridPort` | `no-restricted-imports` on the MCP SDK outside `src/infrastructure/battlegrid/` |
| Scope is never a safety signal | Classification precedes every call; scope check is a *second* gate, not the first |
| Unknown tools fail closed | `classify()` returns destructive on a miss |
| Audit written before the attempt | Two-phase, committed before the call |
| `expectedRevision` always; surface conflicts, never retry | `RevisionConflictError` propagates; no retry path exists |
| Structured logging, never a token | Logger redaction list covers `accessToken`, `refreshToken`, `authorization` |
| Drizzle builder only, scoped by `userId` | Repositories take `userId` as a required first argument |
| Quality gate | `pnpm typecheck && pnpm lint && pnpm test` |

---

## Architectural Boundaries

```
app/                    → presentation (Next.js App Router)
src/presentation/       → components, stores
src/application/        → use cases (CQRS: *.command.ts / *.query.ts)
src/domain/             → entities, value objects, rules — imports NOTHING
src/ports/              → interfaces the domain and application depend on
src/infrastructure/     → adapters implementing ports
```

Dependencies point inward only. `src/domain` must not import `src/infrastructure`,
`src/application`, `app/`, Drizzle, or the MCP SDK.

---

## File & Responsibility Inventory

| # | File | Action | Layer | Responsibility |
|---|---|---|---|---|
| 1 | `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `drizzle.config.ts` | create | build | Project scaffold; lint rules that enforce the boundaries |
| 2 | `src/domain/connection/connection.ts` | create | domain | Connection entity, status transitions |
| 3 | `src/domain/connection/scope.ts` | create | domain | `Scope` value object; `mcp:read` / `mcp:wager`; never a safety signal on its own |
| 4 | `src/domain/capability/tool-class.ts` | create | domain | `ToolClass` — mutating, destructive, requiredScope |
| 5 | `src/domain/capability/classify.ts` | create | domain | Annotation → `ToolClass`; **unknown ⇒ destructive** |
| 6 | `src/domain/capability/confirmation.ts` | create | domain | `ConfirmationToken` issue/verify rules |
| 7 | `src/domain/audit/audit-entry.ts` | create | domain | `AuditEntry`, `AuditOutcome` (attempted/succeeded/failed) |
| 8 | `src/domain/audit/audit-repository.ts` | create | domain | `AuditReader` / `AuditWriter` interfaces (CQRS) |
| 9 | `src/domain/connection/connection-repository.ts` | create | domain | Reader/Writer interfaces |
| 10 | `src/domain/errors.ts` | create | domain | Domain errors incl. `RevisionConflictError` |
| 11 | `src/ports/battlegrid.ts` | create | ports | The only way to BattleGrid |
| 12 | `src/ports/clock.ts` | create | ports | Injected time, so expiry is testable |
| 13 | `src/application/use-cases/start-connection.command.ts` | create | application | Begin authorization: PKCE, state, transaction row |
| 14 | `src/application/use-cases/complete-connection.command.ts` | create | application | Validate callback, exchange code, create identity |
| 15 | `src/application/use-cases/disconnect.command.ts` | create | application | Revoke at BattleGrid, discard local authority |
| 16 | `src/application/use-cases/record-audit.command.ts` | create | application | Two-phase audit write |
| 17 | `src/application/use-cases/list-audit.query.ts` | create | application | Per-user history, newest first |
| 18 | `src/application/use-cases/describe-grant.query.ts` | create | application | The honest description of what is granted |
| 19 | `src/infrastructure/battlegrid/oauth-client.ts` | create | infra | DCR-pinned client, PKCE, exchange, refresh, revoke |
| 20 | `src/infrastructure/battlegrid/capability-cache.ts` | create | infra | Per-session `tools/list`, degraded allowlist |
| 21 | `src/infrastructure/battlegrid/mcp-adapter.ts` | create | infra | Implements the port; **the only MCP SDK importer**; runs the 7-step call path |
| 22 | `src/infrastructure/battlegrid/fake-battlegrid.ts` | create | infra | Fake port for tests — no live account needed |
| 23 | `src/infrastructure/crypto/envelope.ts` | create | infra | Token encryption at rest |
| 24 | `src/infrastructure/db/schema/*.ts` | create | infra | Drizzle tables mirroring columns 1:1 |
| 25 | `src/infrastructure/db/repositories/*.ts` | create | infra | Drizzle repositories, `userId`-scoped |
| 26 | `src/composition-root.ts` | create | infra | The only place adapters are constructed |
| 27 | `app/api/auth/battlegrid/callback/route.ts` | create | presentation | Callback handler — pass-through only |
| 28 | `app/(app)/audit/page.tsx` | create | presentation | Audit history view |
| 29 | `src/presentation/components/consent-summary.tsx` | create | presentation | R4 — describes configuration authority honestly |
| 30 | `tests/**` | create | test | One test per scenario in the matrix above |

---

## Dependency / Call-Tree Sketch

```
app/api/auth/battlegrid/callback/route.ts
  └─ container.completeConnection            (application)
       ├─ ConnectionRepository (port)  ──────► DrizzleConnectionRepository
       ├─ BattleGridPort               ──────► McpBattleGridAdapter
       │                                          ├─ OAuthClient
       │                                          ├─ CapabilityCache ─► classify()  (domain)
       │                                          └─ RecordAuditCommand (application)
       └─ Clock (port)                 ──────► SystemClock
```

`classify()` sits in the domain and is pure. Everything dangerous is decided by
a function with no I/O, which is why it can be exhaustively tested.

---

## Checklist Coverage Matrices

### Architecture checklist coverage

| Rule | Applies to | Verified by |
|---|---|---|
| P1 Scope is not a safety boundary | #21 | `tests/capability/classify.test.ts`, `scope.test.ts` |
| P2 Runtime discovery, fail closed | #5, #20 | `tests/capability/discovery.test.ts` |
| P3 Audit before the attempt | #16, #21 | `tests/audit/audit.test.ts` |
| P4 Conflicts surfaced, never retried | #10, #21 | `tests/concurrency/conflict.test.ts` |
| P5 Compile free of effect | n/a this change | — (strategy authoring is a later change) |
| P6 One way in | #21, #26 | lint rule + `tests/architecture/boundaries.test.ts` |
| SOLID / DI | #13–#18 | constructor injection throughout |
| Query safety | #25 | repositories take `userId` first |

### Data pipeline checklist coverage

| Layer | Touched | Notes |
|---|---|---|
| 0 BattleGrid | yes | tokens and tool lists come from here, unmodified |
| 1 Postgres | yes | connections, audit, transactions, confirmations |
| 2 Schema | yes | 1:1 with columns |
| 3 Queries | yes | `userId`-scoped |
| 4 Mappers | yes | no defaults that mask missing data |
| 5 Use case | yes | the only layer computing derived values |
| 6 Server actions | yes | pass-through |
| 7 Client state | minimal | no credential ever in a store |
| 8 Components | yes | consent summary + audit list, display only |
| 9 Completeness | yes | every use case reachable |

### UI checklist coverage

Limited UI scope in this change: a consent summary and an audit list. The
Consequence & Confirmation section applies in full to the consent summary
(rule 9 — never describe read scope as read-only). No destructive action reaches
the UI in this change; that arrives with agent authoring.

---

## Phase-by-Phase Tasks

Task-level detail lives in `../tasks.md` (26 tasks). Phases:

| Phase | Tasks | Gate |
|---|---|---|
| 0 Prove assumptions | 0.1, 0.2 | 0.1 **complete** — `findings-dcr.md`. 0.2 unprovable headlessly; carried as a known unknown |
| 1 Scaffold + domain | inventory #1–#12 | `pnpm typecheck` passes; domain imports nothing outward |
| 2 Adapter + infra | #19–#26 | Fake port exists; boundary test passes |
| 3 Use cases | #13–#18 | Every requirement has a passing scenario test |
| 4 Presentation | #27–#29 | Consent copy reviewed against R4 |
| 5 Verification | #30 | Full suite green; `validate --all` clean |

---

## Phase 1 Review Checklist (Planner)

- [x] Every ADDED requirement has ≥1 implementing file
- [x] Every scenario has a named verification
- [x] No file in the inventory serves no requirement without being declared infrastructure
- [x] Constraints extracted from the architecture checklist, not invented
- [x] Out-of-scope items from the proposal are absent from the plan
- [x] Assumption-proving task sequenced first

## Phase 2 Review Checklist (Executor)

- [ ] All inventory files created
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes, including the boundary rule
- [ ] `pnpm test` passes with a test per scenario
- [ ] `python3 .claude/tools/openspec.py validate --all` reports 0 errors
- [ ] Review docs filled with evidence, status moved off PENDING
- [ ] Decision log updated with any deviation

## Phase 3 Review Checklist (Auditor — production gate)

- [ ] Spec parity: each of the 10 requirements delivered, with evidence
- [ ] No wager-scoped tool is reachable by any code path
- [ ] No hard-coded tool list grants anything (the degraded allowlist only denies)
- [ ] Audit cannot be bypassed by any mutating path
- [ ] No credential appears in logs, client state, or the repository
- [ ] Domain layer imports nothing outward
- [ ] Checklist parity: architecture P1–P6 satisfied
- [ ] Scope adherence: nothing built that the proposal excluded

---

## Artifacts

| Path | Purpose |
|---|---|
| `plan/master-plan.md` | this file |
| `plan/architecture-review.md` | executor fills with evidence |
| `plan/data-review.md` | executor fills with evidence |
| `plan/uiux-review.md` | limited UI scope |
| `plan/decision-log.md` | decisions across all phases |
| `design.md` | approach and rationale |
| `findings-dcr.md` | task 0.1 evidence |
| `tasks.md` | 26 executable tasks |

---

PLAN READY FOR REVIEW
