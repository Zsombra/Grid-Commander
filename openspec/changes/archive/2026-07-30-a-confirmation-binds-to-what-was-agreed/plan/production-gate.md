# Production Gate: a-confirmation-binds-to-what-was-agreed

**Decision: PASS** — 2026-07-30 (re-audit)

First pass **BLOCKED** with one CRITICAL and three MAJOR. All five findings are
now FIXED and re-verified; the record of the first pass is kept below rather than
rewritten, because the interesting part is that every quality gate was green while
the change duplicated the one thing it exists to consolidate.

**What the first pass found, and how:** by reading the master plan's file
inventory against `git diff --name-status`. No command runs that check.

## Handoff integrity: VALID (was SUSPECT)

| Check | Result |
|---|---|
| Master plan ends `EXECUTION READY FOR PRODUCTION GATE` | PASS |
| Tasks fully checked or tracked | PASS — 27/29; 5.1 done, 5.2 is this gate |
| Review artifacts on disk | PASS — architecture, data, uiux all present |
| Decision log has planner + executor entries | PASS — DL-1..DL-5 planner, DL-6..DL-8 executor |
| Review artifacts carry true path-level evidence | PASS at re-audit — PG-003 corrected in place, with the false claim kept as a correction |
| Master plan inventory matches the diff | PASS at re-audit — 26 touched, 26 listed, zero drift either way |

## Evidence window

`94e5d66..HEAD`, plus the uncommitted verifier remediation. Resolved from the
decision log and confirmed non-empty: 29 files committed in `54ab9d3`, 7 paths
uncommitted (3 review artifacts, 2 backlog items, 2 remediation edits).

## Spec parity: 2/2 requirements delivered, 0 scenarios uncovered

| Requirement | Op | Delivered | Evidence |
|---|---|---|---|
| Destructive Operations Require Confirmation Naming The Consequence | MODIFIED | YES | `src/domain/capability/confirmation.ts:60-118` (`confirmationTarget`); old behaviour gone — no target composed outside it, asserted by `tests/architecture/confirmation-binds-values.test.ts:151` |
| A Destructive Change Is Agreed To By A Person | MODIFIED | YES | `src/application/use-cases/describe-edit.query.ts:84`, `src/application/use-cases/update-agent.command.ts:118` |

| Scenario | Covered | Evidence |
|---|---|---|
| A destructive operation is requested | YES (pre-existing) | `tests/capability/call-path.test.ts:110` |
| Confirmation is withheld | YES (pre-existing) | `tests/capability/call-path.test.ts:216` |
| The submitted values differ from the agreed ones | YES | `tests/agent/edit-binding.test.ts:111,126` |
| The values are the ones that were agreed | YES | `tests/agent/edit-binding.test.ts:98` |
| Changing an agent | YES (pre-existing) | `tests/agent/rename.test.ts` |
| The consequence that was agreed to | YES (pre-existing) | `tests/agent/rename.test.ts:18` |
| A change that changes nothing | YES (pre-existing) | `tests/agent/rename.test.ts:24` |
| An amount altered after it was agreed to | YES | `tests/agent/edit-binding.test.ts:126` — both clauses; the "no request is built" half was the verifier's finding and was closed before this gate |
| Two agreements for one agent | YES | `tests/agent/edit-binding.test.ts:151` |

**Regression against existing specs**: the unmodified requirements of both
capabilities hold. `Every Agent Mutation Carries The Revision It Was Formed
Against` — `expectedRevision` still flows (`update-agent.command.ts:118`);
`Every Modifying Operation Is Recorded` — the audit `begin` is untouched and
`edit-binding.test.ts:187` asserts no row on a refusal, which is the requirement's
own "refused before attempted" side. 770 tests pass.

**Unspecified behaviour**: none. Everything in the diff maps to a requirement
clause or to a decision-log entry (DL-6 ports, DL-7 apply path, DL-8 one reader).

**Scope adherence**: PASS. No schema change; `expectedRevision` on archive
untouched; rebind revision and refusal wording filed rather than built.

## Violations

| ID | Sev | Category | Requirement | Evidence | Impact | Required fix | Status | Owner | Verification |
|---|---|---|---|---|---|---|---|---|---|
| PG-001 | CRITICAL | REDUNDANCY | Destructive Operations… — *"One mechanism, in one place"* | `src/application/use-cases/compile-plan.command.ts:87` and `src/domain/capability/digest.ts:17` both define `digestOf`; `:91` and `:21` both define `canonicalise`. Found by `grep -rn 'function digestOf' src/` | Two implementations of the function that makes a binding meaningful. If they drift, a plan digested by one and verified against the other mismatches, and `apply_strategy_plan` silently dies again — the exact defect DL-7 found. The change duplicated the thing it exists to consolidate | Delete `digestOf` and `canonicalise` from `compile-plan.command.ts`; import from `@/domain/capability/digest.js`. Confirm one definition remains | **FIXED** | executor | `grep -rn 'function digestOf\|function canonicalise' src/` → one each, both in `src/domain/capability/digest.ts`. `compile-plan` and `apply-plan` import it. Re-injected a second copy: `confirmation-binds-values.test.ts` fails |
| PG-002 | MAJOR | HANDOFF | — | `tasks.md:43` — task 2.4 is `- [x]` and reads *"`compile-plan.command.ts` imports `digestOf` rather than defining it"*. It still defines it | Checkbox theatre. A ticked task with no corresponding code is how PG-001 reached this gate unnoticed | Fix PG-001, then the task is honest. If any part is deferred, un-tick it and say what is left | **FIXED** | executor | `compile-plan.command.ts` is in the diff and defines nothing; task 2.4 now records that it was ticked before it was true |
| PG-003 | MAJOR | HANDOFF | — | `plan/architecture-review.md:69` asserts *"`digestOf` — moved, not duplicated. One definition; `compile-plan.command.ts` imports it"*. False | A review artifact asserting a fact that is not true is worse than one that omits it: it is the evidence the gate is supposed to rely on. This is the third artifact in this project to state a rule and describe the opposite | Correct the line to record what was actually verified, and how | **FIXED** | executor | `architecture-review.md:69` states what was actually verified and keeps the false claim as a correction rather than deleting it |
| PG-004 | MAJOR | OTHER | — | `plan/master-plan.md:52` lists `compile-plan.command.ts` as modified — it is not in `git diff --name-status 94e5d66..HEAD`. The diff also touches 5 files the inventory omits: `src/presentation/components/agent-edit.tsx`, `tests/agent/{concurrency,rebind}.test.ts`, `tests/live/write-probe.test.ts`, `tests/strategy/mapper.test.ts` | Inventory drift in both directions. The plan claims a file was changed that was not — which is how PG-001 hid — and omits five that were, so the audit's touched-path scans could have missed them | Reconcile the inventory with the diff. The five omissions are call-site updates and a prop widening; state them as such | **FIXED** | executor | Reconciled by script: 26 files touched, 26 listed, empty in both directions |
| PG-005 | MINOR | TECH_DEBT | Destructive Operations… — *"One mechanism, in one place"* | `tests/architecture/confirmation-binds-values.test.ts` checks that no *target* is composed by hand. It does not check that the *digest* has one definition, which is why PG-001 passed every guard | The requirement's "one mechanism" clause is enforced for half of the mechanism. A second `digestOf` is invisible to the guard that exists for exactly this property | Extend the guard to assert one definition of `digestOf`, or state the limitation in the file. Backlog: `the-digest-has-no-uniqueness-guard` | **FIXED** | executor | `confirmation-binds-values.test.ts:216` asserts one definition each; re-injecting a second `digestOf` fails it. Backlog item `the-digest-has-no-uniqueness-guard` filed and may be closed against this |

**Totals: 5 findings — 0 open, 5 FIXED.**

## Mandatory recheck evidence

| Check | Command | Result |
|---|---|---|
| Conflict markers | `grep -rn '^(<<<<<<<\|=======\|>>>>>>>)' src/ app/ tests/` | PASS — none |
| Debt markers, touched paths | `grep -rn 'TODO\|FIXME\|HACK\|XXX'` over touched source | PASS — none |
| Stale exports | Call sites for `confirmationTarget`, `digestOf`, `editIntent`, `Confirmation` | PASS — all live. `rebindTarget` removed, no orphan references |
| Fallback masking | `??` / `?.` in touched paths | PASS — `extras.confirmation?.target` resolves to `undefined`, which `enforce()` refuses for a destructive tool. Fails closed |
| Dependency direction | `boundaries.test.ts` | PASS — domain imports nothing outward; `app/` imports no domain |
| Runtime dual-path | Manual + guard | PASS — targets and digest both. PG-001 was a dual definition of the digest; now one, and guarded |
| Contract consistency | `Confirmation` declared once, imported by 2 ports, 2 adapters, 2 fakes | PASS |
| `npm run typecheck` | | PASS — 0 errors |
| `npm run lint` | | PASS — 0 errors |
| `npx vitest run` | | PASS — 765 passed, 6 skipped (the new uniqueness check) |
| `./scripts/check.sh` | | PASS |
| `npm run build` | | PASS — compiled successfully |
| `DATABASE_URL=… ./scripts/check-serving.sh` | | PASS — schema applied, 4 routes answered |
| `validate <change>` | | PASS — clean |

## Not verified, and why

- **Live behaviour against BattleGrid.** No key on disk. The revived
  `apply_strategy_plan` path is proven *locally spendable*, not accepted by the
  platform. A dead path that stops being refused locally can still fail upstream.
  The proposal states this in Out of Scope; recorded here so the gate does not
  read as broader than it is.
- **UI parity**: no `docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md` rule is engaged —
  no rendered output changed. `uiux-review.md` records the reasoning.

## First-pass blocking rationale (resolved)

`digestOf` existed twice. The change's own requirement says a rule of this kind
lives in one place; its guard enforced that for targets and not for the digest
underneath them; a ticked task claimed the consolidation happened; and a review
artifact asserted it was verified. Small to fix, and the pattern around it is the
one this project keeps paying for.

## Gate rationale

Zero open violations. Spec parity was clean on the first pass and is unchanged: 2/2
requirements delivered, 0 of 9 scenarios uncovered, no regression, no unspecified
behaviour, scope held. The CRITICAL was a redundancy rather than a behavioural
defect — no runtime path was wrong, and the risk was drift between two copies —
which is why the change is fit to archive once fixed rather than needing rework.

The guard gap that let it through is closed, and closed the way this project
requires: re-injected and seen to fail.

**Still not verified against BattleGrid.** No key on disk, so the revived
`apply_strategy_plan` path is proven locally spendable and not platform-accepted.
That is recorded in the proposal's Out of Scope and is not a gate finding — but it
means the most consequential fix in this change is unproven end to end, and the
next live session should exercise a compile-and-apply before anything else.
