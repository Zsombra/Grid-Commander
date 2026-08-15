# Proposal: The record answers forward

## Why

The recorder captures what every signal said with the price at each capture,
and deliberately does not analyze (backlog
`recorded-signals-are-not-yet-evidence`, #94). The record is the
prerequisite, not the product: until an analysis layer reads it, every
strategy claim stays at "no forward data" with better raw material waiting.
The item's gate was two-halved — connection and depth — and on 2026-08-15
the operator relaxed the depth half to now: "let's get it done now." The
statistical consequence (small per-state samples at ~2.4 days of hourly
captures) is carried openly, not hidden — which is the item's own discipline.

## What Changes

- **Forward returns are derived from the record, at read time.** For each
  coin+interval series, consecutive recorded captures are paired and the
  price change to the next capture is attributed to the states at the
  earlier one: per triggered signal, per dominant bias, per
  conflicting-signals flag, plus the unconditional baseline every figure is
  compared against.
- **A pair that spans a coverage gap is not a forward return.** Pairing
  reuses the record's single gap definition (spacing beyond twice the
  series' median — `domain/recording/coverage.ts`); pairs falling on a gap
  are excluded and the exclusion is counted and stated. Failed captures
  carry no price and are never paired.
- **Every figure ships with its sample size**, and ordering never promotes
  small samples: tables sort by sample size, never by return — the
  explorer's win-rate rule applied to the new numbers.
- **A new surface, `/recorder/analysis`**, renders the analysis: the
  window and depth of record it stands on, the baseline, then per-signal /
  per-bias / per-conflict tables. Not-enough-to-compute is a stated fact,
  never an error; never-recorded and unreadable stay the record's standing
  distinct shapes. `/recorder` links to it.
- **Verified against the live record** before archive: a read-only run of
  the real query over the operator's database, cross-checked against
  independent SQL aggregates.

## Capabilities

**New**: none
**Modified**: `signal-recording` — one ADDED requirement

## Out of Scope

- **Attaching figures to strategy-analysis claims** (the item's third
  clause — evidence tiers moving off "no forward data"). That consumes this
  layer's output and is filed as its own item.
- **MCP exposure of the analysis.** A model can already derive it from
  `read_signal_history` (the item: "a first version can be a model-side
  workflow"); a dedicated tool follows the #272 pattern later if wanted.
  Filed as residue.
- **New store SQL.** The query composes the two proven reads
  (`recordedSeries`, `history`) rather than adding a bespoke aggregate —
  the db suite cannot run locally (the live-record refusal is correct), so
  no new SQL ships unproven; the cost is loading readings the analysis
  ignores, acceptable at the record's current size and noted for later.
- **Weighted/simulated re-scoring** (`simulate_aggregate_score` replays) —
  the item names it as answerable later; not this change.

## Impact

- `src/domain/recording/forward.ts` (new) — pure derivation + aggregation.
- `src/application/use-cases/read-forward-returns.query.ts` (new).
- `app/(app)/recorder/analysis/page.tsx` (new) + a link from `/recorder`;
  `src/presentation/components/forward-returns.tsx` (new).
- `src/composition.ts` — wiring.
- Tests: domain fixtures (gap exclusion, attribution, ordering), query
  arms, rendering arms; plus the live read-only cross-check at archive.
- Surface manifest for the new page as the change's last task.
- No BattleGrid calls anywhere in the path — this layer reads only the
  product's own record.
