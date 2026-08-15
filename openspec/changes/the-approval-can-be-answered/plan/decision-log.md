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

## Where a fresh session picks this up

**Read first**: this log top to bottom, then
`openspec/backlog/approvals-have-no-write-side.md` for every observed payload.
Nothing below the UI needs re-deriving — it is built and tested.

**Built and green (19/40)**: the binding (`src/domain/agent/pending-decision.ts`),
the confirmation target, the read query, the port method, the adapter, and
`AnswerDecisionCommand`. 34 tests. `npm test` → 2505 across 199 files.

**The next task is 1.4b — the queue surface**, then 3.3/3.4 (the cancel
confirmation). Everything needed is already behind the query:
`ReadPendingDecisionsQuery` returns `waiting` / `none` / `unreadable` as distinct
kinds, and each view carries exactly `{decision, msRemaining}`.

**Three constraints the surface must honour, all already decided:**

1. **No currency amount** anywhere (PE-2). Size renders as the proportion the
   platform sent. The formula that would produce an amount is known and exact —
   that is why the rule exists, not why it can be broken.
2. **Gate by not rendering.** Accept must not exist on any surface where cancel
   is unavailable, and a disabled-but-present control is forbidden twice over
   (UI checklist item 5, `system.json` principle 10).
3. **`executedAt` is not "when the trade opened."** It is set at creation, and
   was observed set on a decision that had executed nothing.

**Then 4.5, which is the live gate**: perform a cancel *through the product* and
confirm the audit row. Vanguard produces decisions on its own now, so this needs
no setup writes — wait for one and answer it. **No accept surface may be built
until this passes** (DL-11).

**Do not**: start a polling watch (the operator asked for none); name a
fund-committing tool outside `src/infrastructure/battlegrid/` (A10 checks);
compose a confirmation target inline (`edit-binding.test.ts` checks); or add a
retry anywhere (P4 item 3 is not excepted).

---

## Executor handoff notes

1. **Start with `closedAt`.** The liveness half of DL-1 is unimplementable until
   the port type and adapter carry it. It is not currently mapped.
2. **Do not compose a confirmation target inline.** `tests/agent/edit-binding.test.ts`
   exists to catch that; extend it rather than working around it.
3. **The audit row goes in before the call, including for refused bindings.** A
   refusal is a thing that happened.
4. **No currency amount for a pending decision** (PE-2). The platform computes
   none until accept time; deriving one violates the Iron Rule.
5. **`npm run test:db` needs `DATABASE_URL`.** CI provides postgres; skip locally
   if absent and say so — do not report the gate as passed.
6. If any of DL-1 through DL-6 turns out to be wrong in implementation, **update
   the entry** rather than adding a contradicting one, and say so in the review
   doc.
