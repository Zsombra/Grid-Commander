---
id: two-read-tools-do-not-answer
title: Two argument-free read tools refuse or error when actually called
type: question
status: open
priority: p3
created: 2026-07-29
updated: 2026-07-29
change: every-value-sent-is-one-the-platform-accepts
capability: battlegrid-connection
blocked_by: []
tags: [battlegrid, probe, declared-vs-observed]
---

# Two argument-free read tools refuse or error when actually called

## What

The probe calls a tool only when `readOnlyHint` is true **and** its input schema
declares no required arguments. On 2026-07-29 that set was 21 tools. Nineteen
answered. Two did not:

```
get_market_context   VALIDATION_ERROR   Provide sessionId or primaryTimeframe
get_open_orders      INTERNAL_ERROR     Internal server error
```

Both had answered on the previous probe (2026-07-28), when all 21 succeeded and
declared output matched observed output exactly.

## Why it matters

They are different failures and only one of them is BattleGrid's to explain.

**`get_market_context` is a declared-vs-observed divergence.** Its schema says
nothing is required. Calling it with `{}` — exactly what the schema permits —
is refused for omitting an argument. So `required` does not capture the real
precondition: it is "one of `sessionId` or `primaryTimeframe`", a constraint the
JSON Schema could express with `anyOf` and does not.

This is the same class of gap that let this change's defect through, one level
out: the schema is the product's source of truth about what a call needs, and
here it is incomplete. Anything that builds a call to this tool from `required`
alone will build one the server rejects.

**`get_open_orders` is a server error**, not a refusal — a 500 on a read tool
with no arguments. It coincided with the recovery from the MCP outage that day,
so it may simply be residue. Or it may not.

Neither tool is called by this product today, so nothing is broken. Both are on
the roadmap: `get_open_orders` belongs to the nine unused positions/orders tools.

## Fix

1. **Re-probe and see whether `get_open_orders` still 500s.** If it does, it is
   worth reporting to BattleGrid — a read with no arguments should not be able
   to fail that way.
2. **Record `get_market_context`'s real precondition** wherever the product
   would build the call, and do not trust `required` alone for it.
3. **Consider whether the probe should distinguish the two.** It records both as
   `call_failed` with the message, which is honest but flattens a schema bug and
   a server bug into one bucket. A refusal carrying a `code` (`VALIDATION_ERROR`)
   is a different finding from `INTERNAL_ERROR`, and the adapter already parses
   that code — see `ToolRefusedError`.

## Related

- change `every-value-sent-is-one-the-platform-accepts` — found these while
  re-probing after the outage
- `confirm-agent-write-response-shape` — the other open declared-vs-observed
  question
