---
id: confirm-the-recorder-is-running
title: Confirm the signal-recorder cron is running — a gap can never be backfilled
type: risk
status: open
priority: p2
created: 2026-08-11
updated: 2026-08-11
change: ""
capability: signal-recording
github: "145"
blocked_by: []
tags: [signals, recorder, operator-action, deployment]
---

# Confirm the signal-recorder cron is running

## What

The signal recorder shipped 2026-08-07 with its own warning: start the
cron on day one, because the platform serves current readings only and a
gap can never be backfilled. Whether the operator's deployment has
actually been running it since — and how many captures the record holds —
is a fact only that deployment knows. Nothing in this repository, and no
remote session, can read it.

## Why it matters (p2)

Two things hang on the answer:

1. **Every silent day is unrecoverable.** If the cron never started, or
   died, the record has a hole exactly as long as the silence, and the
   recorder's whole premise is that holes cannot be repaired later.
2. **The evidence-grading build is gated on it.** #94
   (`recorded-signals-are-not-yet-evidence`, the largest open build) rules
   itself out "until the record holds enough captures to say anything" —
   unanswerable until this is answered.

## First step

Operator action, five minutes: check the cron is scheduled and alive on
the deployment, and read the capture count
(`SELECT count(*) FROM signal_captures` or the recorder's own status
output). If it is not running: start it today — that is the whole fix —
and note the gap's span here so the record's hole is documented rather
than discovered. Then answer #94's gate with the count.

## Answered 2026-08-11 — the recorder has never run

The operator confirmed: **no persistent deployment exists.** Grid-Commander
has only ever run inside ephemeral sessions, so the cron was never
installed anywhere durable and the record holds **zero captures**.

- **The gap starts at the ship date, 2026-08-07, and widens daily** until a
  host runs the cron. Nothing before the day it starts will ever be
  recoverable — that span is documented here, not discovered later.
- **The pipeline itself is proven.** Run once live in a session on
  2026-08-11 (platform 17.2.0): exit 0, all 20 of the account's radar
  deployments captured at 1h, 84 signals each. The capture landed in the
  session's throwaway database and died with it — which is exactly the
  point: the recorder works; only the host is missing.
- **#94's gate is answered: the count is zero.** It stays ruled out until
  the record accumulates.

## What remains — a host (operator's choice)

Any machine that stays up: a home machine that never sleeps, a small VPS,
anything with cron. One-time setup on it:

1. Node 20+ and PostgreSQL 16; clone the repo, `npm install`.
2. Environment (the recorder refuses, naming each one, if missing):
   `DATABASE_URL`, `TOKEN_ENCRYPTION_KEY` (**32 bytes base64** —
   `openssl rand -base64 32`; a hex key is refused), `SESSION_SECRET`,
   `BATTLEGRID_API_KEY`.
3. `npx drizzle-kit migrate` once.
4. Run `npx tsx bin/grid-commander-record.ts` by hand; require exit 0.
5. Install the cron line from `docs/FIRST_SESSION.md`
   (`17 * * * *`). Cron's nonzero-exit mail is the dead-recorder alarm.

When the first cron run lands, note the record's actual start date here
and close this item.
