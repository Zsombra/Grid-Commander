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
- [x] 1.4b **DONE** - `/approvals` (`app/(app)/approvals/page.tsx`), account-wide
      via `ReadApprovalQueueQuery`. **Deviation, deliberate**: the requirement says
      "across all of the user's agents", and `list_entry_decisions` requires an
      agent id - there is no account-wide decision read on the platform. So the
      queue fans out one read per agent and carries **partial failure** as a
      first-class result. Reachable from the section nav and from the trading-mode
      selector; the agent is named at the group rather than on the view, so 1.7's
      "exactly two keys" guard stays exactly as strong.
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
- [x] 2.2 **DONE** - `/approvals/authority`. `STEP_UP_SCOPES` is a separate
      constant from `REQUESTED_SCOPES` (which stays read-only, so A10 keeps
      passing), and it carries read forward rather than replacing it. The page
      states the two operations, that it commits real money, that the platform
      caps still apply, and offers a visible way out.
- [x] 2.3 **DONE, structurally** - `tests/agent/answer-authority.test.ts` scans
      `src/` and `app/` and asserts **exactly one** file requests the step-up: the
      authority page's server action, which only runs on a form submit. A second
      caller of any kind fails the test. The default - calling `execute()` with no
      argument, as the connect flow does - is separately asserted not to widen.
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
- [x] 3.3 **DONE** - `DescribeDecisionAnswerQuery` composes the consequence and
      mints the token bound to verb + id + levels; the page renders it in the
      shared consequence role. Minting is **conditional on authority**: no
      agreement is issued for an act the connection cannot perform.
- [x] 3.4 **DONE, on both halves** - the describe returns `no-longer-answerable`
      before minting anything (the page renders `<ExpiredNotice>`), and a decision
      that closes between render and submit refuses in the command and comes back
      as "Nothing was cancelled ... this is not a cancel you performed".

## 4. Verification gate — cancel proven before accept is written

- [x] 4.1 **DONE** — `tests/agent/pending-decision.test.ts` (22) and
      `tests/agent/answer-decision.test.ts` (12). ~~Unit: the binding refuses when entry, stop, or target differs; refuses
      when the levels match but `status !== "PENDING"` or `closedAt !== null`;
      refuses when the decision is missing; passes only when all five hold.
- [x] 4.2 **DONE** - `answer-authority.test.ts`, both verbs, asserting the
      refusal happens before the attempt, names the missing authority, and writes
      no audit row.
- [x] 4.3 **DONE at the query layer** — `tests/agent/read-pending-decisions.test.ts`.
- [x] 4.4 **Live**: with operator authorization, cancel one real pending
      decision. Read back that it is no longer waiting. Record the payload
      verbatim in the backlog item. — **DONE 2026-08-15T17:05:44Z, ahead of
      implementation.** `cancel_entry_decision` on decision `6c11b3dc` returned
      `{"decisionId":"…","cancelled":true}` and nothing else; read-back shows
      `status`/`tradeStatus` → `CANCELLED`, `closedAt` set, every other field
      preserved. Assert against that response; do not model a richer one.
- [x] 4.5 **PASSED 2026-08-17. The gate is crossed.** A real decision was
      cancelled **through the product**, with the operator's authorisation, and
      it wrote the audit row 4.4 could not.

      **How a decision was obtained.** The queue is empty most of the time and a
      window is 15 minutes, so waiting was not a plan. With the operator's
      go-ahead the account was configured to produce one: Cannae forked to
      `Vanguard Test Bench` (`6b7256ab`), Vanguard rebound to the fork so
      **Undertow's binding never moved**, and Vanguard's `minTradeConviction`
      dropped 0.55 -> 0.35 -> 0. Vanguard is `APPROVAL_REQUIRED` throughout, so
      nothing could execute. The strategy's own gates were compiled but **never
      applied** - the conviction dial alone was sufficient, which is itself the
      finding: `minAggregateScore` decides whether the model is called,
      `minTradeConviction` decides whether its answer becomes an ENTER, and the
      second is the binding one.

      **The decision**, produced 3.5 minutes after the config change:

      ```
      50735dc6-2cf0-45f0-9613-0a50c8d3a097   Vanguard   AVAX SHORT
      conviction 0.45      <- below the old 0.55 bar; it exists because of the change
      entry 6.3556   stop 6.39207472   target 6.2223   12% MEDIUM
      created 18:01:47Z    expires 18:16:47Z
      ```

      **The cancel went through the product's own server action**, not over MCP:
      a POST to `/approvals/[agentId]/[id]` carrying the form's
      `$ACTION_ID_40d4b63...`, `decisionId`, `confirmationToken` **and all three
      price levels** - the confirmation binding working as designed, since the
      decision row has no revision field and the levels are the change-detector.
      It answered `303 -> /approvals?note=The+proposal+was+cancelled.+Nothing+was+bought+or+sold.`

      **Platform read-back**: `status`/`tradeStatus` `CANCELLED`, `closedAt
      18:14:00.517Z`, `executedOrderId`/`stopLossOrderId`/`takeProfitOrderId`
      all null, no fill price, quantity or fee. Cancelled with 2m47s left.

      **The audit row - the whole point of this task:**

      ```json
      {"tool":"cancel_entry_decision","actor":"user","destructive":true,
       "outcome":"succeeded","created_at":"2026-08-16T18:14:02.119Z",
       "completed_at":"2026-08-16T18:14:06.237Z","failure_reason":null}
      ```

      The query was *every* `cancel_entry_decision` row ever written, and it
      returned **exactly one**. That is the proof this task was written for: the
      2026-08-15 cancel made straight over MCP left no row, and this one did.

      **The account was restored immediately**: Vanguard rebound to Cannae r3,
      `minTradeConviction` 0.55 and `gridMinConfidence` 0.75 put back, the fork
      archived (`isActive: false`, `boundAgentCount: 0`). Undertow and Breakwater
      were never touched - Cannae stayed at revision 3 throughout.

      **Observed while there, and worth its own note**: the decision page renders
      *"Accepting a proposed trade is not yet available"*. The gate held itself
      shut while its own precondition was being satisfied.
- [x] 4.6 **DONE** - the port returns `void` (asserted), and the command's
      `answered` result is asserted to carry exactly `kind`, `verb`, `decisionId`
      - nothing echoed from the platform, so no surface can render an outcome from
      the ack.
- [x] **GATE CROSSED 2026-08-17.** 4.4 passed 2026-08-15 and 4.5 above.
      Section 5 may now be built. Nothing in it is built yet: 5.2-5.5 remain
      open, and until 5.2/5.3 land there is still no accept control on any
      surface - which is why the decision page says accepting is unavailable.

## 5. Accept — only after the gate

> **GATE CROSSED IN FACT, 2026-08-17.** 5.1 was implemented ahead of it (DL-11)
> because DL-3 had settled that answering is one verb-parameterised operation.
> The rest of section 5 was built only after 4.5 passed — a real decision
> cancelled through the product, with an audited row proving it. The accept
> surface now exists and 5.3 is what keeps it honest: it is drawn only beside
> cancel, never alone.

- [x] 5.1 **DONE AHEAD OF THE GATE (DL-11)** — `accept_entry_decision` in the
      adapter, behind the same binding, audit and scope guard as cancel.
- [x] 5.2 **DONE.** The accept confirmation carries the coin and direction in
      its heading, the three levels in the shared `<dl>` above it, and
      `describeAnswer('accept', …)`'s sentence: *"Opens a real position: SHORT
      AVAX, staking 12% of the agent's available funds. This spends your money at
      BattleGrid immediately, and the size is set by the platform at the moment
      you confirm."*

      **No currency figure, and none may be added (PE-2).** The platform computes
      no size until acceptance — and #305 sharpened why that is not merely a
      rounding problem: the decision row carries **no leverage field**, so the
      proportion is not even sufficient to derive an amount from. A figure here
      would be this product's arithmetic wearing the platform's authority, on a
      confirmation, about money. Asserted by *"names no amount on the accept,
      only the proportion"*.

- [x] 5.3 **DONE, as both-or-neither.** `offered` keeps only the verbs that
      minted a spendable agreement, and the answer block renders only when every
      requested verb did — so an accept can never stand alone. Cancel renders
      first, deliberately: the money-moving verb is never the one nearest the
      reasoning or the one a hurried click lands on. Two tests: *"offers accept
      only alongside cancel, never alone"* (which also asserts the ordering) and
      *"offers neither when the connection cannot answer"*.

      **These replace `renders no accept control anywhere`**, which pinned the
      pre-gate state. The assertion was moved to the rule that still holds rather
      than deleted — dropping it would have left the arrangement the gate exists
      to prevent checked by nothing.

- [x] 5.4 **DONE — already satisfied, now confirmed rather than assumed.** A
      decision that is no longer answerable never reaches the answer surface:
      `describeDecisionAnswer` returns `no-longer-answerable` and the page
      renders `ExpiredNotice`, which says the window closed on its own and that
      *"Nothing was cancelled and nothing was bought — no answer was ever sent."*
      Covered by the `EXPIRED` case in `approvals.test.ts` asserting
      `/expired unanswered/i`. Accept changed nothing here, because the branch
      runs before any verb is offered.

- [x] 5.5 **DONE — by construction, and that is the point.** Accept and cancel
      share one implementation: `answerDecision(verb, formData)`, with the thin
      exported wrappers `acceptDecision` / `cancelDecision`. So a refused accept
      takes the identical path a refused cancel does and reports the platform's
      own reason through `explainAnswerRefusal(result.refusal)`, landing back on
      the decision with `?problem=`. `ConfirmationRequiredError` and
      `ScopeUnavailableError` are handled once, for both verbs.

      Two copies would have been two places for the binding, the refusal
      handling and the scope redirect to drift — and the one that drifted would
      be the one nobody exercised, since only cancel has ever been run live.

## 6. Retire the disclosure

- [x] 6.1 **DONE** - `money-limits.tsx` now links to `/approvals`, names the
      fifteen-minute window, and says accepting is still unbuilt rather than
      letting "answer them" imply both halves. `tests/agent/money-limits.test.ts`
      was inverted to assert the new obligation and that the dead-end disclosure
      is gone rather than softened.
- [x] 6.2 **DONE - and it found two.** No other surface claimed the mode was
      unanswerable, but two made claims the step-up falsified:
      `wager-authority.tsx` said the product "never requests the wager scope" (now
      narrowed to: never to play in the arena, none held by default, and one place
      that can ask), and `consent-summary.tsx` said "It does not ask for that
      authority" (now scoped to the grant being agreed to, with the later step-up
      named). Both guard tests updated to the narrower claims.

## 7. Verification

- [x] 7.1 **DONE** - `answer-authority.test.ts`, over both verbs: refuses as
      `not-answerable` carrying status `EXPIRED`, and sends nothing. Also covers
      the `EXECUTED` / `closedAt: null` case that a `closedAt`-only check would
      have treated as answerable.
- [x] 7.2 **DONE, at the surface as well as the view** - `approval-queue.test.ts`
      scans all five files on this path for currency formatting and for the
      money-shaped budget fields, and the rendering test asserts no currency
      figure reaches the page.
- [x] 7.3 **DONE - and the delta spec was corrected to match DL-9.** The
      requirement as drafted said every refusal is audited; that contradicted the
      codebase's tested position. It now distinguishes an **attempt that failed**
      (audited) from a **refusal before the attempt** (not audited - nothing left
      this process). Tests cover both, plus that a platform failure is not
      disguised as a binding refusal.
- [ ] 7.4 **Live, operator-authorized, by name at the moment**: accept one real
      decision. Read back the position. Record it verbatim.
- [x] 7.5 **DONE, with one gate honestly not run.** `tsc` clean,
      `npm run lint` clean, **2681 vitest across 211 files**, `npm run build`
      compiled with all three `/approvals` routes emitted, `db:generate` leaves
      `drizzle/` clean. **`npm run test:db` was NOT run**: it truncates every
      table it touches including the signal record, and `DATABASE_URL` here points
      at the real `grid_commander`. The suite's own guard refuses, and overriding
      it would destroy a record BattleGrid cannot re-serve because it serves
      current readings only. It needs a disposable database (CI). `test:live`
      likewise not run.
- [x] 7.6 **DONE** - `validate --all` **0 errors / 15 warnings**, and 15 is the
      standing count. The run reached 19 mid-session because this change staled
      four manifests; all four were refreshed in **prose as well as digest**,
      since three of them asserted the retired disclosure in words and a refreshed
      hash over stale prose would claim a survey that never happened. Three new
      manifests written: `approvals-queue`, `approvals-decision`,
      `approvals-authority`. The three new `design_orphan_surface` INFOs are
      correct - these surfaces have had no design pass, which is `/design`'s step.
