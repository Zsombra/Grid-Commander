# Tasks

- [x] 1.1 Done. `ReportPreview` and the adapter no longer carry
      `estimatedTokenCount`. **No fallback that rebuilds it from the gauge** —
      that would model a payload the platform stopped sending
- [x] 1.2 Done. The preview page's "Cost" section is the gauge list, the token
      estimate among them, and `tokenCountModel` is a note on how the budget was
      measured rather than a qualifier on a missing number
- [x] 1.3 Done, and this is the load-bearing half. The **raw-payload** fixture in
      `preview.test.ts` was still the v5 shape, so the mapper was being proved
      against a payload the platform no longer sends. It now carries
      `budgetUsage.estimatedTokens: {used: 1767, cap: 16000}` and no standalone
      count — the shape observed live on 2026-08-06
- [x] 1.4 Done. The rendering test asserts the gauge, both numbers, **and that
      the page never says "unavailable"** — the exact word it was printing above
      the number it was displaying
- [x] 1.5 Done. `./scripts/ci.sh` green; live preview probe re-run against v9
