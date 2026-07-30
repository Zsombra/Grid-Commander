# Tasks

## 1. Domain Type
- [ ] 1.1 Add `{ readonly kind: 'unknown' }` to the `Brain` union in
      `src/domain/agent/brain.ts`
- [ ] 1.2 Confirm `brainToArgument` does not need a branch for `unknown`
      (it must never be called with an unknown brain — add a type-level
      assertion or a runtime guard that throws)

## 2. Mapper Fix
- [ ] 2.1 In `mapBrain` (`src/infrastructure/battlegrid/agent-mapper.ts`),
      return `{ kind: 'unknown' }` when neither `str(a.brainPreset)` nor
      `str(a.modelId)` is truthy
- [ ] 2.2 Remove the `?? ''` fallback on `modelId` — it exists only to mask
      the missing-brain case

## 3. UI Handling
- [ ] 3.1 Find every surface that switches on or renders `Brain['kind']`
- [ ] 3.2 Add an `unknown` branch to each: render "Not configured" (or
      equivalent) rather than a blank, an empty model name, or a runtime
      exhaustiveness error

## 4. Tests
- [ ] 4.1 Unit test: `mapBrain` with no `brainPreset` and no `modelId`
      produces `{ kind: 'unknown' }`
- [ ] 4.2 Unit test: `mapBrain` with a `modelId` but no `brainPreset` still
      produces `{ kind: 'custom', modelId: '...' }`
- [ ] 4.3 Snapshot or render test: a brain rendered as `unknown` shows
      "Not configured" (or equivalent), not blank

## 5. Verification
- [ ] 5.1 `npm run type-check` — zero errors (exhaustiveness of the new arm)
- [ ] 5.2 `npm run lint` — zero errors
- [ ] 5.3 `npm test -- --run` — all tests pass
- [ ] 5.4 Requirement 7.4 scenario covered: an agent with no brain fields is
      mapped as `unknown` and rendered as undescribed
