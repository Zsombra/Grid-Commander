# Proposal: The Connection Asks Who It Is

## Why

**No delegated connection has ever completed.** BattleGrid is plain OAuth 2.1 —
`/.well-known/openid-configuration` is 404 and the authorization-server metadata
advertises no `userinfo_endpoint` — so its token response carries
`access_token, token_type, expires_in, refresh_token, scope` and no `sub`.
`mcp-adapter.ts:431` throws on every grant that lacks one. Walked live on
2026-08-13 across two grants and one refresh: the operator consented, the code
exchanged, the tokens were valid and were used successfully against `/mcp` — and
the adapter refused them (#203).

The throw is a bare `Error`, so it escapes the callback's `catch` and reaches the
user as a framework error page, after they have already consented at BattleGrid.

The guard's *reasoning* is sound and this change keeps it: defaulting an absent
subject to `''` would collide every such connection on one key, and the second
user to connect would be recognised as the first. What is wrong is only the
assumption that a grant carries identity at all. **A grant is authorization, not
authentication.** The identity has to be asked for.

The mechanism already exists for the other path: `AccountPort.subjectFor` asks
BattleGrid which account a credential acts as, and the personal-key deployment
has used it since it was written.

## What Changes

- A delegated connection establishes the acting account's platform identity by
  an **authenticated read performed with the newly granted authority**, instead
  of reading a claim off the authorization response.
- A token response carrying no subject is **normal**, and is no longer a reason
  to refuse a connection. **BREAKING** to the `TokenGrant` contract: `subject`
  leaves it, because that layer never had the answer.
- **BREAKING** to `AccountPort`: the identity read reports *why* it could not
  answer rather than flattening every failure to `null`. The personal path keeps
  its current behaviour by collapsing that result at its own call site — which is
  where "unknown must never become a refusal" actually applies.
- When the identity read cannot answer, the connection is **refused, not stored,
  and the just-issued grant is released at BattleGrid** — so a user is never left
  holding a live grant for a connection they were told did not happen.
- A refused connection returns the user to `/connect` with an explanation and a
  retry, never a framework error page.
- Two records that misled stop misleading: `scripts/ci.sh` states beside
  `oauth-live` that no gate exercises a grant and why one cannot, and the
  registration comment at `config.ts:95` is corrected against
  `docs/battlegrid-oauth-metadata.json`, which has contradicted it in-repo the
  whole time.

## Capabilities

**New**: none

**Modified**: `battlegrid-connection` — where a delegated connection's identity
comes from, and what happens when it cannot be established.

## Out of Scope

- **The keep-or-delete decision for the delegated path (#91).** This change is
  what makes that decision answerable — it is currently being made about code
  that has never run to completion. Deciding it stays with the operator.
- **Any change to the personal-key path's observable behaviour.** Its contract
  with an unknown subject is preserved exactly; only where the swallowing happens
  moves.
- **Multi-tenant session hardening beyond identity establishment** — session
  fixation, concurrent-device policy, and the `oauth_transactions` retention
  window are untouched.
- **Automating the consent step.** An authorization code requires a human at a
  consent screen. This change writes that boundary down; it does not remove it.
- **Refresh-time identity.** A refresh returns a grant for an already-identified
  connection, so it does not re-ask. Re-verifying identity on refresh is a
  separate question and is filed rather than assumed.

## Impact

| Area | Effect |
|---|---|
| `src/ports/battlegrid.ts` | `TokenGrant.subject` removed — the layer that cannot answer stops claiming to |
| `src/infrastructure/battlegrid/mcp-adapter.ts` | `tokenRequest` no longer requires or reads `sub`; the refusal moves to where identity is actually established |
| `src/ports/account.ts` | the identity read carries a cause out; the port's failure contract is restated for two callers with opposite needs |
| `src/infrastructure/battlegrid/account-adapter.ts` | reports the cause instead of swallowing it |
| `src/application/use-cases/connect.commands.ts` | `CompleteConnectionCommand` asks for identity, refuses without it, releases the grant on refusal |
| `src/application/use-cases/owner-only-user.ts` | collapses the new result to `null`, keeping personal-mode behaviour byte-for-byte |
| `app/api/auth/battlegrid/callback/route.ts` | renders the refusal instead of throwing past it |
| Data | none — no schema change. `users.battlegrid_subject` already holds exactly this fact |
| Consumers | `apply_strategy_plan`'s ownership comparison is unaffected: it reads the stored subject, and the stored subject's provenance is what changes |
| Live | one authenticated read is added to the connect flow, on the delegated path only |

## Risk

`subjectFor` is proven against a **personal `bg_live_` key**, not against a
delegated access token. `list_user_active_positions` is a read and the delegated
grant carries `mcp:read`, so it should answer — but "should" is what produced
this bug. **This change is not done until one live delegated connection has
completed end to end**, which needs the operator at a consent screen.
