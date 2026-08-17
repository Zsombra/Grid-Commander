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
- [x] 1.9 Walk the live write. **Run by the integrator, 2026-08-06, and it
      passed end to end** — against `Tobruk (fork)` on account 1:

      ```
      fork:    Tobruk (fork) 8fc730ed-… r1
      before:  conditions=5 [AT_SUPPORT, AT_RESISTANCE, VOLATILITY_CALM,
                             FORTIFIED_UP, FORTIFIED_DOWN]
      describe: proposal — "GC_PROBE_DRAFT is added … would be left defining
                6 condition(s) … BattleGrid takes the condition list whole"
      after:   r2 conditions=6 [… , GC_PROBE_DRAFT]  tagline unchanged
      remove:  r3 conditions=5 [back to the original five]
      cleanup: fork archived, parked strategy restored
      ```

      Every audit entry `succeeded`. The re-read is the proof, not the apply's
      own payload; tagline and section keys were unchanged across both writes,
      which is the narrow intent proving it cost the strategy no axis.

      Two corrections the walk needed first, both committed:
      - the read-only half's control case expected a plan where the platform
        correctly refuses a no-op (see DL-9);
      - the source selection picked the first eligible SYSTEM strategy, which
        was `Dunkirk` — and `fork_strategy` answers `INTERNAL_ERROR` when a
        strategy of the fork's name already exists, which for `Dunkirk` it did,
        twenty-two times over. Filed as `forking-a-name-that-exists-is-a-500`.
        The column search also had to recurse into groups: `London`'s eight
        conditions carry no top-level `compare`/`between`, so the walk skipped
        *after* forking and reported success having proved nothing.
