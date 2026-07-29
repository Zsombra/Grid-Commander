# Tasks

## Fix the write

- [x] 1. `applyEdit` projects onto `TRADING_CONFIG_FIELDS` and reports what it
      dropped, instead of passing the read's 23 keys through.
- [x] 2. `update-agent.command.ts` checks the merged config is complete before
      sending — the check the create path has always had.

## Record what the platform accepts

- [ ] 3. **Deferred.** `probe_mcp_surface.py` to record `input_accepts`: the
      accepted property set per object path, and which paths are closed
      (`additionalProperties: false`). The unit guards in task 6 already pin the
      three fields that broke this path; the general record is the sweep, filed
      as `conformance-sweep-for-required-and-accepted-params`.
- [ ] 4. **Deferred with 3.**

## Guard it

- [ ] 5. **Deferred with 3** — the general form needs the record from task 3.
- [x] 6. Unit guard on `applyEdit` — the three read-only keys never survive.
- [x] 7. Re-injected the pass-through `applyEdit`: 4 guards fail.

## Prove it

- [ ] 8. **Blocked — BattleGrid is 500ing.** The probe is written
      (create OFF/caps-10 → edit `maxDailyTrades` → read back → archive, with
      assertions that the edit did not reset `tradingMode` or the money caps).
      `create_intelligence_agent` now returns `INTERNAL_ERROR: Internal server
      error` on the identical payload that succeeded at 12:38. `/health` is 503
      and `get_open_orders` 500s too — the backend came back from the morning
      outage in a partial state. Nothing was left on the account: the failed
      create produced no agent.
- [x] 9. 678 tests, typecheck, lint green.

## Close the loop

- [x] 10. Closed `trading-config-read-shape-is-not-write-shape` — it described
      this and is now fixed.
- [x] 11. Filed `conformance-sweep-for-required-and-accepted-params`.
