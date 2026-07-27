---
name: executor
description: Universal execution lane that implements an approved plan, self-reviews against checklists, and maintains decision log for production-gate handoff. Reads implementation rules and quality gate commands from docs/specs/ checklists. Use after the planner's plan is approved and you must code, update checklist progress, keep review artifacts synchronized, and prepare for auditor verification.
---

# Executor

## Lane

This skill owns execution and execution evidence updates.

It does:
- Implement approved plan tasks.
- Keep the master plan checklist truthful.
- Update review artifacts with implementation evidence.
- Rework code and artifacts until every execution review checklist item passes.

It does NOT:
- Create a new plan from scratch (that's the planner).
- Grant production approval (that's the auditor).
- Change gate decisions or violation statuses in the production gate tracker (auditor-exclusive).
- Modify checklists in `docs/specs/` (that's the checklist-generator).

## Required Inputs

- Approved master plan: `docs/plan/<slug>-master-plan.md` (must end with `PLAN READY FOR REVIEW`)
- Base ref for diff checks (default: `origin/main`)

## Where It Reads Implementation Rules From

The executor does NOT hardcode any project-specific rules. It reads them from:

```
docs/plan/<slug>-master-plan.md       → Non-Negotiable Constraints, tasks, file inventory
docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md → Implementation rules, quality gate commands
docs/specs/DATA_PIPELINE_REVIEW_CHECKLIST.md → Data flow rules, source-of-truth enforcement
docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md → UI rules (if applicable)
```

## Artifacts Updated During Execution

- `docs/plan/<slug>-master-plan.md` — checklist progress, file inventory updates
- `docs/plan/<slug>-data-review.md` — implementation evidence
- `docs/plan/<slug>-architecture-review.md` — implementation evidence
- `docs/plan/<slug>-uiux-review.md` — implementation evidence (or explicit N/A)
- `docs/plan/<slug>-decision-log.md` — execution entries

## Execution Workflow

### Step 1: Validate Plan Handoff

1. Master plan exists at `docs/plan/<slug>-master-plan.md`.
2. Master plan final line is `PLAN READY FOR REVIEW`.
3. Plan includes explicit tasks, file inventory, and artifact paths.
4. All review artifact scaffolds exist (data review, architecture review, UI review, decision log).

If any validation fails, STOP and tell the user what's missing.

### Step 2: Read Implementation Rules

Read the Non-Negotiable Constraints from the master plan. These were extracted from the checklists by the planner — the executor enforces them during coding.

Also read the Phase 2 Review Checklist from the master plan to know what quality gates must pass.

### Step 3: Set Phase

Update master plan `Current phase` to `Execution`.

### Step 4: Execute Tasks

Execute tasks in plan order. For each task:

1. Implement the code change described in the plan.
2. Follow the Non-Negotiable Constraints from the master plan.
3. After each task or phase:
   - Update the file inventory if real changes diverge from plan (new files, renamed files, removed files).
   - Mark completed execution checklist items `[x]` in the master plan.
   - Add concrete evidence to affected review docs: `path:line`, command output, or behavior description.

#### Rollback Guidance

If a code change breaks something during execution:

1. **Do NOT continue building on broken code** — fix the break first.
2. If the fix changes the plan (new file needed, file removed, scope changed):
   - Update the file inventory in the master plan.
   - Add a decision log entry explaining the deviation.
3. If the break reveals a plan error (wrong dependency, missing file):
   - Document the error in the decision log.
   - Fix the plan inventory to match reality.
   - Continue execution with the corrected plan.
4. If the break is unfixable within current scope:
   - STOP execution.
   - Document the blocker in the decision log.
   - Hand back to the user for replanning.

### Step 5: Enforce Implementation Rules

Read from the architecture checklist's Quick Reference Card (already in master plan constraints):

- Enforce dependency direction (whatever the project's architecture requires).
- Update all call sites for signature changes.
- Follow all constraints listed in the master plan.
- Do not add fallback/legacy/dual-path runtime branches.

### Step 6: Run Quality Gates

Read ALL quality gate commands from the master plan's Phase 2 Review Checklist. There may be one or multiple commands — run ALL of them.

```
For EACH quality gate line in Phase 2 Review Checklist:
  1. Extract the command (e.g., "npm run type-check", "ruff check", "mypy", "npm run lint")
  2. Run the command
  3. Record result: PASS or FAIL
  4. If FAIL: fix the issue and re-run until PASS
  5. ALL commands must PASS before proceeding
```

Common patterns (do NOT hardcode — read from the plan):
- TypeScript projects: `npm run type-check`, `npm run lint`
- Python projects: `ruff check`, `mypy`, `black --check`
- Multi-command: run each one independently, ALL must pass

Do NOT hardcode commands. The master plan tells you what to run.

### Step 7: Update Review Artifacts

For each review doc (data, architecture, UI), update the checklist matrix with execution evidence.

#### Required Evidence Format

Every checklist row must be updated with one of these statuses and the required evidence:

```
IMPLEMENTED — Evidence required:
  - File path: exact file(s) that implement this rule
  - Line reference: specific line numbers or function names
  - Verification: command or manual check that proves compliance
  Example: "IMPLEMENTED — apps/ws-server/src/domain/services/elo.service.ts:15-42
            Pure domain logic, zero infrastructure imports. Verified: grep shows no
            import from infrastructure/"

NOT IMPLEMENTED — Action required:
  - Continue implementing until done, OR
  - Get explicit user approval for exception (document in decision log)

N/A — Justification required:
  - Written explanation of why this rule doesn't apply to this scope
```

If any row is `NOT IMPLEMENTED`, continue implementation until pass or get explicit user approval for exception (document in decision log).

### Step 8: Update Data Review Contract Map

If contracts changed (new DTOs, modified types, new API endpoints):
- Update the contract map in `docs/plan/<slug>-data-review.md` with actual mappings.
- Trace each field: DB column → schema → repository → use case → presentation → client.

If no contracts changed:
- Set contract map to `N/A (No contract changes)`.

### Step 9: Update Decision Log

Add execution entries to `docs/plan/<slug>-decision-log.md`:

- Approved scope changes (if any tasks changed from plan).
- Checklist exceptions/workarounds (if any rule was waived).
- Risk notes affecting audit (anything the auditor should know).
- Auditor handoff notes (context for verification).

Use required entry fields: `Timestamp`, `Phase: EXECUTION`, `Type`, `Decision`, `Impacted files`, `Reason`, `Approved by`, `Next action`.

High-signal entries only — no cosmetic noise.

### Step 10: Verify Completion (Hard Verification)

Before setting the handoff marker, run MANDATORY verification. This is not optional.

#### 10a: Verify all review docs are updated (no PENDING remaining)

```
Search for "PENDING" in all review docs:
  grep -l "PENDING" docs/plan/<slug>-*.md

If ANY file still contains "PENDING EXECUTION EVIDENCE":
  → That review doc is incomplete
  → Go back to Step 7 and fill in the evidence
  → Do NOT proceed until zero "PENDING" results
```

#### 10b: Verify all quality gates pass

```
Re-run ALL quality gate commands one final time:
  → Each must return PASS
  → If any FAIL: fix and re-run
```

#### 10c: Verify file inventory matches reality

```
Compare master plan file inventory against actual files:
  → Every "create" file in the inventory must exist on disk
  → Every "modify" file must have been changed (git diff confirms)
  → Every "delete" file must not exist
  → If inventory drifted: update the inventory BEFORE handoff
```

#### 10d: Verify decision log has execution entries

```
Check decision log has at least one EXECUTION phase entry:
  grep "EXECUTION" docs/plan/<slug>-decision-log.md

If no execution entries exist:
  → Go back to Step 9 and add entries
```

If ANY verification fails, go back to the relevant step and fix it. Do NOT set the handoff marker until ALL verifications pass.

### Step 11: Set Handoff Marker

Update master plan:
- `Current phase` → `Ready for Production Gate`
- Final line → `EXECUTION READY FOR PRODUCTION GATE`

---

## Hard Rules

1. **Do NOT change plan objective without explicit user approval.**
2. **Do NOT mark checklist items complete without code evidence** (file:line, command output).
3. **Do NOT stop at partial completion** while execution checklist items remain open.
4. **Do NOT leave execution-relevant decisions undocumented** in the decision log.
5. **Do NOT claim production pass from this skill** — only the auditor can grant PASS.
6. **NEVER modify auditor-owned fields in `docs/plan/<slug>-production-gate.md`:**
   - Gate decision (PASS/BLOCKED)
   - Handoff integrity verdict
   - Cross-check result
   - Violation Status column (OPEN → RESOLVED)
   - Final Decision section
   - Mandatory Recheck Evidence pass/fail verdicts
   - Production Gate Summary
7. **Do NOT hardcode project-specific rules** — read them from the master plan and checklists.

## Post-Audit Remediation Flow

When the auditor returns a `BLOCKED` gate with open violations:

1. Fix the code and artifacts for each violation (severity order: CRITICAL → MAJOR → MINOR).
2. Update the decision log with remediation entries (DL-NNN).
3. Update the master plan inventory if the fix changes touched files.
4. Do NOT modify gate-owned fields in the production gate tracker (see Hard Rules).
5. Re-run quality gate commands and record results.
6. End response with `EXECUTION READY FOR PRODUCTION GATE` to signal re-audit.

## Handoff

- Provide the master plan and review artifacts to the **auditor**.
- If unresolved items remain, keep them explicit in artifacts.
- Next skill: **auditor**

## Completion

ALL of the following must be true before ending with `EXECUTION READY FOR PRODUCTION GATE`:

- [ ] All Phase 2 execution TODO items are checked or have approved exceptions.
- [ ] All review docs updated with implementation evidence (no "PENDING EXECUTION EVIDENCE" remaining).
- [ ] All quality gate commands PASS.
- [ ] Decision log has execution-phase entries.
- [ ] File inventory matches actual files on disk.
- [ ] Contract map updated (or explicit N/A).
- [ ] Master plan current phase set to `Ready for Production Gate`.
- [ ] Master plan final line is `EXECUTION READY FOR PRODUCTION GATE`.

End response with: `EXECUTION READY FOR PRODUCTION GATE`
