# Tasks: The Protection That Actually Rests

- [x] 1. `readRestingOrders` on `PositionsPort` + the observed row model,
      decimal strings parsed at the adapter, rows without orderId/symbol
      dropped by the guarded null-check form.
- [x] 2. Adapter mapping in `positions-adapter.ts`; conformance READS entry if
      the surface declares `orders`.
- [x] 3. Fourth independent read in `ReadExposureQuery`; join per position by
      symbol over reduceOnly rows, in the query.
- [x] 4. Render legs / the naked statement / the unreadable note on the agent
      page's exposure section; fakes updated.
- [x] 5. Tests: adapter drop behaviour, query join + independence, rendering
      of all four scenarios.
- [x] 6. `./scripts/ci.sh` green; archive; narrow #116 to the market-context
      reads; backlog item updated.
