# Tasks: The Port Knows What Costs Money

> **Track `full`.** The planner writes `plan/` before section 2 begins. Sections 0
> and 1 are deliberately available to the planner as evidence-gathering, because
> the central decision (where the fact lives) needs the A10 question settled
> first.

## 0. Prove the defect before changing anything

- [ ] 0.1 A test that drives `buildClassificationMap` over the **real**
      `docs/battlegrid-mcp-capabilities.json` and asserts today's behaviour:
      `accept_entry_decision` → `destructive: false`, `requiredScope: 'mcp:read'`.
      **This test is expected to be deleted**, not kept — it pins the defect. Its
      job is to make the starting state undeniable in the diff.
- [ ] 0.2 A test that drives the **real** `beginGuardedCall` with that
      classification on `heldScopes: ['mcp:read']` and shows accept is admitted
      with no confirmation token. Also deleted at the end.
- [ ] 0.3 Record both outputs verbatim in `plan/decision-log.md`. Everything
      after this is measured against them.

## 1. Settle where the fact lives

- [ ] 1.1 **Resolve the A10 question.** A10 forbids naming a fund-committing tool
      outside `src/infrastructure/battlegrid/`; the judgement belongs in
      `src/domain/capability/`. Decide, and record why in the decision log. Do not
      start section 2 until this is settled.
- [ ] 1.2 Decide the audit-column question from `design.md` — platform's claim,
      product's judgement, or both. The design recommends **both**, with existing
      rows left alone.
- [ ] 1.3 Write the list of money-committing tools, with a one-line reason per
      entry, and a line for each of the remaining 22 mutating tools saying why it
      is **not** on the list. The absence of a reason is how the next one gets
      missed.

## 2. The classification learns the difference

- [ ] 2.1 `classify.ts` distinguishes **what the platform said** from **what this
      product concluded**. The raw `destructiveHint` is retained as evidence.
- [ ] 2.2 A money-committing operation classifies as requiring fund-committing
      authority, whatever the platform's annotation says.
- [ ] 2.3 A money-committing operation classifies as consequential, so the
      confirmation gate applies to it.
- [ ] 2.4 The absent-hint case is unchanged and still fails closed
      (`classify.ts:44` reasoning preserved verbatim).
- [ ] 2.5 `UNKNOWN_TOOL` is unchanged: still `destructive: true`,
      `requiredScope: 'mcp:wager'`. A new money-committing tool must stay safe
      before anyone classifies it.
- [ ] 2.6 **`inferScope` stops lying.** Either it is removed, or its comment stops
      claiming `declaredScope` catches wager tools. No comment may describe a
      mechanism with no producer.

## 3. The list cannot rot

- [ ] 3.1 A name on the money-committing list that is **absent from the
      discovered surface** is an error, not a silent no-op.
- [ ] 3.2 That guard carries a vacuity assertion — it must fail if the surface
      record cannot be read, rather than passing over an empty set.
- [ ] 3.3 Verified non-vacuous by adding a bogus name and confirming the failure.

## 4. Both gates, at the port

- [ ] 4.1 `beginGuardedCall` refuses a money-committing operation on a connection
      without fund-committing authority, **before** it is attempted, naming the
      authority.
- [ ] 4.2 `beginGuardedCall` requires and **spends** a confirmation for a
      money-committing operation.
- [ ] 4.3 Cancel's behaviour is unchanged — it is destructive by the platform's
      annotation and by ours, and must stay gated.
- [ ] 4.4 No audit row is written for either refusal. A refusal is not an attempt
      (DL-9 of the approvals change, and `wager.test.ts`).
- [ ] 4.5 **No second opinion.** The application layer is untouched;
      `read-answer-authority.query.ts` still decides only what is *drawn*.

## 5. The tests stop asserting fabricated inputs

- [ ] 5.1 Rewrite `tests/agent/answer-authority.test.ts:171-176` to take its
      classification from the real map rather than hand-building
      `{ destructive: true, requiredScope: 'mcp:wager' }`. **It currently passes
      while the defect is live**, which is the whole problem.
- [ ] 5.2 Sweep the suite for other hand-built `ToolClass` literals and give each
      one either a real classification or a comment saying why a fabricated one is
      correct there.
- [ ] 5.3 Every new guard reverted once and shown to fail.

## 6. The audit says what we did

- [ ] 6.1 A money-committing write records the product's judgement.
- [ ] 6.2 Whatever section 1.2 decided about recording the platform's claim
      alongside it.
- [ ] 6.3 Existing rows are **not** rewritten. An audit you edit is not an audit.
- [ ] 6.4 `audit-list.tsx` renders the change without claiming anything about
      rows written before it.

## 7. Live

- [ ] 7.1 **Read-only first.** Re-probe the surface and confirm the five
      money-affecting annotations still read as recorded. The count has held still
      while semantics moved twice before (#198, #301).
- [ ] 7.2 **BLOCKED ON THE OPERATOR.** With authority and by name at the moment:
      accept one real decision through the product and confirm from the audit that
      the row now states the consequence, and that the confirmation was spent.
      Nothing in section 7.2 runs without that.
- [ ] 7.3 Confirm a read-only connection is refused at the **port** — the scenario
      that is vacuous today.

## 8. Close out

- [ ] 8.1 Delete the section 0 tests. They pinned a defect that no longer exists.
- [ ] 8.2 `#340` updated with what was measured, and closed only if the sweep in
      1.3 is complete.
- [ ] 8.3 Re-pin any surface manifest whose source files moved.
- [ ] 8.4 Journal entry.
