---
id: a-condition-block-hides-the-condition-that-failed
title: A condition-stage block renders "(detail)" where it should name the condition that failed
type: bug
status: open
priority: p3
created: 2026-08-16
updated: 2026-08-16
change: ""
capability: agent-understanding
github: "337"
blocked_by: []
tags: [stoppages, rendering, conditions, v19]
---

# A condition block hides the condition that failed

## What

`stoppages.tsx` renders every `reasonDetail` value that is an object or an array
as the literal string `(detail)`:

```ts
value: typeof value === 'object' && value !== null ? '(detail)' : figure(name, value)
```

A reason code observed for the first time on 2026-08-16 makes that lossy.
`REQUIRED_CONDITION_FALSE`, at the new `CONDITIONS` gate stage, sends:

```json
{ "failedConditionKeys": ["RANGING_TAPE"], "conditionVerdict": "NEITHER",
  "strategyRevision": 4, "provisional": true }
```

Three of those four render fine. The fourth — **`failedConditionKeys`, the only
field that says *which* condition stopped the agent** — renders as `(detail)`,
because it is an array. It is an array of plain strings and would render
perfectly as `RANGING_TAPE`.

## Why it matters

The surface is titled *what keeps stopping this agent*, and on this block it
answers "a condition did, and I won't say which." A strategy may carry several
conditions; Salamis carries one today, so the omission is currently recoverable
by going and looking, and that is exactly the kind of thing that stops being
recoverable as soon as a second condition is authored.

It is p3 and not p2 because nothing false is shown — `(detail)` is honest about
withholding. It is still a legibility hole in the one field that matters on this
code.

## Evidence

- `src/presentation/components/stoppages.tsx` — `readDetail`, the `rest` mapping.
- Live at v19.2.0, 2026-08-16: `list_gate_blocks(Breakwater)` summary reports
  `CONDITIONS` / `REQUIRED_CONDITION_FALSE` **17 times, latest
  2026-08-16T12:57:59Z**, every row carrying the payload above.
- Observed while closing [[the-deciding-branch-awaits-a-required-condition]]
  (#147), which is where the full shape is recorded.

## Notes

- **The existing rule is not wrong, it is too wide.** The comment in `readDetail`
  argues the `(detail)` case from `rrRejectedPairs` — an array of structured
  objects that genuinely belongs on another surface. That reasoning holds there
  and does not transfer to an array of primitives.
- The narrow fix is to render an array whose entries are all primitives as a
  joined list, and keep `(detail)` for anything with structure. That stays
  inside the file's rule 1 — it prints what the platform sent, and adds no
  lookup table and no paraphrase of the code.
- Do **not** special-case `failedConditionKeys` by name. This file's stated
  discipline is to key on shape, not on reason codes, so that a new code sending
  a known shape renders correctly on the day it ships — the same discipline that
  made three of these four fields render with no change at all.
