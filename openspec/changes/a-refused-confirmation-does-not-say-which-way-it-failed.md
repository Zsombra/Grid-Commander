---
id: a-refused-confirmation-does-not-say-which-way-it-failed
type: debt
status: done
priority: P3
capability: battlegrid-connection
created: 2026-07-30
updated: 2026-07-31
change: a-confirmation-binds-to-what-was-agreed
---

# A refused confirmation does not say which way it failed

`enforce()` raises one message for four different situations:

> the confirmation was invalid, expired, already used, or issued for something else

Accurate, and unhelpfully broad. Each of the four has a different next step:

| cause | what the user should do |
|---|---|
| expired | review it again — nothing is wrong |
| already used | the change probably landed; go look |
| issued for something else | the values changed since you agreed |
| unknown token | something is broken, not stale |

`a-confirmation-binds-to-what-was-agreed` made the third one reachable: a
submission carrying different values now lands here rather than being accepted.
The page can only render the composite sentence, so the most informative thing it
could say — *"the amount changed since you agreed to it — review it again"* — is
unavailable.

## Why it is P3

Nobody reaches this state by using the product: it takes editing a hidden field in
your own browser, on your own account. Expiry is the only cause a normal user
meets, and five minutes of reading is a generous TTL.

It is worth doing because a refusal that cannot say why is the same shape of defect
as a surface that reports something wrong without naming its subject — the thing
`app-access` now has a requirement about.

## Fix

`ConfirmationStore.consume` returns `null` for all four. It would need to return a
reason — `'expired' | 'consumed' | 'mismatched' | 'unknown'` — and
`ConfirmationRequiredError` would carry it. That is a port signature change and a
new error shape, so it is a change rather than a copy edit.

Care needed on one point: **the message must not confirm a guess.** Telling someone
"issued for something else" when they submitted a token they never had would
report on a token's existence. `unknown` and `mismatched` should read the same to
the caller even if they are distinguished internally for the audit.

## Closed

Fixed in `the-small-debts-sweep` (2026-07-31): `ConfirmationStore.diagnose()` — a read-only post-mortem after a failed consume (consume stays the single atomic spender) — and the guard raises four distinct messages, each naming its next step. Guard tests cover all four causes.
