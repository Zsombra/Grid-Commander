# Tasks

## Fix the write

- [x] 1. `applyEdit` projects onto `TRADING_CONFIG_FIELDS` and reports what it
      dropped, instead of passing the read's 23 keys through.
- [x] 2. `update-agent.command.ts` checks the merged config is complete before
      sending — the check the create path has always had.

## Guard it

- [x] 3. Unit guard on `applyEdit` — the three read-only keys never survive.
- [x] 4. Re-injected the pass-through `applyEdit`: 4 guards fail.

## Prove it

- [x] 5. Live probe passed, end to end:

      ```
      propose: Replaces every trading limit this agent runs under.
      limits:  updated
      limited: maxDailyTrades=7 mode=OFF dailyLoss=10
      ```

      The projection is what makes it succeed — a 23-key write is rejected
      outright — and the all-or-nothing rule held: `tradingMode` and
      `maxDailyLossUsd` were untouched by an edit that changed neither. Account
      verified after: probe agent ARCHIVED, only `THE .0` active, 1 of 3 slots.

      It ran only after `renaming-an-agent-is-offered-and-cannot-work` supplied
      the confirmation the guard demanded. And a rename alone would not have
      proven this: it never passes `tradingConfigChanges`, so it never reaches
      `applyEdit`.

      **The earlier `INTERNAL_ERROR` was not the platform.** It was recorded here
      as a degraded backend. The probe was reusing a fixed `displayName` and an
      archived agent still holds its name; BattleGrid answers that collision with
      an unhandled 500. Same payload, fresh name, same strategy → created.
- [x] 6. 691 tests, typecheck, lint green.

## Close the loop

- [x] 7. Closed `trading-config-read-shape-is-not-write-shape` — it described
      this and is now fixed.
- [x] 8. Filed `conformance-sweep-for-required-and-accepted-params`.

## Two probe defects this shook out

Neither was in the product, and both cost real time by looking like something
else.

**A fixed `displayName`.** The probe called itself `Grid-Commander probe (off)`
every run. An archived agent still holds its name, so the second run collided
with the first and BattleGrid answered `INTERNAL_ERROR: Internal server error` —
a 500, not a refusal. It was diagnosed as a degraded backend for half an hour,
including in a scheduled check-in written to skip work while "the platform is
unwell". Established directly: same payload, fresh name, same strategy →
created. Now `Date.now()`-suffixed.

**An inherited precondition.** Target selection asked for a SYSTEM strategy with
`boundAgentCount === 0`, copied from the fork probe above — where it matters,
because that one archives what it picks. Creating an agent writes to the agent,
never to the strategy, so it bought nothing here. It also could not hold:
`boundAgentCount` counts agents across every player and archived agents still
count, so two runs consumed the last two strategies that satisfied it and the
test began failing on its own precondition.

Both are the same shape as the defects this session found in the product: a
check that looked like it was protecting something and was not.
