---
id: the-record-cannot-be-forgotten
title: Retention controls for the signal record
type: debt
status: done
priority: p3
created: 2026-08-07
updated: 2026-08-10
change: "the-record-can-be-forgotten-with-ceremony"
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

## Resolved 2026-08-10 — age-based trim, with the full ceremony

`/recorder/trim`: choose a boundary, read exactly what becomes unknowable —
runs, captures, failed attempts, readings, coins and the span — and confirm.
The confirmation binds the boundary and the described extent, so agreement to
one trim cannot authorise a different one; the perform spends it once and
reports what actually went. The boundary is the run, because coverage derives
gaps from runs and rows deleted under a surviving run would leave the record
claiming attempts whose findings are invisible.

Recorded declines, from the change's proposal:

- **Raw-only trimming** (the middle option) — deferred with its reason: `raw`
  is null exactly when the outcome is `failed` today, so a trimmed raw needs a
  tombstone column and a three-state `rawAnswer` contract. Build when growth
  actually hurts.
- **Per-coin purge** — declined: no surface asks for it, and a coin's record
  is exactly the history a purge re-widens. If a concrete need names itself,
  file it then.
- **No MCP exposure** — the describe stays off the tool table; a model can
  never reach this confirmation.
