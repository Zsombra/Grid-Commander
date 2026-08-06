# Tasks

- [x] 1.1 `sessionDetail` and `hasSubmitted` return named results, never throw
- [x] 1.2 `WatchArenaQuery` degrades per session rather than failing the arena
- [x] 1.3 `entered` becomes nullable; the page stops rendering an unread check
      as "has not entered"
- [x] 1.4 Tests: one session unreadable while the others render; an unread
      submission check that says so rather than claiming
- [x] 1.5 `all-controllers-probe` green against both accounts, `./scripts/ci.sh` green

## How it was found, and what the walk showed

`all-controllers-probe` walks every read controller against one live account
and prints what each returned. On its **first run** against the second account:

```
watchArena   THREW BattleGrid is limiting how often this deployment may ask (HTTP 429).
readField    field=unreadable leaderboard=unreadable
```

Two controllers, one rate limit, opposite behaviour. That is the defect in one
line, and no single-feature probe would have produced it — `arena-probe` reads
the arena alone and never generates enough traffic to be limited.

After the fix, both accounts walk clean:

| | account 1 | account 2 |
|---|---|---|
| controllers walked | 25 | 25 |
| threw | **0** | **0** |
| `watchArena` | `arena sessions[50]` | `arena sessions[50]` |
| `readTradingRecord` | `none` | `record outcomes[5] total=27` |
| `readPipeline` | `evaluations=none decisions=none` | all four populated |
| `readOwnEvaluation` | skipped — nothing to open | `evaluation` |

The empty column on the left is why every existing probe stayed green while
this bug shipped: account 1 exercises fewer paths, and a probe that only ever
ran there could not reach them.

## The probe's own first-run defect, kept

It read `listings[0].id` where the shape is `listings[0].strategy.id`, and
`field.agents` where it is `field.field.agents`. Both `if`s fell through and
**four controllers were never called, in a run that reported success**. Now
every controller is walked or printed as `SKIPPED — <why>`, and the row count
is asserted — a survey whose gaps are invisible is the exact failure it exists
to catch.
