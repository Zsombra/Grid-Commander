---
id: brain-presets-are-hardcoded-and-short-one
title: BRAIN_PRESETS is a hand-written list, and the schema has one it lacks
type: debt
status: done
priority: p3
created: 2026-07-29
updated: 2026-08-06
change: brain-presets-are-read-not-remembered
capability: agent-authoring
blocked_by: []
tags: [battlegrid, agent-authoring, catalog]
---

# BRAIN_PRESETS is a hand-written list, and the schema has one it lacks

## What

`agent-adapter.ts:45` carries a hand-written list of ten brain presets. The live
`create_intelligence_agent` schema pins eleven:

```
MONTGOMERY KESSELRING CHUIKOV EISENHOWER ZHUKOV
NIMITZ BRADLEY ROMMEL PATTON YAMAMOTO CUSTOM
                                       ^^^^^^ not in BRAIN_PRESETS
```

The eleventh, `CUSTOM`, sits inside the *preset* branch of the union — distinct
from `brain.kind: "CUSTOM"`, which is the other branch entirely. What
`{kind: "PRESET", preset: "CUSTOM"}` means to the platform is not established.

## Why it matters

Nothing is broken. The ten the product offers are all valid, and creation works.
The cost is narrower and worth stating plainly:

**The list is exactly the shape this project has already been burned by.** F-3
found the repo's own surface map listing four position-management presets where
the live server returned five, which is why `catalog.ts` reads everything else
from the platform at runtime. Brain presets are the one set that stayed
hard-coded, on the reasoning that no tool lists them — recorded in the comment
above the constant.

That reasoning is now out of date. `tools/list` pins the enum, the probe records
it (`input_constants["create_intelligence_agent"]["brain.preset"]`), and the
product could read it the same way it reads everything else.

## Fix

1. Establish what `{kind: "PRESET", preset: "CUSTOM"}` does. It may be a
   platform-internal marker for an agent whose brain came from the custom
   branch, in which case the product should not offer it.
2. Either read the preset list from the discovered schema at runtime, or keep
   the constant and add a conformance check that it matches
   `input_constants["create_intelligence_agent"]["brain.preset"]` — the same
   guard `wire-values.test.ts` already applies to values.

Option 2 is cheaper and catches drift; option 1 removes the class.

## Related

- change `every-value-sent-is-one-the-platform-accepts` — added the probe
  recording that makes either fix checkable
- change `brain-presets-are-read-not-remembered` — takes option 1, and argues
  in its proposal why option 2 was not enough. Step 1 above is *not* answered
  by it: the value is excluded rather than explained, and the question moved to
  `preset-custom-in-the-preset-branch-is-unestablished`
- `brain-with-no-model` — the other open question about the brain union
