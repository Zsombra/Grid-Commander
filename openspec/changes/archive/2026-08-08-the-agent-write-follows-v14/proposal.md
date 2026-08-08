# The agent write follows v14

## Why

BattleGrid v14.0.0 dropped `atrTimeframe` and `atrMatchesStrategyTimeframe`
from `create_intelligence_agent` and `update_intelligence_agent` while the
read kept returning both. `TRADING_CONFIG_FIELDS` still carried the two
names, so `buildTradingConfig` composed them into every create and
`applyEdit` merged them into every full-config edit — and with
`additionalProperties: false` on both tools, every such payload was
rejected whole. Agent create and config edit were dead write paths from
the moment v14 deployed. Filed as
`agent-create-composes-fields-v14-refuses` (p1); fixed here because the
committed v14 record makes the payload-conformance guards state the break
as six red tests, which is exactly what they are for.

The brain half of that item needed no product change: v14 made
`brain.behavior` required for CUSTOM brains, and the product has modelled
and sent the triple since findings-agents F-5 — the refusal observed
during the live build came from a raw one-off script omitting it, not
from the app's composition.

## What Changes

- `src/domain/agent/catalog.ts` — the two names leave
  `TRADING_CONFIG_FIELDS` (20 → 18), with the v14 reason stated where they
  were.
- `src/domain/agent/trading-config.ts` — the count-stating docstrings
  (23-vs-20 → 23-vs-18, and the five read-only names).
- `tests/support/agent-fakes.ts` — `READ_ONLY_CONFIG_FIELDS` grows to
  five; `liveTradingConfig()` moves the two ATR keys to the read-only,
  non-overridable tail.
- Guard expectations follow the record: `payload-conformance` (accepts 18,
  dropped 5), `wire-values` (the sentinel list loses the removed
  constrained path), `money-limits` (18), `edit.test` (derived from the
  two lists rather than `+ 3`), `agreeing-to-a-limit` (seventeen others).
- `tests/test_probe_declared_fields.py` — the artifact assertion stops
  pinning the platform's field count and asserts the property (closed,
  non-vacuous, names recorded).

## No behavior changes beyond the wire

The composition now sends exactly what v14 accepts. No form, port, or
use-case signature moved. The ATR sample timeframe is platform-derived
from the bound strategy now — nothing in the product offered a control
for it, so nothing user-facing is lost.
