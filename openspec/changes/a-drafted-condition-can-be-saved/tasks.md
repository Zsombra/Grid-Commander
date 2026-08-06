# Tasks

- [x] 1.1 `condition-write.ts`: `resolveConditionEdit` over both readings of the
      strategy's conditions (the platform's own objects, and the domain's), the
      three standings, `listedKeys`, and the dangling **delta**.
- [x] 1.2 `compiled-plan.ts`: `compileConditionsIntent` — an UPDATE naming
      conditions and nothing else — and `postStateDrift`, the only reader of
      `postState` beside `toApplyPlan`.
- [x] 1.3 `DescribeConditionWriteQuery`: fresh read, seeded-draft resolution,
      compile, drift check, and the addendum handed to `DescribeApplyQuery` so
      the token is minted against the whole text. `addendum` added to
      `DescribeApplyRequest`; the composed consequence is byte-identical without it.
- [x] 1.4 `/strategies/[id]/conditions/save`: the list with per-condition
      removal, the describe, the confirm form, `?problem=` round-tripping the
      edit; the way in from the composer, carrying the draft's own query;
      composition wiring.
- [x] 1.5 The composer's promise narrowed to what it still guarantees, said in
      both places it was said before.
- [x] 1.6 Guards: the new action-bound route pinned in `reachability`; the ledger
      row and verdict in `write-results`. No exemption added anywhere, and the
      try surface's own structural check (no compile, no apply, no server action
      in its five files) still passes untouched.
- [x] 1.7 Tests: 27 unit over the list, the drift check, the describe branches
      and the binding; 16 rendering over every branch the page can show; the
      full suite green (1697 passing, 26 live files skipped without a key).
- [x] 1.8 Live probe `tests/live/condition-write-probe.test.ts` — a compile-only
      half under a key alone (the list taken whole, the omitted axes preserved,
      and what `conditions: []` means), and a write half under
      `BATTLEGRID_LIVE_WRITES=1` walking fork → describe → apply → read back →
      remove → restore.
- [ ] 1.9 Walk the live write. Not run here: the integrator reserves live MCP
      calls, and this change ships with the exact command and the exact
      expectations in `plan/decision-log.md` (DL-9).
