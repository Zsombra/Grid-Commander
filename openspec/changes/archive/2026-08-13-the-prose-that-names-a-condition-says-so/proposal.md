# The prose that names a condition says so

## Problem

A strategy's `marketReadText` — its prose — can reference a condition by
`{KEY}` marker. Removing that condition invalidates the prose, and BattleGrid
refuses the compile:

```
VALIDATION_ERROR
[market-read] strategy f34788df-…: marker '{ALL_AGREE_UP}' names neither a
column this strategy's report renders nor one of its conditions

details.authoringCode  MARKET_READ_MARKER_UNKNOWN
details.path           ["marketReadText", 184]
details.context        {token: "ALL_AGREE_UP", lookupKind: "reportHeader",
                        nearestKey: "ALL_AGREE_DOWN"}
```

The describe compiles before it proposes, so this refusal arrives **before**
any confirmation is minted — the operator never agrees to an incomplete
picture. That is why #111 was re-graded from p2 to p3, and it stays true.

What is left is that the refusal arrives as **an opaque wall**. The describe's
whole job is to state the consequence of an edit before it happens: it already
computes `dangling` — the conditions that would be left referring to nothing —
and says so in a sentence. The prose is a *fourth place a condition is
referenced from*, and when it is the reason, the product hands over the
platform's raw refusal text instead of naming the cause it now knows.

**The structured answer is already on the wire and already thrown away.**
`ToolRefusedError` carries the refusal body verbatim as its message
(`mcp-adapter.ts:100`), and `mapColumnRefusal` (`strategy-adapter.ts:1093`)
already parses exactly this shape for the *column* checker — `authoringCode`,
`path`, `allowedDomain`. The compile path does none of it: it catches, calls
`messageOf(err)`, and returns `{ kind: 'rejected', reason: <the whole JSON> }`
(`strategy-adapter.ts:133`).

## Intent

**When the platform refuses because the strategy's own prose names the
condition, say that — and say which marker.**

Not by parsing prose. The product never reads `marketReadText` and never
learns the marker grammar; the platform states the token, the path and the
nearest valid key in the refusal it already sends, and this change carries
those through instead of flattening them into a string.

## Capabilities touched

- **strategy-authoring** — ADDED (a compile refused for a prose marker is
  named as that, not rendered as an unexplained refusal)

## Scope

### In scope

- `CompileResult`'s rejected arm carries the refusal's structured detail —
  `authoringCode` and the context the platform sends — parsed in the adapter
  the way `mapColumnRefusal` already parses its sibling
- `CompilePlanResult` threads it
- `DescribeConditionWriteQuery` gains an arm for the marker case, distinct
  from the generic `refused`, the way `no-such-condition`, `inexpressible` and
  `drift` are already distinct facts rather than one bucket
- The save page renders it: what the prose names, where, and the nearest valid
  key the platform offered — with the operator's edit preserved, as every
  refusing branch already does

### Out of scope

- **Parsing `marketReadText` for markers.** The issue's first candidate, and
  rejected there and here: the marker grammar is undocumented beyond one error
  message, `lookupKind: "reportHeader"` hints markers also name report columns,
  and this product would be inventing a parser for a language the platform
  owns. The compile already answers authoritatively.
- **Folding the marker into `dangling` on a proposal.** There is no proposal
  when the compile refuses. The two are different states and are kept apart.
- **The `conditions: []` question.** Whether an empty list means "define none"
  or "unspecified", and what removing the *last* condition does, is still
  unobserved — the probe's empty-list case was refused for *this* reason, not
  for being empty. It stays recorded on #111 and does not move here.
- **Every other `authoringCode`.** Only `MARKET_READ_MARKER_UNKNOWN` gets a
  named state. The rest keep the generic refusal, which is correct: naming a
  code the product has never seen would be guessing at what it means.

## Why standard, not lite

It adds a requirement and changes a port's result shape, so callers and the
spec both move. No behaviour that writes, no migration, no money.
