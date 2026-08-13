# Decision Log — The Connection Asks Who It Is

Entries are append-only. A decision reversed during execution gets a new entry
that says so; the original stays.

---

## D1 — Identity comes from an authenticated read, not from the grant

- **Timestamp**: 2026-08-13
- **Phase**: 1 (planning)
- **Type**: architecture
- **Decision**: A delegated connection's account identity is established by
  calling `AccountPort.subjectFor` with the newly issued access token, after the
  code exchange. `TokenGrant.subject` is removed outright rather than made
  optional.
- **Impacted files**: `src/ports/battlegrid.ts`,
  `src/infrastructure/battlegrid/mcp-adapter.ts`,
  `src/application/use-cases/connect.commands.ts`
- **Reason**: BattleGrid is plain OAuth 2.1 —
  `/.well-known/openid-configuration` is 404 and the authorization-server
  metadata advertises no `userinfo_endpoint`. Three live grants on 2026-08-13
  carried no `sub`. There is no case in which the field is present, so a
  tolerant branch would be unreachable code with a comment attached. Optionality
  would preserve the false claim that a grant is a plausible identity source, and
  the next reader would wire to it again.
- **Rejected**: deriving identity from the token's own bytes (opaque by
  contract, rotates on refresh — would key a workspace to a credential and strand
  the user after one refresh); keeping `sub` as a legacy case.
- **Approved by**: proposed by the planner — **pending the operator's plan review**
- **Next action**: Phase A1–A2

---

## D2 — The port reports its cause; the personal path collapses it

- **Timestamp**: 2026-08-13
- **Phase**: 1 (planning)
- **Type**: architecture / contract
- **Decision**: `AccountPort.subjectFor` returns `subject` | `unreadable` |
  `unnamed` instead of `BattlegridSubject | null`. `OwnerOnlyUser` collapses that
  to `null` at its own call site, preserving personal-mode behaviour exactly.
- **Impacted files**: `src/ports/account.ts`,
  `src/infrastructure/battlegrid/account-adapter.ts`,
  `src/application/use-cases/owner-only-user.ts`,
  `src/application/use-cases/connect.commands.ts`
- **Reason**: Two callers need opposite behaviour from one question. The port
  currently hard-codes one of them: swallowing every failure into `null` is
  correct for `OwnerOnlyUser` — where `userId` is the constant `owner`, so
  identity exists without the subject, and where refusing on unknown is what
  made `apply_strategy_plan` unreachable — and wrong for connecting, where the
  subject *is* the identity key and an unknown re-creates the collision the
  removed guard prevented. Moving the tolerance to the caller keeps the guarantee
  intact and makes it visible to the reader it constrains.
- **Rejected**: a second port (`AccountIdentityPort`) — the existing
  `AccountPort` / `AccountStatePort` split is right because those answer
  *different questions*; this is one question with two callers, and two adapters
  calling the same tool is how they come to disagree. Also rejected: leaving
  `subjectFor` as-is and refusing on `null` at the connect path — it works, and
  it turns the port's own documentation into a lie for the next reader. This
  codebase has been bitten six times by a check whose stated intent outlived what
  it reached.
- **Approved by**: **operator, 2026-08-13** — chosen explicitly over both
  alternatives when presented side by side
- **Next action**: Phase A2, B2, C1

---

## D3 — A refused connection releases the grant it was just given

- **Timestamp**: 2026-08-13
- **Phase**: 1 (planning)
- **Type**: security / product behaviour
- **Decision**: When the identity read cannot answer, store nothing, issue
  nothing, then call `revoke` with the just-issued access token. A failed release
  is a distinct outcome the user is told about.
- **Impacted files**: `src/application/use-cases/connect.commands.ts`,
  `src/domain/errors.ts`, `app/api/auth/battlegrid/callback/route.ts`,
  `app/connect/page.tsx`
- **Reason**: At that moment the grant is live — the user consented, the code
  exchanged, BattleGrid holds an active authorization — and we are about to tell
  them the connection did not happen. Discarding it locally is precisely what
  `DisconnectCommand` refuses to do, for the same stated reason: local deletion
  alone "would leave a live grant the user believes they revoked."
- **Rejected**: storing the connection pending identity (needs an identity to
  store it under — any placeholder is the collision key again); retrying the read
  inline (converts a stated outcome into a variable-length wait at the end of a
  consent flow, and papers over a failure the user should hear about, since a
  read that will not answer usually means the grant is not usable for anything
  else either).
- **Approved by**: proposed by the planner — **pending the operator's plan review**
- **Next action**: Phase C3, D1–D2

---

## D4 — The refusal is rendered, not thrown

- **Timestamp**: 2026-08-13
- **Phase**: 1 (planning)
- **Type**: product behaviour
- **Decision**: The refusal becomes a named domain error the callback catches and
  renders, joining `declined`, `incomplete` and `untrusted`.
- **Impacted files**: `src/domain/errors.ts`,
  `app/api/auth/battlegrid/callback/route.ts`
- **Reason**: The current failure is a bare `Error` that escapes the callback's
  `catch` and lands the user on a framework error page **after they consented**.
  There is still no error boundary in this application, so a throw here is a
  crash. Same shape as the refused rebind fixed on 2026-08-12.
- **Approved by**: proposed by the planner — **pending the operator's plan review**
- **Next action**: Phase A3, D1

---

## D5 — Refresh does not re-establish identity

- **Timestamp**: 2026-08-13
- **Phase**: 1 (planning)
- **Type**: scope
- **Decision**: A token refresh reuses the connection's stored subject and does
  not re-ask. Explicitly out of scope, and filed rather than assumed.
- **Impacted files**: none (a deliberate absence)
- **Reason**: A refresh token is issued against one grant, and BattleGrid rotates
  both tokens on refresh with no incremental step-up (walked live 2026-08-13,
  #93). Adding a read to every refresh is a different trade against a failure
  that would be a serious platform defect rather than an ordinary condition.
  Recorded so the next reader can tell "considered and judged unnecessary" from
  "never thought about" — the distinction this change exists to restore.
- **Approved by**: proposed by the planner — **pending the operator's plan review**
- **Next action**: backlog `a-refresh-is-trusted-to-be-the-same-account`
  (GitHub #206); settle it inside the live walk, which is already required

---

## D6 — The live walk is a gate, not a follow-up

- **Timestamp**: 2026-08-13
- **Phase**: 1 (planning)
- **Type**: verification
- **Decision**: The change is BLOCKED at the production gate until one delegated
  connection has been walked end to end by the operator at a consent screen.
- **Impacted files**: `tasks.md` §5.9, `plan/master-plan.md` Phase 3
- **Reason**: `list_user_active_positions` is proven to answer for a personal
  `bg_live_` key. That it answers for a *delegated* access token is an
  inference — and an inference of exactly the kind that produced the bug being
  fixed. Nine of this project's findings needed a real call to the real platform;
  none was findable by reading code or schemas. Shipping this on reasoning would
  repeat the pattern the codebase has documented six times.
- **Approved by**: proposed by the planner — **pending the operator's plan review**
- **Next action**: Phase F9

---

## DL-1 — The live OAuth probe is `oauth-metadata.test.ts`, not `oauth-live.test.ts`

- **Timestamp**: 2026-08-13
- **Phase**: EXECUTION
- **Type**: plan correction
- **Decision**: Phase E2 was written against `tests/live/oauth-live.test.ts`. No
  such file exists — `oauth-live` is the *gate name* in `scripts/ci.sh`, and the
  file it runs is `tests/live/oauth-metadata.test.ts`. The boundary statement
  went into the real file.
- **Impacted files**: `tests/live/oauth-metadata.test.ts` (instead of the planned
  path), master plan inventory
- **Reason**: A planning-time inference from a gate name, corrected on contact.
  Worth logging rather than fixing silently: a gate name and a file name that
  differ is exactly the confusion this whole change is about, one level up.
- **Approved by**: executor, within plan scope
- **Next action**: inventory corrected in the master plan

---

## DL-2 — `one-destination.test.ts` was changed, and it was not in the plan

- **Timestamp**: 2026-08-13
- **Phase**: EXECUTION
- **Type**: unplanned change to an existing guard
- **Decision**: Deduplicate the file list per host in the guard's assertion
  message, so a file that spells a host more than once is named once.
- **Impacted files**: `tests/architecture/one-destination.test.ts`
- **Reason**: The corrected registration comment in `src/config.ts` quotes
  `https://mcp.battlegrid.trade/register`, which made that file appear twice in
  the provenance string and failed the guard. **The set of hosts — what the rule
  exists for — was unchanged.** The guard was reacting to how many times a host
  is *spelled* in one file, which is the defect shape this directory carries
  warnings about in three separate comments.
- **Rejected**: rewording the `config.ts` comment to avoid the string. It would
  have passed, left the trap armed for the next person quoting a BattleGrid URL,
  and weakened a correction to satisfy a formatting artefact.
- **Verification**: mutation-checked (M3) — a second host was planted in
  `src/config.ts`, the deduplicated guard failed and named it, and the plant was
  removed. The dedup touches only the message for a host already present; a new
  host still changes `distinct` and still fails.
- **Approved by**: executor — **flagged for the auditor** as a change outside the
  planned inventory
- **Next action**: auditor review

---

## DL-3 — `npm run test:db` did not run

- **Timestamp**: 2026-08-13
- **Phase**: EXECUTION
- **Type**: quality gate not satisfied
- **Decision**: Five of six quality gates pass. `test:db` was not run, and this
  is recorded rather than worked around.
- **Impacted files**: none
- **Reason**: No database credential exists in this environment. There is no
  `.env` in the worktree or in the main checkout — only `.env.example` — and the
  PostgreSQL listening on `:5432` refuses a passwordless connection
  (`SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`).
  Guessing or planting a credential is not an option this change gets to take.
- **Scope of the gap, stated rather than waved at**: no test under `tests/db/`
  imports or constructs anything this change touched. `grep` finds one mention,
  a prose comment at `tests/db/connections.test.ts:140`. `npm run typecheck`
  covers `tests/` and passes, so the db suite compiles against the new
  contracts. `npm run db:generate` reports no schema change and
  `git diff --quiet drizzle/` is clean, so there is no migration for the db
  suite to be run against.
- **What would close it**: `DATABASE_URL=postgres://…@localhost:5432/grid_commander_test npm run db:migrate && npm run test:db`,
  against a **disposable** database. `assertDisposable` (#195) refuses a
  non-disposable one rather than truncating it.
- **Approved by**: executor — **the auditor decides whether this blocks**
- **Next action**: operator runs the db gate, or the auditor accepts the scoped
  gap

---

## DL-4 — Every new guard was fed the failure it was written for

- **Timestamp**: 2026-08-13
- **Phase**: EXECUTION
- **Type**: verification
- **Decision**: Three mutations run, each confirming the intended check fails and
  the others do not.
- **Impacted files**: `tests/connection/revoke.test.ts`,
  `tests/connection/connect.test.ts`, `tests/architecture/one-destination.test.ts`
- **Detail**:
  - **M1** — `sub` requirement re-injected into `tokenRequest`. Exactly one test
    failed: "accepts the token response BattleGrid actually sends".
  - **M2** — the `revoke` call removed from `refuseUnidentified` and `released`
    hard-coded to `true`. All three `unidentified_refused_and_released` tests
    failed.
  - **M3** — a second host planted in `src/config.ts`. The deduplicated
    one-destination guard failed and named it.
- **Reason**: This file's predecessor was green for the entire life of the
  defect, so "the tests pass" was never the evidence here. A guard nobody has
  seen fail is a guard nobody knows works — six findings in this repo, and the
  sixth was a guard written against that very lesson whose regex could not match.
  M1 and M2 are recorded in the test files themselves, per the 2026-08-12
  convention.
- **Approved by**: executor
- **Next action**: none

---

## DL-5 — Two personal-mode tests added that the plan did not ask for

- **Timestamp**: 2026-08-13
- **Phase**: EXECUTION
- **Type**: scope addition (verification only)
- **Decision**: Added "treats an answer that names nobody exactly like a read
  that failed" and "remembers an unknown too, rather than re-asking on every
  request" to `tests/connection/personal-key.test.ts`.
- **Impacted files**: `tests/connection/personal-key.test.ts`
- **Reason**: The plan required proving personal mode did not move. It could not
  be proven: **the `null`-caching behaviour was uncovered before this change**.
  "Asks once, then remembers" only ever exercised the answer path, so a
  regression that re-asked on every request whenever the account read was down —
  a failing call in front of every page, which is the exact cost the cache
  exists to avoid — would have passed. The second test is the new distinction
  the port introduced: `unnamed` and `unreadable` must collapse identically
  here, and a future reader wiring them apart now has to delete a test that says
  why not.
- **Approved by**: executor, within plan scope (D2's "preserving personal-mode
  behaviour exactly" is not assertable without them)
- **Next action**: none

---

## AUDIT-1 — Production gate: BLOCKED

- **Timestamp**: 2026-08-13
- **Phase**: AUDIT
- **Type**: gate decision
- **Decision**: **BLOCKED**, four open violations — PG-001 (MAJOR, CRLF endings),
  PG-002 (MAJOR, the live walk), PG-003 (MAJOR, `test:db` unrun), PG-004 (MINOR,
  requirement R3 has no automated verification).
- **Impacted files**: `plan/production-gate.md`
- **Reason**: Handoff integrity is VALID and five of six quality gates pass. The
  blocking violation on merit is PG-002: the change's central premise — that
  `list_user_active_positions` answers for a *delegated* access token — is proven
  only for a personal key, and every unit test supplies that answer through a
  fake. D6 designated this a gate before execution began.
- **Endorsed on the record**: DL-2's direction of fix (repair the guard, not the
  comment), and DL-4's mutation evidence, which is what makes the new checks
  worth anything given the suite they replace was green throughout the defect.
- **Approved by**: auditor
- **Next action**: executor remediates PG-001 and PG-004; operator settles
  PG-002 and PG-003; re-audit Mode B

---

## DL-6 — PG-001 remediated: four files normalised to LF

- **Timestamp**: 2026-08-13
- **Phase**: EXECUTION (remediation)
- **Type**: fix
- **Decision**: Rewrote `src/config.ts`, `plan/decision-log.md`,
  `plan/master-plan.md` and `tasks.md` with LF endings. No content change.
- **Impacted files**: the four above
- **Reason**: PG-001. They were written by `python3 io.open(p,'w')`, which
  applies Windows newline translation; everything written by the editing tool was
  already LF. `.gitattributes:13` sets `* text=auto eol=lf`, and its header
  records why — CRLF working trees previously made two guards match `\n` against
  `\r\n` and read nothing, and made esbuild refuse a CRLF `.mjs` outright, so a
  guard suite collected zero tests (#171).
- **Verification**: the scan that found it reports nothing;
  `npm test` 2253 passed, `npm run build` compiled.
- **Approved by**: executor
- **Next action**: re-audit

---

## DL-7 — PG-004 closed with a check rather than a waiver

- **Timestamp**: 2026-08-13
- **Phase**: EXECUTION (remediation)
- **Type**: scope addition (verification only)
- **Decision**: Added `the coverage boundary around consent is stated where it is
  read` to `tests/architecture/oauth-conformance.test.ts` — five assertions over
  `scripts/ci.sh` and `tests/live/oauth-metadata.test.ts`.
- **Impacted files**: `tests/architecture/oauth-conformance.test.ts` (**new touched
  file, added to the inventory**)
- **Reason**: The requirement *The Coverage Around Consent Is Stated Where It Is
  Read* had a scenario and no verification, so the statement could be deleted by a
  later edit with nothing noticing — the same failure mode the requirement
  describes, one level up. Waiving it would have been defensible and worse: the
  whole change exists because a coverage gap was invisible.
- **How it avoids being brittle**: matched on two independent ideas — that no
  check exchanges a token, and that a human at a consent screen is the reason —
  rather than on a sentence. A rewrite keeping the point keeps passing. It also
  asserts each file is non-empty, because a guard that reads nothing passes
  vacuously.
- **Verification**: **mutation-checked (M4)** — the boundary block was deleted
  from `scripts/ci.sh`; exactly the two `ci.sh` assertions failed and the two
  `oauth-metadata.test.ts` ones correctly kept passing. File restored.
- **Approved by**: executor
- **Next action**: re-audit

---

## DL-8 — A harness for the walk, so the manual step is one click

- **Timestamp**: 2026-08-13
- **Phase**: EXECUTION (remediation support for PG-002)
- **Type**: verification tooling
- **Decision**: Added `tools/oauth_walk.py` — registers a public client by DCR,
  builds a PKCE S256 authorize URL, catches the redirect on a local listener,
  exchanges the code, performs the identity read, refreshes and re-reads, then
  revokes both tokens and confirms they are dead.
- **Impacted files**: `tools/oauth_walk.py` (new; added to the inventory)
- **Reason**: PG-002 cannot be automated away — an authorization code requires a
  person at a consent screen. Everything *around* that step can be, and a walk
  that takes one click is a walk that actually gets repeated: #206 needs one, and
  so will the next major version. It imports `rpc` and `unwrap` from
  `probe_mcp_surface.py` rather than re-implementing the protocol, the same
  choice `capture_mcp_dump.py` made, so the walk and the surface probe cannot
  drift about what an MCP envelope means.
- **Deliberately not run by the agent**: the operator runs it. The tokens it
  handles carry authority over a real BattleGrid account, and this product exists
  to hold credentials that configure other people's agents — so they stay in the
  operator's own terminal rather than passing through an agent's process. D6 says
  "walked by the operator" and that is not incidental wording.
- **Safety properties, verified offline**: requests `mcp:read` only, never
  `mcp:wager`; PKCE challenge confirmed to be genuine unpadded base64url
  `S256(verifier)`; prints no token; writes nothing to the repository; revokes in
  a `finally` and **verifies the revocation** rather than assuming it, as every
  probe in `tests/live/` does.
- **Approved by**: executor
- **Next action**: operator runs it; findings go to `openspec/JOURNAL.md` and
  task 5.9; re-audit Mode B

---

## DL-9 — PG-003 closed: the db gate ran, against the disposable database

- **Timestamp**: 2026-08-13
- **Phase**: EXECUTION (remediation)
- **Type**: quality gate satisfied
- **Decision**: `npm run db:migrate` then `npm run test:db` against
  `grid_commander_test`. **85 tests in 7 files, all passing.** All six quality
  gates are now green.
- **Impacted files**: none — no schema change, so the migration was a no-op
  beyond confirming the suite runs against a migrated database
- **Reason**: the operator supplied the credential. **The live database
  `grid_commander` exists on the same server and was deliberately not used**, and
  not merely because `assertDisposable` (#195) would have refused it — a guard
  refusing is a worse outcome than never pointing at it.
- **Closest coverage to this change**: `connections.test.ts` (16 tests) and
  `oauth-transactions.test.ts` (8). Both green. This is the suite whose absence
  DL-3 had to argue around; the argument is now unnecessary.
- **Approved by**: executor
- **Next action**: PG-002 remains the only open violation

---

## DL-10 — The account read verified live, on the personal path only

- **Timestamp**: 2026-08-13
- **Phase**: EXECUTION (verification)
- **Type**: live evidence
- **Decision**: Added `tests/live/identity-probe.test.ts` (**new file, added to
  the inventory**) and ran it against BattleGrid with the operator's key. Three
  tests, all passing.
- **Impacted files**: `tests/live/identity-probe.test.ts`
- **What it proves**: the rewritten three-outcome `subjectFor` meets the real
  platform and works — `list_user_active_positions` still exists at v18.2.0,
  still carries `userId` at the top level, the mapper reads it, the answer is
  stable across calls, and **a refused credential now reports rather than
  throws**, which the old `null` contract could not express.
- **What it does not prove, stated in the file itself**: this ran on a personal
  `bg_live_` key. PG-002 asks about a **delegated** access token, which needs a
  consent screen. A probe named "identity" sitting green would otherwise read as
  covering both, and reading a green list as coverage it does not have is exactly
  how #203 survived audit, archive, and twelve gates.
- **Also confirmed**: the live server is **v18.2.0**, matching
  `docs/battlegrid-mcp-surface.json` — the freshness gate is green and the
  recorded surface is trustworthy.
- **Considered and rejected as evidence**: the surface record classifies
  `list_user_active_positions` as `read` with no scope requirement and
  `readOnlyHint: true`, which suggests a delegated `mcp:read` grant covers it.
  That is **not** treated as closing PG-002. `readOnlyHint: true` was once served
  for every tool because every tool was a read, and all nine of this project's
  live-found defects were invisible to schemas — including #203, where the schema
  said nothing wrong and the platform simply never sent the field.
- **Approved by**: executor
- **Next action**: the walk

---

## DL-11 — The walk found a second defect, and it was ours

- **Timestamp**: 2026-08-13
- **Phase**: EXECUTION (defect found by verification)
- **Type**: defect + fix
- **What happened**: the first two real delegated authorizations both refused
  with `?error=unidentified`. The refusal path behaved perfectly — nothing
  stored, grant released, rendered not thrown — but the identity read had **never
  reached BattleGrid**. Zero audit rows, and `callTool` audits *before* it
  attempts.
- **Root cause, established by controlled experiment rather than by reading**:
  `callTool` measures a call against `heldScopes.forUser(userId)`. On a delegated
  deployment that is `ConnectionScopes`, which reads the scopes off the caller's
  **stored connection**. The identity read runs at the one moment when no
  connection can exist — that is its purpose — so the lookup answered "no
  authority at all" and the guard refused the call for lacking `mcp:read`, while
  the grant in hand was holding `mcp:read`. Same key, same tool, same adapter,
  one variable changed:

      ConnectionScopes (no connection row) -> unreadable: "requires mcp:read
                                              authority, which Grid-Commander
                                              does not request."
      DeclaredScopes(['mcp:read'])        -> subject: 0eccbf37-…

- **Why nothing caught it**: every unit test fakes `AccountPort`, so the guard is
  not in the picture; `tests/live/identity-probe.test.ts` and every other live
  probe wire `DeclaredScopes`, the personal path, whose scopes come from
  configuration. The probe's own docstring said it covered only the personal
  path. It was right, and it was still not enough.
- **The fix**: `ToolCallRequest.grantedScopes` — the authority to measure a call
  against, for the one call that runs before there is anywhere to look it up.
  `subjectFor(accessToken, grantedScopes?)`; the connect path passes
  `grant.scopes`, `OwnerOnlyUser` omits it and keeps reading from configuration.
- **Not a bypass, and proven so live**: with the grant's scopes the account is
  named; with an **empty** grant the call is still refused. A grant narrower than
  what was requested therefore still refuses, which is what *"The grant is
  narrower than what was asked for"* requires.
- **Contained deliberately**: `tests/architecture/granted-scopes.test.ts` holds
  that exactly one call site may declare its own authority. A field that lets a
  caller assert what it is allowed to do is the shape of thing that spreads, and
  every later use would be a caller overruling the guard.
- **Mutation-checked (M5)**: removing `grant.scopes` from the call fails both new
  checks — the unit test and the architecture guard — and nothing else.
- **The lesson, which is this repo's own**: `ConnectionScopes` was correct, the
  scope guard was correct, and the call was correct. The defect lived entirely in
  the composition — a pre-identity call routed through a post-identity guard.
- **Approved by**: operator (authorised the fix, then walked it)
- **Next action**: DL-12

---

## DL-12 — PG-002 closed: the delegated path completed, live

- **Timestamp**: 2026-08-13
- **Phase**: EXECUTION (verification)
- **Type**: live evidence — the gate D6 held open
- **What was walked**: consent at BattleGrid → code exchanged → identity read →
  connection stored → session issued → `/agents` served.

      GET /api/auth/battlegrid/callback?code=…&state=4JJgTwDO…  307 in 7610ms
      GET /agents                                               200 in 14641ms

- **Verified against the database, not against the redirect**:

      users.id                        3smvWg_Hs_-wVvEtLcKPEA   (local, random)
      users.battlegrid_subject        0eccbf37-d90b-4933-88f2-d120627b23f7
      connections.status              active
      connections.scopes              ["mcp:read"]
      connections.access_token_…      encrypted, 130 chars (never raw)
      oauth_transactions              consumed

- **The answer PG-002 wanted**: `list_user_active_positions` **does** answer for
  a delegated access token, and the subject it returns is the same account id the
  personal key resolves to. D1's mechanism is sound. It took two attempts to find
  that out, because the first attempt was blocked by our own guard.
- **What this closes**: PG-002, task 5.9, and the premise behind the whole
  change. `/agents` rendering under a delegated connection is the product doing
  real BattleGrid reads with an identity established by asking.
- **Approved by**: operator
- **Next action**: re-audit Mode B

---

## AUDIT-2 — Production gate: PASS

- **Timestamp**: 2026-08-13
- **Phase**: AUDIT (Mode B, after the walk)
- **Type**: gate decision
- **Decision**: **PASS.** Zero open violations. PG-001, PG-003, PG-004 fixed
  earlier; PG-002 closed by the walk; PG-005 found by the walk and fixed.
- **Gates**: all six green — `typecheck`, `lint`, `test` (2257), `build`,
  drizzle schema check, `test:db` (85).
- **Scans**: conflict markers 0, CRLF 0, debt markers 0, no diagnostic
  leftovers, no new `??`.
- **Why the gate was worth having**: PG-005 made the delegated path impossible
  and was invisible to 2257 offline tests and two live probes. D6 was written
  into the plan before anyone knew what the walk would catch — and what it caught
  was not the thing it was written to look for. That is the argument for the gate,
  not the argument for the change.
- **Approved by**: auditor
- **Next action**: `/archive`
