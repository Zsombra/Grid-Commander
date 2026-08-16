# Architecture Review: The Approval Can Be Answered

**Status: EXECUTION EVIDENCE RECORDED — one quality-gate command not run, stated below**

Slug: `the-approval-can-be-answered` · Checklist:
`docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md` · Base ref: `origin/main`

The executor fills the Evidence column with `file:line` or a command's output.
An unfilled row is an unmet row — do not mark a box on intent.

## Scope Summary

Two BattleGrid writes (`cancel_entry_decision`, `accept_entry_decision`), the
first `mcp:wager` operations this product performs. One new query, one new
command, one new domain module, one new confirmation-target case, one port
method, one new surface. `EntryDecision`, the confirmation mechanism and the
audit repository are **extended, not replaced** (DL-4).

## Layer Compliance

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Domain does not import the MCP client | `pending-decision.ts` imports only the port type; `boundaries.test.ts` passes. The one place this nearly broke was the server action importing `AnswerRefusal` — the guard caught it and the wording moved to `src/presentation/answer-refusal.ts` | ☑ |
| 2 | Dependencies point inward only | `boundaries.test.ts` W-D/W-E green: no file under `app/` imports infrastructure or the domain | ☑ |
| 3 | Tool names appear only in the infrastructure adapter | `wager.test.ts` A10 confines `accept_entry_decision`/`cancel_entry_decision` to `src/infrastructure/battlegrid/`. The mint site needed the name and asks the port for it (DL-13) rather than writing it | ☑ |
| 4 | New domain module is pure — no I/O, testable without an account | `pending-decision.ts` is pure functions over `EntryDecision`; `pending-decision.test.ts` (22) runs with no account and no client | ☑ |

## Project-Specific Policies

### P1 — Scope Is Not A Safety Boundary

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Nothing decides safety from scope alone | `ReadAnswerAuthorityQuery` decides what to **draw**; `beginGuardedCall` decides what is allowed, on every path including ones that never render. Recorded as a standing warning in DL-15 | ☑ |
| 2 | Destructiveness read from the tool's annotation (`cancel` is `destructiveHint: true`) | Classification comes from the live capability record inside `call`; nothing in this change asserts destructiveness itself | ☑ |
| 3 | No copy calls read scope "read-only" or "view-only" — **including the new step-up surface** | Step-up copy says the connection *connects without authority to commit your funds* — true of wager scope, never claimed of read scope. `consent-summary.tsx` and `wager-authority.tsx` were corrected in the same pass (DL-16); `consent.test.ts` still fails on softening | ☑ |

### P2 — Capabilities Are Discovered At Runtime

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | No hard-coded tool list | The adapter resolves both tools through the same runtime classifier as every other call | ☑ |
| 2 | Both tools resolved from the live connection | `answerDecisionTool(verb)` names the tool; classification and scope are read live in `call` | ☑ |
| 3 | Unknown tool treated as destructive — fail closed | `beginGuardedCall` throws `DiscoveryUnavailableError` for `unknown`/`degraded-allowlist` mutating tools before anything else | ☑ |
| 4 | Discovery failure degrades to confirmed-read-only and says so | Inherited unchanged from `call-path.ts`; this change adds no branch to it | ☑ |

### P3 — Every Write Is Audited, Recorded Before The Attempt

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Audit row written **before** the call | `beginGuardedCall` opens the row before the platform is asked; `answerEntryDecision` routes through it like every other write | ☑ |
| 2 | Row updated with the outcome | The guard completes the row with success or `failed`; the command re-throws a platform failure rather than swallowing it, asserted in `answer-authority.test.ts` | ☑ |
| 3 | Interrupted answer reads as attempted, outcome unknown — never absent | Inherited from the guard path — the row exists before the call, so an interruption leaves `attempted` rather than nothing | ☑ |
| 4 | No mutating path reaches BattleGrid without a row | The only path to the two tools is `AgentsPort.answerEntryDecision` → `call` → `beginGuardedCall`; A10 confines the names to that file | ☑ |
| 5 | ~~A binding refusal is audited too~~ **PLAN ERROR, CORRECTED IN EXECUTION.** A binding refusal is **not** audited: it never reached BattleGrid, and `call-path.ts` already establishes that a refused call writes no row because "recording it as attempted would be a lie in the other direction". `wager.test.ts` asserts exactly that for a scope refusal. The plan asked for the opposite of the codebase's tested position. See DL-9 | `src/application/use-cases/answer-decision.command.ts` — returns a typed refusal before touching the port; `tests/agent/answer-decision.test.ts` asserts `agents.calls` is empty on every refusal path | ☑ |

### P4 — Optimistic Concurrency — **EXCEPTED, SEE PE-1 / DL-2**

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | ~~Every mutation carries `expectedRevision`~~ **EXCEPTED** — the platform publishes no revision on a decision. Auditor must confirm the limitation is real | **PE-1 was confirmed on 2026-08-15 by change task 0.2** — a re-read of decision `6c11b3dc` returning 35 keys with no `revision`, `version`, `updatedAt` or ETag. That is the proof; this row does not replace it. **What today adds is a re-check at a different server version.** Task 0.2 ran at v19.1.0; #329 then found v19.2.0 had arrived unannounced, with 1 output schema changed and 7 leaves added. A re-read at v19.2.0 on 2026-08-16 returns the same 35 keys and still no concurrency token — which matters only because this repo has twice been caught by a surface whose count and inputs held still while the shape moved underneath (#198, #301). **Auditor: 0.2 is the evidence; this is a version guard on it** | ☑ |
| 1a | Substitute in force: all five of `entryPrice`, `stopLoss`, `takeProfit`, `status === "PENDING"`, `closedAt === null` verified on one re-read immediately before the write | `checkAnswerable` verifies all five against one re-read taken in `AnswerDecisionCommand` immediately before the port call. `pending-decision.test.ts` (22) + `answer-decision.test.ts` cover each refusal cause | ☑ |
| 2 | A refused binding is reported to the user, naming what moved | `explainAnswerRefusal` names the field, the shown value and the current value; the decision page renders it through `CarriedProblem` (role=alert). Asserted in `answer-authority.test.ts` | ☑ |
| 3 | **No automatic retry** — NOT excepted, holds absolutely | No retry exists on any path. A refusal redirects to a freshly described decision and offers no one-click retry — recorded as a constraint on the decision manifest | ☑ |

### P6 — One Way In

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Every call goes through the port | `P6` holds: the surfaces call use cases, the use cases call `AgentsPort` | ☑ |
| 2 | MCP client constructed only in the composition root | Unchanged by this change; `composition.ts` remains the only construction site | ☑ |
| 3 | No feature reaches the MCP SDK directly | `boundaries.test.ts` green | ☑ |

## Confirmation Binding (DL-1, DL-3)

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | `confirmationTarget.decisionAnswer` is the **only** construction site | Composition moved **into the command** this session (DL-12) so the server action never touches a target; `edit-binding.test.ts` asserts the only target-shaped literal in `src/` lives in `confirmation.ts` | ☑ |
| 2 | Guard test extended so an inline target fails the build | `edit-binding.test.ts` `TARGET_SHAPES` gained `/decision:\$\{/` — inventory item 9, now done | ☑ |
| 3 | **Accept and cancel produce different targets** — asserted by test, not inspection | Asserted twice: at the mint (`approval-queue.test.ts`) and at the port (`answer-decision.test.ts`, *cannot spend a cancel agreement on an accept*) | ☑ |
| 4 | The command cannot be called without the bound values (compiler-enforced, per the `agentEdit` precedent) | `AnswerDecisionRequest.shown` is required and non-optional; the target is composed from it, so a caller cannot reach the port without supplying what was shown | ☑ |
| 5 | Binding verified against a re-read, never against the rendered copy | `AnswerDecisionCommand.findDecision` issues its own read; `shown` arrives from the form. Two reads, compared — that is the binding | ☑ |

## Use Case Compliance

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Query and command separated (CQRS section) | `ReadApprovalQueueQuery`, `ReadPendingDecisionsQuery`, `ReadAnswerAuthorityQuery` and `DescribeDecisionAnswerQuery` read; `AnswerDecisionCommand` writes | ☑ |
| 2 | One responsibility each | The account-wide fan-out is its own query rather than a flag on the per-agent one (DL-14), because partial failure is a different problem | ☑ |
| 3 | Refusals are typed results, not thrown-and-swallowed | `AnswerDecisionResult` carries `refused` with a typed `AnswerRefusal`; only genuine platform failures throw, and the action re-throws anything that is not a confirmation or scope refusal | ☑ |
| 4 | No console logging | None added; `lint` clean | ☑ |
| 5 | No string literals where an enum exists | `DecisionAnswerVerb` is a union, `ANSWERABLE_STATUS` is a named constant, `STEP_UP_SCOPES`/`STEP_UP_PERMITS` are named constants | ☑ |

## Quality Gate

| Command | Result | Status |
|---|---|---|
| `npm run typecheck` | clean | ☑ |
| `npm run lint` | clean | ☑ |
| `npm test` | **2681 passed across 211 files** | ☑ |
| `npm run build` | compiled; `/approvals`, `/approvals/[agentId]/[id]` and `/approvals/authority` all emitted | ☑ |
| `npm run db:generate && git diff --quiet drizzle/` | *No schema changes*; `drizzle/` clean | ☑ |
| `npm run test:db` (needs `DATABASE_URL`; CI provides postgres) | **NOT RUN — and the gate is not claimed as passed.** The suite truncates every table it touches including the signal record; `DATABASE_URL` here points at the real `grid_commander` and the suite's own guard refuses. Overriding it would destroy a record BattleGrid cannot re-serve. Needs a disposable database (CI) | ☐ |

## Violations Found

**None outstanding. Three were found during execution and fixed rather than accepted:**

1. `app/(app)/approvals/[agentId]/[id]/actions.ts` imported `AnswerRefusal` from
   the domain — a route reaching past its use case (**W-D**). Caught by
   `tests/architecture/boundaries.test.ts`; the wording moved to
   `src/presentation/answer-refusal.ts`, which may hold it.
2. The same page rendered `confirmationToken ?? ''`, coercing a missing agreement
   into an empty one and producing a form that could only ever be refused.
   Caught by `tests/agent/concurrency.test.ts`; the branch now checks for the
   token and renders no control without one (DL-15).
3. `app/(app)/approvals/authority/page.tsx` carried a hidden `next` field the
   server action never read — a control whose value no operation receives. Caught
   by `tests/architecture/reachability.test.ts`; removed, because the grant
   returns through the OAuth callback which knows nothing about that page.

**Two policy notes for the auditor, neither a violation:**

- **PE-1 was already proven by task 0.2 on 2026-08-15**; the P4 row above adds a
  re-check at v19.2.0, not a first proof. Two documented traps picked up **fresh
  instances** from the same read — neither is a new finding, and both are recorded
  here because they are things a later change could still get wrong:
  - **`executedAt` is set at creation, not at fill.** Every EXPIRED decision
    carries `executedAt` **equal to `createdAt`** and `entryFillPrice: null` —
    e.g. `f67c36af`, `executedAt` and `createdAt` both `05:19:37.725Z`, nothing
    ever executed. Rendering it as "when the trade opened" would put a fill time
    on a trade that never happened.
  - **`expiresAt` is rewritten on acceptance**, confirming the caveat DL-1
    retired. `ec5d1d33` was created `18:05:54` with a 15-minute window and reads
    `expiresAt 18:34:00` — exactly `executedAt` + 15 min. `9ea95de6` reproduces
    it: created `23:02:43`, `executedAt 23:15:03`, `expiresAt 23:30:03`. **N is
    now 2**, not 1, and the levels stay in the binding.
- **The Phase D gate has not been crossed.** Section 5 is unbuilt and
  `tests/rendering/approvals.test.ts` asserts that no accept control is rendered
  on either authority branch. The git history shows cancel built first, as DL-6
  requires the auditor to verify from history rather than from assertion.

## Verdict

- [x] Approved **for the scope built** — everything up to the Phase D gate
- [ ] Changes requested

`npm run test:db` was **not run** and is not claimed. It truncates every table it
touches including the signal record, which BattleGrid cannot re-serve because it
serves current readings only; `DATABASE_URL` on this machine points at the real
database and the suite's own guard refuses. It needs a disposable database.
