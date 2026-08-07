# Tasks

- [x] 1.1 The fork form offers an optional name: blank keeps today's behaviour
      and the page says so in plain terms ("BattleGrid names the copy
      `<parent> (fork)`"), with the reason to name stated no wider than the
      truth — a name of your own tells your copies apart. No promise that
      naming avoids an error. `maxLength={50}` pre-states the declared bound
      the way the agent forms pre-state `displayName`'s 80.
- [x] 1.2 `ForkStrategyCommand` threads `name` through; the adapter sends it
      only when non-blank (the schema declares `minLength: 1`, so blank is not
      a name). The adapter comment records the 2026-08-06 finding in one line
      and points at `forking-a-name-that-exists-is-a-500`.
- [x] 1.3 A fork refusal is a result, not a crash: `StrategiesPort.forkStrategy`
      returns `ForkResult`, the adapter converts `ToolRefusedError` /
      `RevisionConflictError` into `{kind: 'refused', reason}` exactly as
      `setActive` does (transport failures still throw), and the action
      redirects back to the fork form with `?problem=` and the typed name.
      No pre-check against existing names anywhere.
- [x] 1.4 Conformance: `payload-conformance.test.ts` holds the fork payload the
      adapter constructs, named and unnamed, against the declared surface.
- [x] 1.5 Tests: command threading (`tests/strategy/lifecycle.test.ts`),
      adapter wire + refusal conversion (`tests/strategy/fork.test.ts`),
      form copy / problem arm / typed-name survival
      (`tests/rendering/fork.test.ts`). `write-probe` narrows the new result.
- [x] 1.6 `npx tsc --noEmit`, `npx vitest run tests/strategy tests/rendering
      tests/architecture`, `npx eslint` over the changed files — all green.
