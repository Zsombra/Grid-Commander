# Tasks

- [x] 1.1 Port reads (`listMetrics`, `metricHints`, `columnContract`) +
      adapter mapping the live shapes; the contract refusal is a structured
      result (code, authoring code, path, received, allowed domain), never
      flattened; refuse-whole-read on unusable rows.
- [x] 1.2 Use-cases (`ReadMetricIndexQuery`, `ReadMetricQuery`,
      `CheckColumnQuery`); composition wiring.
- [x] 1.3 `/strategies/metrics` (grouped by family) +
      `/strategies/metrics/[metric]` (card + GET-form contract check);
      linked from the strategies section; branches per spec.
- [x] 1.4 Tests: mapper over live shapes (valid contract, teaching refusal),
      query states, rendering per branch; key-gated live probe; gates green.
