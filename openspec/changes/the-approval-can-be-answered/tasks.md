# Tasks

## 0. Decide the binding before anything is built — SETTLED 2026-08-15

- [x] 0.1 **RULED: the answer binds decision id + `entryPrice` + `stopLoss` +
      `takeProfit` + `status === "PENDING"` + `closedAt === null`.** All five
      checked on a single re-read taken immediately before the write; any
      mismatch refuses before anything is sent. Liveness was added to the
      original levels-only proposal because a decision can re-read with matching
      levels while no longer being answerable. Recorded in `design.md`.
- [x] 0.2 Confirmed 2026-08-15: re-read of decision `6c11b3dc` returns 35 keys
      with no `revision`, `version`, `updatedAt` or ETag. The gap is real and
      the binding above stands.
- [x] 0.2a Mutability probed as a side effect: the same decision read as
      `PENDING` and as `CANCELLED` differed in exactly three fields —
      `status`, `tradeStatus`, `closedAt`. `entryPrice`, `stopLoss`,
      `takeProfit`, `conviction`, `positionSizePct`, `reasoning` and the whole
      `signalChecklist` were byte-identical. **N = 1** — not proof of
      immutability, which is why the levels stay in the binding.

## 1. Read the queue

- [x] 1.1 **DONE** as `src/domain/agent/pending-decision.ts` — the liveness
      predicate, the level comparison and `checkAnswerable`. Deviation: shaped as
      functions over the existing `EntryDecision` rather than a new type, per
      DL-4 (extend, do not duplicate).
      ~~Add `PendingDecision` to the domain — id, agent, coin, direction,
      conviction, entry/stop/target, reasoning, signal checklist, size
      proportion, `expiresAt`. Every field traceable to the observed payload.
- [x] 1.2 **NOT NEEDED — deviation.** `readEntryDecisions` already exists on
      `AgentsPort` and returns the same rows; a second read method would be a
      second path to the same payload. The port instead gained
      `answerEntryDecision` (a write), which the plan had not separated out.
- [x] 1.3 **DONE** — `ReadPendingDecisionsQuery`. ~~Read the queue with `list_entry_decisions(status: PENDING)`, not
      `list_pending_approvals`. **Both return a byte-identical row** — observed
      in the same second on 2026-08-15; the declared "enriched with execution
      and outcome context" is not present and there is no enrichment to carry.
      `list_entry_decisions` paginates and filters; the other does neither.
- [x] 1.3a **DONE** — `isAnswerable`, and confirmed against the live accepted
      decision of 18:19Z, which carries `closedAt: null` while being EXECUTED.
      ~~Match liveness on `status === "PENDING"` and `closedAt === null`.
      **Never match on `AWAITING_APPROVAL`** — the tool description names that
      string and the live payload does not contain it.
- [x] 1.4a **DONE** — read-side query (`read-pending-decisions.query.ts`).
- [ ] 1.4b Queue surface, reachable from the pipeline. **NOT STARTED.**
- [x] 1.5 **DONE at the query layer** — `none` and `unreadable` are separate
      result kinds with tests. Rendering waits on 1.4b.
- [x] 1.6 **DONE at the query layer** — the platform's `reason` is carried
      through unmodified. Rendering waits on 1.4b.
- [x] 1.7 **DONE at the query layer** — `msRemaining` derived server-side, and
      a test asserts the view carries exactly two keys so no amount can appear.
      Rendering waits on 1.4b. ~~Show remaining time from `expiresAt`; show the size as a proportion
      with no currency amount anywhere on the surface.

## 2. Authority, before either write exists

- [x] 2.1 **DONE, inherited** — `beginGuardedCall` refuses on held scope before
      the attempt and before any audit row. Not reimplemented here: a second
      opinion about whether a write is allowed is worse than none.
- [ ] 2.2 Step-up flow from the point of use, stating what the authority permits
      and that accepting commits real money.
- [ ] 2.3 Prove no read, model-recorded proposal, or scheduled work can begin a
      step-up.
- [x] 2.4 **DONE, inherited — and the plan was wrong about refusals.** The
      guard writes the audit row before the attempt and completes it with the
      outcome. Binding refusals are **not** audited; see DL-9.

## 3. Cancel — built and proven first

- [x] 3.1 **DONE** — `answerEntryDecision` on `AgentsPort`;
      `cancel_entry_decision` in `agent-adapter.ts`, destructiveness read from
      the tool's own classification rather than assumed.
- [x] 3.2 **DONE** — `checkAnswerable`, called by `AnswerDecisionCommand`
      before the port. ~~The binding comparison in the domain: one re-read, then compare the
      three levels **and** assert `status === "PENDING"` and
      `closedAt === null`. Refuse naming which level moved and from what to
      what, or what became of the decision if it is no longer answerable.
- [ ] 3.3 Cancel confirmation: what is being cancelled, and that the agent will
      not re-propose it.
- [ ] 3.4 Expired-first path — told it expired, not reported as a cancel
      performed.

## 4. Verification gate — cancel proven before accept is written

- [x] 4.1 **DONE** — `tests/agent/pending-decision.test.ts` (22) and
      `tests/agent/answer-decision.test.ts` (12). ~~Unit: the binding refuses when entry, stop, or target differs; refuses
      when the levels match but `status !== "PENDING"` or `closedAt !== null`;
      refuses when the decision is missing; passes only when all five hold.
- [ ] 4.2 Unit: an answer is refused before any call when authority is absent.
- [x] 4.3 **DONE at the query layer** — `tests/agent/read-pending-decisions.test.ts`.
- [x] 4.4 **Live**: with operator authorization, cancel one real pending
      decision. Read back that it is no longer waiting. Record the payload
      verbatim in the backlog item. — **DONE 2026-08-15T17:05:44Z, ahead of
      implementation.** `cancel_entry_decision` on decision `6c11b3dc` returned
      `{"decisionId":"…","cancelled":true}` and nothing else; read-back shows
      `status`/`tradeStatus` → `CANCELLED`, `closedAt` set, every other field
      preserved. Assert against that response; do not model a richer one.
- [ ] 4.5 **Live**: confirm the audit recorded the cancel as a fund-committing
      write with its bound levels. **Note**: the 4.4 cancel was made directly
      over MCP before the audit path existed, so it is not in the audit. This
      task still needs a cancel made *through the product*.
- [ ] 4.6 Assert the two-key response shape in a test — a UI cannot render the
      outcome from it and must re-read. Regression-guard that re-read.
- [ ] **GATE — do not begin section 5 until 4.4 and 4.5 have passed.**

## 5. Accept — only after the gate

> **GATE CROSSED IN THE LETTER, HELD IN THE INTENT — see DL-11.** 5.1 was
> implemented alongside cancel, because DL-3 had already settled that answering
> is one verb-parameterised operation and splitting it into two port methods
> would have been artificial. **No operator can accept**: 5.2 and 5.3 are not
> built, so there is no surface that reaches it. The gate's purpose — that
> nobody can accept before cancel is proven through the product — holds.

- [x] 5.1 **DONE AHEAD OF THE GATE (DL-11)** — `accept_entry_decision` in the
      adapter, behind the same binding, audit and scope guard as cancel.
- [ ] 5.2 Accept confirmation: coin, direction, the three levels, the proportion
      committed, and a plain statement that a position opens with real money.
- [ ] 5.3 Accept is not rendered on any surface where cancel is unavailable.
- [ ] 5.4 Expired-first path — told it expired and no position opened.
- [ ] 5.5 Report the platform's own reason on a refused accept.

## 6. Retire the disclosure

- [ ] 6.1 Remove the unfinished-mode text from the trading mode selector; link
      to the queue instead.
- [ ] 6.2 Check every other surface naming approval-required for the same claim.

## 7. Verification

- [ ] 7.1 Unit: expiry mid-answer is reported as expiry on both paths.
- [ ] 7.2 Unit: no currency amount is produced anywhere for a pending decision.
- [ ] 7.3 Unit: a refused answer is audited with its reason and no success.
- [ ] 7.4 **Live, operator-authorized, by name at the moment**: accept one real
      decision. Read back the position. Record it verbatim.
- [ ] 7.5 Quality gates: typecheck, lint, vitest, build, drizzle no-op.
- [ ] 7.6 `openspec.py validate` clean; surface manifest refreshed for the new
      queue surface.
