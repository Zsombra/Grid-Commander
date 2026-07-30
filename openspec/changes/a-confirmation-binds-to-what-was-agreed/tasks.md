# Tasks

## 0. Establish the extent before changing anything (complete)

- [x] 0.1 Enumerate every issuer of a confirmation and the `target` each binds —
      five flows, four already binding their values
- [x] 0.2 Enumerate every port call's `target` and confirm `consume` needs no new
      parameter: the composite already travels as a string
- [x] 0.3 Establish which flows re-read values from the form. Only the edit
      re-reads amounts; archive re-reads `expectedRevision`, which BattleGrid
      refuses on mismatch
- [x] 0.4 Read `partitionEdit` and confirm `accepted` — not the submission — is
      both what reaches the wire and what `describeEdit` describes

## 1. The guard, written first and seen failing

- [ ] 1.1 `tests/architecture/confirmation-binds-values.test.ts` — derive the
      issuers from source (a call to `confirmations.issue`) rather than listing
      them. A list would pass while a sixth flow was added
- [ ] 1.2 Every issuer whose flow carries values must build its `target` through
      the shared construction, not by composing a string inline
- [ ] 1.3 **Run it against the unfixed tree and record the output verbatim.** It
      must name `describe-edit.query.ts` and not `apply-plan.command.ts`
- [ ] 1.4 Two vacuity checks: it found the issuers it compares, and the set is
      neither empty nor everything

## 2. One construction, in the domain

- [ ] 2.1 `src/domain/capability/digest.ts` — `digestOf` moves out of
      `compile-plan.command.ts`. Forced by the boundary: the domain cannot import
      an application use case
- [ ] 2.2 `confirmationTarget()` in `src/domain/capability/confirmation.ts`, next
      to `ConfirmationToken`
- [ ] 2.3 `apply-plan.command.ts` and `rebind.ts` use it. **The strings they
      produce must be byte-identical to today's** — asserted, because this flow is
      the control group
- [ ] 2.4 `compile-plan.command.ts` imports `digestOf` rather than defining it;
      its existing key-ordering tests stay where they are

## 3. Bind the edit

- [ ] 3.1 `DescribeEditQuery` issues against `digestOf(accepted)`
- [ ] 3.2 `UpdateAgentCommand` recomputes from what it is about to send and
      consumes against that
- [ ] 3.3 `agent-adapter.ts` sends the composite target on update
- [ ] 3.4 Refused **before** a request is built — the existing
      `ConfirmationRequiredError` path, not a platform round trip

## 4. Verification

- [ ] 4.1 **The happy path, asserted as directly as the attack.** Propose, submit
      unchanged, and the write reaches the port exactly once. This is the one way
      this change can be wrong while every new test passes — see DL-5
- [ ] 4.2 A tampered amount is refused, and the agent is unchanged — R: A
      Destructive Change Is Agreed To By A Person, scenario `An amount altered
      after it was agreed to`
- [ ] 4.3 Two proposals for one agent produce two targets, each authorising only
      its own change — scenario `Two agreements for one agent`
- [ ] 4.4 Re-inject: drop the digest from the issuer, then from the consumer.
      Both must fail, and with different messages — one is "issued for something
      else", the other is a guard that stopped checking
- [ ] 4.5 Re-inject: digest the raw submission instead of `accepted`, and confirm
      an edit touching a rejected field is wrongly refused — DL-2
- [ ] 4.6 The apply-plan target is unchanged, byte for byte
- [ ] 4.7 `npm run typecheck`, `npm run lint`, `npm test`, `./scripts/check.sh`,
      `next build`
- [ ] 4.8 File the backlog item for rebind's strategy revision

## 5. Production gate

- [ ] 5.1 Verifier
- [ ] 5.2 Auditor — `full` track, and the reason is DL-4 rather than the diff size
