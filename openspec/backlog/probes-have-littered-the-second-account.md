---
id: probes-have-littered-the-second-account
title: Eight archived "GC probe" agents on the operator's second account are ours
type: debt
status: open
priority: p3
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: harness-integrity
blocked_by: []
tags: [live, probes, housekeeping]
---

# Our probes left eight agents on the operator's account

Surveying the second account (`Fibonacci`) on 2026-08-06 turned up 11 agents.
**Eight of them are ours:**

```
GC probe 1315b                          [ARCHIVED]  Stalingrad
GC probe 1315                           [ARCHIVED]  Normandy
Grid-Commander probe (off)              [ARCHIVED]  London
Grid-Commander probe (off) 1785331191732 [ARCHIVED] Dunkirk
Grid-Commander probe (off) 1785331381166 [ARCHIVED] Dunkirk
GC probe renamed 1785332728782          [ARCHIVED]  Dunkirk
GC probe renamed 1785332866870          [ARCHIVED]  Dunkirk
GC probe renamed 1785333064996          [ARCHIVED]  Dunkirk
```

Created by `write-probe` / `radar-probe` runs across several sessions. All are
`ARCHIVED` and `tradingMode: OFF`, so **none can trade and none costs anything**
— the probes were careful about that, which is why this is p3 and not higher.

## Why it is still worth fixing

1. **They crowd the roster.** Three real agents against eight leftovers, and
   `slotUsage` reads `used: 1, limit: 3` — archived agents do not consume slots,
   so nothing is blocked, but every roster read this operator does is 73% noise.
2. **They already cost a probe a wrong answer.** `tests/live/proposal-probe.ts`
   originally picked `agents[0]` and got an archived probe leftover; it now
   filters `status === 'ACTIVE'` and is named `anEditableAgent` for that reason.
   The litter is load-bearing in the wrong direction.
3. **There is no delete.** `archive_intelligence_agent` is the end of the road —
   the MCP surface offers no delete tool, and `canDelete: true` in the payload
   describes BattleGrid's own app, not this client (findings-agents F-1). So
   these cannot be cleaned up from here at all.

## First step when taken

Nothing in this product can remove them, so the options are: leave them and
make the probes reuse a single throwaway agent instead of creating a new one per
run, or ask the operator to delete them in BattleGrid's own UI.

The reuse fix is the one that stops the bleeding and is ours to make: have the
write probes look for an existing `GC probe` agent before creating another, and
only create when none exists.
