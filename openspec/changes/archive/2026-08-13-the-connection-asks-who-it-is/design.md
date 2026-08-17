# Design: The Connection Asks Who It Is

## Technical Approach

`CompleteConnectionCommand` currently reads `grant.subject` and uses it as the
key for `findUserIdBySubject` and `upsert`. After this change it exchanges the
code, then asks BattleGrid which account the new access token acts as, and uses
*that* as the key. Everything downstream of the subject is unchanged — the same
race-tolerant `upsert` returns which id actually holds the connection, and the
session is still issued only for the id the store confirms.

The read itself already exists. `McpAccountAdapter.subjectFor` calls
`list_user_active_positions`, which takes no parameters and returns `userId` at
the top level. It was chosen on observation rather than on the reference:
`get_account_state` is the obvious candidate by name and returns `username`,
`balance`, `stats`, `agentSlots` — **no id at all**.

The domain layer does not learn about any of this. The read is reached through
`AccountPort`, which the application layer already depends on; the MCP client
stays behind it, and `src/domain/` gains no import. What changes in the domain is
subtractive: `TokenGrant` stops carrying a `subject` it was never given.

## Decisions

### Decision: Identity comes from an authenticated read, not from the grant

Chosen because BattleGrid publishes no OIDC metadata and no `userinfo_endpoint`,
so `sub` was never going to be present — three live grants on 2026-08-13
confirmed it. An authenticated read is the only source that exists.

Rejected: **derive identity from the access token's own bytes** (hash it, or
parse it as a JWT). The token is opaque by contract, rotates on every refresh,
and hashing it would key a workspace to a credential rather than to an account —
so one refresh would strand the user in an empty workspace.

Rejected: **keep `sub` and treat its absence as a legacy case**. There is no case
where it is present. A branch that has never been taken and cannot be taken is
not tolerance; it is unreachable code with a comment attached.

### Decision: `TokenGrant.subject` is removed rather than made optional

Chosen because optionality would preserve the false claim that the grant is a
plausible source of identity, and the next reader would wire to it again. The
type should say what the layer knows. `tokenRequest` maps a token response; a
token response has no identity in it.

Rejected: `subject: string | null`. It type-checks and it lies.

Note this also removes the one place `asSubject` was called on grant data.
`BattlegridSubject` exists so that every value of the type "came from somewhere
that genuinely holds BattleGrid's answer" — and after this change every remaining
call site is a read of the platform or the stored column, which is a stronger
claim than the type could make before.

### Decision: The identity read reports its cause; the personal path collapses it

Chosen because two callers need opposite behaviour from the same question, and
the port currently hard-codes one of them. `AccountPort.subjectFor` swallows
every failure into `null` — documented, deliberate, and correct for
`OwnerOnlyUser`, where `userId` is the constant `owner` so identity exists
without the subject, and where a refusal would make `apply_strategy_plan`
unreachable over a down positions read. It is **wrong for connecting**, where the
subject is the identity key and an unknown recreates the collision the removed
guard prevented.

So the port answers honestly and `OwnerOnlyUser` does the collapsing at its own
call site, with the reason written where the tolerance actually applies. The
guarantee the port's comment protects is unchanged; it moves from being a
property of the port to being a property of the caller that needs it — and
becomes visible to the reader of that caller, who is the person it constrains.

Rejected: **a second port** (`AccountIdentityPort`), mirroring the existing
`AccountPort` / `AccountStatePort` split. That split is right because those two
answer *different questions* with different failure philosophies. This is one
question with two callers, and duplicating the port would mean two adapters
calling the same tool, which is how they come to disagree.

Rejected: **leave `subjectFor` as-is and have the connect path treat its unknown
as a refusal.** It works, and it turns the port's own documentation into a lie
for the next reader — the comment says an unknown must never become a refusal,
and there would be a caller three files away doing exactly that. This codebase
has been bitten six times by a check whose stated intent outlived what it
reached; this would be the seventh, pre-installed.

### Decision: A refused connection releases the grant it was just given

Chosen because the grant is live at that moment. The user consented, the code
exchanged, BattleGrid holds an active authorization — and we are about to tell
them the connection did not happen. Dropping it locally is precisely what
`DisconnectCommand` refuses to do, for the same reason: local deletion alone
"would leave a live grant the user believes they revoked."

Ordering: store nothing, then attempt the release. Nothing has been written, so
there is no partial connection to unwind — and unlike disconnect, a failed
release cannot leave a local row claiming something false, because there is no
local row. What it can leave is a user with a wrong belief, so the second
scenario requires telling them.

Rejected: **store the connection pending identity and retry later.** It needs an
identity to store it under, which is the thing that is missing. Any placeholder
is the collision key again.

Rejected: **retry the read inline a few times.** It converts a stated outcome
into a variable-length wait at the end of a consent flow, and the failure it
would paper over — the read genuinely not answering — is one the user should be
told about, because it usually means the grant is not usable for anything else
either.

### Decision: The refusal is rendered, not thrown

Chosen because the current failure is a bare `Error` that escapes the callback's
`catch` and reaches the user as a framework error page — after they consented.
There is still no error boundary in this application, so a throw here is a crash.
The refusal joins the outcomes the callback already renders (`declined`,
`incomplete`, `untrusted`) as a named one.

## Data Flow

1. The callback consumes the one-time transaction; a response with no pending
   request is refused before anything else happens. *(unchanged)*
2. The code is exchanged for a grant. *(unchanged; the grant no longer carries a
   subject)*
3. **New** — the account is read with the new access token. Its answer is the
   platform's id for the account, or a stated failure.
4. **New** — on a stated failure: nothing is stored, the grant is released at
   BattleGrid, and the user is redirected to `/connect` with the reason.
5. On an answer: `findUserIdBySubject`, then the race-tolerant `upsert`, then the
   session for the id the store confirms. *(unchanged)*

## File Changes

- `src/ports/battlegrid.ts` (modified) — `TokenGrant.subject` removed
- `src/ports/account.ts` (modified) — `subjectFor` returns an answer-or-cause;
  the contract note is rewritten to say which caller tolerates unknown and why
- `src/infrastructure/battlegrid/mcp-adapter.ts` (modified) — `tokenRequest`
  stops reading and requiring the subject claim
- `src/infrastructure/battlegrid/account-adapter.ts` (modified) — reports the
  cause instead of catching it into an unknown
- `src/application/use-cases/owner-only-user.ts` (modified) — collapses the
  result, carrying the tolerance note with it
- `src/application/use-cases/connect.commands.ts` (modified) —
  `CompleteConnectionCommand` takes the account port, asks, refuses, releases
- `app/api/auth/battlegrid/callback/route.ts` (modified) — renders the refusal
- `app/connect/page.tsx` (modified) — the new reason is named on the surface
- `tests/connection/connect.test.ts` (modified) — a grant with no subject
  connects; a failed identity read refuses, stores nothing, and revokes
- `tests/connection/personal-key.test.ts` (modified) — personal-mode tolerance
  still holds through the new result shape
- `tests/live/oauth-live.test.ts` (modified) — states the boundary it does not
  cross
- `scripts/ci.sh` (modified) — the gate list says no gate exercises a grant
- `src/config.ts` (modified) — the registration comment corrected against
  `docs/battlegrid-oauth-metadata.json`

## What Would Prove This Works

Nothing in the suite exercises a token exchange, and nothing can: an
authorization code requires a person at a consent screen. The unit tests prove
the branches; **one live delegated connection, walked by the operator, is what
proves the premise** — that `list_user_active_positions` answers for a delegated
access token, which is currently an inference from it answering for a personal
key. Until that walk happens this change is unproven in exactly the way the bug
it fixes was unproven.
