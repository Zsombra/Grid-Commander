# Design: The record answers forward

## Technical Approach

A pure domain derivation over capture series, an application query that
feeds it from the two proven store reads, and one new page. No BattleGrid
call anywhere in the path; no schema change; nothing stored — the analysis
is recomputed from the rows every read, the same rule coverage follows.

## Decisions

### Decision: the gap definition is reused, never restated
A pair is pairable iff `deriveSeriesCoverage` does not call its spacing a
gap. `forward.ts` derives coverage for the series and excludes exactly the
reported gap intervals, so "what counts as a hole" keeps its single home in
`coverage.ts` (GAP_FACTOR × median). Rejected: a second threshold in the
forward module — two cadence rules is how the record ends up claiming a
continuity its own analysis disagrees with.

### Decision: no new SQL — the query composes recordedSeries + history
The db suite cannot run on this machine (it refuses the live record
database, correctly), so a bespoke aggregate would ship with its SQL proven
only in CI. Composing the two existing, db-tested reads keeps every new
line unit-testable with fixtures. Cost: readings the analysis ignores are
loaded (~84 per capture); at the record's size (tens of captures per
series, twenty series) that is acceptable, and the day it is not, a lean
`forwardFacts` store read is a contained follow-up. Rejected for now.

### Decision: attribution is per signalId alone
Signal ids are side-specific on this platform (`rsi_oversold` and
`rsi_overbought` are distinct ids), so grouping by id already separates
directions without shrinking samples further. Bias and conflict are
capture-level facts and group at capture level. Rejected: grouping by
(signalId, direction) — it splits already-small samples across a field
observed null on many readings.

### Decision: figures are simple and few — n, mean, median, share positive
Percent forward return per pair ((next − prior) / prior). No annualising,
no compounding, no significance testing — at these depths a p-value would
be theatre. The honesty mechanism is the sample size beside every figure
and the sort-by-n rule, both spec-pinned.

### Decision: the sort is by sample size, descending, always
The explorer's lesson applied forward: sorting by the interesting column is
exactly how a 2-sample 100%-hit signal tops the table. The requirement pins
that no ordering ranks by return; the implementation sorts by n and breaks
ties alphabetically, so the table is stable run to run.

## Data Flow

1. `ReadForwardReturnsQuery.execute({userId})`
2. `store.recordedSeries(userId)` — series list (or never-recorded arm)
3. per series: `store.history({userId, coinTicker, interval})` — captures
   with readings, newest first; failures ignored (no price to pair)
4. `deriveSeriesForward(captures)` in the domain: sort ascending, derive
   coverage, pair non-gap neighbours, emit per-pair facts
5. aggregate across series: baseline, per-signal, per-bias, per-conflict —
   each `{n, meanPct, medianPct, sharePositive}`
6. page renders tables with n beside every figure, gap-excluded count, and
   the record's depth line

## File Changes

- `src/domain/recording/forward.ts` (new) — pairing + aggregation, pure
- `src/application/use-cases/read-forward-returns.query.ts` (new)
- `src/presentation/components/forward-returns.tsx` (new)
- `app/(app)/recorder/analysis/page.tsx` (new); `app/(app)/recorder/page.tsx`
  (modified — one link)
- `src/composition.ts` (modified — wiring)
- `tests/recording/forward.test.ts`, `tests/recording/forward-query.test.ts`,
  `tests/rendering/forward-returns.test.ts` (new)
- `openspec/design/surfaces/recorder-analysis.json` (new, last task)
