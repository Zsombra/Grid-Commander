# Tasks

## Model what was observed

- [x] 1. `Budget` and `Gauge`, with **unconfigured as its own state**:
      `remaining` and `ceiling` are `null`, never the platform's zero.
- [x] 2. `stoppableLimits` names what binds and what does not.
- [x] 3. The platform's own warnings carried, not recomputed.

## Reach it

- [x] 4. `AgentsPort.readBudget` + adapter over `get_agent_budget`.
- [x] 5. `ReadBudgetQuery`, binding limits ordered first.

## Show it

- [x] 6. `/agents/[id]/limits`, which prints no headroom figure for a limit that
      does not exist.

## Guard it

- [x] 7. Fourteen guards, including the trap directly: the platform's zero must
      not survive mapping.
- [x] 8. Re-injected four, each caught — carrying the zero through (1 failure),
      treating an unconfigured gauge as binding (4), putting a ceiling on the
      wrong gauge (2), dropping usage on an uncapped gauge (1).

## Prove it

- [x] 9. Live read:

      ```
      At risk at once    0 of 250, 250 left
      Trades in a day    21 of 34, 13 left
      Loss in a day      0.07 used · no limit set
      Loss in total      0 used · no limit set
      unbounded: Loss in a day, Loss in total
      ```

      The live assertion is negative and is the point: a gauge the platform
      reports unconfigured must not arrive carrying a `remaining`.
- [x] 10. 724 tests, `./scripts/check.sh`, typecheck, lint green.

## What reading the live payload changed

Two things, neither in the declared schema, both found before a line was typed.

**`fill` is not a fraction.** It is the amount consumed in the gauge's own unit —
`fill: 21, remaining: 13` against a ceiling of 34. A surface treating it as a
proportion would draw a 21-of-34 bar at 2100%. It is mapped to `used` for that
reason.

**An unconfigured gauge reports `remaining: 0`.** As a bare number that reads
*about to halt*; it means *no cap exists at all*. On this account the two
unconfigured gauges are drawdown and daily loss — the two governing how much can
be lost — so the naive rendering states the exact inverse of the truth on
precisely the limits where being wrong costs money.
