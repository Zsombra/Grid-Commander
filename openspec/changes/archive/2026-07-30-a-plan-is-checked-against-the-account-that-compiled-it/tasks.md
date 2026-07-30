# Tasks

## 0. Establish the fact (complete)

- [x] 0.1 Drive the served application against a live account and record the exact
      refusal — *"This plan was compiled for a different account"*
- [x] 0.2 Decode a live plan token and record its `userId` claim
- [x] 0.3 Read both modes' `userId` and confirm neither can match: `'owner'`, and
      `random.token(16)`
- [x] 0.4 Confirm `users.id` and `users.battlegrid_subject` are separate columns,
      so this is not personal-mode-only
- [x] 0.5 Find the fixture that hid it

## 1. The type, which is the guard

- [x] 1.1 `Authority.battlegridSubject: BattlegridSubject | null` — branded, not a
      bare string. See 1.3
- [x] 1.2 `refuseLocally` context takes `battlegridSubject`, not `userId`
- [x] 1.3 **Run typecheck and record the errors verbatim.** Twelve sites named. But
      the re-injection then showed **the rename alone did not enforce it**:
      `battlegridSubject: req.userId` compiled, because both are `string`. Four
      behaviour tests caught it and the compiler said nothing. The claim in DL-2 was
      false and is corrected there. `BattlegridSubject` is now branded, and the
      re-injection reads:
      `error TS2322: Type 'string' is not assignable to type 'BattlegridSubject'`
- [x] 1.4 `null` skips the user check

## 2. Supply it

- [x] 2.1 Delegated: carry `battlegridSubject` from the connection — stored since the
      schema was written, read by nothing that needed it
- [x] 2.2 Personal: discover from `list_user_active_positions`, cached, `null` on
      failure. Chosen because it is in the **probed** surface artifact;
      `get_account_state` is the obvious candidate and returns no id at all
- [x] 2.3 Wire it in `composition.ts`

## 3. Verification

- [x] 3.1 The fixture uses two distinct constants, asserted distinct
- [x] 3.2 A plan compiled for this subject is not refused
- [x] 3.3 A plan compiled for another subject is still refused
- [x] 3.4 `null` does not refuse — and the other three checks keep running, asserted
- [x] 3.5 Discovery failure does not disable applying; asked once, then remembered
- [x] 3.6 Re-inject: pass the local id where the subject belongs — **does not
      compile.** Also re-injected the opposite mistake, refusing on a `null`
      subject, which fails two tests
- [x] 3.6b Cover the delegated half. `ResolveAuthorityQuery` returning the subject
      was untested; `authority.test.ts` now asserts both fields and that they differ
- [x] 3.7 `npm run typecheck`, `lint`, `test`, `check.sh`, `next build`, `check-serving.sh`
- [x] 3.8 Reconcile the plan inventory against `git status`. Three divergences,
      recorded in the plan: `current-user.query.ts` listed and not needed (the field
      passes through), and two files touched but unlisted — the branded-subject
      module and `authority.test.ts`

## 4. Production gate

- [x] 4.1 Verifier — one warning: the brand was unguarded. Closed with a
      `@ts-expect-error` assertion in `tests/access/subject-brand.test.ts`, re-injected
- [x] 4.2 Auditor — PASS, zero open violations
