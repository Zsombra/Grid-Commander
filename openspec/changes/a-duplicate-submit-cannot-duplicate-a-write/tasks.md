# Tasks

No code changes. Everything the new requirements describe already ships — this
change makes the records agree with it and with each other.

## 1. The checklist — checklist-generator, UPDATE mode

**Not the executor.** `.claude/skills/executor/SKILL.md` lists *"Modify
checklists in `docs/checklists/`"* under what it does NOT do, and the generator
halts for human approval before applying. That approval is the point: this is an
amendment to a binding standard.

- [ ] 1.1 Restate `UI_COMPONENT_REVIEW_CHECKLIST.md` State & Interaction item 4
      as the outcome, naming the mechanisms rather than prescribing one. Wording
      to propose:

      > A duplicate submit cannot produce a duplicate write. Where the operation
      > spends a single-use confirmation, or the platform honours an idempotency
      > key, or the write is naturally idempotent, that is the guarantee. A
      > control that stops accepting presses is a mitigation, not a guarantee,
      > and must not be relied on alone.

- [ ] 1.2 **Decide the scope of the regeneration before running it.** The
      generator rewrites the whole file, and the file has other defects (#233):
      a `Based On` header naming shadcn and Zustand, three sections governing
      machinery that has never existed here, and a Tailwind item requiring
      `cn()` in a spelling `controls.test.ts` rejects. Either fix them in the
      same pass or preserve them deliberately. Opening this file twice is worse
      than either.
- [ ] 1.3 Bump the version and the Last Updated date, per the generator's own
      Phase 4.

## 2. The spec

- [ ] 2.1 The delta in `specs/app-access/spec.md` adds two requirements, zero
      MODIFIED. Nothing existing becomes false: the resubmission scenarios in
      `agent-authoring` and `strategy-authoring` are about a confirmation reused
      against a *different target*, and `app-access`'s existing "Single-use
      tokens" scenario is about storage enforcing it, which is one of the
      mechanisms named here rather than a competing claim.

## 3. Verify the outcome is true before claiming it

The requirements assert a property of all eighteen perform submits. Confirm each
group still holds rather than trusting this proposal's table.

- [ ] 3.1 Fourteen spend a single-use `confirmationToken`; `consume` is the
      single atomic spender.
- [ ] 3.2 Fork: BattleGrid refuses the duplicate. Measured 2026-08-14, named and
      auto-named, both `INTERNAL_ERROR` on the second call. **Re-probe if the
      platform version has moved** — CLAUDE.md's rule is to probe the version,
      never the shape.
- [ ] 3.3 Create: `idempotencyKey` minted per render, carried as a hidden input,
      read by the action. Guarded by
      `tests/architecture/a-create-carries-a-dedupe-key.test.ts`.
- [ ] 3.4 Restore is idempotent; connect mints a fresh OAuth state and only
      redirects to consent.
- [ ] 3.5 The refusal reaches the person — `spending()` on ten of the eleven
      spending actions, and a correct hand-rolled catch on the eleventh
      (`conditions/save`). Guarded by
      `tests/architecture/a-refusal-reaches-the-person.test.ts`. **This said
      "nine"**: the guard could not see `/agents/[id]/edit`, which passes its
      token by ES6 shorthand, so the route that edits loss caps spent a
      confirmation with nothing catching its refusal. Corrected during the
      review of PR #235, where the action was wrapped and the scan widened.
      Re-run the count rather than trusting this line — that is what 3.x is for.

## 4. Leave the code alone

- [ ] 4.1 **Do not add `disabled={pending}`.** The proposal records why, and a
      reviewer who disagrees should reopen the decision there rather than in an
      implementation. `tests/rendering/design-tickets-0022-0025.test.ts` already
      asserts no rendered node carries `disabled: true`; that assertion stands
      and is now backed by a requirement instead of only by a design ticket.
- [ ] 4.2 `system.json` principle 14 currently says the trigger "is currently
      contested" and forbids a ticket from asserting either answer while that
      stands. Once this lands the contest is over: rewrite it to state the
      settled position and cite this change. **This is the only edit outside
      `docs/` and `openspec/`,** and it is a principle's text, not a token.

## 5. Close out

- [ ] 5.1 Close #229 with what was decided and which argument decided it.
- [ ] 5.2 `may-a-submit-disable-itself-while-it-is-in-flight` (#228) is
      superseded by this change; close it, noting that its three arguments are
      the record of the trade and that the third one — the one about the
      announcement channel — is what survived scrutiny.
- [ ] 5.3 Journal entry.
