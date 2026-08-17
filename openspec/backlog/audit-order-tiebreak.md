---
id: audit-order-tiebreak
title: Two audit entries written in the same millisecond come back in unspecified order
type: debt
status: done
priority: p3
created: 2026-07-28
updated: 2026-07-31
change: the-small-debts-sweep
capability: battlegrid-connection
blocked_by: []
tags: [database, audit]
---

# Two audit entries written in the same millisecond come back in unspecified order

## What

`DrizzleAuditRepository.listForUser` orders by `created_at DESC` with no
tiebreak. Two entries sharing a timestamp are returned in whatever order
PostgreSQL chooses, which is stable in practice today only because it happens to
be insertion order.

Found while running the repositories against a real database for the first time
(`prove-it-runs`, findings F-6).

## Why it matters

Mildly. The audit log's claim is "this is what Grid-Commander did to your
account", and two operations reported in the wrong order is a small lie in a
record whose whole value is being trustworthy. `systemClock` has millisecond
resolution and a single request can write two entries well inside one.

## Fix

Add `id` as a secondary sort. It does not make the order *correct* — two entries
at one instant have no true order — but it makes it stable and repeatable, which
is what a reader comparing two page loads actually needs.

## Closed

Fixed in `the-small-debts-sweep` (2026-07-31): `listForUser` orders by `created_at DESC, id DESC` (fake mirrors it); db test pins two same-instant entries returning identically across two reads.
