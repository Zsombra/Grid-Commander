# Production Gate: The Approval Can Be Answered

**Audit timestamp**: 2026-08-17
**Track**: full
**Evidence window**: `0fd2ce0..fbdeade` (`8f06401^` → HEAD)
**Auditor**: auditor skill — Mode A, then two Mode B re-audits

---

## Handoff Integrity

| Check | Result |
|---|---|
| Master plan final line is `EXECUTION READY FOR PRODUCTION GATE` | **PASS** at re-audit — was `PLAN READY FOR REVIEW` (PG-001, now FIXED) |
| Execution checklist fully checked | **PASS** — tasks 40/40; Phase 2 checklist all `[x]` |
| Required review artifacts exist | **PASS** — `architecture-review.md`, `data-review.md`, `uiux-review.md`, `decision-log.md` |
| Decision log has planner + executor entries | **PASS** — DL-1..DL-20, spanning PLANNING, EXECUTION and VERIFICATION |
| Reviews carry path-level evidence | **PASS** — reviews cite `file:line` throughout |
| Inventory aligned with the evidence window | **PASS** — 29 inventory rows; the three apparent mismatches are notation, not drift: a line-number suffix (`src/ports/agents.ts:518`), an ellipsis path (`src/presentation/.../approvals/`), and a naming variant (`agents.adapter.ts` for `agent-adapter.ts`) |

Integrity was **SUSPECT** on one clerical count at Mode A and is **VALID** at re-audit.

---

## Quality Gates

Read from `openspec/config.yaml:71` via `docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md:658`.

| Gate | Result | Evidence |
|---|---|---|
| `npm run typecheck` | **PASS** | `tsc --noEmit` exit 0 |
| `npm run lint` | **PASS** | `eslint .` exit 0, no output |
| `npm test` | **PASS** | 2716/2722 across 213 files. The 6 failures are the documented baseline — `cli-spawn` (2), `live-probes-are-named` (4) — confirmed by running both files alone; `HANDOFF.md` states the pass criterion is six, not zero |
| `npm run build` | **PASS** | exit 0, full route table emitted |
| `npm run db:generate && git diff --quiet drizzle/` | **PASS** | "No schema changes, nothing to migrate"; `drizzle/` clean |
| `npm run test:db` | **PASS** (re-audit 2) | 96 tests, 8 files, against `grid_commander_test` — see PG-002 |

---

## Scans

| Scan | Scope | Result |
|---|---|---|
| Conflict markers | `src`, `app`, `tests` | **CLEAN** |
| `TODO\|FIXME\|HACK\|XXX` | approvals scope, 13 paths | **CLEAN** |
| `deprecated\|legacy\|obsolete\|dead code` | approvals scope | **CLEAN** |
| Stale-method reachability | `answerEntryDecision` | **CLEAN** — one production caller, now asserted (DL-19) |

---

## Phase 3 Checklist — Auditor

| # | Item | Result |
|---|---|---|
| 1 | PE-1 is a genuine platform limitation, not convenience | **PASS**, from the record — the decision payload's 35 keys are enumerated in `approvals-have-no-write-side.md`, none a concurrency token. **Not re-read live this session** |
| 2 | Binding cannot be bypassed | **PASS as of this audit, and it was not before.** `confirmation-binds-values.test.ts` already blocked inline target composition; nothing blocked a second caller reaching the port. Now asserted — DL-19 |
| 3 | Accept and cancel targets provably distinct | **PASS** — `answer-decision.test.ts:65,101`; `approval-queue.test.ts:195` |
| 4 | No mutating path reaches BattleGrid without a row written first | **PASS** — `call-path.ts` step 4 writes `audit.begin` before the call, on every path including accept |
| 5 | Gate honoured — cancel proven before accept written | **PASS**, in git history: `eac3284` (4.5, cancel live) → `b9d1286` (section 5, accept surface) → `f12a274` (7.4, accept live) |
| 6 | No UI copy calls read scope read-only; no computed currency amount | **PASS** — `access-is-described-honestly.test.ts` 4/4; `sizing-base.test.ts` 14/14 (PE-2). **See the correction below: a separate claim this audit made about the scope *gate* was wrong.** This row is about copy and stands |
| 7 | Spec deltas match implementation; the disclosure actually removed | **PASS as of this audit.** The code still carried it until today — see PG-003, fixed pre-audit. The main spec still holds the requirement, which is correct pre-archive: the archiver removes it on merge |

---

## Violations

| ID | Severity | Category | Status |
|---|---|---|---|
| PG-001 | MAJOR | HANDOFF | **FIXED** (re-audit) |
| PG-002 | MAJOR | HANDOFF | **FIXED** (re-audit 2) |
| PG-003 | CRITICAL | UI | **FIXED** before this audit |
| PG-004 | MAJOR | STALE_CODE | **FIXED** before this audit |
| PG-005 | MAJOR | ARCHITECTURE | **FIXED** before this audit |

---

### PG-001 — Master plan was never marked ready for the gate

- **Severity**: MAJOR
- **Category**: HANDOFF
- **Evidence**: `openspec/changes/the-approval-can-be-answered/plan/master-plan.md`, final line reads `PLAN READY FOR REVIEW`. Five of the eight most recent archived full-track plans end `EXECUTION READY FOR PRODUCTION GATE`, and 17 `production-gate.md` files exist in the archive — the marker is this repository's convention, not the skill's import.
- **Impact**: The gate's first integrity check is that a human deliberately declared execution finished. Auditing a plan that still says "ready for review" audits work nobody handed over. Clerical here — tasks are 40/40 and every artifact exists — but the check is worthless if waived the first time it fires.
- **Required fix**: Executor sets the final line to `EXECUTION READY FOR PRODUCTION GATE`.
- **Owner**: Executor
- **Verification note**: `tail -1 master-plan.md` equals `EXECUTION READY FOR PRODUCTION GATE`.
- **Status**: **FIXED** (re-audit 2026-08-17). `tail -1` now returns the marker; the Status
  block's Phase reads *3 — Production gate* and records the live gate crossing. The
  declaration is honest rather than clerical: tasks 40/40, every Phase 2 box checked, and
  the verifier's findings fixed before the audit.

---

### PG-002 — `npm run test:db` did not run

- **Severity**: MAJOR
- **Category**: HANDOFF
- **Evidence**: Gate 6 of `openspec/config.yaml:77`. `DATABASE_URL` is set to `postgres://…@localhost:5432/grid_commander` — the operator's working database, **not** a disposable one. The suite truncates the signal record on setup, and BattleGrid serves current readings only, so a wrong target destroys data the platform cannot re-serve (#195, #208). The decision log's executor handoff note already states the gate is not claimed as passed.
- **Impact**: The DB-backed suite is unexercised locally. This change writes audit rows, so the audit repository's persistence is covered only by CI.
- **Required fix**: Run against a disposable target, exactly as the precedent in `2026-08-13-the-connection-asks-who-it-is/plan/production-gate.md` PG-003 did:
  `DATABASE_URL=postgres://USER:PASS@localhost:5432/grid_commander_test npm run db:migrate && DATABASE_URL=… npm run test:db`.
  `assertDisposable` refuses a target whose name does not mark it disposable. **Do not point it at `grid_commander`.** Alternatively waive to CI with an owner and date.
- **Owner**: Operator (the database is theirs to designate)
- **Verification note**: Suite green against a `_test` database, or a dated waiver recorded here and in the decision log.
- **Status**: **FIXED** (re-audit 2, 2026-08-17). Run for real rather than waived:
  `grid_commander_test` created, migrated, and the suite run against it — **96 tests,
  8 files, all passing**. `DB_TESTS_MAY_TRUNCATE` was never set; both guards were left
  to do their work, and the live-grant preflight read 0 active connections in the test
  database before the run.
  **The working database was verified untouched afterwards**: `grid_commander` still
  holds **144,732** `signal_readings`, against **0** in the test database the suite
  truncated. That check is the point — the guard's own error text records that this
  suite was once pointed at a live database and destroyed a record that could not be
  rebuilt, and that every test passed while it did.
- **Standing position, recorded at the operator's request**: CI provisions a disposable
  postgres and runs this gate on every push, so a local run is not required of future
  sessions. A session without a disposable database may waive to CI by dating it here
  rather than pointing `DATABASE_URL` at a working database.

---

### PG-003 — The retired disclosure still shipped, and had become false — FIXED

- **Severity**: CRITICAL
- **Category**: UI
- **Evidence**: `src/presentation/components/money-limits.tsx:95-96` rendered *"Accepting is not yet available here and still happens on battlegrid.trade."* Found by the verifier pass; `tests/agent/money-limits.test.ts:237` was asserting it.
- **Impact**: A false statement on the money surface, directing operators off the product for an operation the product performs — the day after 7.4 accepted a real decision through it. Exactly the failure the retired requirement *An Unanswerable Trading Mode Says So* existed to prevent, committed by its own replacement.
- **Required fix**: Applied. Copy names both answers; the test asserts the corrected copy; `answering-is-not-disclaimed.test.ts` fails if a disclaimer returns.
- **Owner**: Executor
- **Status**: **FIXED** — `fbdeade`. Verified non-vacuous: restoring the false sentence fails 2 assertions.

---

### PG-004 — Two docstrings described code that no longer existed — FIXED

- **Severity**: MAJOR
- **Category**: STALE_CODE
- **Evidence**: `app/(app)/approvals/[agentId]/[id]/page.tsx:16-27` headed itself *"Why there is no accept button here"* and *"deliberately reaches cancel alone"*, twelve lines above `verbs: ['cancel', 'accept']` at `:63`. `openspec/design/surfaces/approvals-decision.json` `constraints[0]` read *"Accept is rendered nowhere… A design must not add one."*
- **Impact**: The manifest one is the serious half — a **constraint**, not a description. A design round reading it would have been instructed to delete a live money control and restore the disclaimer.
- **Required fix**: Applied. Both corrected; four manifests re-pinned in prose and digest per DL-16's rule.
- **Owner**: Executor
- **Status**: **FIXED** — `fbdeade`. DL-20.

---

### PG-005 — The binding's only remaining guard was an unenforced convention — FIXED

- **Severity**: MAJOR
- **Category**: ARCHITECTURE
- **Evidence**: `src/application/use-cases/answer-decision.command.ts:16-20` claims the binding check *"cannot be skipped by a caller, because the port method is not reachable from anywhere else in the application layer"*. True, and asserted by nothing.
- **Impact**: The second layer is **inert on accept**: `call-path.ts:71` gates the confirmation consume on `cls.destructive`, and BattleGrid annotates `accept_entry_decision` `destructiveHint: false`, so the token is passed and never spent (#340). Cancel is gated; the money-committing verb is not. A future second caller would have reached an unbound write with nothing objecting.
- **Required fix**: Applied — `tests/architecture/answering-is-not-disclaimed.test.ts` asserts the port method is named only in the command, the port interface and the adapter.
- **Owner**: Executor
- **Status**: **FIXED** — `fbdeade`. Verified non-vacuous: a second caller fails the assertion. **Does not fix #340**, which stays open (DL-19).

---

## Gate Decision

| Pass | Date | Decision | Open |
|---|---|---|---|
| Mode A | 2026-08-17 | BLOCKED | 2 MAJOR |
| Mode B re-audit | 2026-08-17 | BLOCKED | 1 MAJOR |
| Mode B re-audit 2 | 2026-08-17 | **PASS** | **0** |

**Decision: `PASS`** — 2026-08-17. Zero OPEN violations.

*(The literal token above is what `openspec.py board` reads to stop reporting "remediate gate violations"; this file necessarily still contains the word BLOCKED in its own history table, and the board's check is a substring one.)*

All six quality gates pass, all re-run at re-audit rather than only the failed one:

| Gate | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm test` | **PASS** — 2716/2722, the documented six-failure baseline |
| `npm run build` | **PASS** — no source file changed after Mode A; only plan and journal documents |
| `npm run db:generate && git diff --quiet drizzle/` | **PASS** |
| `npm run test:db` | **PASS** — 96 tests, 8 files, `grid_commander_test` |
| `openspec.py validate <change>` | **PASS** — clean |

No new violations were introduced by either remediation round. All five findings
are FIXED and each was verified rather than asserted:

- **PG-003/004/005** came from the verifier pass and were proven non-vacuous by
  reverting — restoring the false copy fails 2 assertions, adding a second
  unbound caller fails 1.
- **PG-001** verified by `tail -1`.
- **PG-002** verified by a real run, plus an after-the-fact count confirming the
  working database was untouched.

**What this gate did not cover**, stated rather than implied:

- **#340 stays open** and is not fixed here. DL-19 closed the bypass route; the
  inverted `destructiveHint`, the confirmation token that is never spent on
  accept, and the audit row reading `destructive: false` on a position-opening
  write are all still live. The audit's PG-005 says so explicitly.
- **PE-1 was verified from the record, not re-read live** this session.
- The **live behaviour** of the accept surface rests on task 7.4's recorded
  evidence, not on a fresh execution.

Cleared for `/archive`.

**PRODUCTION GATE: PASS.**

---

## Correction, 2026-08-17 — this audit asserted something false about the scope gate

**Withdrawn**: PG-005's sentence *"the `mcp:wager` step-up fires"*, and the
matching claim in the Mode A narrative that *"the scope step-up is intact"*.

Measured afterwards, from the capability record's own annotations through the
real `buildClassificationMap` and the real `beginGuardedCall`:

```
accept_entry_decision -> {"mutating":true,"destructive":false,"requiredScope":"mcp:read"}
cancel_entry_decision -> {"mutating":true,"destructive":true, "requiredScope":"mcp:read"}

accept admitted on mcp:read alone, no token. audit id issued: true
```

`rawDiscoverTools` (`mcp-adapter.ts:387`) never sets `declaredScope`, and
`inferScope` (`classify.ts:63`) returns `'mcp:read'` unconditionally — so **no
known tool requires wager authority at the port**, and the gate can fire only on
the fail-closed `UNKNOWN_TOOL` path. Neither of the port's two money-relevant
gates applies to `accept_entry_decision`.

**How the audit got it wrong.** It read the correct answer during the verifier
pass, in a probe whose synthetic tool object carried no `declaredScope`, and
withdrew it as an artifact of the probe. The probe was reproducing production
exactly. Withdrawing a true observation for a plausible reason is the failure
here, and it is worth more than the finding.

**What this does not change.** Nothing archived becomes wrong: the application
layer does gate on wager scope (`read-answer-authority.query.ts:36`) and does
bind every answer (`AnswerDecisionCommand`), so no operator accepted without
authority and no accept was unbound. The gate's PASS stands on the work that was
audited. What is withdrawn is this document's description of *where* the
protection lives.

Tracked on **#340**, re-priced p2 and re-scoped to both gates.
