# Tasks

## 1. The manifests the round designs against (#173)
- [x] 1.1 Twelve stale surfaces re-surveyed at `6562791` — the twelve that
      `the-outcome-reaches-the-person` and DT-0015 moved underneath
- [x] 1.2 The refresh added `-with-problem` state variants where
      `CarriedProblem` now renders on every branch, which immediately failed
      the coverage check on tickets written against the old manifests. The
      tickets were regenerated from the refreshed ones rather than the
      warning suppressed.

## 2. The tickets (#166)
- [x] 2.1 DT-0016 — deploy: consequence role + mobile stack
- [x] 2.2 DT-0017 — undeploy: the same, on the sibling page
- [x] 2.3 DT-0018 — rebind-confirm: consequence role on the product's largest
      blast radius ("this is not a merge")
- [x] 2.4 DT-0019/0020/0021 — strategy archive/restore/fork: failure
      sentences take the danger role; `repair-required` and `at-capacity`
      explicitly stay `role=status`, because neither is a failure

## 3. Implementation
- [x] 3.1 Consequence blocks on deploy, undeploy and `rebind-confirm.tsx`
- [x] 3.2 Mobile stack on all three action rows
- [x] 3.3 Danger role on the strategy ceremonies' failure sentences;
      "is not archived" deliberately left as prose — it states what is true
      of the strategy, not an attempt that failed

## 4. The drift the survey found, which #166 did not know about
- [x] 4.1 Five hand-rolled copies of the refusal banner replaced with
      `CarriedProblem`: reactivate, agent archive, recorder trim, pending
      queue, pending proposal
- [x] 4.2 `/pending` thereby regains the semibold "Refused:" prefix it had
      lost — the drift the extraction was supposed to prevent, already
      happened once
- [x] 4.3 `CarriedProblem` widened to accept `string | null` as well as
      `undefined`. A shared component that refuses a caller's shape is one
      somebody quietly re-hand-rolls, which is the failure being closed.
- [x] 4.4 `/connect`'s `declined` banner deliberately untouched — notice, not
      danger (DT-0005: the user chose; nothing failed). Likewise `/pending`'s
      `note`.

## 5. The dead branch
- [x] 5.1 `/agents/[id]` read a `?problem=` no route has minted since the
      rename form moved to `/edit` (`6959707`), and rendered it in the
      *consequence* role — the one place the product called a refusal
      something else. Removed, not restyled.
- [x] 5.2 Typecheck found the eight test call sites still passing
      `searchParams` to that page; all updated, unused `noSearch`
      declarations removed.

## 6. Verification
- [x] 6.1 A product-wide guard: no `.tsx` under `app/` or `src/presentation/`
      hand-rolls the banner. The previous guard only knew the six pages of
      the last change, which is exactly why it could not see these five.
- [x] 6.2 That guard carries vacuous-pass insurance — it asserts it found
      >40 files and that at least one renders the component, so a path drift
      cannot read as compliance.
- [x] 6.3 Gates: typecheck, lint, build, vitest — 165 files / 2179 tests
      green on Windows.

## 7. A dead write path, found by the survey and fixed here

Out of the round's declared scope, and taken anyway: a p1 that makes an
advertised destructive action impossible is not something to leave running
while a restyle lands on top of it.

- [x] 7.1 `RebindConfirm` rendered four hidden inputs; `performRebind` reads
      five. `requiredText(formData, 'agentId')` threw `FormError` on **every
      rebind submit**, before the use case, surfacing as a framework error
      page. One `<input type="hidden" name="agentId">` fixes it.
- [x] 7.2 Why nothing caught it: the rebind flow tests call the use case
      directly, so the *form* was on no path any test walked, and
      `four-dead-write-paths` (closed 2026-07) guarded whether an action is
      bound — never whether it is fed.
- [x] 7.3 New guard `tests/architecture/a-form-sends-what-its-action-reads.test.ts`
      resolves the form actually bound to each action and checks it renders
      every field the action requires. Mutation-verified: removing the input
      again names the file and the field.
- [x] 7.4 **The first version of that guard was useless** and is recorded as
      such in its header: it asked whether the field name appears *anywhere*
      in the UI, and passed with the bug present, because `agentId` is a
      hidden input on four other pages. A guard that cannot fail on its own
      defect is the false confidence this session has now hit twice.
- [x] 7.5 The guard then found a **second** dead path: `create` requires
      `strategyId` and `AgentForm` has no strategy control at all. Filed as
      **#177** (p1) — the fix is a chooser, which is behaviour and needs a
      proposal — and recorded in the guard's `KNOWN_UNSENDABLE` ledger so the
      suite states the defect rather than hiding it.
