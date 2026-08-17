# Tasks: The Port Knows What Costs Money

> **Track `full`.** The planner writes `plan/` before section 2 begins. Section 0
> is deliberately available to the planner as evidence-gathering — it only adds
> throwaway tests that pin today's behaviour.
>
> **The two questions the first draft deferred are settled** and section 1 records
> the answers: A10 puts the producer in the adapter, and the audit records both
> claims without backfilling. Do not re-open either; challenge them in the
> decision log if the planner disagrees.

## 0. Prove the defect before changing anything

- [x] 0.1 A test that drives `buildClassificationMap` over the **real**
      `docs/battlegrid-mcp-capabilities.json` and asserts today's behaviour:
      `accept_entry_decision` → `destructive: false`, `requiredScope: 'mcp:read'`.
      **This test is expected to be deleted**, not kept — it pins the defect. Its
      job is to make the starting state undeniable in the diff.
- [x] 0.2 A test that drives the **real** `beginGuardedCall` with that
      classification on `heldScopes: ['mcp:read']` and shows accept is admitted
      with no confirmation token. Also deleted at the end.
- [x] 0.3 Record both outputs verbatim in `plan/decision-log.md`. Everything
      after this is measured against them.

## 1. One home for the judgement

> **Settled before planning — do not re-open.** A10 half 1 forbids a
> `WAGER_TOOLS` name anywhere in `src/`/`app/`; half 2 confines the answer pair to
> `src/infrastructure/battlegrid/`. So the producer is the **adapter**, never the
> domain. The audit question is settled too: **record both, never backfill**.

- [x] 1.1 Move the names to one module under `src/infrastructure/battlegrid/`,
      partitioned into **forbidden** (unreachable) and **reachable**.
      `tests/agent/wager.test.ts` imports it instead of declaring its own copy, so
      A10 guards the same list the runtime uses.
- [x] 1.2 Add **`random_submit_market_grid`** to the forbidden set. Money-affecting,
      absent from `WAGER_TOOLS`, unnamed in `src`/`app` today — unreachable in fact
      and unguarded.
- [x] 1.3 Assert the **partition**: every money-committing tool is in exactly one
      set. A name in both, or called while in neither, is an error.
- [x] 1.4 A one-line reason per entry, and a line for each remaining mutating tool
      saying why it is on neither list. The absence of a reason is how the next one
      gets missed.

## 2. `declaredScope` gets the producer its comment already claims

- [x] 2.1 `rawDiscoverTools` (`mcp-adapter.ts:387`) sets `declaredScope` on the
      reachable money-committing tools as it maps the discovered list. It is inside
      the directory A10 permits, and it is the only place that may know the names.
- [x] 2.2 `classify.ts` stays **name-free**. It keeps reading
      `tool.declaredScope ?? inferScope(...)`; the field simply now has a value.
- [x] 2.3 `classify.ts` distinguishes **what the platform said** from **what this
      product concluded**, retaining the raw `destructiveHint` as evidence.
- [x] 2.4 A money-committing operation classifies as consequential, so the
      confirmation gate applies whatever the annotation says.
- [x] 2.5 The absent-hint case is unchanged and still fails closed
      (`classify.ts:44` reasoning preserved verbatim).
- [x] 2.6 `UNKNOWN_TOOL` unchanged — `destructive: true`,
      `requiredScope: 'mcp:wager'`. A newly deployed money-committing tool stays
      safe before anyone classifies it.
- [x] 2.7 **`inferScope` stops lying.** Either it goes, or its comment stops
      claiming `declaredScope` catches wager tools. No comment may describe a
      mechanism with no producer — that sentence is why this survived four months.

## 3. The list cannot rot

- [x] 3.1 A name on the money-committing list that is **absent from the
      discovered surface** is an error, not a silent no-op.
- [x] 3.2 That guard carries a vacuity assertion — it must fail if the surface
      record cannot be read, rather than passing over an empty set.
- [x] 3.3 Verified non-vacuous by adding a bogus name and confirming the failure.

## 4. Both gates, at the port

- [x] 4.1 `beginGuardedCall` refuses a money-committing operation on a connection
      without fund-committing authority, **before** it is attempted, naming the
      authority.
- [x] 4.2 `beginGuardedCall` requires and **spends** a confirmation for a
      money-committing operation.
- [x] 4.3 Cancel's behaviour is unchanged — it is destructive by the platform's
      annotation and by ours, and must stay gated.
- [x] 4.4 No audit row is written for either refusal. A refusal is not an attempt
      (DL-9 of the approvals change, and `wager.test.ts`).
- [x] 4.5 **No second opinion.** The application layer is untouched;
      `read-answer-authority.query.ts` still decides only what is *drawn*.

## 5. The tests stop asserting fabricated inputs

- [x] 5.1 Rewrite `tests/agent/answer-authority.test.ts:171-176` to take its
      classification from the real map rather than hand-building
      `{ destructive: true, requiredScope: 'mcp:wager' }`. **It currently passes
      while the defect is live**, which is the whole problem.
- [x] 5.2 Sweep the suite for other hand-built `ToolClass` literals and give each
      one either a real classification or a comment saying why a fabricated one is
      correct there.
- [x] 5.3 Every new guard reverted once and shown to fail.

## 6. The audit says what we did

- [x] 6.1 A money-committing write records **both** the platform's claim and this
      product's judgement, as separate facts.
- [x] 6.2 The badge renders **ours**, because it is presented as our statement
      about what we did to someone's account.
- [x] 6.3 Existing rows are **not** rewritten. An audit you edit is not an audit.
- [x] 6.4 `audit-list.tsx` renders the change without claiming anything about
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

- [x] 8.1 Delete the section 0 tests. They pinned a defect that no longer exists.
- [ ] 8.2 `#340` updated with what was measured, and closed only if the sweep in
      1.4 is complete.
- [x] 8.3 Re-pin any surface manifest whose source files moved.
- [x] 8.4 Journal entry.
