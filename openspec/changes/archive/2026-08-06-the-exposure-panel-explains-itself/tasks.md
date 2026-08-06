# Tasks

## 1. The sentence

- [x] 1.1 `Exposure`'s unreadable branch renders `WhyNotLoaded` beside the
      reason, with `cause={exposure.cause}` — carried out of the read, never
      parsed from the message.
- [x] 1.2 Subject is `this agent’s positions are`. The argument for it over
      `these positions are` lives in the component, next to the words.

## 2. The guard

- [x] 2.1 Delete the `src/presentation/components/exposure.tsx  (exposure)`
      entry from `EXEMPT` in `tests/architecture/failure-is-explained.test.ts`.
      The guard fails on a branch that carries the sentence and is still listed,
      so this is not optional cleanup.

## 3. Verification

- [x] 3.1 `tests/rendering/exposure.test.ts`: the unreadable branch renders the
      reassurance with its subject, tells a refusal from an outage, and still
      never reads as holding nothing.
- [x] 3.2 `npx tsc --noEmit -p tsconfig.json`, `npx eslint .`, and
      `npx vitest run tests/architecture/ tests/rendering/` green.
- [x] 3.3 `the-exposure-panel-still-prints-its-reason` linked to this change and
      set `in-progress` — it becomes `done` when this archives.
