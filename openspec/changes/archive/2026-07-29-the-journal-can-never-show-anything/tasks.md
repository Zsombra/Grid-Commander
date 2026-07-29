# Tasks

## Observe before modelling

- [x] 1. Record a real `get_agent_journal` payload for three agents — active,
  archived-with-activity, created-only — and keep the observed key list. Every
  field typed below must appear in one of them.

## Domain

- [x] 2. `src/domain/agent/journal.ts` — `ActivityEvent`, `GameResult`, and the
  `AgentRecord` that holds the three parts. Event kinds as an open map, the way
  `OUTCOMES` is, with the reason a closed union is wrong stated once.
- [x] 3. `describeEvent`, `eventDetail` — copy for the kinds observed, the
  platform's own name for anything else. `metadata` is read for the fields seen
  and passed through otherwise.
- [x] 4. `settled(game)` — a submission with no score is pending, not zero.

## Port and adapter

- [x] 5. `JournalResult` carries an `AgentRecord`, not a flat entry list. The
  three-state shape stays.
- [x] 6. `readJournal` maps `recentThoughts` / `recentActivity` / `recentGames`.
  `recentThoughts` goes through the existing `mapThought`.
- [x] 7. Delete the invented key chain. No `?? payload['journal']`, no
  `e['type'] ?? e['kind']`.

## Surface

- [x] 8. `journal-view.tsx` renders the three parts. Activity first.
- [x] 9. Empty stays distinguishable from unreadable, per part.

## Guard

- [x] 10. `tests/agent/journal-mapper.test.ts` — the mapper against a
  recorded payload. Re-inject the old key chain and watch it fail.
- [x] 11. Assert the payload fixture is the observed shape, so a future edit that
  "fixes" the fixture to match a wrong mapper fails too.

## Verify

- [x] 12. Serve against the live account. `/agents/<id>/journal` shows Volatilis'
  `INSUFFICIENT_FUNDS`. Screenshot stays out of the repo.
- [x] 13. typecheck, lint, tests, `./scripts/check.sh`.

## What the live run added

Rendering the fix against the account surfaced vocabulary a ten-entry sample had
not: two outcomes (`SKIPPED_INSUFFICIENT_FUNDS`, `SKIPPED_SESSION_UNAVAILABLE`)
and three event kinds (`GRID_SUBMITTED`, `SESSION_SETTLED`, `SUMMARY_GENERATED`),
plus `{rank, score}` on a settled session. All appeared as bare identifiers on
the page — the open maps working, not failing — and copy was added for each.

`SKIPPED_INSUFFICIENT_FUNDS` is deliberately **not** folded into `stoodDown()`.
An agent that chose not to act and an agent that could not act are different
answers to "why is it quiet", and only the first is a decision.
