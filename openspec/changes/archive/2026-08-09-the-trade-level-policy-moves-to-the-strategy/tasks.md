# Tasks — the-trade-level-policy-moves-to-the-strategy

- [x] 1.1 Re-probe at v15.0.0; regenerate reference + capabilities dump.
- [x] 1.2 Add the three policy fields to `toApplyPlan`'s projection (they
      are `required` on apply — the eleventh dead write path, prevented).
- [x] 1.3 Drop the three from `TRADING_CONFIG_FIELDS` (18 → 15).
- [x] 1.4 Grow `READ_ONLY_CONFIG_FIELDS` to eight; fixture tail updated.
- [x] 1.5 Update the guard expectations that pinned the v14 counts.
- [x] 1.6 Re-point the three tests that used `maxStopLossPct` as their
      example to fields that survived v15.
- [x] 1.7 Full suite green (1902 vitest + 235 harness + typecheck + lint +
      keyed surface-freshness against the live v15 server).
- [x] 1.8 File `v15-trade-level-policy-is-declared-but-inert` (p1); journal.
