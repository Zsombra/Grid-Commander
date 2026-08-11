---
id: the-hub-answers-the-fleet-in-one-call
title: get_agents_hub answers the fleet in one call — spend totals, status precedence and the message meter nothing reads
type: feature
status: open
priority: p3
created: 2026-08-11
updated: 2026-08-11
change: ""
capability: agent-understanding
github: "129"
blocked_by: []
tags: [battlegrid, spend, fleet, surface]
---

# The hub answers the fleet in one call

## What

`get_agents_hub` (observed 2026-08-11, shapes in #129) carries facts with no
other home on the 114-tool surface:

- `summary.totalCost24hUsd` — the fleet's model spend as one number ($1.34 at
  observation; the per-agent figure lives on the roster row, the total only
  here).
- `messagesUsedToday` / `dailyLimit` — the conversational-message meter, an
  account ceiling nothing reads (0/100 observed).
- `hubStatus` — the server's own status precedence, decided once server-side.
- `cost24hUsd` per row — a second, independently-computed spend meter that
  agrees with the roster to the cent, which matters because the roster meter
  has one recorded lying window (#96).

## Why it matters

The operator's accept-vs-cut spend ruling has its number again, and no surface
renders the fleet total. The message meter is invisible until the day it
refuses at 100.

## Notes

Two-sources discipline: if a fleet surface is built, render the hub's total
(a fact only it publishes) and leave the per-agent figure where it lives, or
state the roster-vs-hub comparison explicitly as a cross-check — never as two
silent copies of one fact.
