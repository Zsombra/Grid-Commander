---
id: the-db-suite-truncated-a-live-record
title: The database suite truncated a live signal record, and every test passed
type: risk
status: done
priority: p1
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: harness-integrity
github: "195"
blocked_by: []
tags: [testing, destructive, data-loss, guard]
---

# The database suite truncated a live signal record

## What happened

`npm run test:db` truncates every table it touches — `tests/db/support.ts`:

```
truncate audit_entries, confirmation_tokens, connections, oauth_transactions,
         proposals, signal_readings, signal_captures, signal_capture_runs cascade
```

It reads `DATABASE_URL`, and `databaseUrl()` refused only a **missing** value.
Any present one was accepted — including the application's own, which is what
`.env` sets and what anyone running the app already has exported.

On 2026-08-13 it was run that way against a live `grid_commander`. The recorder's
accumulated series went: GOLD 24 captures, JPY 24, AVAX 25 spanning two days,
down to the four fixture rows the last test left behind.

**All 85 tests passed. Nothing warned.**

## Why it matters (p1 as filed)

The signal record is the one store this product documents as unrecoverable.
`confirmation.ts:160` — the loss "is permanent in a way BattleGrid's archives
are not" — because BattleGrid serves current readings only and does not re-serve
history. There is no fetch that rebuilds it.

The whole `describe → confirm → perform` ceremony on `/recorder/trim` exists to
stop a person deleting that record by accident. A test command deleted it with
no ceremony at all, and reported green.

## The fix, landed the same day

`assertDisposable` in `tests/db/support.ts`. The suite now requires the database
to be *named* as disposable — `/(^|[_-])(test|tests|scratch|throwaway)([_-]|$)/i`
— or an exact `DB_TESTS_MAY_TRUNCATE=yes`.

Opt-**in**, deliberately, following the house pattern of `ALLOW_INSECURE_COOKIES`:
an unrecognised value refuses, a typo refuses, silence refuses. A suite whose
failure mode is unrecoverable data fails toward doing nothing.

Pinned by `tests/architecture/db-suite-refuses-a-live-database.test.ts`, 8 cases,
including that `latest` and `contest` do **not** count as consent and that
`YES`/`true`/`1` do not either. `.env.example` documents the disposable-database
workflow where someone will meet it.

## Notes

**The guard was written after the loss, which is the honest order.** Nothing
here predicted it; the harness had refused the *absent* case since it was
written and read that as sufficient. The failure was that "refuses when unset"
looked like "refuses when wrong".

Related in shape to the three other silent checks found the same day —
[[the-re-pin-pins-to-the-commit-before-its-own-edits]] (#192),
[[dt-0014-acceptance-outlived-the-receipt-it-described]] (#193),
[[the-render-harness-cannot-see-a-key-collision]] (#194). All four read as
passing after they had stopped meaning anything. This is the only one that
destroyed something.
