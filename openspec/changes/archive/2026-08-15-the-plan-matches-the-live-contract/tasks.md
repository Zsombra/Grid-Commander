# Tasks

- [x] 1.1 Move `regimeAutoDerive`/`regimeTimeframe` from
      `PLAN_FIELDS_FROM_POST_STATE` to `FIELDS_APPLY_REJECTS`, dated
      observation in the comment.
- [x] 1.2 Projection test: required list drops the two; the
      rejected-fields loop covers their absence by name.
- [x] 1.3 Conformance guard: expect exactly the four stale-artifact rows,
      dated and self-expiring.
- [x] 1.4 Gates (vitest 196 files / 2461 tests, python 274, validate 0
      errors, tsc + lint clean); residue
      `the-surface-record-is-a-deployment-behind` filed and mirrored
      (#287); #285 closed both sides on archive.
