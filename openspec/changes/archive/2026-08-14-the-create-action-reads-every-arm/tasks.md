# Tasks

## 1. The action reads every arm

- [x] 1.1 `backTo(problem): never` in the create action, mirroring the edit
      action's: `problem` plus every submitted field except `idempotencyKey`
      and keys beginning `$ACTION`, redirecting to `/agents/new`.
      (→ "A Refused Create Keeps What Was Composed")
- [x] 1.2 The three arms consumed through it — `at-capacity` carries
      `result.explanation`, `no-catalog` carries `result.reason`, `invalid`
      joins its issues as `field: reason · …` — with the tail written so the
      union is narrowed to exhaustion and a new arm fails `npm run typecheck`
      inside this action. (→ "The Outcome Of A Write Reaches The Person Who
      Asked For It", partial-read clause)

## 2. The composition survives the bounce

- [x] 2.1 `AgentForm` gains `composed` (the page's query): `displayName`,
      `strategyId`, `brainPreset`, `modelId`, the three behavior enums, and
      `positionPreset` take their defaults from it; the six money questions
      flow through `MoneyLimits`' existing `current` prop. Nothing carried
      means today's rendering exactly — the strategy select still chooses
      nothing on the operator's behalf.
      (→ "A Refused Create Keeps What Was Composed")
- [x] 2.2 The page passes the carried query through to `AgentForm`, and the
      re-render mints a fresh `idempotencyKey` as it does today.
- [x] 2.3 Remove the dead `issues` prop from `AgentForm` (no caller passes it;
      the bounce carries reasons through `CarriedProblem`). Infrastructure.

## 3. The gap that hid this is taught

- [x] 3.1 `tests/agent/refusals-reach-the-operator.test.ts`: the create action
      joins the partial-read pins — `const result = await
      app.createAgent.execute` read, all three arm spellings present, the
      reason carried unglossed — with the lesson recorded where the pins live:
      "reads the result" is not "reads every arm the union carries".
      (→ scenario "A result read partially, not fully")
- [x] 3.2 `tests/rendering/new-agent.test.ts`: the action seam walked for each
      refused arm — fakes forcing `at-capacity`, `no-catalog`, and `invalid` —
      asserting the bounce lands on `/agents/new?problem=` with the arm's own
      reason and the submitted values carried, and that `idempotencyKey` is
      **not** among them. (→ all three ADDED scenarios)
- [x] 3.3 Prefill rendering tests: a page rendered with carried values holds
      them in the form; a first visit renders exactly as before, nothing
      preselected. (→ "A Refused Create Keeps What Was Composed")

## 4. Verification

- [x] 4.1 Quality gates: `npm run typecheck`, `npm run lint`, `npm test`,
      `npm run build`; `npm run db:generate && git diff --quiet drizzle/`
      (no schema change — must be a no-op); `npm run test:db` only if a local
      `DATABASE_URL` is available (no db surface is touched).
- [x] 4.2 The mutation check, on the union rather than a spelling: add a
      scratch arm to `CreateAgentResult` locally, confirm `npm run typecheck`
      fails inside the create action, revert. Record the result in this file.
      (→ scenario "A result read partially, not fully" — the check must be
      able to fail)
- [x] 4.3 Confirm `write-results.test.ts` still counts the create site as read
      (its `sees the app at all` floor) and that no ledger row was added or
      removed.

## Results (2026-08-14)

- 4.1: typecheck, lint clean; **2386 tests / 185 files** green (one amended:
  `money-limits.test.ts` "passes nothing to prefill when composing" pinned the
  old spelling — its own comment states the principle as "the prefill can only
  come from a value that was passed in", which the bounce preserves: the
  carried values are the operator's own typing; re-pinned to
  `current={composed}` and a literal still fails); build clean;
  `db:generate` a no-op (`git diff --quiet drizzle/` exit 0). `test:db`
  skipped: no db surface touched, no local `DATABASE_URL` — and per the
  2026-08-14 journal, "CI provides postgres" is a claim about configuration,
  not runs.
- 4.2: **measured.** Scratch arm `'scratch-arm-for-mutation-check'` added to
  `CreateAgentResult` → `tsc` failed at `app/(app)/agents/new/page.tsx(227,21)`
  `TS1360: … does not satisfy the expected type 'never'` — inside the action's
  default branch, exactly where a sixth arm must be handled. Reverted;
  typecheck clean again.
- 4.3: `write-results.test.ts` 5/5 including the ≥30-sites floor; ledger
  untouched (two rows, both `applyPlan`).
