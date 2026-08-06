---
id: the-leaderboard-has-rows-and-no-surface-shows-them
title: The leaderboard's ten rows are read, mapped onto the port, and rendered nowhere
type: feature
status: done
priority: p2
created: 2026-08-06
updated: 2026-08-06
change: the-players-above-you-are-shown
capability: agent-comparison
blocked_by: []
tags: [battlegrid, explorer, leaderboard, mapped-but-unrendered]
---

# Ten rows arrive and one number is shown

`get_leaderboard` returns rows. Observed live 2026-08-06, account 1,
`{metric: PROFIT, timeframe: ALL_TIME, gameType: ALL, limit: 10}`:

```json
{"rank":1,"userId":"9b7a50e1-…","displayName":"PrawnCocktail",
 "avatarUrl":"https://imagedelivery.net/…","value":371.7}
```

Ten of them, on every metric tried. `ExplorerPort` models them —
`Leaderboard.entries: readonly LeaderboardEntry[]` — and `ReadFieldQuery`
carries them to the surface.

`app/(app)/explorer/page.tsx` renders **only** `leaderboard.leaderboard.own`:
the account's own rank, percentile and value. `entries` is never read.

## Why this is the shape it is

The rows genuinely used to be empty. The 2026-08-06 surface probe recorded
`"leaderboard": []` with `"currentUser": null`, and
`market-grid-standings-need-a-gametype-not-a-second-mapper` says in as many
words that "the rows have never been observed populated" and `/explorer`
renders only `currentUser`. That was true when written and is not true now.

So nothing here was a mistake. It is the ordinary case of a payload that filled
in after the surface was built, which is why it needs a re-read rather than a
blame.

## Why it is p2

**Mapped and unrendered is the defect this repository keeps finding.**
`binding.state` was mapped, carried through the domain, and rendered nowhere,
while the roster wrote the word "Bound" into its JSX — and the day the platform
answered `ORPHANED`, the product stated the opposite of the payload. Nothing is
*false* here, but the same gap is open: the data crosses the whole application
and stops one line short of a reader.

And the surface is thin without it. `/explorer` is the "where do I stand"
page; it currently answers with a rank and no field to be ranked against. The
account sits at **rank 7 by profit, 97th percentile** — a number whose meaning
is exactly the ten rows above it.

## What it needs

A table under the existing standing sentence: rank, display name, value. The
port already carries all three.

Two things to decide rather than assume:

- **`userId` and `avatarUrl` are on the wire and not on `LeaderboardEntry`.**
  `avatarUrl` is presentation this product has had no use for anywhere else.
  `userId` is the one that matters: it is what would let a row link to that
  player's public agents, which `agent-comparison` already reads. Worth
  mapping only if the link is built.
- **The account's own row appears in the list** (`ANBUJEFF` is rank 1 by volume
  and by score, and is this account). So the table must not present `own` and
  the rows as separate facts without saying they overlap.

## Related

- `market-grid-standings-need-a-gametype-not-a-second-mapper` — the sibling,
  whose "first step" was to check whether rows arrive. They do; that item's
  own finding is recorded there.
- `bound-and-on-duty-are-claims-the-payload-must-back` — the mapped-and-
  unrendered precedent
