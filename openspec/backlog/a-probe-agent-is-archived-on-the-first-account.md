---
id: a-probe-agent-is-archived-on-the-first-account
title: The response-shape probe left one archived agent on the operator's first account
type: debt
status: open
priority: p3
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: agent-authoring
github: "201"
blocked_by: []
tags: [battlegrid, housekeeping, probe-residue]
---

# A probe agent is archived on the first account

## What

Answering [[confirm-agent-write-response-shape]] and
[[preset-custom-in-the-preset-branch-is-unestablished]] needed one real create.
It left:

```
GC probe shape II   6bde228e-d8cd-4b2d-8ec2-6f83f5cdb3ba
                    ARCHIVED, revision 4, bound to Lepanto rev 11
                    tradingMode OFF, 0 games, 0 trades, no deployment
```

**The surface has no delete.** `capabilities.canDelete` reads `true` on the
agent, but no tool on the 114 deletes one — `archive` is the whole of cleanup.
So this cannot be tidied from here; it can only be tidied by the operator in
BattleGrid's own UI, if that offers it.

## Why it matters

p4 — clutter, not risk, and worth saying why it is only clutter:

- It **holds no radar slot.** [[an-archived-agent-is-shown-on-duty]] found that
  an archived agent keeps its deployments and still reads as scanning. This one
  was never deployed to any coin, so that failure mode cannot apply to it.
- It **costs no agent slot.** Archiving is what freed the slot for it in the
  first place: `used` went 3 → 2 on archiving `Vanguard`, and back to 3 when
  `Vanguard` returned. Archived agents are not counted.
- It **cannot trade.** `tradingMode: OFF`, and with no deployment it is never
  on duty for a coin regardless.

So it is one dead row in the roster.

## Notes

This is the same shape as [[probes-have-littered-the-second-account]], which
found eight of these on account 2 and is closed. One is not eight, and this one
is named and dated rather than anonymous — but the pattern is worth naming
again: **a probe that needs a create leaves residue the surface cannot remove.**

If a future probe needs a create, it should reuse this agent rather than make a
second one. It is archived, `activate` restores it, and its whole purpose is to
be disposable.
