# Decision Log: connect-battlegrid-account

High-signal decisions only, across all phases. Cosmetic choices are not logged.

---

## Phase 1 — Planning

### 2026-07-27 · DL-1 · Scope boundary

**Decision**: This change delivers only the connection, classification and audit
layer. Agent authoring, strategy authoring and the assistant are separate
changes.

**Impacted files**: whole inventory.

**Reason**: Greenfield makes every requirement an ADDED. Thirteen MVP features in
one change folder would be unreviewable and unverifiable, and this is the change
everything else depends on — it needs to be right before anything is built on it.

**Approved by**: owner (full autonomy granted 2026-07-27).

**Next action**: executor implements the inventory.

---

### 2026-07-27 · DL-2 · Assumption · DCR proven before design was finalised

**Decision**: Task 0.1 was executed before planning completed, against the live
BattleGrid server.

**Impacted files**: `findings-dcr.md`, `design.md` D-A through D-D.

**Reason**: The token model, client type and registration strategy all depended
on facts no amount of reading could settle. Planning around an unproven
assumption would have produced a plan that had to be rewritten.

**Outcome**: DCR works. Two findings changed the design — see DL-3 and DL-4.

**Approved by**: owner.

---

### 2026-07-27 · DL-3 · Constraint · Every client is public; register as one

**Decision**: Register with `token_endpoint_auth_method: "none"`. Do not attempt
confidential-client authentication.

**Impacted files**: `src/infrastructure/battlegrid/oauth-client.ts`, deployment config.

**Reason**: The server echoes `client_secret_post` back but issues no
`client_secret` (findings-dcr F-1), contrary to RFC 7591 §3.2.1. Declaring an
auth method we cannot perform would be dishonest and would fail at the token
endpoint. Security rests on PKCE S256 plus exact redirect URI matching.

**Consequence carried forward**: registration is open and unauthenticated, so
anyone can register a client named "Grid-Commander". We cannot prevent that. We
pin one `client_id` per deployment (DL-4) and surface it to users so a
suspicious grant is at least visible after the fact.

**Approved by**: owner.

---

### 2026-07-27 · DL-4 · Constraint · Pin one client_id; register `mcp:read` only

**Decision**: One `client_id` per environment, registered out of band and pinned
in configuration, declaring `scope: "mcp:read"` and nothing more.

**Impacted files**: deployment config, `oauth-client.ts`.

**Reason**: Two parts. (a) There is no RFC 7592 management endpoint, so a
registration cannot be edited or revoked — it is write-once, and a runtime
registration would be unverifiable. (b) Registration-time scope is honoured as a
ceiling (findings-dcr F-2), which turns "never request wager authority" from a
line of code someone could add into a property of the deployment. Stepping up
becomes a deliberate re-registration.

**Approved by**: owner.

---

### 2026-07-27 · DL-5 · Design · Confirmation tokens, not booleans

**Decision**: Destructive operations require a server-issued `ConfirmationToken`
naming the operation and its target, not a `confirmed: true` flag.

**Impacted files**: `src/domain/capability/confirmation.ts`, `mcp-adapter.ts`,
`confirmation_tokens` table.

**Reason**: R7 requires confirmation that names the consequence. A boolean can be
set by any caller and is no evidence a human saw anything. A token issued
alongside the rendered consequence, and checked against the operation it was
issued for, cannot be replayed against a different action.

**Approved by**: owner.

---

### 2026-07-27 · DL-6 · Design · Audit committed before the call, outside its transaction

**Decision**: `begin()` inserts `outcome: attempted` and **commits** before the
BattleGrid call runs. `complete()` updates it afterwards.

**Impacted files**: `record-audit.command.ts`, `drizzle-audit-repository.ts`.

**Reason**: R8's crash scenario. Sharing a transaction with the call would roll
the audit row back on a crash, and the attempt would vanish — which is precisely
the case an audit log exists for. Committing first means an interrupted
operation is visible as `attempted`, the honest state.

**Accepted cost**: a row can read `attempted` indefinitely if a process dies.
That is the intended behaviour, not a defect.

**Approved by**: owner.

---

### 2026-07-27 · DL-7 · Planned exception · One hard-coded tool list is permitted

**Decision**: When `tools/list` fails, fall back to a small hard-coded allowlist
of unambiguous getters and operate read-only.

**Impacted files**: `capability-cache.ts`.

**Reason**: Architecture policy P2 forbids hard-coded tool lists. This one is
permitted because it can only ever **deny** — it is a floor, never a grant. It
cannot authorise anything the live list would not have, and R5's third scenario
requires the product to keep functioning in a degraded read-only mode rather
than failing entirely.

**Auditor note**: verify this list is only ever consulted to refuse, never to
permit a write. If it can grant, it is a violation.

**Approved by**: owner.

---

### 2026-07-27 · DL-8 · Known unknown · Token lifetimes remain unproven

**Decision**: Ship without knowing access token lifetime, refresh rotation, or
incremental step-up behaviour. Read `expires_in` from the response; if absent,
assume 60 seconds and refresh eagerly.

**Impacted files**: `oauth-client.ts`.

**Reason**: Completing an authorization requires a human consenting in a browser,
which cannot be done headlessly. Assuming a long lifetime and being wrong means
every call fails until the user reconnects; assuming the shortest safe window
costs a refresh and is never wrong in a damaging direction.

**Next action**: record the real values on the first live connection and revisit.

**Approved by**: owner.

---

### 2026-07-27 · DL-9 · Executor handoff

**Decision**: Execution may begin. Owner granted full autonomy on 2026-07-27
covering planning, implementation, verification and archive.

**Handoff notes**:
- Build the domain layer first; `classify()` is pure and exhaustively testable,
  and everything dangerous depends on it.
- The lint boundary rule (P6) should land with the scaffold, not at the end —
  it is cheap to satisfy from the start and expensive to retrofit.
- Do not add a retry anywhere near `RevisionConflictError`.
- Write the test per scenario as each requirement lands, not in a final sweep.

**Next action**: executor.
