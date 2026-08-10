---
id: no-account-balance-is-readable
title: A cap cannot be shown against the money behind it — no tool publishes an account balance
type: question
status: open
priority: p2
created: 2026-08-10
updated: 2026-08-10
change: ""
capability: agent-understanding
blocked_by: []
tags: [battlegrid, risk, agent, surface]
---

# No account balance is readable

Tracked on GitHub as **#84**, which carries the full search and the two options.

## What

`a-stop-inside-the-noise-looks-like-a-tight-stop` asks for
`maxConcurrentExposureUsd` to be shown against the account balance. On the live
account that is the whole finding — a $250 exposure cap against a **$49.05**
balance is a cap that cannot bind, and it reads as a limit.

There is no balance read. `AccountPort` answers identity only
(`src/ports/account.ts`); `ExposureTotals` carries what is *at risk*, never what
is *available* (`src/ports/positions.ts:68`). Equity appears solely inside gate
block details — `{equityUsd: 2.18, thresholdUsd: 10}` — which is a reading from
whenever that block last fired, not a current figure.

## Why it matters

It is the one row of the p1 item that `a-number-alone-says-nothing` could not
ship, and the comparison it would make is the sharpest of the six.

## Evidence

Searched at v16.0.0 / 114 tools, the current surface record. `src/ports/account.ts`,
`src/ports/positions.ts:68`, and the gate-block details rendered by
`src/presentation/components/stoppages.tsx:30`.

## Notes

Deriving a balance from open positions would be inventing a figure on the one
surface whose purpose is to be trusted instead of the raw setting — so this is
filed rather than half-built.

Two honest options, and choosing between them is the operator's call because it
trades a stale-but-real number against no number: show the gate-block equity
with its timestamp, or keep saying nothing. Sweep
`docs/BATTLEGRID_MCP_REFERENCE.md` for a direct equity tool first; if one
exists, this is an ordinary `/propose`.
