# Tasks: extend-coercion-guard

- [x] 1 `tests/architecture/identifiers.test.ts` — the nullish half
- [x] 2 The ternary half, which the previous guard could not have seen
- [x] 3 The positive half: a mapper must be able to refuse
- [x] 4 Assert the rule covers a non-empty file set, so it cannot pass trivially
- [x] 5 Reproduce PG-301 verbatim and assert the rule rejects it
- [x] 6 Re-inject PG-301 into the real adapter and confirm the build fails
- [x] 7 Close backlog `extend-coercion-guard-to-mappers`
- [x] 8 Quality gates green
