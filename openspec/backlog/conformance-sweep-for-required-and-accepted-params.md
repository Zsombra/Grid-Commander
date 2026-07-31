---
id: conformance-sweep-for-required-and-accepted-params
title: Check every payload against required and accepted params, not just top-level names
type: feature
status: done
priority: p2
created: 2026-07-29
updated: 2026-07-31
change: conformance-sweep-for-required-and-accepted-params
capability: battlegrid-connection
blocked_by: []
tags: [battlegrid, conformance, probe]
---

# Check every payload against required and accepted params, not just top-level names

## What

`mcp-conformance.test.ts` reads `input_required` — **top level only**.
`wire-values.test.ts` checks values against `input_constants`. Neither checks:

1. **Nested required params.** A payload can satisfy every top-level requirement
   and omit a required field three levels down.
2. **Accepted property sets.** An object with `additionalProperties: false`
   rejects the *whole* payload for one unaccepted key.

The second is not hypothetical: it is exactly how `update_intelligence_agent`
came to be impossible. `tradingConfig` reads back with 23 keys, accepts 20, and
is closed — so passing the read back rejected everything.

## Why it matters, and the honest size of it

Counting nested required params across the tools the product calls gives 161,
which is what motivated this. **That number overstates the risk**, and the
investigation is worth recording so nobody re-derives the alarm:

- **`apply_strategy_plan` — 64 of its 68 required paths live inside `plan`**,
  which is the server's own `approvedPlan` handed straight back. The product
  never constructs them. Not a risk.
- **`compile_strategy_plan`** — `request` is a three-branch union; the `UPDATE`
  branch requires six fields and the edit page sends all six plus a legal
  optional. Correct.
- **`update_intelligence_agent`** — top level requires `agentId` and
  `expectedRevision`, both sent.

So of the four tools that dominated the count, three were already correct. The
real defect was in the *accepted* set, not the required set — the dimension the
count did not measure.

The lesson for whoever builds this: **classify params by who constructs them.**
Server-round-tripped objects are the platform's business; product-constructed
ones are ours. A sweep that does not distinguish them will cry wolf at 64
fields that were never at risk and miss the three that were.

## Fix

1. `probe_mcp_surface.py` records `input_accepts`: per object path, the accepted
   property set and whether the path is closed (`additionalProperties: false`).
   Also record nested `required` as paths.
2. A guard that builds each payload the product constructs and checks it against
   both — every required path present, no key outside the accepted set.
3. Mark round-tripped objects (`apply_strategy_plan.request.plan`) as
   pass-through so the check does not demand the product supply what the server
   supplied.

## Related

- change `the-edit-path-cannot-succeed-either` — found the accepted-set defect
- change `every-value-sent-is-one-the-platform-accepts` — added `input_constants`
- `two-read-tools-do-not-answer` — the other declared-vs-actual gap
