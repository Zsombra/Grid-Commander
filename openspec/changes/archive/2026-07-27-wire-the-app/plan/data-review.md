# Data Pipeline Review: wire-the-app

Against `docs/specs/DATA_PIPELINE_REVIEW_CHECKLIST.md`.

## Scope

First change to write to PostgreSQL. Implements the four repositories the schema
has described since change 1 and nothing had implemented.

## Checklist Matrix

| Rule | Where | Evidence |
|---|---|---|
| Iron Rule — one source of truth per fact | both repositories | BattleGrid owns agent state (no agent table); this product owns the audit log, connections and confirmations |
| Tables mirror columns 1:1 | `toDomain` in both files | No computed column; no derived field stored |
| Nothing nullable given a misleading default | `accessTokenExpiresAt` | Stays null when the server did not say — DL-8's honesty preserved through persistence |
| Audit committed before the attempt | `DrizzleAuditRepository.begin` | Its own statement, never enrolled in the operation's transaction — DL-6 |
| An unknown outcome reads as `attempted` | `drizzle-audit-repository.ts:81` | Anything not `succeeded`/`failed` reads as the honest unknown, never as success |
| An unrecognised scope is dropped, not carried | `drizzle-connection-repository.ts:144` | `row.scopes.filter(isScope)` — silently widening the held set is the one direction that must never happen |
| Revoking discards authority, keeps history | `markRevoked` | Tokens nulled, row retained; R2 requires the history to survive |
| A refresh cannot revive a revoked grant | `updateTokens` | `WHERE status = 'active'` |
| Single-use is enforced by the statement | `DrizzleConfirmationStore.consume` | Conditions in the `WHERE`, atomic — see architecture review F-3 |
| Single-use state is enforced by deletion | `DrizzleTransactionStore.consume` | A replayed state finds nothing; expired rows swept on the way past |

## Contract Map

| Fact | Column | Domain | Notes |
|---|---|---|---|
| Access token | `access_token_encrypted` | never exposed | AES-256-GCM; decrypted only in the vault read |
| Refresh token | `refresh_token_encrypted` | never exposed | same |
| Token expiry | `access_token_expires_at` (nullable) | `Date \| null` | null means the server did not say |
| Held scopes | `scopes text[]` | `readonly Scope[]` | unrecognised values dropped |
| Connection state | `status` | `'active' \| 'revoked'` | anything unrecognised reads as active — see finding below |
| Audit outcome | `outcome` | `AuditOutcome` | anything unrecognised reads as `attempted` |

## Findings

**F-1 — an unrecognised `status` reads as `active`, while an unrecognised
`outcome` reads as `attempted`.** Deliberately asymmetric, and worth stating
because it looks inconsistent. The audit's unknown is `attempted`, which is the
*cautious* reading — it claims less. For a connection, the cautious reading is
not "revoked": a connection wrongly read as revoked would lock a user out of
their own account, while one wrongly read as active still cannot act, because
every call is gated by scope, classification and the token itself. The
conservative direction differs per field, so the defaults do too.

**F-2 — no migration was generated.** `drizzle.config.ts` exists and the schema
is complete, but `drizzle-kit generate` was not run. The repositories are written
against the schema and typecheck against it; nothing has executed SQL. Filed as
`generate-initial-migration` — the first deployment cannot happen without it.

## Status

EVIDENCE RECORDED
