# Proposal: A Cancelled Session Is Promised Nothing

## Why

The arena branches on `status !== 'SETTLED'` and, on everything else, says:

> Results arrive after settlement.

A **CANCELLED** session never settles. Live census, 2026-08-06, all 50 rows
`list_market_grid_sessions` returned:

```
PENDING     2
CANCELLED  48
```

So the sentence is false on 48 of the 50 rows the page renders — the ordinary
case, not an edge. The platform's own refusal repeats the same broken promise:

```
CONFLICT  Results are not available yet: Market Grid session … is CANCELLED.
          Results are published after the session settles.
```

BattleGrid saying "not available yet" about a terminal state is BattleGrid's
mistake. The arena repeating the promise in its own voice makes it this
product's claim, and it is the kind of false claim that costs a reader time: a
player watching a session is told to come back for results that will never
exist.

## What Changes

The results sentence on an arena row follows the session's status instead of
being said to everything short of `SETTLED`:

- **`PENDING`** keeps the promise: results arrive after settlement. It is the
  state from which settlement is reached, and the sentence is the platform's
  own story about it.
- **`CANCELLED`** says plainly that the session was cancelled, will not
  settle, and will publish no results. Terminal, said as terminal.
- **`SETTLED`** repeats no promise, unchanged — what was promised has arrived,
  and its state is read on the opened session.
- **Any other value** renders as the platform's own word with no claim about
  results attached — the `BindingSummary` third-branch treatment, which exists
  in this product for exactly this problem. The declared enum
  (`input_constants`) carries `LIVE`, `RESOLVING` and `SETTLEMENT_QUARANTINED`,
  none ever observed on a session; writing sentences for unobserved states is
  the mistake behind three dead paths in `HANDOFF.md`, so those states get the
  word and no prose.
- **`null`** stays a named unknown (`status not stated`) and claims nothing
  either way, as it already does.

The vocabulary boundary holds: the status stays a nullable string read off the
wire at runtime, no enum is written down, and the only literals in source are
the two observed values plus `SETTLED` — the same pattern the page already
established by branching on `'SETTLED'`. `tests/strategy/structure.test.ts`
and `AL-1` guard catalog vocabulary (signals, presets, model ids); session
status literals for observed values are the arena's existing, narrower
practice, and this change adds no value that has not been seen on the wire.

## Out of scope

- **`/arena/[id]` carries the same false promise** and is not touched here:
  the adapter maps *every* results CONFLICT — including the one quoted above,
  which names CANCELLED — to `kind: 'not-settled'`, and the session page
  renders that as "Results are published after this session settles." That
  surface, `OpenGridSessionQuery` and the adapter's CONFLICT mapping belong to
  a sibling change and are flagged to the integrator rather than edited.
- No new fields are mapped and no per-session read is added; the status was
  already on the list row.

## Capabilities

**Modified**: `market-grid` — one MODIFIED requirement (The Arena Is
Watchable Without Being Played).
