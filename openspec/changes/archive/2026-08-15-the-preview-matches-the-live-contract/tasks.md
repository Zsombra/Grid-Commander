# Tasks

- [x] 1.1 Drop `regimeAutoDerive`/`regimeTimeframe` from the
      `previewReport` port signature and the adapter payload, dated
      observation in the comment.
- [x] 1.2 The two use-case call sites stop passing them; the strategy
      read side stays whole.
- [x] 1.3 Test mirrors follow: `previewPayload` in the conformance
      guard, the preview unit tests, the fake port, the live
      custom-table probe.
- [x] 1.4 Gates: tsc, lint, vitest (200 files / 2498 tests), validate 0
      errors. The **read** side needed a correction the first draft of
      this change denied: v19 deleted `regimeAutoDerive` from all fifteen
      output schemas and a live `get_strategy` confirms its absence, so
      the mapper now records `boolean | null` instead of collapsing the
      platform's silence to `false`. `regimeTimeframe` still arrives
      though nothing declares it.
