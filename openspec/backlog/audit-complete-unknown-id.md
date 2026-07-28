---
id: audit-complete-unknown-id
title: Completing an audit entry that does not exist succeeds silently
type: debt
status: open
priority: p3
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: battlegrid-connection
blocked_by: []
tags: [database, audit]
---

# Completing an audit entry that does not exist succeeds silently

## What

`DrizzleAuditRepository.complete(id, outcome)` is an `UPDATE ... WHERE id = $1`
whose result is discarded. Passing an id that matches no row updates nothing and
returns normally.

Confirmed against a real database (`prove-it-runs`, findings F-7).

## Why it matters

Less than it first looks, and worth being precise about why. An entry that is
never completed stays `attempted`, and `attempted` is deliberately the honest
unknown state rather than an error — so a lost completion degrades the record in
the direction the design already chose.

What is wrong is that the caller cannot tell. A completion aimed at the wrong id
is indistinguishable from one that landed, so the guard sequence would report
success for an operation whose record still reads as unfinished.

## Fix

Check the affected row count and raise when it is zero. Do not fall back to
inserting a replacement entry — a completion is evidence about an operation that
began, and manufacturing the beginning to justify the end is worse than the
failure it hides.
