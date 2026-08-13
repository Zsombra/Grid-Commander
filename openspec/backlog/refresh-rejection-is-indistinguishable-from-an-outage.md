---
id: refresh-rejection-is-indistinguishable-from-an-outage
title: Every rejected refresh token returns 500, so reconnect and retry-later look identical
type: risk
status: open
priority: p3
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: battlegrid-connection
github: "204"
blocked_by: []
tags: [oauth, battlegrid, platform-defect, live]
---

# A rejected refresh is indistinguishable from an outage

## What

Live 2026-08-13. `POST /token` with `grant_type=refresh_token` answers **200**
for a valid token and **500 server_error** for every invalid one:

| token | result |
|---|---|
| valid | 200, new access **and** refresh token |
| replayed after rotation | 500 server_error (3/3, deterministic) |
| random 64-char string | 500 server_error |
| the literal `"nope"` | 500 server_error |

There is no `400 invalid_grant` path. RFC 6749 section 5.2 requires one.

## Why it matters

The two cases behind that 500 demand **opposite** responses:

- *the refresh token was rotated away or revoked* - stop retrying, tell the user
  to reconnect
- *BattleGrid is having a bad minute* - do not touch the connection, back off
  and retry

`mcp-adapter.ts:415` maps every non-OK to `PlatformUnavailableError(res.status)`,
so a permanently dead connection currently reports as a platform outage, and the
user waits for a recovery that cannot come. The opposite mapping would be worse:
a transient 500 would tear down a healthy connection.

**Neither mapping is right, because the information needed to choose is not in
the response.** The current one is the safer of the two - it fails toward leaving
the connection alone - and that is worth stating in the code rather than leaving
it to look like an oversight.

## What can be done here

Little, honestly, and that is the point of filing it. Options, none clean:

1. **Say so where it is mapped.** A comment at `tokenRequest` recording that a
   500 is ambiguous by platform behaviour, why the outage reading was chosen,
   and what would change if BattleGrid ever returns `invalid_grant`. Cheapest,
   and it stops the next reader "fixing" it into the more dangerous mapping.
2. **Bounded retry, then reconnect.** If N refreshes in a row fail, treat it as
   revoked. Guesses a threshold, but converges on the right answer either way.
3. **Report it upstream.** This is the third deterministic INTERNAL_ERROR on the
   platform - see [[battlegrid-is-returning-internal-errors]] (#100) and
   fork_strategy (#102). Worth carrying as one report rather than three.

Option 1 should happen regardless; it costs a comment and removes a trap.

## Notes

Only reachable with a real refresh token, so it could not have been found
without the consent walk. Found answering [[prove-token-lifetimes]] (#93).
