# Decision Log: The Approval Can Be Answered

Slug: `the-approval-can-be-answered` · Base ref: `origin/main`

High-signal decisions only. Cosmetic choices are not logged.

---

## DL-1 — The answer binds levels **and** liveness, not a revision

| Field | Value |
|---|---|
| Timestamp | 2026-08-15 |
| Phase | 1 — Planning (ruled during change task 0.1) |
| Type | Contract / safety |
| Decision | An answer binds `decisionId` + `entryPrice` + `stopLoss` + `takeProfit` + `status === "PENDING"` + `closedAt === null`, all five verified on one re-read taken immediately before the write |
| Impacted files | `src/domain/agent/pending-decision.ts`, `src/domain/capability/confirmation.ts`, `src/application/use-cases/answer-decision.command.ts` |
| Reason | A BattleGrid entry decision publishes **no revision** — 35 keys observed on both a live `PENDING` and a settled `CANCELLED` payload, with no `revision`, `version`, `updatedAt` or ETag, and both write tools take `decisionId` alone. Liveness was added to the operator's original levels-only instruction because a decision can re-read with all three levels matching while being expired or already answered elsewhere; levels alone would forward that to the platform after telling the operator their answer was being performed |
| Approved by | Operator, by name, 2026-08-15 |
| Next action | Implement in Phase C; assert all five in `tests/agent/pending-decision.test.ts` |

~~**Caveat carried forward**: mutability evidence is **N = 1**.~~
**CAVEAT RETIRED 2026-08-15 18:19Z — the levels were right to keep.**

The caveat said one observed transition was not proof a `PENDING` decision can
never be re-priced. An accept observed the same day settles it in the other
direction: **`expiresAt` was rewritten**. Decision
`ec5d1d33-0164-48c1-b02f-8f086058ed46` was created 18:05:54 with a 15-minute
window — due to expire 18:20:54 — and reads `expiresAt: 18:34:00.258Z`, exactly
`executedAt` + 15 minutes.

Decision fields **do** change across a lifecycle transition. Had the binding
been reduced to liveness alone, as the "content never moves" reading invited, it
would have been built on something now known to be false. The three levels stay.

Two more corrections from the same payload, both already handled correctly in
the code but not by design:

- **`status` and `tradeStatus` diverge** (`EXECUTED` / `LIVE`). They moved
  together on the cancel; do not derive one from the other.
- **`closedAt` stays null on an EXECUTED decision.** So `closedAt` alone is not
  a liveness test — `status === "PENDING"` carries real weight in the pair, and
  a `closedAt`-only check would treat a live position's decision as answerable.
  `isAnswerable` already requires both.

---

## DL-2 — P4 (`expectedRevision`) is formally excepted, not silently skipped

| Field | Value |
|---|---|
| Timestamp | 2026-08-15 |
| Phase | 1 — Planning |
| Type | Policy exception |
| Decision | This change cannot satisfy architecture policy **P4 item 1** ("every mutation carries `expectedRevision` from a fresh read"). Recorded as **PE-1** in the master plan |
| Impacted files | `src/application/use-cases/answer-decision.command.ts`, `plan/architecture-review.md` |
| Reason | The platform publishes no revision on a decision. P4's *intent* — never apply an intent formed against a state that no longer exists — is preserved by DL-1's five-condition binding. P4's *mechanism* is unavailable |
| Approved by | Operator (implied by the DL-1 ruling); **auditor must verify the limitation is real, not convenient** |
| Next action | Auditor re-reads a decision and confirms no revision field before passing the gate |

**P4 item 3 is not excepted.** No automatic retry, anywhere, under any
circumstance.

---

## DL-3 — Accept and cancel MUST produce different confirmation targets

| Field | Value |
|---|---|
| Timestamp | 2026-08-15 |
| Phase | 1 — Planning |
| Type | Safety |
| Decision | `confirmationTarget.decisionAnswer` takes the **verb** as an argument, so a token issued for a cancel cannot be spent on an accept |
| Impacted files | `src/domain/capability/confirmation.ts`, `tests/agent/edit-binding.test.ts` |
| Reason | Direct precedent already in the codebase: `agentDeploy` and `agentUndeploy` are deliberately separate for exactly this reason — *"opposite acts on the same pair, so they must not share a target: a token agreeing to stop an agent could otherwise be spent starting it."* Here the asymmetry is far worse than deploy/undeploy: cancel commits nothing, accept opens a position with real money. A shared target would let an agreement to decline authorise a purchase |
| Approved by | Planner, on documented in-codebase precedent |
| Next action | Assert distinctness by test, not by inspection |

---

## DL-4 — Extend `EntryDecision` and `confirmationTarget`; build no parallel machinery

| Field | Value |
|---|---|
| Timestamp | 2026-08-15 |
| Phase | 1 — Planning |
| Type | Architecture |
| Decision | Reuse `EntryDecision` (`src/ports/agents.ts:518`), `readEntryDecisions` (`:200`), the `ConfirmationStore`/`confirmationTarget` mechanism, and the existing audit repository. The only additions are `closedAt` on the port type, one `confirmationTarget` case, one port method, one query and one command |
| Impacted files | `src/ports/agents.ts`, `src/domain/capability/confirmation.ts`, `src/infrastructure/battlegrid/agents.adapter.ts` |
| Reason | The read side of this feature is already modelled — `entryPrice`, `stopLoss`, `takeProfit`, `status`, `positionSizePct`, `checklist` and `reasoning` are all present. The confirmation mechanism was built for precisely this class of defect (*"an agreement about $25 authorises a submission carrying $25,000"*) and is already protected by a guard test. A second decision type or a second binding path would fracture both |
| Approved by | Planner |
| Next action | Phase A adds `closedAt` first — the liveness half of DL-1 cannot be implemented without it |

---

## DL-5 — The queue is read with `list_entry_decisions`, not `list_pending_approvals`

| Field | Value |
|---|---|
| Timestamp | 2026-08-15 |
| Phase | 1 — Planning (settled during change proposal) |
| Type | Integration |
| Decision | Read the queue via `list_entry_decisions(status: PENDING)` |
| Impacted files | `src/infrastructure/battlegrid/agents.adapter.ts` |
| Reason | Both tools were called in the **same second** against the same live decision and returned a **byte-identical row** — 35 keys, same values. The declared *"enriched with execution and outcome context"* does not exist. Given identical payloads, `list_entry_decisions` wins: it paginates and filters, and `list_pending_approvals` is documented as doing neither |
| Approved by | Planner, on observed evidence |
| Next action | Never match on `AWAITING_APPROVAL` — the declared status string does not appear in any live payload; the value is `PENDING` |

---

## DL-6 — Cancel is proven live before accept is written

| Field | Value |
|---|---|
| Timestamp | 2026-08-15 |
| Phase | 1 — Planning |
| Type | Process / safety |
| Decision | Phase D is a hard gate. No Phase E (accept) file is written until a cancel has been performed **through the product**, audited, and read back |
| Impacted files | All of Phase E |
| Reason | Cancel and accept share the binding, the audit, the port and the adapter shape. Cancel exercises every one of them while committing no money; accept opens a position at real size. Proving the shared machinery on the free path is the cheapest possible risk reduction |
| Approved by | Operator (stated in the original instruction: *"Build cancel before accept — cancelling costs nothing, accepting opens a position at real size"*) |
| Next action | Auditor verifies the ordering from git history, not from assertion |

**Note**: change task 4.4 is already complete — a real cancel was performed over
MCP on 2026-08-15 and read back. **That does not satisfy this gate.** It was made
directly, before the audit path existed. Task 4.5 remains open and requires a
cancel made *through the product*.

---

## DL-7 — A10's wager guard was not in the plan inventory, and Phase C must amend it deliberately

| Field | Value |
|---|---|
| Timestamp | 2026-08-15 |
| Phase | **EXECUTION** |
| Type | Plan deviation / safety |
| Decision | Keep `src/` free of fund-committing tool names for the whole of Phase A. The two tools are described in `pending-decision.ts` without being named. `tests/agent/wager.test.ts` is added to the master plan file inventory as a **Phase C** modification |
| Impacted files | `src/domain/agent/pending-decision.ts`, `tests/agent/wager.test.ts` (Phase C), master plan inventory |
| Reason | Phase A's first `npm test` failed on a guard the plan had not accounted for: **A10, "agent operations that commit funds are not reachable"**, which asserts structurally that no `mcp:wager` tool name appears anywhere in `src/` or `app/`. A doc comment naming the two answer tools tripped it. The comment made nothing reachable — but the guard is deliberately blunt because a name is the first step toward a call, and this codebase's own stated position is that *"a guard with an exception is a guard that gets exceptions added instead of defects fixed."* Weakening it for a comment, in the phase that performs no writes, would spend the guard for nothing |
| Approved by | Executor, on the guard's own documented rationale |
| Next action | **Phase C amends A10 deliberately**: narrow the structural half to the tools that remain unreachable, keep the behavioural half (a wager call arriving without the scope is still refused, and still not audited as an attempt), and log the amendment. Do not delete the test |

**A10's second assertion is also now a Phase C item**: it reads
`REQUESTED_SCOPES` from `src/domain/connection/scope.ts` and requires it to
contain no wager scope. The step-up in Phase B/C must not widen the scopes
requested *at connect* — which is exactly what the `battlegrid-connection` delta
already requires, so the guard and the spec agree. Keep them agreeing.

---

## DL-8 — `EntryDecision.closedAt` is required, not optional

| Field | Value |
|---|---|
| Timestamp | 2026-08-15 |
| Phase | **EXECUTION** |
| Type | Contract |
| Decision | `closedAt` added to `EntryDecision` as a required `string \| null`, not an optional field |
| Impacted files | `src/ports/agents.ts`, `src/infrastructure/battlegrid/agent-mapper.ts`, `tests/support/agent-fakes.ts`, `tests/rendering/pipeline.test.ts` |
| Reason | Liveness is half the binding (DL-1) and an optional field would let a construction site omit it silently, which is the failure the binding exists to prevent. Making it required turned the compiler into the guard: `npm run typecheck` named all seven construction sites immediately, and each was given a value that reflects what that fixture actually represents rather than a blanket null |
| Approved by | Executor |
| Next action | None — done and typechecking clean |

---

## DL-9 — A binding refusal is NOT audited. The plan asked for the opposite.

| Field | Value |
|---|---|
| Timestamp | 2026-08-15 |
| Phase | **EXECUTION** |
| Type | Plan error / correction |
| Decision | A refused binding writes no audit row. `AnswerDecisionCommand` returns a typed refusal before the port is touched |
| Impacted files | `src/application/use-cases/answer-decision.command.ts`, `plan/architecture-review.md` (P3 item 5) |
| Reason | The plan's P3 row said *"a binding refusal is audited too — a refusal is a thing that happened."* That contradicts the codebase's existing, tested position. `call-path.ts` states it directly — a refused call throws **before** any audit row, because *"a refused operation was never attempted, and recording it as attempted would be a lie in the other direction"* — and `wager.test.ts` asserts `audit.entries` is empty after a refused wager call. A binding refusal never reaches BattleGrid, so it is the same class of event. Following the plan here would have put operations in the user's audit log that never left this process, and broken an existing test's premise |
| Approved by | Executor, on the codebase's tested position over the plan's assertion |
| Next action | None. Every refusal path in `answer-decision.test.ts` asserts `agents.calls` is empty |

**The distinction worth keeping**: an *attempt that failed* is audited by the
guard path (`audit.complete(id, 'failed')`). A *refusal before the attempt* is
not audited at all. The audit answers "what did this product do to your
account", and the honest answer for a refusal is "nothing".

---

## DL-10 — The two released tools are confined to the adapter, and A10 says so

| Field | Value |
|---|---|
| Timestamp | 2026-08-15 |
| Phase | **EXECUTION** |
| Type | Safety / guard amendment |
| Decision | `tests/agent/wager.test.ts` A10 amended as DL-7 planned: `accept_entry_decision` and `cancel_entry_decision` removed from `WAGER_TOOLS`, and a **new** assertion added confining them to `src/infrastructure/battlegrid/` |
| Impacted files | `tests/agent/wager.test.ts`, `src/infrastructure/battlegrid/agent-adapter.ts` |
| Reason | The old guard said "nowhere in `src/` or `app/`". Deleting the two names outright would have weakened it to "nowhere except wherever anyone puts them". The replacement says "one place", which is a weaker claim than the original but still a checkable one — and it enforces P6 mechanically: a tool name outside the adapter means the port was bypassed, and every guarantee resting on the port becomes advisory. Eight tools remain fully forbidden; the category was not released, two members of it were |
| Approved by | Executor, per DL-7's planned amendment |
| Next action | Adding to `WAGER_TOOLS` stays the cheap direction. Any future release removes a name **on purpose** and says why here |

---

## DL-11 — Task 5.1 was implemented ahead of the gate. Letter crossed, intent held.

| Field | Value |
|---|---|
| Timestamp | 2026-08-15 |
| Phase | **EXECUTION** |
| Type | Process deviation — **surfaced, not excused** |
| Decision | `accept_entry_decision` was implemented in the same commit as `cancel_entry_decision`, before the Phase D gate had passed |
| Impacted files | `src/ports/agents.ts`, `src/infrastructure/battlegrid/agent-adapter.ts` |
| Reason | DL-3 had already settled that answering is **one verb-parameterised operation** — that is precisely what makes the two confirmation targets distinct and testable. Splitting it into `cancelDecision` and `acceptDecision` port methods purely to honour the gate's sequencing would have created two code paths where the design calls for one, and the duplicate would itself be a risk |
| Approved by | Executor — **not** pre-approved by the operator, and recorded here because it was not |
| Next action | Auditor verifies the containment claim below independently, from the code rather than from this entry |

**What the gate was actually protecting, and whether it still holds.**

The gate exists so that no operator can accept a trade — committing real money —
before the shared machinery has been proven on the path that commits none. That
machinery is the binding, the audit, the scope guard and the adapter shape, and
cancel exercises every part of it.

**No operator can accept.** Tasks 5.2 and 5.3 are not built: there is no
confirmation and no surface that reaches the accept verb. The only way to invoke
it today is to construct a `Confirmation` in code with a target built by
`confirmationTarget.decisionAnswer('accept', …)` and call the command directly.
So the purpose holds even though the sequence did not.

**What is genuinely still owed**: 4.5, a cancel performed *through the product*
and confirmed in the audit. Until then nothing has proven the audit path end to
end, and **no accept surface may be built** — that part of the gate is untouched
and stands.

---

## DL-12 — The command composes the target; the caller hands in a token alone

| Field | Value |
|---|---|
| Timestamp | 2026-08-16 |
| Phase | **EXECUTION** |
| Type | Safety / API change |
| Decision | `AnswerDecisionCommand` takes `confirmationToken: string` instead of a whole `Confirmation`, and builds the target itself with `confirmationTarget.decisionAnswer(verb, id, shown)` |
| Impacted files | `src/application/use-cases/answer-decision.command.ts`, `tests/agent/answer-decision.test.ts`, `app/(app)/approvals/[agentId]/[id]/actions.ts` |
| Reason | Taking a `Confirmation` would have put target composition in a **server action**, which lives in `app/` — outside the directory `edit-binding.test.ts` scans. That guard exists because a caller composing its own target can compose one from values the person never saw, and the compiler has no opinion about string contents. `UpdateAgentCommand` already takes a bare token for exactly this reason; this now matches it |
| Approved by | Executor, on in-codebase precedent |
| Next action | None. Two tests assert the composed target reaches the port and that accept and cancel differ |

---

## DL-13 — The port publishes the tool name, so the mint and the spend cannot drift

| Field | Value |
|---|---|
| Timestamp | 2026-08-16 |
| Phase | **EXECUTION** |
| Type | Architecture |
| Decision | `AgentsPort.answerDecisionTool(verb)` returns the tool an answer will be performed with; `DescribeDecisionAnswerQuery` asks the port rather than naming the tool |
| Impacted files | `src/ports/agents.ts`, `src/infrastructure/battlegrid/agent-adapter.ts`, `src/application/use-cases/describe-decision-answer.query.ts`, `tests/support/agent-fakes.ts` |
| Reason | A confirmation binds a **tool name** as well as a target, and the two ends are issued in different layers — the application layer mints, the adapter spends. A hard-coded name at the mint site would be a second copy free to drift into a token that can never be consumed: a confirmation refusing everyone with "unrecognised" and no way to tell why. A method rather than an exported constant keeps the literal inside `src/infrastructure/battlegrid/`, which is what A10 checks (DL-10) |
| Approved by | Executor |
| Next action | None. `approval-queue.test.ts` asserts the issued tool equals `answerDecisionTool('cancel')` |

---

## DL-14 — The account-wide queue is its own query, and partial failure is a result

| Field | Value |
|---|---|
| Timestamp | 2026-08-16 |
| Phase | **EXECUTION** |
| Type | Architecture / plan deviation |
| Decision | `ReadApprovalQueueQuery` composes `ReadPendingDecisionsQuery` per agent rather than the latter growing an optional `agentId`. Every result carries the agents that could **not** be read, including results that also carry decisions |
| Impacted files | `src/application/use-cases/read-approval-queue.query.ts` (new), `tests/support/agent-fakes.ts`, `tests/agent/approval-queue.test.ts` |
| Reason | The requirement says "across all of the user's agents", and `list_entry_decisions` **requires an agent id** — BattleGrid publishes no account-wide decision read. Fanning out makes partial failure the ordinary failure, and that is a different problem from reading one agent's queue, so it is a different object. Keeping it separate also left 1.7's guard — that `PendingDecisionView` carries exactly `decision` and `msRemaining`, so there is nowhere for a currency amount to appear — exactly as strong; the agent is named at the **group** instead |
| Approved by | Executor |
| Next action | None. The queue's empty heading stays qualified whenever an agent went unread, asserted in `tests/rendering/approvals.test.ts` |

---

## DL-15 — No confirmation is minted for an act the connection cannot perform

| Field | Value |
|---|---|
| Timestamp | 2026-08-16 |
| Phase | **EXECUTION** |
| Type | Safety |
| Decision | `DescribeDecisionAnswerQuery` takes `mintConfirmation`, false when the connection holds no fund-committing authority; the description's `confirmationToken` is then `null` and the page renders no control |
| Impacted files | `src/application/use-cases/describe-decision-answer.query.ts`, `src/application/use-cases/read-answer-authority.query.ts` (new), `app/(app)/approvals/[agentId]/[id]/page.tsx` |
| Reason | The requirement says the decision stays **fully readable** without the authority, and that accept and cancel are refused before they are attempted. Minting anyway would put a row in the confirmation store recording that somebody was offered a choice they were never actually offered. Making the token nullable also removed the `?? ''` the compiler would otherwise have forced — `concurrency.test.ts` forbids defaulting an identifier into existence, and an empty token renders a form that could only ever be refused |
| Approved by | Executor |
| Next action | **`ReadAnswerAuthorityQuery` is not a safety boundary and must not become one.** It decides what to *draw*; `beginGuardedCall` refuses, on every path including ones that never render (P1) |

---

## DL-16 — Retiring the disclosure falsified two claims elsewhere

| Field | Value |
|---|---|
| Timestamp | 2026-08-16 |
| Phase | **EXECUTION** |
| Type | Correction found by task 6.2 |
| Decision | `wager-authority.tsx` and `consent-summary.tsx` were both corrected, and their guard tests narrowed with them |
| Impacted files | `src/presentation/components/wager-authority.tsx`, `src/presentation/components/consent-summary.tsx`, `tests/rendering/arena.test.ts`, plus four design surface manifests |
| Reason | Task 6.2 asked whether any other surface claimed approval-required was unanswerable. None did — but two claimed something the **step-up** falsified. The arena said Grid-Commander *"never requests the wager scope"*, and the connect page said *"It does not ask for that authority"*. Both were true of the whole product until this change; both are now false as stated. They were narrowed rather than deleted: never at connect, never to play in the arena, none held by default, and exactly one place that can ask |
| Approved by | Executor |
| Next action | The four manifests those files appear in were refreshed in **prose and digest** — three asserted the retired disclosure in words, and a refreshed hash over stale prose would claim a survey nobody performed |

---

## DL-17 — The delta spec's audit requirement was corrected, not worked around

| Field | Value |
|---|---|
| Timestamp | 2026-08-16 |
| Phase | **EXECUTION** |
| Type | Spec correction |
| Decision | The requirement *Answering A Decision Is Recorded As A Money Write* now distinguishes an **attempt that failed** (audited) from a **refusal before the attempt** (not audited). Task 7.3 was implemented against the corrected text |
| Impacted files | `openspec/changes/the-approval-can-be-answered/specs/agent-understanding/spec.md`, `tests/agent/answer-authority.test.ts` |
| Reason | DL-9 already ruled this during Phase A and the code follows it — but **the delta spec still carried the original claim**, so the requirement and the implementation disagreed and nothing had reconciled them. Building 7.3 to the spec as written would have put operations in the operator's audit log that never left this process. The project's own rule is that a divergence is not taken silently: the spec was updated and the reason recorded in it |
| Approved by | Executor, on DL-9's standing ruling |
| Next action | Auditor should check the corrected requirement against `call-path.ts` and `wager.test.ts` rather than against the original wording |

---

## DL-18 — The replacement copy carried the falsehood the retirement removed

| Field | Value |
|---|---|
| Timestamp | 2026-08-17 |
| Phase | **VERIFICATION** |
| Type | Correction found by the verifier pass |
| Decision | `money-limits.tsx` copy rewritten to name both answers; two stale docstrings corrected; `tests/architecture/answering-is-not-disclaimed.test.ts` added so the class cannot recur |
| Impacted files | `src/presentation/components/money-limits.tsx`, `app/(app)/approvals/[agentId]/[id]/page.tsx`, `tests/architecture/answering-is-not-disclaimed.test.ts` |
| Reason | The surface rendered *"Accepting is not yet available here and still happens on battlegrid.trade"* — false since 5.2, and actively sending operators off the product for something it does, on the money surface, the day after 7.4 accepted a real decision through it. **DL-16 is why this survived.** Task 6.2 swept *other* surfaces for the *old* disclosure and correctly found none; nobody swept the **replacement copy this change had just written**, which was true when 6.1 wrote it and false eight tasks later. The retired requirement existed precisely to stop a disclosure outliving its truth, and its own replacement did it |
| Approved by | Executor, on the verifier's CRITICAL |
| Next action | Auditor: the guard is a **transcription** check and is labelled weak in the file. It catches the phrasings a human writes for an unready capability; it cannot catch a novel sentence meaning the same thing, and it deliberately leaves *"you do not have permission"* sayable, that being true and different |

---

## DL-19 — The binding's one door is now held shut by a test

| Field | Value |
|---|---|
| Timestamp | 2026-08-17 |
| Phase | **VERIFICATION** |
| Type | Guard added for an unenforced invariant |
| Decision | `answerEntryDecision` may be named only in the command, the port interface and the adapter, asserted in `tests/architecture/answering-is-not-disclaimed.test.ts` |
| Impacted files | `tests/architecture/answering-is-not-disclaimed.test.ts` |
| Reason | `answer-decision.command.ts:16-20` claims the binding check *"cannot be skipped by a caller, because the port method is not reachable from anywhere else in the application layer"*. True when written, enforced by nothing. It matters more than an ordinary convention because the second layer is **inert on accept**: `call-path.ts:71` gates the confirmation consume on `cls.destructive`, and BattleGrid annotates `accept_entry_decision` `destructiveHint: false`, so the token is passed and never spent (**#340**). Cancel is gated; the money-committing verb is not. On the accept path this convention was the only thing left |
| Approved by | Executor, on the verifier's WARNING |
| Next action | **This does not fix #340** and must not be read as doing so. It closes the bypass route; the inverted annotation, the unspent token and the audit row reading `destructive: false` on a position-opening write are still open there |

---

## DL-20 — A surface constraint forbade the control the change had just shipped

| Field | Value |
|---|---|
| Timestamp | 2026-08-17 |
| Phase | **VERIFICATION** |
| Type | Correction found while re-pinning manifests |
| Decision | `approvals-decision.constraints[0]` inverted; `agent-new`'s implementation prose corrected; four manifests re-pinned in **prose and digest** |
| Impacted files | `openspec/design/surfaces/approvals-decision.json`, `agent-new.json`, `agent-edit.json`, `agent-reactivate-confirm.json` |
| Reason | The constraint read ***"Accept is rendered nowhere, with authority or without — a design must not add one, and the sentence naming battlegrid.trade as where accepting happens is what stands in its place."*** True for the window between 4.5 and 5.2, false afterwards, and **a constraint rather than a description**: a design round reading it would have been instructed to remove a live money control and restore the disclaimer. `agent-new` carried the milder version, describing the note as saying accepting was unbuilt. Both were found only because editing the two source files staled four manifests and `validate` named them |
| Approved by | Executor, following DL-16's rule |
| Next action | Auditor: this is the **third** instance in one change of a record outliving the thing it described — DL-16 (two surfaces), DL-18 (the replacement copy and its test), DL-20 (a constraint and a manifest). The pattern is that each was written true and none had a producer that would revisit it; the copy half now has `answering-is-not-disclaimed.test.ts`, and manifest prose still has none |

---

## DL-21 — AUDIT: gate BLOCKED on two clerical handoff items, nothing in the code

| Field | Value |
|---|---|
| Timestamp | 2026-08-17 |
| Phase | **AUDIT** |
| Type | Production gate decision |
| Decision | **BLOCKED**, 2 OPEN MAJOR — both HANDOFF. Tracker: `plan/production-gate.md` |
| Impacted files | `openspec/changes/the-approval-can-be-answered/plan/production-gate.md` |
| Reason | **PG-001**: the master plan's final line still reads `PLAN READY FOR REVIEW`. The marker is this repository's convention, not the skill's import — five of the eight most recent archived full-track plans end `EXECUTION READY FOR PRODUCTION GATE` and 17 gate trackers exist in the archive — so execution was never declared handed over. **PG-002**: `npm run test:db` could not run. `DATABASE_URL` points at `grid_commander`, the operator's working database; the suite truncates the signal record on setup and BattleGrid serves current readings only, so it was **not** run rather than run carefully. Five of six gates pass: typecheck, lint, 2716/2722 at the documented six-failure baseline, build, and the drizzle schema check |
| Approved by | Auditor |
| Next action | PG-001 is one line for the executor. PG-002 is the operator's to designate — a `_test` database as in `2026-08-13-the-connection-asks-who-it-is` PG-003, or a dated waiver to CI. Everything the gate checks about the built work passed; the three substantive findings (PG-003/004/005) came from the verifier pass and were fixed before the audit, each proven non-vacuous by reverting |

---

## DL-22 — AUDIT: gate PASS, and the DB gate was run rather than waived

| Field | Value |
|---|---|
| Timestamp | 2026-08-17 |
| Phase | **AUDIT** |
| Type | Production gate decision, re-audit 2 |
| Decision | **PASS** — zero OPEN violations. Cleared for `/archive` |
| Impacted files | `plan/production-gate.md`, `plan/master-plan.md` |
| Reason | PG-001 fixed by declaring execution handed over, honestly — 40/40, every Phase 2 box checked, verifier findings fixed. **PG-002 the operator asked to be both run and waived, and both are recorded.** Run: `grid_commander_test` created, migrated, suite green at **96 tests / 8 files**, `DB_TESTS_MAY_TRUNCATE` never set so both guards did their own work, and the live-grant preflight read 0 active connections first. Waived-position: CI provisions a disposable postgres on every push, so future sessions need no local run. **The working database was counted afterwards** — `grid_commander` holds 144,732 `signal_readings` against 0 in the truncated test database. That check is not ceremony: the guard's own message records that this suite was once pointed at a live database, destroyed a record that could not be rebuilt, and every test passed while it did |
| Approved by | Auditor, on the operator's instruction to do both |
| Next action | `/archive`, which merges the deltas into `openspec/specs/` — including **removing** *An Unanswerable Trading Mode Says So* from the main spec, where it correctly still stands pre-archive — and closes **#101**. **#340 is not closed by this** and its item stays open |

---

## Where a fresh session picks this up

**Read first**: this log top to bottom, then
`openspec/backlog/approvals-have-no-write-side.md` for every observed payload.

**Built and green (33/40)**: everything below *and* including the UI. The queue
(`/approvals`), the decision page with its cancel confirmation
(`/approvals/[agentId]/[id]`), the step-up (`/approvals/authority`), the
account-wide read, the authority read, the describe-and-mint, and the retirement
of the unanswerable-mode disclosure. Gates on this tree: `tsc` clean, lint clean,
**2681 tests across 211 files**, `npm run build` compiled with all three routes
emitted, `drizzle/` clean, `validate --all` 0 errors / 15 warnings.

**The next task is 4.5, and it cannot be done by an agent alone.** It is the
change's gate: a cancel performed *through the product*, confirmed in the audit.
Everything it needs is now built. What it needs from a person is two things:

1. a real decision waiting — Vanguard produces them on its own, so this needs no
   setup writes, only timing;
2. the operator granting fund-committing authority at `/approvals/authority` and
   answering one decision, **by name, at the moment**.

That grant is the first time this product will ever hold `mcp:wager`, and the
cancel is the first fund-committing call it will ever make. It commits no money —
that is exactly why the gate puts it first.

**Section 5 (accept) is still not begun and must not be**, per DL-11 and the
gate. `tests/rendering/approvals.test.ts` asserts no accept control is rendered
on either authority branch; that assertion is the gate made mechanical, and it
should be deleted only by the change that legitimately crosses it.

**Three constraints the accept surface will inherit, unchanged:**

1. **No currency amount** (PE-2). Now enforced by a scan over all five files on
   this path, not only by the view's shape.
2. **Gate by not rendering.** Absent authority removes the control; it is never
   disabled. `system.json` principle 10, UI checklist item 5.
3. **`executedAt` is not "when the trade opened."** Set at creation, observed set
   on a decision that had executed nothing.

**Do not**: start a polling watch (the operator asked for none, and the queue's
manifest records that as requires-spec-change); name a fund-committing tool
outside `src/infrastructure/battlegrid/` (A10); compose a confirmation target at
a call site (`edit-binding.test.ts` now scans for the decision shape too); add a
retry anywhere (P4 item 3 is not excepted); or run `npm run test:db` against a
`DATABASE_URL` that is not disposable — it truncates the signal record, and
BattleGrid serves current readings only.

---

## Executor handoff notes

1. **The two live tasks (4.5, 7.4) are the only ones left that need a human.**
   Everything else in sections 1-7 is built, tested and green.
2. **`ReadAnswerAuthorityQuery` decides what to draw, never what is allowed.**
   If a future change starts branching on it for permission, that is the P1
   violation this log is warning about in advance.
3. **The delta spec was corrected during execution** (DL-17). Read the
   requirement as it stands, not as the proposal describes it.
4. **`npm run test:db` was not run and the gate is not claimed as passed.** It
   needs a disposable database; CI provides one.
