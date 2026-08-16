# Tasks

## 1. The copy

- [x] 1.1 Replace the `maxConcurrentExposureUsd` hint in
      `src/presentation/components/money-limits.tsx` with the approved wording.
      Read the rendered paragraph whole: the field is in `UNBOUNDED_AT_ZERO`, so
      the existing bold *"Entering 0 removes this limit…"* is appended to it and
      the two must read as one paragraph.
- [x] 1.2 Confirm the label *"Most it may have at risk at once"* is unchanged —
      it is already correct and the delta does not touch it.

## 2. Verification

- [x] 2.1 A test asserts the exposure hint names margin and does **not** claim
      a total of open positions — the scenario *A limit described by the wrong
      mechanism*. Assert on the claim, not on the exact sentence, so a later
      rewording does not fail for being a rewording.
- [x] 2.2 A test asserts the rendered paragraph still carries the
      unbounded-at-zero sentence for this field — the pre-existing scenario
      *A value that removes the limit* must not regress.
- [x] 2.3 Quality gates: `npm run typecheck`, `npm run lint`, `npx vitest run`.
      Two files (`live-probes-are-named`, `cli-spawn`) fail at HEAD for
      unrelated reasons — confirm the count is unchanged rather than zero.
- [x] 2.4 `python3 .claude/tools/openspec.py validate the-cap-says-what-it-meters`
      reports zero errors.
