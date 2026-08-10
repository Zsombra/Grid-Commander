---
id: the-record-cannot-be-forgotten
title: Retention controls for the signal record
type: debt
status: open
priority: p3
created: 2026-08-07
updated: 2026-08-07
change: ""
capability: signal-recording
github: "112"
blocked_by: []
tags: [signals, retention, storage]
---

# Retention controls for the signal record

## What

The signal recorder accumulates by design and offers no way to trim or
delete: no age-based retention, no per-coin purge, no "delete my record".
Deferred from `nothing-records-what-the-signals-said` deliberately — deletion
of a record whose loss is permanent is destructive in exactly the sense this
product treats with ceremony, and v1 should not ship a casual version of it.

## Why it matters

Two directions, eventually: an operator who records many coins at a tight
cadence will want to trim (raw payloads dominate the growth — roughly tens
of MB per month at ten coins and a few captures a day), and a multi-tenant
deployment owes a user the ability to remove their own data.

## Evidence

- `signal_captures.raw` carries the whole platform answer per coin per
  capture; row math is in the change's proposal (Impact).
- The store is account-scoped already, so per-account deletion has a clean
  boundary.

## Notes

When built: deletion goes through the same describe→confirm ceremony as
other destructive acts, and what is shown must say what becomes unknowable —
a trimmed record re-widens every gap it covered. Consider raw-payload-only
trimming (keep normalized rows) as the middle option.
