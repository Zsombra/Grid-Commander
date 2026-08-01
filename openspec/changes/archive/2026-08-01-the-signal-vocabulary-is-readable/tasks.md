# Tasks

- [x] 1.1 Signal reads on the strategies port (`listSignals`,
      `signalDefinition`) + adapter mapping the live shapes; refuse-whole-read
      on unusable rows; definition-missing is a distinct outcome.
- [x] 1.2 Use-cases (`ReadSignalLibraryQuery`, `ReadSignalQuery`);
      composition wiring.
- [x] 1.3 `/strategies/signals` (grouped by module) +
      `/strategies/signals/[id]` (authoring card); linked from the strategies
      section; unreadable/missing branches per spec.
- [x] 1.4 Tests: mapper over live shapes, query states, rendering per branch;
      gates green.
