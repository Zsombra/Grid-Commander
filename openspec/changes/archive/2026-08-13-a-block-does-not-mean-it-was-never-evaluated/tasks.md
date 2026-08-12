# Tasks

## 1. The five assertions

- [x] 1.1 `src/ports/agents.ts:419` — the `GateBlock` contract comment. This is
      the one that teaches every future reader, so it should say what the field
      is (the stage the platform named) rather than where it happened.
- [x] 1.2 `src/infrastructure/battlegrid/agent-mapper.ts:627`
- [x] 1.3 `src/mcp/tools.ts:220` — the `read_decision_pipeline` description.
      **The one that leaves the building.** Other models read this.
- [x] 1.4 `app/(app)/agents/[id]/pipeline/page.tsx:120` — the framing sentence
- [x] 1.5 `app/(app)/agents/[id]/pipeline/page.tsx:178` — the empty state

All five trace to: **Why An Agent Did Not Trade Is Readable**, and specifically
to the rule the delta adds — the product does not assert where a candidate
stopped.

## 2. The test that pins the old wording

- [x] 2.1 `tests/rendering/pipeline.test.ts:260` asserts
      `'Nothing was stopped before evaluation'`. Update it to the new wording
      rather than deleting it — the empty state saying what its emptiness means
      is a requirement, and this is what pins it.

## 3. Check for more

- [x] 3.1 Re-grep after the edits. This change was scoped at four sites and the
      verification pass found five; assume the same again and check rather than
      assume. Search for `before evaluation`, `before it was`, `pre-signal`,
      `never reached`.

## 4. Gates

- [x] 4.1 `npm run typecheck`
- [x] 4.2 `npm run lint`
- [x] 4.3 `npm test`
- [x] 4.4 `npm run build`
- [x] 4.5 `npm run db:generate && git diff --quiet drizzle/`
- [ ] 4.6 `npm run test:db` — blocked on database credentials. Report as
      blocked, never as passed.

## Execution record — 2026-08-13

**Gates**: typecheck PASS · lint PASS · `npm test` PASS (169 files / 2213) ·
build PASS · db:generate + drizzle clean PASS. `test:db` **BLOCKED** on
credentials.

**It was eight sites, not five.** Task 3.1 said to re-grep rather than trust the
scoped list, because the count had already been wrong twice — four in the issue,
five at proposal time. The re-grep found **three more**:

```
src/ports/agents.ts:164                    "Candidates that never reached signal evaluation"
app/(app)/agents/[id]/pipeline/page.tsx:9  "blocked before it was ever evaluated"
app/(app)/agents/[id]/pipeline/page.tsx:176 <h2>Stopped before evaluation</h2>
```

The last is a **user-visible section heading** and would have shipped stating
the thing this change exists to stop stating. That task earned its place.

Headings and prose now say *stopped by a gate*, with the stage BattleGrid names
shown beside each row; the empty state says *"No candidate was stopped by a
gate."*

## Not done

- [ ] 4.6 `npm run test:db` — blocked on credentials.

## 2026-08-13 (later) — the blocked gate ran, and passes

`npm run test:db` was reported BLOCKED throughout this change: the local
`DATABASE_URL` carried no credentials and all 76 db tests failed at
`tests/db/support.ts:20` on connection.

The operator supplied the credentials afterwards. **The gate passes: 7 files /
85 tests.** Recorded here rather than left as "blocked", because an archived
change that says a gate never ran, when it has since run and passed, is a
record that misleads in the safe-looking direction.
