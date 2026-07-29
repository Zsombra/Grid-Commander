---
id: personal-mode-says-reconnect
title: A refused key tells you to reconnect, and there is nothing to reconnect to
type: bug
status: done
priority: p1
created: 2026-07-29
updated: 2026-07-29
change: "a-remedy-that-exists"
capability: battlegrid-connection
blocked_by: []
tags: [personal-mode, copy]
---

# A refused key tells you to reconnect, and there is nothing to reconnect to

## What

In personal mode, when BattleGrid refuses the configured key, every page shows:

> Your BattleGrid connection is no longer valid. **Reconnect to continue.**

There is nothing to reconnect. `/connect` is not in the navigation, the OAuth
client is deliberately unset, and pressing the button there would redirect to an
`/authorize` with an empty `client_id`. The remedy is to fix
`BATTLEGRID_API_KEY` and restart — which nothing says.

`NOT_CONNECTED` has the same problem: *"Connect your account to continue."*

## Why it matters

This is the **primary failure path of personal mode**. A wrong key, a rotated
key, an expired key — all land here, and the one instruction on screen names an
action that does not exist in this deployment.

It is not a wrong *diagnosis*: the account genuinely cannot be read, and nothing
fake is shown. It is a wrong *remedy*, which sends someone to look for a connect
button that was removed on purpose.

## Evidence

Found 2026-07-29 by serving personal mode with a deliberately invalid key and
looking at the page — `docs/merge/proof/personal-mode-dark.png`, the roster's
`unreadable` branch beneath the disclosure banner.

`src/domain/errors.ts` — `ConnectionRevokedError`.
`src/domain/session/session.ts` — `NOT_CONNECTED`.

## Why it was not fixed with the change that found it

Both strings are domain constants, and the delegated path deliberately gives
**one message for every way authority is lost** — design W-C, so that a user
never has to distinguish an expired token from a forged cookie. Making the
remedy vary by deployment mode means threading that mode into error
presentation, which is a design decision rather than a copy edit, and one worth
making deliberately rather than at the end of the change that surfaced it.

## Fix

The diagnosis stays one message; the *remedy* becomes the part that varies.
Something like a `remedy` the presentation layer resolves from the same source
that already drives the personal-mode disclosure — the layout knows the mode, so
nothing new has to be discovered.

Personal: "Check `BATTLEGRID_API_KEY` and restart."
Delegated: "Connect your account to continue." (unchanged)

## Resolution

Closed by `a-remedy-that-exists` (2026-07-29).

The remedy became a `Remedy` value chosen at the composition root rather than a
sentence baked into `ConnectionRevokedError`. A personal deployment now names
`BATTLEGRID_API_KEY` and a restart; a delegated one still says "Reconnect to
continue.", byte for byte.

`NOT_CONNECTED` was left alone, as this item's Fix section anticipated it might
not need changing: `OwnerOnlyUser` returns `acting` unconditionally, so the page
carrying that string is unreachable in personal mode. That is now asserted
across all thirteen pages that render it rather than inferred.

Beyond what was filed: `/connect` itself was the same defect. It rendered a
consent page in personal mode with a button that would have built an
`/authorize` URL with an empty `client_id` — the dead end the broken advice
pointed at. It now says there is nothing to connect.
