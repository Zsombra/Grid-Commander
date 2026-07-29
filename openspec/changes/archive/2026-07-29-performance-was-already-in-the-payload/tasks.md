# Tasks

## Domain

- [x] 1. `src/domain/agent/performance.ts` — `GameRecord`, `TradeRecord`,
  `Performance`. Keep the fraction, never the percent twice.
- [x] 2. `hasPlayed` / `hasTraded` — an agent with no games is not an agent that
  scored zero, the same distinction `settled()` draws.
- [x] 3. `Agent` gains `performance: Performance | null`. Rewrite the doc comment
  that excluded it so the reversal is recorded, not silently deleted.

## Mapper

- [x] 4. `mapPerformance`, wired into `mapAgent`. Both agent reads carry the
  identical thirty keys, so one place covers list and single.
- [x] 5. `null` when the block is absent — distinct from all-zeros.

## Vocabulary the older account exposed

- [x] 6. Seven event kinds: `AGENT_OUTCOMPETED`, `AGENT_WON_COMPETITION`,
  `MULTI_AGENT_DISPATCHED`, `AGENT_ASSIGNED_TO_PRESET`,
  `TRADING_BALANCE_BELOW_THRESHOLD`, `COST_LIMIT_REACHED`, and copy for
  `SESSION_SETTLED`'s `{rank, score}`.
- [x] 7. `SKIPPED_COST_LIMIT` as a thought outcome. Not a stand-down — it could
  not act, same as insufficient funds.
- [x] 8. Game outcome copy — `WON`, `PLACED`, `NO_WIN` observed. Open map.
- [x] 9. `eventSentence` reads `error` as well as `reason`.
- [x] 10. `eventFacts` drops `agentIds` and `winnerId`, and never prints a raw
  JSON array.

## Correct what is now measured

- [x] 11. `settled()` — replace "no settled game was observed" with the
  measurement: 24 both, 0 either-only, 13 neither, across five agents.
- [x] 12. Note that `finalScore` is signed and that rank / outcome / ITM / payout
  are independent, with the observation that produced it.

## Surface

- [x] 13. `/agents/[id]` shows the record. Never played says so.

## Guard

- [x] 14. Fixtures from the older account, identifiers replaced, structure and
  nulls intact — same rules as `journal-payloads.ts`.
- [x] 15. Re-inject: drop `performance` from the mapper and watch it fail; make
  `eventSentence` read only `reason` and watch the cost-limit sentence vanish.

## Verify

- [x] 16. Serve against the older account and open an agent with 97 games.
- [x] 17. typecheck, lint, tests, `./scripts/check.sh`, `check-serving.sh`.
- [x] 18. Backlog: the two empty tools with their evidence, the two P&L figures
  that disagree, and `last24hCostUsd`.

## What the live walk added

Serving it found one more, and it is the same defect as the UUID arrays, one
order of magnitude quieter. `TRADING_BALANCE_BELOW_THRESHOLD` rendered as

```
Balance  2.179006      Floor  10
```

— a warning about someone's money written as two bare floats. The unit is
derived from the platform's own `Usd` key suffix rather than from a list.

That exposed a second: money was being formatted in three places and had already
drifted, showing `paid $0` on one page beside `−$0.25` on the next. One `usd()`
in the domain now, for the same reason `asPercent` is there.

Neither was visible in a test. Both were visible in ten seconds of reading a page.
