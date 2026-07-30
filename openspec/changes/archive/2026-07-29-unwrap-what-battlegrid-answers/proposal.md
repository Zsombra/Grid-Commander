# Proposal: Unwrap What BattleGrid Answers

## Why

The first run against a real `bg_live_` key showed a page saying:

> This BattleGrid account has no agents yet.

The account has **two** agents, and one free slot at Recruit III. `/strategies`
said *"Nothing is listed here — not even BattleGrid's own catalog"* while
BattleGrid was returning Dunkirk, Leningrad, London, Tobruk and Midway. `/audit`
recorded both calls as **Succeeded**, because they had.

**Every read in this product returns an empty object, and always has.**

A `tools/call` result is an MCP envelope:

```json
{ "content": [ { "type": "text", "text": "{\"agents\":[…],\"slotUsage\":{…}}" } ],
  "structuredContent": { "agents": [ … ], "slotUsage": { … } } }
```

The adapters hand `result.content` — the envelope — to `asObject`, which sees an
object, returns it unchanged, and the mappers then look for `payload['agents']`
on a value whose only key is `content`. `undefined` is not an array, so the
roster is `empty`, the catalog is `empty`, and capacity is `unknown`.

Nothing detected it because nothing could. Every fake in the suite returns the
already-unwrapped shape, which is the shape the *mappers* correctly expect — the
reference documentation was right and the mappers match it field for field. The
defect lives in the one seam no fake models: the transport envelope.

**This is the exact failure the roster's three-state design exists to prevent.**
`empty` and `unreadable` were kept separate, and the constraint written down, so
that a user whose roster failed to load is never told they have no agents. The
branch was correct. The data never arrived, one layer below where anyone looked.

### And a tool error is currently recorded as a success

The same envelope carries `isError: true` when a tool rejects:

```json
{ "content": [ { "type": "text", "text": "MCP error -32602: Input validation error…" } ],
  "isError": true }
```

Nothing reads it. A refused tool call returns HTTP 200 with a JSON-RPC `result`,
so `rpc()` returns normally, the audit entry completes as `succeeded`, and the
caller gets an object with no usable fields. A failed write is currently
indistinguishable from a write that changed nothing.

## What Changes

- **`callTool` unwraps the envelope.** `structuredContent` when present,
  otherwise the JSON in the text blocks. Both are documented encodings of the
  same value and were byte-identical across every tool sampled.

- **An unusable envelope throws instead of returning `{}`.** This is the whole
  lesson: `asObject` returning an empty object for anything it did not
  understand is what turned a broken integration into "you have no agents".
  Neither encoding present, or text that is not JSON, is now a failure — and it
  surfaces as `unreadable` with cause `unreachable`, which is exactly what it
  is: BattleGrid answered, but not with an answer.

- **`isError: true` becomes a failed call.** The audit entry completes as
  `failed`, and the caller sees an error carrying BattleGrid's own message.

- **`asObject` goes.** Both adapters keep a private copy of a function whose
  only behaviour is to silently discard what it does not recognise.

## Why one place, not two

The envelope is the MCP wire format, and `McpBattleGridAdapter` is the only
thing in this codebase permitted to know MCP exists (architecture policy P6).
Unwrapping in the agent and strategy adapters would put transport knowledge two
layers out and give it two chances to disagree — and would leave the assistant,
the third consumer, still receiving raw envelopes to reason over.

## Capabilities

- `battlegrid-connection` — ADDED: what a tool result means and when it has
  failed.

## Out of Scope

- **The mappers.** Verified field by field against the live payload —
  `strategyId`, `strategyName`, `strategyRevision`, `bindingState`, `revision`,
  `displayName`, `status`, `capabilities` all match. They were correct all
  along.
- **`tools/list`.** Discovery reads `result.tools` directly and is not wrapped;
  it has been working, which is why classification and audit named the right
  tools throughout.
- **Anything that writes.** This change is verified against a live account using
  read tools only. The write path's envelope handling improves identically
  because it shares the seam, but no mutation was performed to prove it.
