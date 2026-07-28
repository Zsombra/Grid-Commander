# Production Gate: connect-battlegrid-account

**Track**: full · **Auditor pass**: Mode A (initial audit) → Mode B (re-audit after remediation)
**Evidence window**: `87ba83b..HEAD` (plan commit → working tree)
**Decision**: see [Gate Decision](#gate-decision).

---

## Handoff Integrity

| Check | Result | Evidence |
|---|---|---|
| Master plan ends `EXECUTION READY FOR PRODUCTION GATE` | VALID | `plan/master-plan.md` final line |
| Phase 2 execution checklist fully checked | VALID | `plan/master-plan.md` Phase 2 |
| Review artifacts exist and carry path-level evidence | VALID | `architecture-review.md`, `data-review.md`, `uiux-review.md` — all `EVIDENCE RECORDED` |
| Decision log has planner + executor entries | VALID | DL-1…DL-9 (planner), DL-10…DL-14 (executor) |
| File inventory aligns with `git diff --name-status 87ba83b..HEAD` | VALID with logged drift | Consolidations logged as DL-11, DL-12; inventory reconciled |
| Tasks honest against code | VALID | 25/26; 0.2 unchecked and explained (below) |

**Task 0.2** (`Confirm whether scope can be stepped up without re-consenting`) is
deliberately unchecked. Completing it requires a human consenting in a browser
against the live server, which cannot be done headlessly. Recorded as DL-8's open
question rather than marked done — an unchecked box is the honest state.
Not a violation: the requirement it would inform (R3) is delivered and tested.

---

## Spec Parity

Delta: `specs/battlegrid-connection/spec.md` — 10 ADDED requirements, 22 scenarios.
No MODIFIED, REMOVED or RENAMED operations; no existing `openspec/specs/` to regress.

| Req | Requirement | Delivered at | Scenarios | Verdict |
|---|---|---|---|---|
| R1 | Users Connect By Authorization, Never By Credential | `connect.commands.ts:60-140`, `mcp-adapter.ts:60-86` | 4/4 → `tests/connection/connect.test.ts` | DELIVERED |
| R2 | The Connection Is The Identity | `connect.commands.ts:105-120`, `connection.ts`, `schema/index.ts` | 2/2 → `connect.test.ts`, `revoke.test.ts` | DELIVERED |
| R3 | Read Scope Is Requested And Wager Scope Is Not | `scope.ts:REQUESTED_SCOPES`, `call-path.ts:40-60` | 2/2 → `connect.test.ts`, `call-path.test.ts` | DELIVERED |
| R4 | Configuration Authority Is Described Honestly | `describe-grant.query.ts`, `consent-summary.tsx` | 1/1 → `consent.test.ts` | DELIVERED |
| R5 | Capabilities Are Discovered From The Live Connection | `capability-cache.ts`, `classify.ts` | 3/3 → `discovery.test.ts` | DELIVERED |
| R6 | Unrecognised Operations Are Treated As Dangerous | `classify.ts:38-52` | 1/1 → `classify.test.ts` | DELIVERED |
| R7 | Destructive Operations Require Confirmation Naming The Consequence | `confirmation.ts`, `call-path.ts:60-85` | 2/2 → `call-path.test.ts` | DELIVERED |
| R8 | Every Modifying Operation Is Recorded | `record-audit.command.ts`, `list-audit.query.ts`, `call-path.ts:88` | 4/4 → `audit.test.ts` | DELIVERED |
| R9 | Conflicting Changes Are Surfaced, Never Silently Retried | `errors.ts:17-28`, `call-path.ts:101-113` | 1/1 → `conflict.test.ts` | DELIVERED — see PG-003 |
| R10 | A User Can Revoke Access | `connect.commands.ts`, `mcp-adapter.ts:183` | 2/2 → `connect.test.ts`, `revoke.test.ts` | DELIVERED — see PG-002 |

**10/10 requirements delivered, 0 scenarios uncovered.**

**Unspecified behavior**: none found. Every file in the diff serves a matrix row
or is declared infrastructure in the master plan (`config.ts`, `envelope.ts`,
scaffolding). **Scope adherence**: nothing in the diff touches agent authoring,
strategy authoring or the assistant — the proposal's Out of Scope holds.

---

## Violation Tracker

### PG-001 · CRITICAL · CONTRACT · Identity collision on a subject-less grant

| Field | Value |
|---|---|
| **Requirement** | R2 — The Connection Is The Identity |
| **Evidence** | `src/infrastructure/battlegrid/mcp-adapter.ts:222` (pre-fix: `subject: json.sub ?? ''`), found by the mandated `rg "\?\?"` fallback-masking scan |
| **Impact** | Two users whose grants carried no `sub` would both key on `''`. `findUserIdBySubject('')` matches the first, so the second user to connect is recognised as the first — landing in a stranger's workspace, holding a stranger's BattleGrid connection and their audit history. The most severe failure this product can have. |
| **Required fix** | Refuse the grant. An identity that cannot be established must not be defaulted into one. |
| **Status** | **FIXED** |
| **Owner** | executor |
| **Verification** | `mcp-adapter.ts:211-213` throws `no subject; cannot establish identity`. Three tests in `tests/connection/revoke.test.ts:137-184` cover absent `sub`, empty-string `sub`, and the accepting case. Reverting the guard fails 2 of the 3. |

### PG-002 · MAJOR · SPEC_PARITY · R10 second scenario was not implemented

| Field | Value |
|---|---|
| **Requirement** | R10 — A User Can Revoke Access, scenario *Revoked at BattleGrid instead* |
| **Evidence** | `src/infrastructure/battlegrid/mcp-adapter.ts:184` (pre-fix: every non-OK status became `${method} failed with ${status}`), found by verification |
| **Impact** | A user who revokes at BattleGrid gets "tools/call failed with 401" — a message naming an internal method and an HTTP code, with no path back. The spec requires the failure to read as disconnected with an invitation to reconnect. |
| **Required fix** | Raise `ConnectionRevokedError` on 401/403 before the generic branch. |
| **Status** | **FIXED** |
| **Owner** | executor |
| **Verification** | `mcp-adapter.ts:183`. `tests/connection/revoke.test.ts:35-87` — five tests, including one asserting the message does *not* read `failed with 401`, and one asserting a 500 stays an ordinary error. Logged as DL-13. |

### PG-003 · MAJOR · FALLBACK · A conflict error invents a revision number it was never given

| Field | Value |
|---|---|
| **Requirement** | R9 — Conflicting Changes Are Surfaced, Never Silently Retried |
| **Evidence** | `src/infrastructure/battlegrid/call-path.ts:105` — `new RevisionConflictError(resource, expectedRevision ?? -1, null)`, found by the `rg "\?\?"` fallback-masking scan. The sole production call site is `mcp-adapter.ts:144`, which passes no revision, so **every** conflict a user actually sees renders `errors.ts:24` as *"expected revision -1"*. Only the tests (`conflict.test.ts:20,25,31`) pass a real revision, which is why the suite never saw it. |
| **Impact** | R9 requires a conflict to be *surfaced*. A fabricated `-1` is worse than silence: the user is told a specific expectation that was never held, and the one number that would let them reason about what moved is replaced by a sentinel. It also makes the test suite look like it covers the production path when it covers only the branch the tests supply. |
| **Required fix** | Make the expected revision genuinely optional on `RevisionConflictError` and omit the clause when it is unknown, rather than substituting a value. No sentinel. |
| **Status** | **FIXED** |
| **Owner** | executor |
| **Verification** | `errors.ts:17-31` takes `expectedRevision: number \| null`; the message names a revision only when one is known. `call-path.ts:105` passes `expectedRevision ?? null`. `tests/concurrency/conflict.test.ts` gains `renders_without_inventing_a_revision`, asserting the production call path's message contains neither `-1` nor `expected revision`. Reverting the fix fails it. |

### PG-004 · MINOR · TECH_DEBT · `scopesFor()` returns a constant rather than the grant's scopes

| Field | Value |
|---|---|
| **Requirement** | R3 — Read Scope Is Requested And Wager Scope Is Not |
| **Evidence** | `src/infrastructure/battlegrid/mcp-adapter.ts:152-157`; declared as F-3 in `architecture-review.md` and DL-14 |
| **Impact** | None today: the pinned registration cannot obtain more than `mcp:read` (DL-4), so the constant and the truth coincide. It becomes wrong the moment step-up exists, and it would fail *open* — reporting held scope that was never granted. |
| **Required fix** | Read the recorded scopes from the connection. Belongs to the change that introduces step-up. |
| **Status** | WONTFIX (this change) — deferred |
| **Owner** | `author-agents` change |
| **Verification** | Filed as backlog item `scopes-from-connection`. Not blocking: the value is correct under the current deployment and the failure mode cannot be reached without a re-registration. |

### PG-005 · MINOR · HANDOFF · Token lifetimes remain unproven

| Field | Value |
|---|---|
| **Requirement** | — (assumption, not a requirement) |
| **Evidence** | `src/domain/connection/connection.ts:43` — `expiresIn ?? UNKNOWN_EXPIRY_FALLBACK_SECONDS`; DL-8; task 0.2 unchecked |
| **Impact** | The fallback is deliberately the shortest safe window, so being wrong costs an extra refresh and never grants stale authority. The risk is cost, not safety. |
| **Required fix** | Record the real `expires_in`, refresh rotation and step-up behaviour on the first live human connection. |
| **Status** | WONTFIX (this change) — deferred |
| **Owner** | first live connection |
| **Verification** | Filed as backlog item `prove-token-lifetimes`. |

---

## Mandatory Recheck Evidence

| Check | Command | Result |
|---|---|---|
| Spec validation (strict) | `python3 .claude/tools/openspec.py validate connect-battlegrid-account --strict` | PASS — clean |
| Typecheck | `npm run typecheck` | PASS |
| Lint (incl. P6 boundary rule) | `npm run lint` | PASS |
| Tests | `npm test` | PASS — 10 files, 99 tests |
| Harness regression | `python3 -m unittest discover -s tests` | PASS — 124 tests |
| Conflict markers | `grep -rn "^(<<<<<<<\|=======\|>>>>>>>)" src app tests` | PASS — none |
| Fallback masking | `grep -rn "??" src app` | PASS after PG-001, PG-003; remaining 9 reviewed individually, all deny-by-default or declared (PG-004, PG-005) |
| Technical debt markers | `grep -rniE "TODO\|FIXME\|HACK\|XXX\|deprecated\|legacy\|obsolete" src app` | PASS — 3 hits, all the substring `toDo` inside `toDomainError` |
| Console logging | `grep -rn "console\." src app` | PASS — none; also asserted structurally in `tests/architecture/boundaries.test.ts` |
| Retry near conflicts (policy P4) | `tests/concurrency/conflict.test.ts` structural scan of `src/` | PASS |
| Layer boundaries (policy P6) | `tests/architecture/boundaries.test.ts` | PASS |
| Stale exports | every exported symbol in the diff traced to a call site | PASS |

### On the surviving `??` operators

The fallback scan is only useful if each hit is judged, not counted. All nine
remaining fall into two groups, and neither masks a required contract:

- **Deny-by-default** — `classify.ts:45,50` (an absent `destructiveHint` becomes
  destructive), `capability-cache.ts:53` (an unknown tool becomes
  destructive/wager), `mcp-adapter.ts:205` (an absent scope string becomes the
  empty scope set). Each of these makes the system *more* restrictive when
  information is missing. That is the correct direction for a fallback.
- **Genuine absence, honestly represented** — `mcp-adapter.ts:163,217`,
  `call-path.ts:88`, `list-audit.query.ts:21`, `connect.commands.ts:111`. Each
  maps a legitimately-optional value to its documented empty form.

PG-001 and PG-003 were the two that pointed the other way, and both are fixed.

---

## Checklist Parity

| Checklist | Result | Notes |
|---|---|---|
| `ARCHITECTURE_REVIEW_CHECKLIST.md` | PASS | Dependency direction enforced by ESLint *and* `boundaries.test.ts`. One declared exception: DL-7's degraded allowlist — audited below. No dual runtime paths. |
| `DATA_PIPELINE_REVIEW_CHECKLIST.md` | PASS | Classification is computed once at the boundary and carried on `ToolCallResult`; the UI (`audit-list.tsx`, `consent-summary.tsx`) recomputes nothing. Iron Rule holds. |
| `UI_COMPONENT_REVIEW_CHECKLIST.md` | PASS | Two server components, no data fetching in components, consent copy reviewed against R4 in `uiux-review.md`. |

**DL-7 auditor note discharged.** The decision log asked the gate to verify the
degraded allowlist can only ever deny. `capability-cache.ts:53` looks the tool up
in the degraded map and returns `{mutating: true, destructive: true, requiredScope: 'mcp:wager'}`
for anything absent; a listed tool yields a read-only classification and nothing
else. There is no branch in which membership grants write authority.
`tests/capability/discovery.test.ts::degrades_to_readonly` asserts a mutating
tool is refused in this mode. **The exception holds as declared.**

---

## Gate Decision

**Initial audit (Mode A)**: 1 CRITICAL, 2 MAJOR, 2 MINOR — 3 open → BLOCKED.
**Re-audit (Mode B), 2026-07-27**: PG-001, PG-002, PG-003 verified FIXED with
tests that fail when reverted. PG-004 and PG-005 deferred with backlog items and
named owners. All quality gates re-run in full, not just the failing ones. No new
violations introduced by the remediations.

```
Open violations: 0
```

## **DECISION: PASS** — 2026-07-27

Handoff: **archiver**. A `PASS` that is never archived leaves `openspec/specs/`
empty while ten requirements are live in code, and the next audit would have
nothing to measure regression against.
