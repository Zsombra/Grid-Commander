# Tasks

## 1. The pre-flight

- [x] 1.1 In `forkStrategy` (app/(app)/strategies/[id]/fork/page.tsx), after
      the listing re-read finds the strategy: compute the resulting name —
      the typed name, or `"<parent> (fork)"` when blank — and check it for an
      exact match against the names of PRIVATE strategies in the same
      listing. (Requirement: refuse before sending; own strategies only.)
- [x] 1.2 On a match, redirect back to the form with a `problem=` reason that
      uses the existing "Nothing was attempted:" convention, names the
      colliding name, states the platform's measured answer as a fact about
      the platform, and keeps the typed name via `name=`. Blank-name arm
      points at typing a name of one's own. (Requirement: naming + kept
      input.)
- [x] 1.3 Leave the refused-arm rendering and the CarriedProblem path
      untouched — the platform backstop must behave exactly as before.
      (Requirement: race is still the platform's.)

## 2. Verification

- [x] 2.1 Test: blank name with "<parent> (fork)" already owned → nothing
      sent (fake port records no fork call), problem names the collision,
      points at typing a name.
- [x] 2.2 Test: chosen name matching an owned strategy → nothing sent,
      problem names it, `name=` keeps the typed value.
- [x] 2.3 Test: chosen name matching only a SYSTEM strategy → the fork IS
      sent (fake port records the call).
- [x] 2.4 Test: no collision, platform refuses → refusal renders whole with
      typed name kept (existing behavior stays green).
- [x] 2.5 Quality gates: typecheck, lint, full vitest, build, drizzle no-op;
      test:db skipped if no local DATABASE_URL (say so).
