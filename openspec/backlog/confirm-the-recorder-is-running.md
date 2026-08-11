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
