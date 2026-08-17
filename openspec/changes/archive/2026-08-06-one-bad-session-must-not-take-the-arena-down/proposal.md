# Proposal: One Bad Session Must Not Take The Arena Down

## Why

Found by `all-controllers-probe` on its **first run**, walking every read
controller against the second account:

```
watchArena   THREW BattleGrid is limiting how often this deployment may ask (HTTP 429).
readField    field=unreadable leaderboard=unreadable
```

Two controllers hit the same rate limit in the same run. One degraded and said
so. The other **threw**, which at a route is a 500 — the one outcome every read
in this product is shaped to avoid.

## What is actually wrong

`WatchArenaQuery` reads the session list through a guarded call, then fans out
per session to `sessionDetail` and `hasSubmitted`. **The guard is on the first
call and not on the N that follow.** `listSessions` catches and returns
`unreadable`; the two per-session methods throw, and nothing catches them.

The spec already asks for better. *"What cannot be read SHALL render as
unknown, never as an empty arena"* — but its only scenario covers the session
list, so the fan-out was never held to the sentence above it.

## The second defect, which is worse

`ArenaSession.entered` is a `boolean`. The page renders:

```tsx
{s.entered ? 'This account has entered this session.'
           : 'This account has not entered this session.'}
```

So a submission check that fails renders as **"this account has not entered"** —
a definite claim, produced by a read that returned nothing. That is the exact
shape of the mistake this product names everywhere else: a null win rate that
is not 0%, an unconfigured gauge that is not a limit of zero, an unreadable
roster that is not an empty one. It is worse than the throw, because a throw is
visibly broken and this is quietly false.

## What Changes

- `sessionDetail` and `hasSubmitted` return a named result instead of throwing,
  like every other read on every other port here.
- A session whose detail or submission check fails **still renders**, with what
  the list knew — its name and coin pool — and says which part could not be
  read. One session's failure costs that session's detail, not the arena.
- `entered` becomes nullable. `null` is "could not be read" and renders as
  that; `false` keeps meaning "has not entered".
- The session list failing still takes the whole arena to `unreadable`, which is
  right: with no list there is nothing to show.

## Capabilities

**Modified**: `market-grid` — one MODIFIED requirement.
