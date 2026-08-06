# Tasks

- [x] 1.1 Reproduce the mismatch against the fakes and record both targets, so
      the fix is measured against an observed failure rather than a reading
- [x] 1.2 Form one intent in the probe's trading-limit step and describe it
- [x] 1.3 Split that same intent with `editArguments` — the product's own split,
      not a hand-rolled one — and submit the two halves
- [x] 1.4 Drive the probe's describe→apply pair against the fakes and assert the
      confirmation is spendable and the merge lands `maxDailyTrades: 7`
- [x] 1.5 Drive the old, disagreeing pair in the same place, so the refusal is
      demonstrated rather than inferred
- [x] 1.6 Guard the probe's source: both halves come from one intent through
      `editArguments`, and no empty `tradingConfig` literal returns
- [x] 1.7 Leave the live-write gates alone — the probe still requires both
      `BATTLEGRID_API_KEY` and `BATTLEGRID_LIVE_WRITES=1`, and
      `live-writes.test.ts` still sees it
- [x] 1.8 `npx tsc --noEmit -p tsconfig.json`, `npx eslint .`, and
      `npx vitest run tests/agent/ tests/architecture/ tests/capability/` green
- [x] 1.9 Close the backlog item against this change

## What is not proven here

The live run. The trading-limit step now composes a pair the product can
authorise, and that is established offline against the fakes — the same way the
defect was. Whether BattleGrid accepts the twenty-field merge that follows is the
claim the probe exists to make, and only a deliberate live run makes it. Nothing
in this change may be read as having made it.
