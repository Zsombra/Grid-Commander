---
id: the-capability-record-has-no-freshness-guard
title: WITHDRAWN — the capability record is guarded, and the divergence was self-inflicted
type: debt
status: done
priority: p3
created: 2026-08-16
updated: 2026-08-16
change: ""
capability: platform-mapping
github: "328"
blocked_by: []
tags: [battlegrid, records-accuracy, withdrawn, false-premise]
---

# WITHDRAWN — the capability record is guarded

> **Filed and withdrawn the same day, 2026-08-16.** The central claim was false.
> Kept rather than deleted because the way it was wrong is the more useful
> record.

## What was claimed

That `docs/battlegrid-mcp-capabilities.json` is compared to nothing, that
`tests/live/surface-freshness.test.ts` passed 23 assertions while it sat a
version behind, and that this was #198's failure mode still open.

## Why it is wrong

**The guard exists.** `tests/architecture/surface-freshness.test.ts` carries
`it('agrees on which server, across all of them')` — a sweep over every
committed record that declares a server block, asserting they all name the same
version. A sibling test, `finds every record, and does not quietly find none`,
names all three files explicitly so that a record which loses its server block
drops out loudly rather than silently. The vocabulary-vs-surface assertion even
says so in its own comment: *"superseded in scope by `every committed record of
the surface names one server` below."*

**And the records were consistent.** At `HEAD~1`, before anything in this
session touched them:

```
docs/battlegrid-mcp-surface.json        19.1.0
docs/battlegrid-vocabulary.json         19.1.0
docs/battlegrid-mcp-capabilities.json   19.1.0
```

**The divergence was self-inflicted.** Running `tools/probe_mcp_surface.py`
refreshes the surface record alone. That moved it to 19.2.0 and left the other
two at 19.1.0 — and the three-way disagreement was then read as a pre-existing
defect rather than as a half-finished refresh. The offline guard would have
failed in exactly that window; it was never run there.

**The chain is complete.** Offline proves surface == vocabulary ==
capabilities. Live proves surface == running server. Together those give
capabilities == running server without the live test ever opening it.

## What was actually true

Only this: all three records were a deployment behind, and nothing had noticed
because **the sole check that can discover a remote deployment needs a key and
had not been run.** That is inherent rather than a defect — an offline check
cannot know what BattleGrid is running, and
`tests/architecture/surface-freshness.test.ts` says so in its header: *"one that
implied it could would be the same lie in a new place."* The instance itself is
[[the-surface-record-is-a-deployment-behind]], already `done`, and it recurs by
nature on every deployment.

## The lesson worth keeping

A guard reported as missing was never looked for — the conclusion was drawn from
a divergence this session had just created, and the test file that disproves it
was three greps away. **Check whether the guard exists before filing that it
does not**, and be especially suspicious of a defect discovered immediately
after running a tool that mutates the thing being measured.

Related: [[v19-moved-thirty-four-output-schemas]] (#301) — the real #198
follow-through, and unaffected by this withdrawal.
