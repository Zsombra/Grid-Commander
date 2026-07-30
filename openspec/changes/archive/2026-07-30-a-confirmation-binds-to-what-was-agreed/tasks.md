# Tasks

## 0. Establish the extent before changing anything (complete)

- [x] 0.1 Enumerate every issuer of a confirmation and the `target` each binds —
      five flows, four already binding their values
- [x] 0.2 Enumerate every port call's `target` and confirm `consume` needs no new
      parameter: the composite already travels as a string
- [x] 0.3 Establish which flows re-read values from the form. Only the edit
      re-reads amounts; archive re-reads `expectedRevision`, which BattleGrid
      refuses on mismatch
- [x] 0.4 Read `partitionEdit` and confirm `accepted` is what `describeEdit`
      describes. **The second half of this task was wrong as written** — `accepted`
      is *not* what reaches the wire; the command merges onto the current config
      and sends twenty fields. See DL-6

## 1. The guard, written first and seen failing

- [x] 1.1 `tests/architecture/confirmation-binds-values.test.ts` — derive the
      issuers from source (a call to `confirmations.issue`) rather than listing
      them. A list would pass while a sixth flow was added
- [x] 1.2 Every issuer whose flow carries values must build its `target` through
      the shared construction, not by composing a string inline
- [x] 1.3 **Run it against the unfixed tree and record the output verbatim.** It
      named all five issuers, `apply-plan.command.ts` included — the expectation
      written here ("not apply-plan") was wrong, because the property is *one
      construction*, not *has a digest*. Every flow composed its own string
- [x] 1.4 Two vacuity checks: it found the issuers it compares, and the set is
      neither empty nor everything

## 2. One construction, in the domain

- [x] 2.1 `src/domain/capability/digest.ts` — `digestOf` moves out of
      `compile-plan.command.ts`. Forced by the boundary: the domain cannot import
      an application use case
- [x] 2.2 `confirmationTarget()` in `src/domain/capability/confirmation.ts`, next
      to `ConfirmationToken`
- [x] 2.3 `apply-plan.command.ts` and `rebind.ts` use it. ~~The strings must be
      byte-identical to today's, because this flow is the control group~~ —
      **both halves false.** Apply-plan was not a control group, it was broken, and
      byte-identical would have preserved the break. `rebindTarget` was deleted
      rather than repointed: a second construction is the duplication being removed
- [x] 2.4 `compile-plan.command.ts` imports `digestOf` rather than defining it;
      its existing key-ordering tests stay where they are.

      **Ticked before it was true.** The domain copy was added and the original
      left in place, so `digestOf` and `canonicalise` existed twice — caught by the
      production gate (PG-001/PG-002), not by any test. Now one definition, and
      `confirmation-binds-values.test.ts` fails on a re-injected second copy

## 3. Bind the edit

- [x] 3.1 `DescribeEditQuery` issues against `digestOf(accepted)`
- [x] 3.2 `UpdateAgentCommand` recomputes from what it is about to send and
      consumes against that
- [x] 3.3 `agent-adapter.ts` sends the composite target on update
- [x] 3.4 Refused **before** a request is built — the existing
      `ConfirmationRequiredError` path, not a platform round trip

## 4. Verification

- [x] 4.1 **The happy path, asserted as directly as the attack.** Propose, submit
      unchanged, and the write reaches the port exactly once. This is the one way
      this change can be wrong while every new test passes — see DL-5
- [x] 4.2 A tampered amount is refused, and the agent is unchanged — R: A
      Destructive Change Is Agreed To By A Person, scenario `An amount altered
      after it was agreed to`
- [x] 4.3 Two proposals for one agent produce two targets, each authorising only
      its own change — scenario `Two agreements for one agent`
- [x] 4.4 Re-inject: drop the digest from the issuer, then from the consumer.
      Both must fail, and with different messages — one is "issued for something
      else", the other is a guard that stopped checking
- [x] 4.5 Re-inject: digest the raw submission instead of `accepted`, and confirm
      an edit touching a rejected field is wrongly refused — DL-2
- [x] 4.6 ~~The apply-plan target is unchanged, byte for byte~~ — **withdrawn.**
      The old target was the broken one; preserving it byte for byte would have
      preserved a dead write path. Replaced by 4.6b
- [x] 4.6b **The fifth dead write path.** `apply_strategy_plan` issued
      `strategy:<id>#<digest>` and spent `strategy:<id>`, so the product refused
      every apply. Regression tests drive issue-then-spend through the store;
      re-injecting the bare id fails them — R: Destructive Operations Require
      Confirmation Naming The Consequence. See DL-7
- [x] 4.6c **One reader, not two.** `pick` kept `"25"` where `numberish` produced
      `25`; every honest edit would have been refused. `editIntent` is now the one
      reader, `MONEY_FIELDS` moved beside it, and the property has its own tests
      because the first re-injection of it passed. See DL-8
- [x] 4.6d Remove `rebindTarget` — a second construction of the same string is
      the duplication this change exists to delete
- [x] 4.7 `npm run typecheck`, `npm run lint`, `npm test`, `./scripts/check.sh`,
      `next build`
- [x] 4.8 File the backlog item for rebind's strategy revision

## 5. Production gate

- [x] 5.1 Verifier — 2 warnings, both closed before the gate
- [x] 5.2 Auditor — BLOCKED on 1 CRITICAL + 3 MAJOR, then PASS on re-audit — `full` track, and the reason is DL-4 rather than the diff size
