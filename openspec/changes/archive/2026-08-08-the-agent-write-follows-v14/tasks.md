# Tasks — the-agent-write-follows-v14

- [x] 1.1 Drop `atrTimeframe` + `atrMatchesStrategyTimeframe` from
      `TRADING_CONFIG_FIELDS`, stating the v14 reason in place.
- [x] 1.2 Correct the count-stating docstrings in `trading-config.ts` and
      `catalog.ts`.
- [x] 1.3 Grow `READ_ONLY_CONFIG_FIELDS` to five and move the two ATR keys
      to the fixture's non-overridable tail.
- [x] 1.4 Update the guard expectations that pinned the v13 counts
      (payload-conformance, wire-values, money-limits, edit,
      agreeing-to-a-limit, test_probe_declared_fields).
- [x] 1.5 Full suite green (1902 vitest + 235 harness + typecheck + lint).
- [x] 1.6 Close `agent-create-composes-fields-v14-refuses`; journal.
