# Design: Connect a BattleGrid account

How the 10 requirements in `specs/battlegrid-connection/spec.md` are made true.
Grounded in `findings-dcr.md`, which proved the registration flow against the
live server.

---

## The shape of the problem

Grid-Commander holds delegated authority over other people's trading agents. The
platform's permission model does not line up with intuition — `mcp:read` can
rebind an agent's entire configuration — and the platform's tool list changes
under us. Every decision below follows from those two facts.

---

## Decisions

### D-A: One pinned `client_id` per deployment, registered out of band

**Decision**: register once, by hand, per environment. Pin the resulting
`client_id` in configuration. Never register at runtime, never per user.

**Because**: registration is open and unauthenticated (F-1). A `client_id`
obtained at runtime is unverifiable — it proves nothing about who registered it.
Pinning one means a compromised or spoofed registration cannot silently become
the one we use. There is also no RFC 7592 management endpoint, so a registration
cannot be edited or revoked; treating it as write-once configuration matches
what the server actually offers.

**Rejected**: registering on first boot. Convenient, and it would mean the
client identity differs per deployment with no record of which is legitimate.

### D-B: Public client, declared honestly

**Decision**: register with `token_endpoint_auth_method: "none"`. Do not send a
client secret at the token endpoint, because none exists.

**Because**: F-1 established that the server issues no `client_secret` even when
`client_secret_post` is requested. Registering as confidential would declare an
auth method we cannot perform. Security rests on PKCE S256 and exact redirect
URI matching — which is the correct posture for a public client, and being
honest about it keeps the code from pretending otherwise.

### D-C: Register with `mcp:read` only, so wager scope is unrequestable

**Decision**: the production registration declares `scope: "mcp:read"`.

**Because**: F-2 showed registration scope is honoured as a ceiling. D-3 in the
`_PM/` spec says wager authority is never requested in MVP. Enforcing that at
registration makes it a property of the deployment rather than a line of code
someone could later add. Stepping up becomes a deliberate re-registration, which
is exactly the friction it deserves.

### D-D: Token lifetimes are read, never assumed

**Decision**: take `expires_in` from the token response. If absent, treat the
token as expiring in 60 seconds and refresh eagerly.

**Because**: lifetimes remain unproven — completing an authorization needs a
real browser consent. Assuming an hour and being wrong means every call fails
until someone reconnects. Assuming the shortest safe window costs a refresh and
is never wrong in a damaging direction.

### D-E: Capability classification is a per-session cache with a fail-closed miss

**Decision**: on session start, call `tools/list` and build a classification map
from each tool's `annotations`. Cache for the session. A tool absent from the
map classifies as `{mutating: true, destructive: true}`.

**Because**: R5 and R6. The server says its list is not authoritative after a
deployment. A miss can mean "new tool we have never seen" — which might be a
write — so the only safe default is the most restrictive one. Failing open here
would be a silent privilege escalation.

### D-F: Discovery failure degrades to a static read-only allowlist

**Decision**: if `tools/list` fails, permit only tools on a small hard-coded
allowlist of unambiguous getters, and surface a banner saying configuration
changes are unavailable.

**Because**: R5's third scenario requires the product to keep working in a
degraded, read-only mode. This is the one place a hard-coded list is permitted,
and it is permitted precisely because it can only ever *deny* — it is a floor,
never a grant. P2 in the architecture checklist forbids hard-coded lists that
authorise; this one refuses.

### D-G: Audit is two-phase, and the write is not in the same transaction as the call

**Decision**: `begin()` inserts a row with outcome `attempted` and commits.
The tool call runs. `complete()` updates the row with `succeeded` or `failed`.

**Because**: R8's third scenario — a crash between attempt and outcome must
leave evidence. If the audit write shared a transaction with the call, a crash
would roll it back and the attempt would vanish. Committing first means a
crashed operation is visible as `attempted`, which is the honest state: we know
we tried and we do not know what happened.

**Cost**: a row can say `attempted` forever if the process dies. That is the
point.

### D-H: The port is the only way in, enforced structurally

**Decision**: `BattleGridPort` is the sole interface. The MCP client is
constructed only in the composition root. An ESLint `no-restricted-imports` rule
forbids importing the MCP SDK anywhere except `src/infrastructure/battlegrid/`.

**Because**: P6. Every other guarantee — classification, audit, scope refusal —
lives in the adapter. One bypass makes all of them advisory. A lint rule turns a
convention into something CI can fail on.

### D-I: Confirmation tokens, not confirmation booleans

**Decision**: a destructive operation requires a `ConfirmationToken` — a
server-issued value naming the specific operation and its target — rather than a
`confirmed: true` flag.

**Because**: R7 requires confirmation that names the consequence. A boolean can
be set by any caller and carries no evidence that a human saw anything. A token
issued alongside the rendered consequence, and checked against the operation it
was issued for, cannot be reused for a different action.

---

## Architecture

```
app/(auth)/connect            server action → StartConnectionCommand
app/api/auth/battlegrid/callback   route handler → CompleteConnectionCommand
app/(app)/audit               server component → ListAuditQuery

src/application/use-cases/
  start-connection.command.ts        R1
  complete-connection.command.ts     R1, R2
  disconnect.command.ts              R10
  list-audit.query.ts                R8
  describe-grant.query.ts            R4

src/domain/
  connection/                        Connection, Scope, ConnectionStatus
  capability/                        ToolClass, classify(), the fail-closed rule
  audit/                             AuditEntry, AuditOutcome, repositories
  errors.ts                          RevisionConflictError, ScopeUnavailableError,
                                     ConfirmationRequiredError, DiscoveryUnavailableError

src/ports/
  battlegrid.ts                      the only way to BattleGrid
  clock.ts                           injected, so expiry is testable

src/infrastructure/
  battlegrid/mcp-adapter.ts          implements BattleGridPort — the ONLY MCP importer
  battlegrid/oauth-client.ts         PKCE, token exchange, refresh, revoke
  battlegrid/capability-cache.ts     per-session classification
  crypto/envelope.ts                 token encryption at rest
  db/                                Drizzle schema, repositories, mappers
```

**Dependency rule**: `domain` imports nothing. `application` imports `domain`
and `ports`. `infrastructure` implements `ports`. `app/` calls `application`
through the composition root.

---

## The call path for a mutating operation

Every write goes through the same sequence in the adapter. This is where the
requirements actually bite:

```
1. classify(tool)              → D-E; unknown ⇒ destructive          (R5, R6)
2. if needs scope we lack      → refuse before attempting            (R3)
3. if destructive              → require a valid ConfirmationToken   (R7, D-I)
4. audit.begin(...)            → committed before the call           (R8, D-G)
5. call BattleGrid
6. audit.complete(outcome)     → succeeded | failed                  (R8)
7. on revision conflict        → throw RevisionConflictError, no retry (R9)
```

Steps 1–4 are not skippable by a caller: they live inside the adapter, and the
adapter is the only importer of the MCP SDK (D-H).

---

## Data model

| Table | Owns | Notes |
|---|---|---|
| `users` | identity | `battlegridSubject` is the natural key — the connection *is* the identity (R2) |
| `connections` | tokens, scopes, status | tokens encrypted; one per user for MVP |
| `oauth_transactions` | pending authorizations | `state`, PKCE verifier, `userId`, expiry; single-use (R1) |
| `audit_entries` | every mutating call | written before the attempt (R8) |
| `confirmation_tokens` | issued confirmations | bound to operation + target, single-use (R7) |

`audit_entries.outcome` is `attempted | succeeded | failed`. There is no
`unknown` — `attempted` *is* the unknown state, and reading it that way is what
R8's crash scenario requires.

---

## What this design deliberately does not do

- **No wager path.** Not disabled — absent. There is no code that could call a
  wager-scoped tool, and the registration could not request the scope anyway.
- **No automatic retry** on revision conflict (R9, P4).
- **No client-side scorecard, diff, or viability computation** — out of scope
  for this change, but the port's return types are shaped so a later change
  cannot casually add one.
- **No multi-account.** One BattleGrid connection per user for MVP.
