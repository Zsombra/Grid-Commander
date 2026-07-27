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

---

## Phase 2 — Execution

### 2026-07-27 · DL-10 · Deviation · npm instead of pnpm

**Decision**: Use npm. **Reason**: pnpm 11 refuses to run any script while a
dependency's build script is unapproved; neither `onlyBuiltDependencies` nor
disabling the pre-run check cleared it. The package manager is a preference, a
working quality gate is not. **Impacted**: `package.json`, CI, checklist quality
gate line. **Approved by**: owner (full autonomy).

### 2026-07-27 · DL-11 · Deviation · Files consolidated during execution

**Decision**: Three connection use cases became `connect.commands.ts`; the OAuth
client merged into `mcp-adapter.ts`; the guard sequence was extracted to
`call-path.ts`. **Reason**: the three commands share the transaction shape, the
client and adapter are the same boundary, and extracting the guards made them
testable without an HTTP client. **Impacted**: master plan inventory, since
reconciled. **Approved by**: owner.

### 2026-07-27 · DL-12 · Deviation · MCP SDK dropped as a dependency

**Decision**: The adapter uses `fetch` against the documented Streamable HTTP
surface; `@modelcontextprotocol/sdk` was uninstalled. **Reason**: the calls are
few, the transport stays visible at the one boundary that matters, and an unused
dependency is supply-chain surface for nothing. The lint rule and boundary test
remain so reintroduction outside `src/infrastructure/battlegrid/` still fails.
**Approved by**: owner.

### 2026-07-27 · DL-13 · Finding · R10 scenario 2 was not implemented

**Decision**: Fixed during verification. A 401/403 from BattleGrid now raises
`ConnectionRevokedError` rather than a generic error. **Reason**: the spec
requires "fails cleanly, shown as disconnected, invited to reconnect"; the
original implementation produced "failed with 401", which a user cannot act on.
**Verification**: reverting the fix fails 3 tests. **Impacted**:
`mcp-adapter.ts`, `tests/connection/revoke.test.ts`.

### 2026-07-27 · DL-14 · Known debt · `scopesFor()` is a stub

**Decision**: Ship it. **Reason**: it returns `['mcp:read']` rather than reading
the grant's recorded scopes. Correct today because the registration cannot
obtain more, and the next change must replace it. **Filed as**: F-3 in the
architecture review. **Next action**: replace in `author-agents`.

---

## Phase 3 — Production Gate

### 2026-07-27 · DL-15 · AUDIT · Two findings that only a scan would have caught

**Decision**: Both fixed before the gate; neither waived.

**Findings**:

- **PG-001 (CRITICAL)** — `subject: json.sub ?? ''`. A grant with no subject
  defaulted to the empty string, so `findUserIdBySubject('')` matched the first
  such user and the second person to connect would land in a stranger's
  workspace holding a stranger's BattleGrid connection. Fixed by refusing the
  grant outright: an identity that cannot be established must not be defaulted
  into one.
- **PG-003 (MAJOR)** — `RevisionConflictError(resource, expectedRevision ?? -1, null)`.
  The only production call site passes no revision, so every conflict a user
  would actually see read *"expected revision -1"*. Fixed by making the field
  nullable and omitting the clause when unknown.

**Impacted files**: `mcp-adapter.ts`, `errors.ts`, `call-path.ts`,
`tests/connection/revoke.test.ts`, `tests/concurrency/conflict.test.ts`.

**What this says about the process**: both came from the same mandated scan —
`rg "\?\?"` over touched paths — and neither was visible to the test suite,
because in both cases the tests supplied the value that the production path
omits. A suite can be green and still never execute the branch users hit. The
scan is not ceremony; it found the two most serious defects in the change.

**Approved by**: owner (full autonomy).

---

### 2026-07-27 · DL-16 · AUDIT · Gate rationale and deferrals

**Decision**: **PASS**. Zero open violations.

**Reason**: 10/10 requirements delivered with all 22 scenarios covered by tests;
handoff integrity valid; every quality gate re-run in full after remediation
(typecheck, lint, 99 vitest tests, 124 harness tests, strict validation) rather
than only the ones that had failed; no new violations introduced by the fixes.
Each remediation was mutation-checked — reverting it fails a named test.

**DL-7 discharged**: the gate was asked to confirm the degraded-mode allowlist
can only deny. `capability-cache.ts:53` returns destructive/wager for anything
absent from the map and a read-only classification for anything present; there
is no branch where membership grants write authority. The exception holds.

**Deferred, with owners** — neither is fixed here and both are filed rather than
forgotten:

- PG-004 → backlog `scopes-from-connection`, owner `author-agents`.
- PG-005 → backlog `prove-token-lifetimes`, owner: first live connection.

**Task 0.2 stays unchecked.** It cannot be proven headlessly, and marking it done
would be a lie in the one artifact that later audits measure against.

**Next action**: archiver. A PASS that is not archived leaves `openspec/specs/`
empty while ten requirements are live in code.
