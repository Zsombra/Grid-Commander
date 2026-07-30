# Tasks

## 1. Domain Type
- [x] 1.1 Add `{ readonly kind: 'unknown' }` to the `Brain` union in
      `src/domain/agent/brain.ts`
- [x] 1.2 Confirm `brainToArgument` does not need a branch for `unknown`
      (it must never be called with an unknown brain — add a type-level
      assertion or a runtime guard that throws)

## 2. Mapper Fix
- [x] 2.1 In `mapBrain` (`src/infrastructure/battlegrid/agent-mapper.ts`),
      return `{ kind: 'unknown' }` when neither `str(a.brainPreset)` nor
      `str(a.modelId)` is truthy
- [x] 2.2 Remove the `?? ''` fallback on `modelId` — it exists only to mask
      the missing-brain case

## 3. UI Handling
- [x] 3.1 Find every surface that switches on or renders `Brain['kind']`
- [x] 3.2 Add an `unknown` branch to each: render "Not configured" (or
      equivalent) rather than a blank, an empty model name, or a runtime
      exhaustiveness error

## 4. Tests
- [x] 4.1 Unit test: `mapBrain` with no `brainPreset` and no `modelId`
      produces `{ kind: 'unknown' }`
- [x] 4.2 Unit test: `mapBrain` with a `modelId` but no `brainPreset` still
      produces `{ kind: 'custom', modelId: '...' }`
- [x] 4.3 Snapshot or render test: a brain rendered as `unknown` shows
      "Not configured" (or equivalent), not blank — verified by inspection
      (app/(app)/agents/[id]/page.tsx:77-82, the string literal 'Not configured'
      is the only value the ternary can return for kind='unknown'); the project
      has no component test infrastructure for server components

## 5. Verification
- [x] 5.1 `pnpm typecheck` — zero errors (exhaustiveness of the new arm)
- [x] 5.2 `pnpm lint` — zero errors
- [x] 5.3 `pnpm test` — 795 tests pass, 6 skipped (live)
- [x] 5.4 Requirement scenario covered: an agent with no brain fields is
      mapped as `unknown` (mapper.test.ts) and rendered as 'Not configured'
      (page.tsx:81, verified by inspection and typecheck)
