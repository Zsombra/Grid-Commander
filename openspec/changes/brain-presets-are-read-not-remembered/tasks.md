# Tasks

- [x] 1.1 A reader for the values a discovered tool's schema permits at one
      argument path — union branches merged, local `$ref`s followed, cycles
      ended — matching the walk the probe uses for `input_constants`
- [x] 1.2 The agent adapter resolves the brain presets from the discovered
      `create_intelligence_agent` schema instead of the hand-written constant,
      and offers only values the declaration is unambiguous about
- [x] 1.3 An unanswerable declaration yields no presets and never a claim that
      there are none: the create form says BattleGrid did not declare them and
      keeps the model route open, and the create command refuses a submitted
      preset for that reason rather than calling it invalid
- [x] 1.4 Tests: a preset the platform adds is offered, one it stops declaring
      is not, an ambiguous declared value is never offered, an unanswerable
      declaration is stated rather than rendered as an empty set
- [x] 1.5 A source-level guard that fails if any declared preset name is written
      into `src/` again, with the names read from the platform's own record
- [x] 1.6 `npx tsc --noEmit`, `npx eslint .`, and the agent, rendering and
      architecture suites green
