# Tasks

- [x] 1.1 Done, live, not assumed. `includePerpSpotFlow` is among the 25 section
      templates; `list_strategy_signals` returns both `FLOW_DIVERGENCE` signals;
      all six new metrics are reachable under their categories (`PERP_SPOT_*` in
      `derived`, `SPOT_CVD`/`RVOL` in `volumeFlow`, `BB_WIDTH_PCT` in
      `volatility`) and `VOLUME_RATIO` is gone. **No code needed** — that is the
      runtime-vocabulary rule paying out
- [x] 1.2 Done. `previewExecutionLimits` mapped off `list_strategy_vocabulary`,
      the call the section templates already come from, and carried through
      `ReadSectionOptionsQuery` to the editor. **No second read** — that call is
      discovery, which is where v9 moved the limits to
- [x] 1.3 Done. `null` when unpublished, and both numbers or neither: a deadline
      with no size cap would be shown as the whole constraint
- [x] 1.4 Done, and this is the finding. `agentMinConfidenceFloorPercent: 30`
      and `agentMinTradeConvictionFloorPercent: 20` are the **same limits** as
      the `…Floor` keys already mapped (0.3, 0.2), in percent. Config values are
      fractions. Proved harmful by injection: mapping the percent key makes
      `checkBound(minTradeConviction, 0.35)` return `ok: false` — a valid
      configuration refused on the surface where an operator sets how confident
      an agent must be before it trades. Pinned by
      `tests/strategy/v9-datasets.test.ts`
- [x] 1.5 Done. `./scripts/ci.sh` green
