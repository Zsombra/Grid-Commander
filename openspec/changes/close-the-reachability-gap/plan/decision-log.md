# close-the-reachability-gap Decision Log

## Purpose

Track high-signal decisions across planner, executor, and auditor phases.
Log only what affects scope, risk, validation, waivers, or handoff clarity.

## Entries

### DL-101

- Timestamp: `2026-07-28 07:05 UTC`
- Phase: `PLANNING`
- Type: `risk`
- Decision: The guard is written first, run against the unfixed tree, and its
  output recorded verbatim before any defect is fixed.
- Impacted files: `tests/architecture/reachability.test.ts`, `plan/architecture-review.md`
- Reason: Every other guard in this project has been demonstrated by
  re-injecting a defect after the fix. Here the defects are already present, so
  the demonstration is free — and it is the *only* moment it can be observed
  naming all nine at once. After Phase 3 nobody can reproduce that without
  reverting nine changes. A guard that has only been seen passing is a comment.
- Approved by: planner
- Next action: executor records the output, not a summary of it

### DL-102

- Timestamp: `2026-07-28 07:05 UTC`
- Phase: `PLANNING`
- Type: `risk`
- Decision: The guard derives its route set from the filesystem, never from a
  literal list.
- Impacted files: `tests/architecture/reachability.test.ts`
- Reason: A hardcoded route list is the same mistake one level up — it would
  pass while a route was deleted, which is exactly how the current defect
  survived three gates. The offered set is likewise scanned from the source
  rather than enumerated.
- Approved by: planner
- Next action: auditor checks this specifically

### DL-103

- Timestamp: `2026-07-28 07:05 UTC`
- Phase: `PLANNING`
- Type: `scope-change`
- Decision: Components take their action as a required prop rather than keeping
  a string action with a `route.ts` POST handler behind it.
- Impacted files: `agent-form.tsx`, `rebind-confirm.tsx`, `plan-review.tsx`
- Reason: It converts a silent failure into a type error. A component that
  hardcodes `action="/agents/new"` compiles, renders and does nothing; one that
  requires an action cannot be used without it. The rejected alternative works
  and re-implements Server Actions by hand — losing progressive enhancement and
  the single place the form and handler are typed together.
- Approved by: planner
- Next action: none

### DL-104

- Timestamp: `2026-07-28 07:05 UTC`
- Phase: `PLANNING`
- Type: `exception`
- Decision: Reactivate is its own route, not `archive?to=ACTIVE`.
- Impacted files: `app/(app)/agents/[id]/reactivate/page.tsx`
- Reason: `SetLifecycleCommand` takes a direction, which makes one page look
  sufficient. It is not: the consequence copy differs, the text stored with the
  confirmation token differs, and the heading differs. Two consequences behind
  one URL is how a user confirms wording written for the other operation.
- Approved by: planner
- Next action: auditor checks the two pages do not share consequence text

### DL-105

- Timestamp: `2026-07-28 07:05 UTC`
- Phase: `PLANNING`
- Type: `exception`
- Decision: Fork does not issue a confirmation token.
- Impacted files: `app/(app)/strategies/[id]/fork/page.tsx`
- Reason: Forking creates a private copy and changes nothing that exists — no
  blast radius, nothing to warn about. Adding a confirmation would train users
  to click through confirmations that carry no consequence, which is how the
  ones that do carry one stop being read.
- Approved by: planner
- Next action: none

### DL-106

- Timestamp: `2026-07-28 07:05 UTC`
- Phase: `PLANNING`
- Type: `risk`
- Decision: The guard's known blind spot is stated now rather than discovered at
  audit: it checks that a form is bound to an action, **not** that every control
  inside the form reaches that action's payload.
- Impacted files: `tests/architecture/reachability.test.ts`
- Reason: `agent-form.tsx:83` renders a position-management select and the
  create action sends `tradingConfig: null`, so that control collects a value
  nobody sends. It is the same defect class one level down, and this guard will
  not catch it. Saying so is the difference between a stated limit and the fifth
  instance of believing a guard covers more than it does.
- Approved by: planner
- Next action: filed as `a-preset-does-not-constrain-its-config`; not fixed here

### DL-107

- Timestamp: `2026-07-28 07:05 UTC`
- Phase: `PLANNING`
- Type: `risk`
- Decision: No use case, port, repository, or domain file may be modified. If
  execution needs one, the plan is wrong and stops.
- Impacted files: none — this is a falsifiable claim about the diff
- Reason: The whole premise is that the behaviour exists and only the connection
  is missing. If that premise is false, the change is larger than proposed and
  should be re-proposed rather than quietly grown. Stating it as a boundary
  makes the premise checkable at the gate.
- Approved by: planner
- Next action: auditor verifies the diff touches only `app/`,
  `src/presentation/`, and `tests/`

### DL-108

- Timestamp: `2026-07-28 09:05 UTC`
- Phase: `EXECUTION`
- Type: `risk`
- Decision: The change is handed to the gate with **CI unverified**, and the
  gate must record it that way rather than reading the local gates as CI.
- Impacted files: none — this is a statement about the evidence
- Reason: Every workflow run since `7f1cb28` is a `startup_failure` that never
  reaches a job, and the workflow file is byte-identical to the last green run.
  All local gates pass (typecheck, lint, 394 tests, build, 51 database tests,
  `validate --all`) and the served probe returned 200 on all 16 routes — but a
  local green and a CI green are different claims. Filed `ci-startup-failure`
  (p1).
- Approved by: executor
- Next action: auditor records CANNOT RUN for CI rather than PASS; re-check once
  `ci-startup-failure` clears

### DL-109

- Timestamp: `2026-07-28 09:05 UTC`
- Phase: `EXECUTION`
- Type: `waiver`
- Decision: The workflow file was **not** edited to force a new run.
- Impacted files: `.github/workflows/validate.yml` (deliberately untouched)
- Reason: A trivial edit would retrigger CI and turn the board green. It would
  also place a change to the workflow in the history of a failure the workflow
  did not cause, and the next person debugging this would start from a false
  lead. The file is provably unchanged since the last green run; that fact is
  worth more than a green check.
- Approved by: executor
- Next action: re-run from the UI, or push unrelated work
