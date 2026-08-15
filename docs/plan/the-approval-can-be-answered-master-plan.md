# Master Plan: The Approval Can Be Answered

## Status

| Field | Value |
|---|---|
| Slug | `the-approval-can-be-answered` |
| Change | `openspec/changes/the-approval-can-be-answered/` |
| Phase | **2 — Execution (Phase A complete; B–G open)** |
| Base ref | `origin/main` |
| Track | `full` |
| Last updated | 2026-08-15 |

Checklists read from `docs/checklists/` (**not** `docs/specs/` — the planner
skill names a path this project does not use; CLAUDE.md is authoritative).

## Objective

Let an operator answer a trade their agent proposed — cancel it, or accept it —
with the agreement bound to what they were shown, and cancel proven live before
accept exists at all.

## Non-Negotiable Constraints

From `docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md`:

| ID | Constraint | How this change honours it |
|---|---|---|
| Dependency Rule | Dependencies point inward; **the domain must not import the MCP client** | Answering is a domain command over a port; tool names appear only in the adapter |
| P1 | Scope is not a safety boundary | Destructiveness read from the tool's annotation (`cancel` is `destructiveHint: true`), never inferred from `mcp:wager` |
| P2 | Capabilities discovered at runtime; unknown ⇒ destructive | No hard-coded tool list; both tools resolved through the existing capability classifier |
| P3 | Every write audited, **row written before the attempt** | Audit row precedes both calls; updated with outcome; a refused binding is audited too |
| P4 | Every mutation carries `expectedRevision` from a fresh read | **CANNOT BE SATISFIED — see Planned Exception PE-1** |
| P5 | Compile free of effect; apply is not | N/A — no compile step in this flow |
| P6 | One way in — every call through the port | Answering goes through `AgentsPort`; no feature touches the MCP SDK |

From `docs/checklists/DATA_PIPELINE_REVIEW_CHECKLIST.md`:

| Iron Rule | Application |
|---|---|
| Every displayed value traces to a BattleGrid response, a DB column, or a server-side derivation returned as a first-class DTO field | Every field on the queue row comes from the observed payload. **No currency amount may be computed** — see PE-2 |
| A cached BattleGrid value is displayed as a snapshot with its age | The queue is read fresh; the re-read before the write is the whole binding |

## Planned Exceptions

### PE-1 — `expectedRevision` cannot be carried (violates P4 as written)

**A BattleGrid entry decision publishes no revision.** 35 keys observed on both
a live `PENDING` and a settled `CANCELLED` payload: no `revision`, `version`,
`updatedAt`, or ETag. `accept_entry_decision` and `cancel_entry_decision` each
take `decisionId` alone. This is the only BattleGrid mutation that departs from
the `expectedRevision` pattern.

**Substitute, ruled by the operator (change task 0.1)**: the answer binds
`decisionId` + `entryPrice` + `stopLoss` + `takeProfit` + `status === "PENDING"`
+ `closedAt === null`, all five verified on one re-read taken immediately before
the write.

P4's *intent* — never apply an intent formed against a state that no longer
exists — is preserved. P4's *mechanism* is unavailable. **P4 item 3 still holds
absolutely: no automatic retry.**

### PE-2 — the confirmation cannot name a currency amount (Iron Rule edge)

The platform computes no size until accept time; a decision carries
`positionSizePct` with every fill field null. Deriving an amount client-side
would violate the Iron Rule directly. The confirmation states the proportion.
Filed as #305.

## Architectural Boundaries

```
app/  +  src/presentation/     queue surface, confirmation, step-up
        ↓
src/application/use-cases/     read-pending-decisions.query
                               answer-decision.command
        ↓
src/domain/  +  src/ports/     PendingDecision rules, confirmationTarget case,
                               AgentsPort methods
        ↓
src/infrastructure/            BattleGrid adapter: the two wager calls
```

## File & Responsibility Inventory

**Much of this already exists.** `EntryDecision` (`src/ports/agents.ts:518`)
already carries `entryPrice`, `stopLoss`, `takeProfit`, `status`,
`positionSizePct`, `checklist` and `reasoning`; `readEntryDecisions`
(`:200`) already reads them. The binding mechanism
(`src/domain/capability/confirmation.ts`) already exists and is already guarded.
**Extend; do not build parallel machinery.**

| # | File | Action | Layer | Responsibility |
|---|---|---|---|---|
| 1 | `src/ports/agents.ts` | modify | domain/ports | Add `closedAt` to `EntryDecision` (needed for liveness, not currently mapped). Add `answerEntryDecision` to `AgentsPort` |
| 2 | `src/domain/agent/pending-decision.ts` | create | domain | Liveness predicate and the level-comparison; pure, no I/O |
| 3 | `src/domain/capability/confirmation.ts` | modify | domain | Add `confirmationTarget.decisionAnswer(verb, decisionId, entry, stop, target)` — **accept and cancel MUST produce different targets** |
| 4 | `src/application/use-cases/read-pending-decisions.query.ts` | create | application | Read the queue; map to a DTO with no derived currency |
| 5 | `src/application/use-cases/answer-decision.command.ts` | create | application | Re-read, verify all five, audit, call, audit outcome |
| 6 | `src/infrastructure/battlegrid/agents.adapter.ts` | modify | infrastructure | Map `closedAt`; implement `answerEntryDecision` over the two tools |
| 7 | `src/presentation/.../approvals/` | create | presentation | Queue surface + confirmation |
| 8 | connection step-up surface | modify | presentation | Offer wager authority from point of use |
| 9 | `tests/agent/edit-binding.test.ts` | modify | test | Extend the guard so the new target cannot be composed inline |
| 10 | `tests/agent/pending-decision.test.ts` | create | test | The five-condition binding, both refusal causes |
| 11 | `tests/agent/wager.test.ts` | **modify (Phase C)** | test | **Added during execution — not in the original plan.** A10 asserts no fund-committing tool name appears in `src/` or `app/`. Phase C must narrow the structural half deliberately and keep the behavioural half. See DL-7 |
| 12 | `tests/support/agent-fakes.ts` | modify | test | **Added during execution.** `anEntryDecision` gains `closedAt` |
| 13 | `tests/rendering/pipeline.test.ts` | modify | test | **Added during execution.** Two decision fixtures gain `closedAt` |

## Dependency / Call-Tree Sketch

```
approvals surface
  └─> ReadPendingDecisionsQuery ──> AgentsPort.readEntryDecisions(status PENDING)
  └─> confirmation rendered, token issued
        target = confirmationTarget.decisionAnswer(verb, id, entry, stop, tp)
  └─> AnswerDecisionCommand
        ├─> AgentsPort.readEntryDecisions  (the re-read)
        ├─> pending-decision: isAnswerable() && levelsMatch()   ← refuse here
        ├─> ConfirmationStore.consume(token, user, tool, target) ← refuse here
        ├─> AuditRepository.record(attempt)                     ← BEFORE the call
        ├─> AgentsPort.answerEntryDecision(verb, decisionId)
        └─> AuditRepository.update(outcome)
```

## Checklist Coverage Matrices

### Architecture

| Rule | Files | Notes |
|---|---|---|
| P1 scope not a boundary | 5, 6 | Destructiveness from annotation; copy never says "read-only" |
| P2 runtime discovery | 6 | Both tools resolved live; unknown ⇒ destructive |
| P3 audit before attempt | 5 | Includes binding refusals |
| P4 concurrency | 2, 3, 5 | **PE-1**; no retry anywhere |
| P6 one way in | 5, 6 | Port only |
| SOLID / SRP | 2, 4, 5 | Query and command separated per CQRS section |
| Error handling | 5 | Refusals are typed results, never swallowed |

### Data pipeline

| Rule | Files | Notes |
|---|---|---|
| Iron Rule | 4, 7 | Every field from the payload; **PE-2** — no computed amount |
| No client derivation | 7 | Proportion rendered as sent |
| Snapshot with age | 7 | `expiresAt` drives the remaining-time display |

### UI (`Consequence & Confirmation`, the section the checklist calls "the reason the UI exists")

| # | Rule | Application |
|---|---|---|
| 1 | Modifying action visually distinct from reading | Accept/cancel distinct from the queue read |
| 2 | Destructive action names what is lost | Cancel names the proposal that will not return |
| 3 | Consequence, not mechanism | Never "this calls accept_entry_decision" |
| 5 | Gate by **not rendering**, never by disabling | Accept absent until cancel is available; confirmation absent until the decision is rendered |
| 6 | Not styled as equal-weight siblings | Cancel and accept are not twin buttons |
| 8 | State-moved explained, no one-click retry | The five-condition refusal names what moved |
| 9 | Never call read scope "read-only" | Step-up copy |

## Phase-by-Phase Tasks

Task detail lives in `openspec/changes/the-approval-can-be-answered/tasks.md`
(38 items, 4 complete). This plan does not duplicate it. Phase mapping:

| Plan phase | tasks.md sections | Exit condition |
|---|---|---|
| **A — Read** | 1 | **PARTIALLY COMPLETE 2026-08-15.** Done: `closedAt` on the port type and mapper, the `PendingDecision` domain module, the `decisionAnswer` confirmation target, 19 tests. **Not done: the read query and the queue surface** |
| B — Authority & audit | 2 | No write path can reach BattleGrid without an audit row |
| C — Cancel | 3 | Cancel works end to end through the product |
| D — **GATE** | 4 | **A cancel performed through the product, audited, read back. Section 5 is not begun until this passes.** |
| E — Accept | 5 | Accept works, reusing C's binding and audit unchanged |
| F — Retire disclosure | 6 | `An Unanswerable Trading Mode Says So` removed |
| G — Verify | 7 | Quality gates + `openspec.py validate` clean |

**The gate is the plan's central safety property.** Sections 3 and 5 share the
binding, the audit and the adapter shape; cancel exercises all of it while
committing no money.

## Phase 1 Review Checklist — Planner

- [x] Checklists located and read (`docs/checklists/`, not `docs/specs/`)
- [x] Layer model and constraints extracted, not invented
- [x] Existing machinery inspected — `EntryDecision`, `confirmationTarget`, audit — and the plan extends rather than duplicates
- [x] Every P1–P6 policy addressed, with the one unsatisfiable policy raised as **PE-1** rather than quietly skipped
- [x] Iron Rule edge raised as **PE-2**
- [x] File inventory complete with responsibilities
- [x] Review scaffolds and decision log created
- [x] No production file modified

## Phase 2 Review Checklist — Executor

- [ ] Every file in the inventory created/modified as described, or the deviation logged
- [ ] `confirmationTarget.decisionAnswer` is the **only** construction site; guard test extended
- [ ] Accept and cancel produce **different** targets — asserted by test
- [ ] Audit row precedes every attempt, including refused bindings
- [ ] No `expectedRevision` invented; no retry path anywhere
- [ ] No currency amount derived for a pending decision
- [ ] **Phase D gate passed before any Phase E file was written**
- [ ] Quality gates pass: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run db:generate && git diff --quiet drizzle/`. `npm run test:db` needs `DATABASE_URL` — run in CI, skip locally if absent
- [ ] Review docs filled with evidence; decision log updated

## Phase 3 Review Checklist — Auditor

- [ ] PE-1 verified as a genuine platform limitation, not convenience — re-read a decision and confirm no revision field
- [ ] Binding cannot be bypassed: no inline target composition, no path to the adapter that skips the re-read
- [ ] Accept and cancel targets provably distinct
- [ ] Audit completeness: no mutating path reaches BattleGrid without a row written first
- [ ] Gate honoured — git history shows cancel proven before accept written
- [ ] No UI copy describes read scope as read-only; no computed currency amount
- [ ] Spec deltas match implementation; `An Unanswerable Trading Mode Says So` actually removed

## Artifacts

| File | Purpose |
|---|---|
| `docs/plan/the-approval-can-be-answered-master-plan.md` | This plan |
| `docs/plan/the-approval-can-be-answered-architecture-review.md` | Executor evidence — architecture |
| `docs/plan/the-approval-can-be-answered-data-review.md` | Executor evidence — data pipeline |
| `docs/plan/the-approval-can-be-answered-uiux-review.md` | Executor evidence — UI |
| `docs/plan/the-approval-can-be-answered-decision-log.md` | Decisions across all phases |
| `openspec/changes/the-approval-can-be-answered/` | Proposal, deltas, design, tasks |
| `openspec/backlog/approvals-have-no-write-side.md` | The observed evidence everything rests on |

PLAN READY FOR REVIEW
