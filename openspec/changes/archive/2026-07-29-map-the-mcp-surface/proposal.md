# Proposal: Map The MCP Surface

## Why

The envelope defect made the case. Every read in this product returned an empty
object for its entire life, through four production gates and 561 tests, because
the reference was generated from `tools/list` — names, descriptions, input
schemas — and never from a response. The payload field names were all correct.
Nobody had looked at what came back.

A map built the same way would inherit the same blind spot. And there is a
second reason to build one now: the product calls **20 of 110** tools. Ninety
tools of capability are unconsumed, and we have no grounded picture of them.

## What Changes

- **`tools/probe_mcp_surface.py`** — probes the live server and records declared
  and observed separately. It calls a tool only when `readOnlyHint` is true
  *and* its input schema has no required arguments, so the write set is filtered
  out before any request is built rather than avoided by care.

- **`docs/battlegrid-mcp-surface.json`** — the artifact. Shapes, not contents:
  key names and value *types*, so the operator's account data does not land in a
  public repository.

- **`docs/BATTLEGRID_SURFACE_MAP.md`** — regenerated from it, and honest about
  which parts are observed and which are only declared.

- **`tests/architecture/mcp-conformance.test.ts`** — the part with teeth. Checks
  what the adapters build against what BattleGrid declares it requires.

## What it found

- **21 tools called live; declared and observed matched exactly.** Zero keys
  declared-but-absent, zero returned-but-undeclared. That is what makes the
  other 89 checkable from their schema without being called.

- **`archive_strategy` and `restore_strategy` could never succeed.** Both
  require `expectedRevision`; archive also requires `confirm`. `setActive` sent
  `{ strategyId }` alone. Fixed here — the command already held the `Strategy`,
  so its revision was one field away, and passing it is also correct on its own
  terms: it is the optimistic concurrency every agent mutation already carries.

- **The `REPAIR_REQUIRED` branch cannot fire.** It reads `payload['status'] ??
  payload['result']`; neither tool declares either key. Filed as
  `repair-required-cannot-be-detected` rather than guessed at.

- **An input schema can under-declare.** `get_market_context` has no required
  arguments and refuses an empty call. A client building arguments from the
  schema alone — which is exactly what the assistant does — can construct a
  request the tool rejects.

- **`get_open_orders` returns INTERNAL_ERROR**, on the platform's side.

## The checker was wrong three times before it was right

Worth recording, because each failure is the same shape as the bug being hunted:

1. **File-level scan** reported `confirm` present for `archive_strategy`,
   because `applyPlan` sends `confirm: true` two methods away.
2. **Method-level scan** reported `expectedRevision` present after it had been
   deleted from the call — the method's *parameter type* declares
   `expectedRevision: number`. Every required argument sharing a parameter name
   would have passed regardless of whether it was sent, which is most of them.
   Caught by a surviving mutation.
3. **`wraps nothing else`** asserted that exactly two tools take a bare
   `request` envelope. Four do. The assertion was a claim about the platform
   that had not been looked up.

Now scoped to the argument object at `this.call(…)`, where a type signature
cannot reach.

## Out of Scope

- **Calling any write tool.** `writes-unproven-against-live` (P1) is unchanged
  as a *live* proof, though the shapes are now verified against declared
  schemas.
- **Consuming the 90 unused tools.** The map says what is there; deciding what
  the product should grow into is a product question.
