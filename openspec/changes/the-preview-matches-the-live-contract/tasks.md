# Tasks

- [x] 1.1 Drop `regimeAutoDerive`/`regimeTimeframe` from the
      `previewReport` port signature and the adapter payload, dated
      observation in the comment.
- [x] 1.2 The two use-case call sites stop passing them; the strategy
      read side stays whole.
- [x] 1.3 Test mirrors follow: `previewPayload` in the conformance
      guard, the preview unit tests, the fake port, the live
      custom-table probe.
- [ ] 1.4 Gates: tsc, lint, vitest; live preview proven in this
      session's keyed run.
