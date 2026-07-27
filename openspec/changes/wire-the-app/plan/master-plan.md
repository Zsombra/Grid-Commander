# Master Plan: wire-the-app

| | |
|---|---|
| **Change** | `wire-the-app` |
| **Track** | full |
| **Phase** | Execution complete |
| **Base ref** | `edb292d` (archive of `author-agents`) |
| **Last updated** | 2026-07-27 |

## Objective

Make the product reachable: a session, a composition root, the persistence the
ports have always assumed, and routes for every behaviour the previous two
changes delivered.

## Requirement Coverage Matrix

Delta: 6 ADDED (`app-access`), **16 scenarios**.

| Req | Requirement | Implementing file(s) | Scenario → verification |
|---|---|---|---|
| X1 | A Request Acts For Exactly One Identified User | `session.ts`, `cookie-session.ts`, `current-user.query.ts` | Connected user → `tests/access/authority.test.ts::acts for the user the session identifies`<br>No session → `::refuses a request with no session`<br>Unknown user → `::refuses a session naming a user who does not exist`<br>Not issued by us → `tests/access/session.test.ts::rejects a session signed with a different secret` |
| X2 | A Session Is Not A BattleGrid Credential | `session.ts`, `cookie-session.ts` | What it carries → `session.test.ts::contains the user id and nothing else`<br>Disclosed → `::is not readable by scripts…` + `::is secure unless explicitly told otherwise` |
| X3 | Authority Is Refreshed Before Use | `resolve-authority.query.ts` | Near expiry → `authority.test.ts::refreshes before the call`<br>Cannot refresh → `::expired with nothing to refresh from`<br>Stored → `::stores the refreshed authority` |
| X4 | Losing Authority Is One Outcome | `resolve-authority.query.ts`, `current-user.query.ts`, `require-connection.tsx` | Revoked here → `authority.test.ts::the connection was revoked here`<br>Revoked at BattleGrid → `::BattleGrid refused the refresh` (all four cases share one assertion) |
| X5 | Every Capability Is Reachable | 10 route files under `app/` | Connect/disconnect, audit, agent authoring → `boundaries.test.ts::W-D` plus the routes themselves |
| X6 | Assembled Once, From Configuration | `composition.ts`, `config.ts` | Single adapter → `boundaries.test.ts::no route constructs an adapter of its own`<br>Missing configuration → `config.ts::required()` throws |

## Non-Negotiable Constraints

Unchanged from the previous two changes, plus:

| Constraint | Enforcement |
|---|---|
| Routes call use cases and nothing deeper | `boundaries.test.ts::no file under app/ imports infrastructure or the domain` |
| One composition root | `boundaries.test.ts::no route constructs an adapter of its own` |
| One decryption point | `boundaries.test.ts::only resolve-authority reads a stored token` |
| A session carries no BattleGrid authority | `session.test.ts::contains the user id and nothing else` |
| Quality gate | `npm run typecheck && npm run lint && npm test` |

## File & Responsibility Inventory

| File | Action | Layer | Responsibility |
|---|---|---|---|
| `src/domain/session/session.ts` | create | domain | A session as a signed pointer; lifetime; the one not-connected message |
| `src/ports/session.ts` | create | ports | Read / issue / clear, without the domain knowing what a cookie is |
| `src/infrastructure/http/cookie-session.ts` | create | infrastructure | HMAC, constant-time verify, cookie flags |
| `src/application/use-cases/resolve-authority.query.ts` | create | application | The only place a token is obtained or refreshed |
| `src/application/use-cases/current-user.query.ts` | create | application | Who this request acts for |
| `src/application/use-cases/read-catalog.query.ts` | create | application | So a route never touches the agent port |
| `src/infrastructure/db/repositories/drizzle-connection-repository.ts` | create | infrastructure | Connections, users, OAuth transactions, the token vault |
| `src/infrastructure/db/repositories/drizzle-audit-repository.ts` | create | infrastructure | Audit entries and confirmation tokens |
| `src/composition.ts` | create | infrastructure | Assemble once from configuration |
| `src/config.ts` | modify | infrastructure | `SESSION_SECRET`, secure-cookie default |
| `src/presentation/session.ts` | create | presentation | The two lines every route starts with |
| `src/presentation/require-connection.tsx` | create | presentation | One not-connected surface |
| `src/presentation/components/audit-list.tsx` | move | presentation | Was under `app/`; it is a component |
| `app/connect/page.tsx` + 9 more route files | create | presentation | Every behaviour, reachable |
| `tests/access/*.test.ts` (3 files) | create | test | 16 scenarios + the end-to-end proof |
| `tests/architecture/boundaries.test.ts` | modify | test | Three structural rules for routes |

## Dependency / Call-Tree Sketch

```
request → app/**/page.tsx
   └── presentation/session.ts  → composition.app(cookies)
         ├── CurrentUserQuery
         │     ├── SessionPort      (cookie-session)
         │     ├── ConnectionReader (drizzle)
         │     └── ResolveAuthorityQuery ── the only decryption + refresh point
         └── one use case → port → adapter → callTool → guard sequence → BattleGrid
```

## Phase 2 Review Checklist (Executor)

- [x] All 16 scenarios have passing tests
- [x] One end-to-end test through the real path
- [x] `npm run typecheck` PASS
- [x] `npm run lint` PASS
- [x] `npm test` PASS — 254
- [x] `validate wire-the-app --strict` clean
- [x] Mutation-checked: signature verification, refresh trigger
- [x] Backlog `no-composition-root` closed

## Phase 3 Review Checklist (Auditor)

- [ ] Spec parity: 6 ADDED delivered
- [ ] Previous capabilities' requirements still hold
- [ ] Fallback-masking scan on touched paths
- [ ] Scan: no route reaches past the application layer
- [ ] Scan: one decryption point, one composition root
- [ ] Session flags: httpOnly, secure by default, sameSite

---

EXECUTION READY FOR PRODUCTION GATE
