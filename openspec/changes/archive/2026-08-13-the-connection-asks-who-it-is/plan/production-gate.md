# Production Gate — The Connection Asks Who It Is

**Audited**: 2026-08-13
**Change**: `the-connection-asks-who-it-is` (track `full`)
**Evidence window**: `fbe0aa2..<working tree>` — execution is uncommitted; resolved
via `git diff --name-status HEAD`, which is non-empty and matches the plan's
inventory. Deterministic.

## Handoff Integrity

| # | Check | Result |
|---|---|---|
| 1 | Master plan final line is `EXECUTION READY FOR PRODUCTION GATE` | VALID |
| 2 | Execution checklist fully checked, or unresolved rows explicitly tracked | VALID — 5.8 `[~]` and 5.9 `[ ]`, both tracked (DL-3, D6) |
| 3 | Required review artifacts exist on disk | VALID — architecture, data, uiux, decision log |
| 4 | Decision log has planner + executor entries | VALID — D1–D6 (planning), DL-1–DL-5 (execution) |
| 5 | Review artifacts carry path-level evidence, not claims | VALID — `file:line` throughout; spot-checked `account.ts:26`, `connect.commands.ts:135`, `route.ts:44` |
| 6 | Inventory aligned with `git diff --name-status <window>` | VALID — 20 modified files, all inventoried; three rows added during execution to close drift (`composition.ts`, `tests/rendering/connect.test.ts`, `tests/architecture/one-destination.test.ts`) |

**Handoff integrity: VALID.**

## Quality Gates

| Command | Result | Evidence |
|---|---|---|
| `npm run typecheck` | **PASS** | exit 0, no output |
| `npm run lint` | **PASS** | exit 0, no output |
| `npm test` | **PASS** | 2248 tests, 171 files, 0 failed |
| `npm run build` | **PASS** | "✓ Compiled successfully in 5.8s" |
| `npm run db:generate && git diff --quiet drizzle/` | **PASS** | "No schema changes, nothing to migrate"; drizzle/ clean |
| `npm run test:db` | **PASS** (re-audit) | 85 tests, 7 files, against `grid_commander_test` — see PG-003 |

## Scans

| Scan | Scope | Result |
|---|---|---|
| Conflict markers | repo-wide | 0 occurrences, 0 files |
| `TODO\|FIXME\|HACK\|XXX` | `src/**/*.ts` | 0 matches |
| Fallback masking (`??`) | touched source | 4 matches, **all pre-existing and outside this change's lines** (`connect.commands.ts:151` proposal-not-decision; `account-adapter.ts:114-115` in the *other* adapter class; `composition.ts:272`). No `??` introduced |
| Stale readers of `TokenGrant.subject` | repo-wide | 0. The two `owner-only-user.ts` hits are the class's own cache field; `condition-write-probe.test.ts:224` is an unrelated local |
| Stale exports | `AccountIdentityResult`, `AccountUnidentifiedError` | Both live — 8 and 11 call sites respectively |
| Dual-path / legacy retention | touched source | None. `TokenGrant.subject` was **removed**, not deprecated-in-place; no compatibility branch retained (D1) |
| Line endings vs `.gitattributes` | changed files | **4 files CRLF** — see PG-001 |

## Violations

| ID | Severity | Category | Status |
|---|---|---|---|
| PG-001 | MAJOR | TECH_DEBT | **FIXED** (re-audit 2026-08-13) |
| PG-002 | MAJOR | HANDOFF | **FIXED** (re-audit 2026-08-13) |
| PG-003 | MAJOR | HANDOFF | **FIXED** (re-audit 2026-08-13) |
| PG-004 | MINOR | CONTRACT | **FIXED** (re-audit 2026-08-13) |
| PG-005 | CRITICAL | ARCHITECTURE | **FIXED** (found and fixed 2026-08-13) |

---

### PG-005 — A pre-identity call was routed through a post-identity guard

- **Severity**: CRITICAL — the delegated path could not complete a connection
- **Category**: ARCHITECTURE
- **Found by**: the PG-002 walk, on the first real delegated authorization. Not
  findable offline.
- **Evidence**: two live authorizations both refused with `?error=unidentified`,
  with **zero audit rows** — and `callTool` audits *before* it attempts, so the
  read never reached BattleGrid. Controlled experiment, same key and tool, one
  variable:

      ConnectionScopes (no connection row) -> unreadable: "requires mcp:read
                                              authority, which Grid-Commander
                                              does not request."
      DeclaredScopes(['mcp:read'])        -> subject: 0eccbf37-…

- **Cause**: `callTool` measures authority via `heldScopes.forUser(userId)`,
  which on a delegated deployment reads the caller's **stored connection**. The
  identity read runs before that connection exists — that is its purpose — so the
  lookup answered "no authority at all" and the guard refused a call whose grant
  was holding exactly the scope it wanted. `ConnectionScopes` was correct, the
  guard was correct, the call was correct; the defect was in the composition.
- **Impact if unfixed**: the change would have shipped replacing a path that
  failed at the adapter with one that failed one step later, and every gate would
  have stayed green.
- **Fix**: `ToolCallRequest.grantedScopes` — the authority to measure against,
  for the one call with nowhere to look it up. Connect passes `grant.scopes`;
  personal mode omits it and is unchanged.
- **Status**: **FIXED**
- **Owner**: executor
- **Verification note / evidence**: live — with the grant's scopes the account is
  named; with an **empty** grant the call is still refused, so the guard still
  guards and a narrower-than-requested grant still fails.
  Mutation-checked (M5): removing `grant.scopes` fails both new checks and
  nothing else. Contained by
  `tests/architecture/granted-scopes.test.ts` (exactly one supplier). Then walked
  successfully end to end — see PG-002.

**0 open, 5 fixed.** PG-005 was found *by* closing PG-002 — the walk did the job
the gate was held open for.

---

### PG-001 — CRLF line endings introduced into four files

- **Severity**: MAJOR
- **Category**: TECH_DEBT
- **Evidence**: `for f in $(git diff --name-only HEAD); do grep -qU $'\r' "$f" && echo "$f"; done` reports
  `src/config.ts`, `openspec/changes/the-connection-asks-who-it-is/plan/decision-log.md`,
  `.../plan/master-plan.md`, `.../tasks.md`. Every other file in the change is LF,
  including every file edited with the editor rather than rewritten by a script.
  `.gitattributes:13` sets `* text=auto eol=lf`.
- **Cause**: those four were written by `python3 io.open(p,'w')`, which applies
  Windows newline translation. Files written by the editing tool were unaffected.
- **Impact**: `.gitattributes:1-9` exists because of exactly this. CRLF working
  trees on Windows previously broke three guards — two matched `\n` against
  `\r\n` and silently read nothing, and esbuild refused to parse a CRLF `.mjs`
  at all, so `tests/tools/mutate-guard.test.ts` collected **zero tests** and the
  suite reported nineteen failures about the platform and none about the product
  (#171). The committed blob would be normalised on the way in, so this is
  working-tree drift rather than repository corruption — but the build and the
  suite run against the working tree, and "git would have fixed it" is not the
  standard a file with that header gets held to.
- **Required fix**: rewrite the four files with LF endings. No content change.
- **Status**: **FIXED** — re-audit 2026-08-13
- **Owner**: executor
- **Verification note / evidence**: the finding scan re-run over all 21 changed
  files plus untracked change artefacts reports **zero CRLF files**. `npm test`
  2253 passed, `npm run build` compiled successfully, `npm run typecheck` and
  `npm run lint` clean. Remediation recorded as DL-6; content unchanged, endings
  only.

---

### PG-002 — The live delegated walk has not happened

- **Severity**: MAJOR
- **Category**: HANDOFF
- **Evidence**: `tasks.md:93` task 5.9 unchecked. Decision **D6** designates it a
  gate: *"The change is BLOCKED at the production gate until one delegated
  connection has been walked end to end by the operator at a consent screen."*
- **Impact**: The change's central premise is that
  `list_user_active_positions` answers for a **delegated access token**. It is
  proven only for a personal `bg_live_` key (`account-adapter.ts:15-27`). The
  delegated case is an inference — and an inference of precisely the kind that
  produced the defect being fixed: `sub` was assumed present because OAuth
  usually carries one. Nine of this project's findings needed a real call to the
  real platform and none was findable by reading code or schemas. If the read
  refuses for a delegated grant, this change replaces a path that fails at the
  adapter with a path that fails one step later, and the unit tests would not
  notice, because every one of them supplies the answer through a fake.
- **Required fix**: one delegated connection walked end to end — consent,
  exchange, identity read, session, then a second authorization recognising the
  same account. Revoke afterwards and confirm the tokens are dead, as the
  2026-08-13 walk did. Settles GitHub #206 in the same session at no extra cost.
- **Status**: **FIXED** — re-audit 2026-08-13
- **Owner**: operator (walked it)
- **Verification note / evidence**: walked end to end. Server:
  `GET /api/auth/battlegrid/callback?code=…&state=4JJgTwDO… 307 in 7610ms`, then
  `GET /agents 200`. Verified against the database rather than the redirect:
  `users.battlegrid_subject = 0eccbf37-d90b-4933-88f2-d120627b23f7` — the same
  account the personal key resolves to — with `users.id` a distinct local token,
  `connections.status active`, `scopes ["mcp:read"]`, tokens stored **encrypted**
  (130 chars, never raw), and the pending transaction consumed.
  **`list_user_active_positions` does answer for a delegated access token.**
  D1's mechanism is sound.

  **It took two attempts, and the first is the point of this gate.** The initial
  walk refused with `?error=unidentified` — not because BattleGrid declined, but
  because our own scope guard refused the call before it left the building
  (PG-005). No offline test could have found that. See DL-11.

---

### PG-003 — `npm run test:db` did not run

- **Severity**: MAJOR
- **Category**: HANDOFF
- **Evidence**: `DATABASE_URL=postgres://localhost:5432/grid_commander_test npm run db:migrate`
  → `Error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`.
  No `.env` exists in the worktree or the main checkout — only `.env.example`.
  Recorded by the executor as DL-3.
- **Impact**: One of six mandated quality gates is unverified. `vitest.db.config.ts`
  documents why this cannot be skipped quietly: *"a suite that skips when
  `DATABASE_URL` is absent reads exactly like a suite that passed."*
- **Mitigating, and verified rather than asserted**: no test under `tests/db/`
  imports or constructs anything this change touched — `grep` finds a single
  prose mention at `tests/db/connections.test.ts:140`. `npm run typecheck`
  covers `tests/` and passes, so the db suite compiles against the new
  contracts. `npm run db:generate` reports no schema change and `drizzle/` is
  clean, so there is no migration for the suite to exercise.
- **Required fix**: run the gate against a disposable database:
  `DATABASE_URL=postgres://USER:PASS@localhost:5432/grid_commander_test npm run db:migrate && … npm run test:db`.
  `assertDisposable` (#195) refuses a non-disposable target rather than
  truncating it.
- **Status**: **FIXED** — re-audit 2026-08-13
- **Owner**: operator (held the credential; supplied it)
- **Verification note / evidence**: run against
  `postgres://postgres@localhost:5432/**grid_commander_test**` — the disposable
  database, never `grid_commander`. `npm run db:migrate` applied cleanly, then
  `npm run test:db`: **7 files, 85 tests, all passed**, including
  `connections.test.ts` (16) and `oauth-transactions.test.ts` (8), the two
  closest to this change. **All six quality gates now pass.**

---

### PG-004 — Requirement "The Coverage Around Consent Is Stated Where It Is Read" has no automated verification

- **Severity**: MINOR
- **Category**: CONTRACT
- **Evidence**: `grep -rn "exercises a grant\|token exchange" tests/ --include=*.ts`
  → no matches. The requirement's scenario ("Reading what the checks cover")
  is satisfied by prose in `scripts/ci.sh` and
  `tests/live/oauth-metadata.test.ts`, and nothing asserts either sentence is
  present.
- **Impact**: The statement can be deleted or reworded by a later edit and no
  gate notices — which is the same failure mode the requirement was written
  about, one level up. Low severity because the artefact is documentation and a
  test asserting exact comment text is brittle enough to have its own cost.
- **Required fix**: either (a) add a check that the `oauth-live` gate block names
  its boundary, in the style of the existing `tests/architecture/` source-reading
  guards, or (b) waive with a rationale recorded in the decision log. **The
  auditor does not choose**; both are defensible.
- **Status**: **FIXED** — re-audit 2026-08-13. Option (a) was taken (DL-7).
- **Owner**: executor
- **Verification note / evidence**:
  `tests/architecture/oauth-conformance.test.ts` gains
  *"the coverage boundary around consent is stated where it is read"* — five
  assertions across `scripts/ci.sh` and `tests/live/oauth-metadata.test.ts`,
  matched on two independent ideas rather than on a sentence, plus a
  non-emptiness assertion so the guard cannot pass vacuously.
  **Mutation-checked (M4)**: deleting the boundary block from `scripts/ci.sh`
  failed exactly the two `ci.sh` assertions while the two `oauth-metadata`
  assertions correctly kept passing. The gate accepts this as closed — a
  requirement about invisible coverage, verified by a guard that has been seen
  to fail, is the right shape.

---

## Mandatory Recheck Evidence

| Area | Result | Note |
|---|---|---|
| Data pipeline parity | **PASS** | All nine layers accounted for in `data-review.md` with evidence; Iron Rule holds — identity is read from BattleGrid and never computed; `asSubject` call sites verified by grep to be platform-answer or stored-column only |
| Architecture parity | **PASS** | Dependency direction held (`connect.commands.ts:11` type-only interface import); MCP client instantiated only at `composition.ts:261`; no dual path retained |
| UI parity | **PASS** | Both refusal reasons render with existing `danger` tokens; hedging asserted positively and negatively; retry preserved on both branches; 9/9 rendering tests pass |
| Tech-debt zero tolerance | **PASS** (re-audit) | PG-001 fixed; CRLF rescan over all 21 changed files reports zero. No `TODO\|FIXME\|HACK\|XXX` in touched source or in either modified guard |
| Contract consistency | **PASS** | `TokenGrant` removal has zero remaining readers; `AccountIdentityResult` consistent across port, adapter, and both callers; no nullability mismatch (`typecheck` clean) |
| Decision-log parity | **PASS** | Every deviation logged: DL-1 (path correction), DL-2 (unplanned guard change), DL-3 (unsatisfied gate), DL-4 (mutation evidence), DL-5 (scope addition) |

## Notes The Gate Wants On Record

**The mutation evidence is the strongest part of this change.** DL-4 records
three re-injected defects, each confirmed to fail the intended check and only it.
That matters more here than usual: the suite this change replaces was green for
the entire life of the defect, so "the tests pass" carried no information. M1
in particular — restoring the `sub` requirement and watching exactly one new test
fail — is the evidence that the new check can do what the old one could not.

**DL-2 is a correct call and is endorsed.** The `one-destination` guard failed on
a comment quoting a BattleGrid URL. Rewording the comment would have passed the
gate and left the guard sensitive to spelling rather than reachability — the
defect shape this repository has documented six times. Fixing the guard and
mutation-checking it (M3) is the right direction of fix.

**PG-002 is not a formality.** It is the same gate the operator was told about
before execution began, and it is the reason this change is not shippable on the
strength of a green suite.

## Re-Audit — Mode B, 2026-08-13

Remediation checked against the violations that found them, then all gates and
scans re-run in full rather than only the ones that had failed.

| Check | Result |
|---|---|
| PG-001 remediation actually fixes it | YES — scan reports zero CRLF |
| PG-004 remediation actually fixes it | YES — guard exists, passes, and was seen to fail (M4) |
| All quality gates re-run | `typecheck` PASS · `lint` PASS · `test` PASS (2253, up from 2248: five new assertions) · `build` PASS · drizzle check PASS · `test:db` **still CANNOT RUN** |
| All scoped scans re-run | conflict markers 0 · CRLF 0 · debt markers 0 · no new `??` |
| New violations introduced by remediation | **None.** The remediation touched one further file, `tests/architecture/oauth-conformance.test.ts`, added to the master plan inventory per DL-7 |

## Re-Audit #2 — Mode B, 2026-08-13 (after the walk)

| Check | Result |
|---|---|
| PG-002 remediation actually fixes it | YES — walked live, verified in the database |
| PG-005 remediation actually fixes it | YES — live, and the guard still refuses an empty grant |
| All quality gates re-run | `typecheck` PASS · `lint` PASS · `test` PASS (**2257**) · `build` PASS · drizzle PASS · `test:db` PASS (**85**) — **all six** |
| All scoped scans re-run | conflict markers 0 · CRLF 0 · debt markers 0 · no diagnostic leftovers |
| New violations introduced by remediation | **None.** One further test file added (`granted-scopes.test.ts`), inventoried per DL-11 |

## Superseded Decision (2026-08-13, first re-audit)

**BLOCKED** — superseded by the walk. Retained because a gate whose history is
deleted teaches nobody why it was held.

**2 open violations, both requiring the operator and neither closable from here:**

- **PG-002** — the live delegated walk. This is the blocking one on merit, and it
  is the gate D6 defined before execution began. The premise that
  `list_user_active_positions` answers for a delegated access token is proven
  only for a personal key, and every unit test supplies that answer through a
  fake.
- **PG-003** — `npm run test:db`, unrunnable without a database credential. The
  exposure is bounded and was verified rather than asserted: no `tests/db/` test
  imports or constructs anything this change touched.

Everything within the executor's reach is closed. The code is in the state it
should be in for the walk.

Re-audit after the walk: **Mode B**.


## Final Decision

**PASS** — 2026-08-13.

Zero open violations. All six quality gates green. Every requirement in the delta
is implemented, and the one that could only be proven by a person at a consent
screen has been.

The gate earns its keep on PG-005: a defect that made the delegated path
impossible, invisible to 2257 offline tests and to two live probes, found because
this change was not allowed to ship on a green suite. The walk was written into
the plan as D6 before anyone knew what it would catch — and what it caught was
not the thing it was written to look for.

**PRODUCTION GATE: PASS.**
