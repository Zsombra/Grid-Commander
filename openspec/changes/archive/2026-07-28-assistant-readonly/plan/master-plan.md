# Master Plan: assistant-readonly

| | |
|---|---|
| **Change** | `assistant-readonly` · **Track** | full |
| **Phase** | Execution complete |
| **Base ref** | `6e59337` (archive of `author-strategies`) |
| **Last updated** | 2026-07-28 |

## Objective

The last MVP change: a read-only assistant over the user's own BattleGrid setup,
where read-only is a property of what it is given rather than what it is told.

## Requirement Coverage Matrix

6 ADDED (`assistant`), **16 scenarios**.

| Req | Requirement | Implementing file(s) | Verification |
|---|---|---|---|
| S1 | The Assistant Can Only Read | `toolset.ts`, `ask-assistant.command.ts` | `tests/assistant/toolset.test.ts` (7), `ask.test.ts::the toolset handed to the assistant` (3), `structure.test.ts` (3) |
| S2 | An Answer Names What It Was Built From | `answer.ts`, `ask-assistant.command.ts`, `assistant-answer.tsx` | `ask.test.ts::attribution` (3) |
| S3 | The Assistant Answers About This User's Account | `ask-assistant.command.ts`, `answer.ts` | `ask.test.ts::the phrases for what it cannot do` (2) |
| S4 | Not Knowing Is An Answer | `answer.ts` | `ask.test.ts::a read that did not return` (2) |
| S5 | Asking Requires An Account That Can Act | `ask-assistant.command.ts` | `ask.test.ts::losing access` (4) |
| S6 | What The Assistant Did Is Visible To The User | audit `actor` through 6 layers, `audit-list.tsx` | `structure.test.ts::assistant reads are attributable` (2), `ask.test.ts::marks its reads` |

**6/6 delivered, 0 scenarios uncovered.**

## Non-Negotiable Constraints

| Constraint | Enforcement |
|---|---|
| The assistant holds no mutating tool | `toolset.test.ts::has no overlap with the mutating half of the surface` |
| The toolset has one source | `structure.test.ts::is built by readOnlyToolset and nowhere else` |
| The filter derives from `classifyTool`, not a name list | `structure.test.ts` |
| The port cannot reach BattleGrid except through `callTool` | `structure.test.ts::the assistant port is given a callTool and nothing else` |
| Every audit row says who caused it | `structure.test.ts::the audit entry carries an actor at every layer` |
| Quality gate | `npm run typecheck && npm run lint && npm test` |

## File & Responsibility Inventory

| File | Action | Layer | Responsibility |
|---|---|---|---|
| `src/domain/assistant/toolset.ts` | create | domain | Read-only as a filtered set |
| `src/domain/assistant/answer.ts` | create | domain | Answer shapes, incompleteness, refusal copy |
| `src/ports/assistant.ts` | create | ports | The model as a port |
| `src/application/use-cases/ask-assistant.command.ts` | create | application | Derive, re-check, abandon on revocation |
| `src/infrastructure/assistant/not-configured.ts` | create | infrastructure | Honest refusal until a model is chosen |
| `src/domain/audit/audit-entry.ts` | modify | domain | `AuditActor` |
| `src/domain/audit/audit-repository.ts` | modify | domain | `NewAuditEntry.actor` |
| `src/infrastructure/db/schema/index.ts` | modify | infrastructure | `actor` column, defaulted |
| `src/infrastructure/db/repositories/drizzle-audit-repository.ts` | modify | infrastructure | Write and read it |
| `src/infrastructure/battlegrid/call-path.ts` | modify | infrastructure | Carry it, defaulting to `user` |
| `src/ports/battlegrid.ts`, `mcp-adapter.ts` | modify | ports/infra | Thread it |
| `src/presentation/components/assistant-answer.tsx` | create | presentation | Answer + citation |
| `src/presentation/components/audit-list.tsx` | modify | presentation | Show the actor |
| `app/(app)/assistant/page.tsx` | create | presentation | Ask a question |
| `src/composition.ts` | modify | infrastructure | Wire it |
| `tests/assistant/*.test.ts` (3 files) | create | test | 16 scenarios + structural guards |

## Phase 2 Review Checklist (Executor)

- [x] All 16 scenarios have passing tests
- [x] `npm run typecheck` / `lint` / `test` PASS — 390
- [x] `validate assistant-readonly --strict` clean
- [x] Mutation-checked: filter, re-check, revocation flag
- [x] The `actor` threaded through every layer, with a type error at each missed site

## Phase 3 Review Checklist (Auditor)

- [ ] Spec parity: 6 ADDED delivered
- [ ] The four prior capabilities still hold
- [ ] Fallback-masking scan on touched paths
- [ ] The identifier guard still passes over the enlarged `src/`
- [ ] No mutating tool can reach the assistant
- [ ] No wager tool reachable anywhere

---

EXECUTION READY FOR PRODUCTION GATE
