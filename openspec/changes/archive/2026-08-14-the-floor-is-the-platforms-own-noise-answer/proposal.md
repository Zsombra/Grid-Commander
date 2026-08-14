# Proposal: The floor is the platform's own noise answer

## Why

The highest-value finding on the trading side — stops sit inside ordinary
market noise, and 74% of trades die at `STOP_LOSS` (776-trade sample,
`_PM/TRADE_CATEGORIES_AND_MATHEMATICAL_FAMILIES.md` §D.3; re-confirmed on the
26-trade fleet) — has no home on the surface where the stop geometry now lives.
Since BattleGrid v15 that surface is the strategy, and the strategy detail page
renders `minStopLossAtrMultiple` as a bare number labelled "Stop-loss floor
(ATR×)". The number *is* the platform's own volatility-relative statement of
where noise ends — a stop closer than that multiple of the ATR is inside
ordinary movement, by the platform's own declaration — and the page never says
so. Backlog item `the-stop-vs-noise-comparison-has-no-home` (#85) names this as
its option (3), "the only one of the three that is not waiting on someone
else": read the declared floor as the platform's own noise answer, as a
presentation change on the panel that already exists.

## What Changes

- The trade-level policy panel on the strategy detail page presents the
  stop-loss floor with its meaning: the platform's own volatility-relative
  reading of where ordinary movement ends, at the declared ATR multiple.
- The presentation claims **declaration only, never enforcement**. Whether the
  platform applies the floor to live trades has not been observed (#85's
  standing rule), and the fleet's realized record — stops dying inside the
  noise — is evidence against assuming it. The copy must not imply the floor
  protects anyone.
- The panel names where the measured half of the comparison lives — each
  agent's trading record, which derives realized moves from that agent's own
  closed trades — without duplicating that derivation on the strategy page.

## Capabilities

**New**: none
**Modified**: `strategy-authoring` — requirement "Trade-Level Policy Is Shown
As Platform-Set While Inert" gains the floor's meaning and the
declaration-only constraint.

## Out of Scope

- **A bespoke noise floor from candles.** Computing adverse excursion needs
  `get_coin_candles`, which nothing calls (`trading-telemetry-is-unread`,
  #116). This change exists precisely to test whether the platform's own
  constant makes that unnecessary.
- **Any realized-move figure on the strategy page.** A strategy binds several
  agents; the measured half stays per-agent on the trading record
  (`read-trading-record.query.ts`), which already computes it. The panel
  points, it does not compute. `tests/architecture/no-population-constants.test.ts`
  additionally forbids a measured constant here.
- **Per-agent links from the strategy page.** The strategy payload carries
  `boundAgentCount`, not bound agent ids; resolving them would be a new
  cross-module read. The panel names the place in prose.
- **Verifying enforcement.** The verification #85 names (a compile carrying
  changed values that changes `derive_strategy_rule_view` output, or a trade
  whose stop provably came from the strategy value) needs a live-account write
  — the operator's call, not this change's.

## Impact

- `src/presentation/components/strategy-detail.tsx` — the trade-level policy
  section (currently lines 99–122): presentation copy only.
- `openspec/specs/strategy-authoring/spec.md` — one requirement modified.
- Tests: rendering assertions for the new copy; no query, adapter, domain, or
  schema changes; no new platform reads.
- Backlog: `the-stop-vs-noise-comparison-has-no-home` (#85) → `in-progress`,
  linked to this change.
