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

---

# Re-verified 2026-08-13 — the platform half stands, the product half was wrong in both directions

**The platform observation is untouched and is the reason this stays open**:
`POST /token` with `grant_type=refresh_token` answers 500 `server_error` for
every invalid token and never `400 invalid_grant`, which RFC 6749 section 5.2
requires. That is an upstream report, and
[[battlegrid-is-returning-internal-errors]] already earmarks it to be carried
with `fork_strategy` (#102) as one bundle of three deterministic
INTERNAL_ERRORs.

**What this item says the product does is not what it does.** The sole caller of
`refresh()` is `src/application/use-cases/resolve-authority.query.ts:95`, and it
catches *everything*:

    } catch {
      // BattleGrid refused the refresh. Whatever the cause, the remedy is the
      // same one.
      throw new ConnectionRevokedError('reconnect');
    }

So the mapping this item calls wrong is not in force. `PlatformUnavailableError`
never reaches the user from this path; the product already says "reconnect".

**And the consequence this item fears in the other direction does not happen
either.** `ConnectionRevokedError` deletes nothing.
`current-user.query.ts:67` turns it into `notConnected()` and
`failure-outcome.ts:39` into `{kind: 'authority-lost'}`. The stored connection
row is untouched, so the next request runs `resolve-authority` again, tries the
refresh again, and — if the platform has recovered — succeeds. **The behaviour
is self-healing.**

That falsifies both halves of the item's argument. It is not true that "a
permanently dead connection reports as a platform outage, and the user waits for
a recovery that cannot come": it reports as authority lost, which is correct for
that case. And it is not true that the opposite mapping "would tear down a
healthy connection": nothing is torn down under either.

**What is actually left is cosmetic and transient.** During a platform outage a
user is told to reconnect when waiting would have done. If they act on it, they
complete an OAuth round trip they did not need — no harm, just wasted effort —
and if they ignore it, it fixes itself. That is a wording problem on the
authority surface, which is
[[the-authority-page-names-a-remedy-and-offers-no-target]] (#182), and it should
be solved there rather than by a second mapping here.

**Re-priced from the risk it names to the report it is.** No product change is
proposed. The item stays open as the product-side record of an upstream defect,
and closes when the report is sent.
