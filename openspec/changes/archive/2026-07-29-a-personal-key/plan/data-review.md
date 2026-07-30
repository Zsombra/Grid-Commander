# Data Review: a-personal-key

## What moves

Personal mode reads and writes **less**, not differently:

| | Delegated | Personal |
|---|---|---|
| `connections` | read for scopes and tokens | not read |
| `oauth_transactions` | written at connect | not written |
| `audit_entries` | written per call | written per call, keyed `owner` |
| `confirmation_tokens` | written per destructive call | unchanged |

No new table, column or query. The audit and confirmation paths are untouched
and still key on `userId`, which is now a constant.

## The credential

The personal key is read from the environment and held in memory. It is **not**
written to the database and not encrypted at rest, because it is not at rest —
`TOKEN_ENCRYPTION_KEY` protects tokens the product stored, and this one it never
stores.

Worth stating because the asymmetry looks like an omission: a delegated token is
BattleGrid's, obtained on a user's behalf and kept; a personal key is the
operator's own, supplied at boot like any other secret.

## No hidden recomputation

`DeclaredScopes` returns its constructor argument. Nothing derives a scope from
anything.

## Verdict

No violations.
