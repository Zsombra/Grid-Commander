# Tasks

## 1. The outcome exists
- [x] 1.1 `DeployAgentResult`, `UndeployResult`, `RetuneRuleResult` and
      `RebindAgentResult` gain an `authority-lost` arm carrying the reason
- [x] 1.2 Each catch re-classifies `ConnectionRevokedError` into it, and
      leaves every other error as `refused`

## 2. The surfaces render the loss, not the ceremony
- [x] 2.1 `AuthorityLost` component — the sentence verbatim, danger role,
      role=alert, and no control that performs anything
- [x] 2.2 The four actions redirect back with `?authority=`, distinct from
      `?problem=`
- [x] 2.3 The four pages branch on it before describing — there is nothing to
      describe when authority is gone — and render no form

## 3. Verification
- [x] 3.1 Unit: a revoked connection returns `authority-lost`, not `refused`,
      on all four commands
- [x] 3.2 Unit: every other thrown error still returns `refused`
- [x] 3.3 Rendering: with `?authority=`, the page shows the sentence and
      renders no submit control
- [x] 3.4 Gates: typecheck, lint, build, vitest
