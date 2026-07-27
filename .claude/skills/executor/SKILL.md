---
name: executor
description: Universal execution lane that implements an approved change — tasks on lite/standard, the master plan on full — self-reviews against checklists, and keeps artifacts truthful. Reads behavior from the change's delta specs and rules from docs/specs/ checklists. Use when the user says implement, build, continue, or work through the tasks.
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

- A change ID. If not given, infer it from context; if ambiguous, run
  `python3 .claude/tools/openspec.py list` and ask which one.
- Track `full`: an approved master plan at
  `openspec/changes/<change-id>/plan/master-plan.md` ending with
  `PLAN READY FOR REVIEW`.
- Track `lite`/`standard`: `tasks.md` and the delta specs. There is no master
  plan and none is needed — `tasks.md` is the plan.
- Base ref for diff checks (default: `origin/main`).

## Where It Reads Implementation Rules From

The executor does NOT hardcode any project-specific rules. It reads them from:

```
openspec/changes/<change-id>/specs/**/spec.md → THE CONTRACT — what must become true
openspec/changes/<change-id>/tasks.md         → The work items
openspec/changes/<change-id>/proposal.md      → Scope, and what is out of it
openspec/changes/<change-id>/design.md        → Approach and decisions (if present)
openspec/changes/<change-id>/plan/master-plan.md → [full] Constraints, file inventory, coverage matrix
openspec/config.yaml                          → Project context and rules
docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md   → Implementation rules, quality gate commands
docs/specs/DATA_PIPELINE_REVIEW_CHECKLIST.md  → Data flow rules, source-of-truth enforcement
docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md   → UI rules (if applicable)
```

**Read the delta specs before writing code, every time, from disk.** The
requirements are the definition of done. Tasks describe the work; requirements
describe the result. When they disagree, the requirement wins and the task is
wrong.

## Artifacts Updated During Execution

Always:
- `openspec/changes/<change-id>/tasks.md` — checkbox progress, updated as you go

Track `full` also:
- `openspec/changes/<change-id>/plan/master-plan.md` — checklist progress, file inventory updates
- `openspec/changes/<change-id>/plan/data-review.md` — implementation evidence
- `openspec/changes/<change-id>/plan/architecture-review.md` — implementation evidence
- `openspec/changes/<change-id>/plan/uiux-review.md` — implementation evidence (or explicit N/A)
- `openspec/changes/<change-id>/plan/decision-log.md` — execution entries

Steps below marked **[full]** apply only to full-track changes. On `lite` and
`standard`, do the code, the tasks file, and the quality gates.

## Execution Workflow

### Step 1: Validate Handoff

```bash
python3 .claude/tools/openspec.py status <change-id>
python3 .claude/tools/openspec.py validate <change-id>
```

1. Validation reports zero errors. If not, STOP — hand back to the proposer.
2. `tasks.md` exists and has checkboxes.
3. **[full]** Master plan exists and its final line is `PLAN READY FOR REVIEW`.
4. **[full]** Plan includes explicit tasks, file inventory, and the requirement
   coverage matrix.
5. **[full]** All review artifact scaffolds exist (data, architecture, UI, decision log).

If any check fails, STOP and tell the user what's missing.

### Step 2: Read the Contract

Read every delta spec. For each ADDED and MODIFIED requirement, note what
observable behavior must be true when you are done, and which scenarios prove it.
This list — not the task list — is the definition of done.

**[full]** Read the Non-Negotiable Constraints and the Phase 2 Review Checklist
from the master plan. These were extracted from the checklists by the planner;
the executor enforces them during coding.

### Step 3: Set Phase

**[full]** Update master plan `Current phase` to `Execution`.

### Step 4: Execute Tasks

Execute tasks in order. For each task:

1. Implement the change.
2. Follow the constraints — from the master plan on `full`, from
   `openspec/config.yaml` and the checklists otherwise.
3. Mark the checkbox `- [ ]` → `- [x]` in `tasks.md` **immediately** on
   completion. A checkbox marked before the work is real is worse than no
   checkbox — the verifier trusts it.
4. **[full]** After each task or phase:
   - Update the file inventory if real changes diverge from plan (new files, renamed files, removed files).
   - Mark completed execution checklist items `[x]` in the master plan.
   - Add concrete evidence to affected review docs: `path:line`, command output, or behavior description.

#### When Implementation Contradicts the Spec

Implementation regularly reveals that a requirement was wrong. When it does:

1. **Stop and say so.** Do not silently build something different from what
   was agreed — that is exactly the failure the spec layer exists to prevent.
2. Update the delta spec to describe what the behavior should actually be,
   and record why in the decision log (**[full]**) or your summary.
3. Then continue. A change folder that no longer matches reality is worse than
   no change folder.

Updating a spec mid-flight is normal and expected. Diverging from it quietly
is not.

#### Record What You Leave Behind

While you are in the code and remember why, file a backlog item
(`.claude/references/tracking.md`) for:

- Debt you took on deliberately to keep this change scoped
- A bug you noticed in adjacent code and did not fix
- Any `TODO`/`FIXME` you left — the auditor will find it anyway, and an item
  with your reasoning beats a marker without it
- A blocker you routed around

Do it as it happens, not at the end. The reasoning is the valuable part, and it
is gone by the time you are writing the summary.

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

### Step 4c: Implementing Design Tickets

When the work is a design ticket rather than a spec task, read
`.claude/references/design-contract.md` first, then:

```bash
python3 .claude/tools/openspec.py design tickets
python3 .claude/tools/openspec.py design show DT-NNNN
```

Work tickets in priority order. For each one:

1. Read the ticket, its surface manifest, and `openspec/design/system.json`.
2. Set `status: in-progress`.
3. Implement **presentation only**, using the named tokens. If the codebase has
   no token layer yet, create one from `system.json` — do not inline the values
   and do not invent your own names.
4. Implement **every state** in `design.states`, including `loading`, `empty`,
   and `error`. Those are where users judge quality.
5. Check each `acceptance` line yourself. They were written to be checkable.
6. Set `status: implemented`.

#### Refuse tickets that cross the lane

**A `behavior_impact: none` ticket whose implementation would require touching
behavior must be refused.** Say which requirement or state it would change, set
`status: blocked`, and tell the user it needs `/propose`.

That refusal is the safety mechanism working. The design agent cannot see
`openspec/specs/`; you can. If you implement it quietly, the specs stop
describing the product and every later audit measures against fiction.

Equally: a ticket marked `requires-spec-change` with no landed `spec_change`
does not get implemented. Validation already errors on it.

#### Respect the constraints

The surface manifest's `constraints` array is your own veto, recorded earlier.
If a ticket breaks one — keyboard navigation, masked data, a contrast floor —
reject it with the specific constraint quoted. Do not quietly drop the
constraint to make the design fit.

#### Keep the surface honest

Restyling rarely changes structure, but when it does — a component split, a new
child, a state that now exists — re-run the **ui-surveyor** so the manifest
matches. A stale manifest sends the next design round at the wrong target.

### Step 5: Enforce Implementation Rules

Read from the architecture checklist's Quick Reference Card (already in master plan constraints):

- Enforce dependency direction (whatever the project's architecture requires).
- Update all call sites for signature changes.
- Follow all constraints listed in the master plan.
- Do not add fallback/legacy/dual-path runtime branches.

### Step 6: Run Quality Gates

Read ALL quality gate commands, in this precedence:

1. `quality_gates:` in `openspec/config.yaml`
2. **[full]** The master plan's Phase 2 Review Checklist
3. The Code Quality / Quality Gate section of `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md`

There may be one or multiple commands — run ALL of them.

```
For EACH quality gate command:
  1. Extract the command (e.g., "npm run type-check", "ruff check", "mypy", "npm run lint")
  2. Run the command
  3. Record result: PASS or FAIL
  4. If FAIL: fix the issue and re-run until PASS
  5. ALL commands must PASS before proceeding
```

Common patterns (do NOT hardcode — read from config or the plan):
- TypeScript projects: `npm run type-check`, `npm run lint`
- Python projects: `ruff check`, `mypy`, `black --check`
- Multi-command: run each one independently, ALL must pass

Do NOT hardcode commands. The project tells you what to run.

### Step 6b: Self-Check Against the Requirements

Before touching the review artifacts, walk the delta specs one requirement at a
time and answer, for each:

- Which file and line implements it?
- Which test or check exercises each of its scenarios?

Any requirement you cannot answer both questions for is not done. Go back to
Step 4. This is the same pass the verifier runs — doing it yourself first is
cheaper than a round trip.

### Step 7: Update Review Artifacts

**[full] only.** On other tracks, skip to Step 10.

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
- Update the contract map in `openspec/changes/<change-id>/plan/data-review.md` with actual mappings.
- Trace each field: DB column → schema → repository → use case → presentation → client.

If no contracts changed:
- Set contract map to `N/A (No contract changes)`.

### Step 9: Update Decision Log

Add execution entries to `openspec/changes/<change-id>/plan/decision-log.md`:

- Approved scope changes (if any tasks changed from plan).
- Checklist exceptions/workarounds (if any rule was waived).
- Risk notes affecting audit (anything the auditor should know).
- Auditor handoff notes (context for verification).

Use required entry fields: `Timestamp`, `Phase: EXECUTION`, `Type`, `Decision`, `Impacted files`, `Reason`, `Approved by`, `Next action`.

High-signal entries only — no cosmetic noise.

### Step 10: Verify Completion (Hard Verification)

Before setting the handoff marker, run MANDATORY verification. This is not optional.

#### 10-pre: Verify the change itself (all tracks)

```
python3 .claude/tools/openspec.py status <change-id>
  → tasks must read N/N complete, or every open task explained

python3 .claude/tools/openspec.py validate <change-id>
  → zero errors

Every ADDED/MODIFIED requirement in the deltas has an implementation you can
name as file:line.
Every REMOVED requirement's behavior is actually gone from the code.
```

#### 10a: Verify all review docs are updated (no PENDING remaining)

**[full] only** — 10a through 10d apply to full-track changes.

```
Search for "PENDING" in all review docs:
  grep -rl "PENDING" openspec/changes/<change-id>/plan/

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
  grep "EXECUTION" openspec/changes/<change-id>/plan/decision-log.md

If no execution entries exist:
  → Go back to Step 9 and add entries
```

If ANY verification fails, go back to the relevant step and fix it. Do NOT set the handoff marker until ALL verifications pass.

### Step 11: Set Handoff Marker

**[full]** Update master plan:
- `Current phase` → `Ready for Production Gate`
- Final line → `EXECUTION READY FOR PRODUCTION GATE`

**[lite/standard]** No marker. Report progress and hand to the verifier.

---

## Hard Rules

1. **Do NOT change plan objective without explicit user approval.**
2. **Do NOT mark a task or checklist item complete without code evidence** (file:line, command output).
3. **Do NOT stop at partial completion** while execution checklist items remain open.
4. **Do NOT leave execution-relevant decisions undocumented** in the decision log.
5. **Do NOT claim production pass from this skill** — only the auditor can grant PASS.
5b. **Do NOT diverge from a requirement silently.** Update the delta spec and
    say so, or implement what the spec says. Never a third thing.
5c. **Do NOT edit `openspec/specs/`** — the source of truth is written by the
    archiver at archive time, never during execution.
5d. **Do NOT work outside the proposal's declared scope.** If the work needs it,
    update the proposal first and say so.
6. **NEVER modify auditor-owned fields in `openspec/changes/<change-id>/plan/production-gate.md`:**
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

- **[full]** Provide the master plan and review artifacts to the **auditor**
  (run the **verifier** first — it is cheaper and catches spec mismatches that
  would otherwise burn an audit cycle).
- **[lite/standard]** Hand to the **verifier**, then `/archive`.
- If unresolved items remain, keep them explicit in the artifacts.

## Completion

All tracks:

- [ ] Every task in `tasks.md` is `[x]`, or the open ones are explained.
- [ ] Every ADDED/MODIFIED requirement has a named implementation (`file:line`).
- [ ] Every REMOVED requirement's behavior is gone from the code.
- [ ] Delta specs updated wherever implementation changed the agreed behavior.
- [ ] `openspec.py validate <change-id>` reports zero errors.
- [ ] All quality gate commands PASS.
- [ ] Debt, adjacent bugs, and TODOs left behind are filed in the backlog.

Track `full` additionally, before ending with `EXECUTION READY FOR PRODUCTION GATE`:

- [ ] All Phase 2 execution TODO items are checked or have approved exceptions.
- [ ] All review docs updated with implementation evidence (no "PENDING EXECUTION EVIDENCE" remaining).
- [ ] Decision log has execution-phase entries.
- [ ] File inventory matches actual files on disk.
- [ ] Contract map updated (or explicit N/A).
- [ ] Master plan current phase set to `Ready for Production Gate`.
- [ ] Master plan final line is `EXECUTION READY FOR PRODUCTION GATE`.

End response with:
- `EXECUTION READY FOR PRODUCTION GATE` — track `full`
- `EXECUTION COMPLETE — READY FOR VERIFICATION` — tracks `lite` and `standard`
