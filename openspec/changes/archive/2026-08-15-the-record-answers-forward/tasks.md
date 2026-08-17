# Tasks

## 1. Domain

- [x] 1.1 `src/domain/recording/forward.ts`: pair consecutive captures per
      series excluding exactly the intervals `deriveSeriesCoverage` calls
      gaps; per-pair facts (forward %, triggered signal ids, dominant bias,
      conflict flag at the earlier capture); aggregate to
      `{n, meanPct, medianPct, sharePositive}` per signal / bias / conflict
      / baseline; carry pairs-excluded-over-gaps.
- [x] 1.2 Domain tests: attribution to the earlier capture; a gap pair
      excluded and counted; a single capture pairs nothing; ordering by n
      with a stable tiebreak; zero-price edge refused rather than divided by.

## 2. Query and wiring

- [x] 2.1 `read-forward-returns.query.ts`: arms `analysis` /
      `not-deep-enough` (with depth facts) / `never-recorded` (reusing
      HOW_RECORDING_STARTS) / `unreadable`; composes recordedSeries +
      per-series history; aggregates across series.
- [x] 2.2 Query tests over a fake store: all four arms; cross-series
      aggregation; failures never paired.
- [x] 2.3 Composition wiring.

## 3. Surface

- [x] 3.1 `forward-returns.tsx`: depth line (window, pairs, exclusions),
      baseline, three tables sorted by n with n beside every figure;
      not-deep-enough and never-recorded and unreadable arms as themselves.
- [x] 3.2 `/recorder/analysis` page + link from `/recorder`.
- [x] 3.3 Rendering tests: the four scenario arms, the n-beside-figures
      pin, the sort-by-n pin.

## 4. Verification

- [x] 4.1 Gates: typecheck, lint, vitest, build, drizzle no-op; test:db
      deliberately skipped (live record db; the guard's refusal is correct).
- [x] 4.2 Live read-only cross-check: run the real query against the
      operator's record (tsx one-off, DATABASE_URL from the user registry),
      and verify the baseline pair count and one signal's n against
      independent SQL aggregates. Record the figures in the journal.
- [x] 4.3 Survey `/recorder/analysis` into a surface manifest (last task,
      pinned at the implementation commit).
- [x] 4.4 At archive: #94 → done both sides; file the two residues
      (claims-attachment; MCP exposure of the analysis).
