---
name: planner
description: Full-track planning lane that turns a proposed change into an implementation plan, review scaffolds, and a decision log without touching production code. Reads behavior from the change's delta specs and engineering rules from docs/checklists/ checklists. Use after the proposer creates a full-track change and you need a file-level plan with checklist scaffolding for executor self-review and auditor production-gate verification.
---

# Planner

## Lane

This skill owns planning only, on `full`-track changes.

On `lite` and `standard` tracks the proposer's `tasks.md` **is** the plan —
skip this skill. Run it when the change is `full`, or when the user explicitly
asks for a master plan.

It prepares:
1. The implementation plan (master plan).
2. The execution checklist (for the executor to track progress).
3. The production-gate checklist (for the auditor to verify).
4. Review artifact scaffolds (for the executor to fill with evidence).
5. The decision log (for accountability across all phases).

It does NOT:
- Execute code or modify production files.
- Run production gate audits.
- Create or modify checklists in `docs/checklists/` (that's the checklist-generator).

## Required Inputs

- A change ID with an existing folder at `openspec/changes/<change-id>/`,
  containing at minimum `proposal.md` and its delta specs
- Diff base ref for later gates (default: `origin/main`)

If no change folder exists, stop and tell the user to run `/propose` first. The
planner plans *a change*; it does not invent one.

## Where It Reads Rules From

The planner hardcodes nothing. Two sources, two different jobs:

**Behavior — what must become true** (`openspec/`):
```
openspec/changes/<change-id>/proposal.md      → intent, scope, out-of-scope
openspec/changes/<change-id>/specs/**/spec.md → the requirements this change must satisfy
openspec/changes/<change-id>/design.md        → approach and decisions (if present)
openspec/specs/**/spec.md                     → current behavior of touched capabilities
openspec/config.yaml                          → project context and per-artifact rules
```

**Engineering standards — how we build** (`docs/checklists/`):
```
docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md  → Constraints, layers, patterns, quality gate commands
docs/checklists/DATA_PIPELINE_REVIEW_CHECKLIST.md → Data flow rules, source-of-truth principle
docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md  → UI rules (if file exists; skip if no frontend)
```

If the required checklists don't exist, tell the user to run the
checklist-generator first. The planner cannot operate without them.

See `.claude/references/change-lifecycle.md` for the full layout.

## Core Artifacts

Create or update these planning artifacts in `openspec/changes/<change-id>/plan/`:

- Master plan: `openspec/changes/<change-id>/plan/master-plan.md`
- Data pipeline review doc: `openspec/changes/<change-id>/plan/data-review.md`
- Architecture review doc: `openspec/changes/<change-id>/plan/architecture-review.md`
- UI review doc: `openspec/changes/<change-id>/plan/uiux-review.md` (required for UI scope, otherwise explicit N/A rationale)
- Decision log: `openspec/changes/<change-id>/plan/decision-log.md`

The master plan is the handoff contract for execution.

## Planning Workflow

### Step 0: Read the Change

```bash
python3 .claude/tools/openspec.py status <change-id>
python3 .claude/tools/openspec.py validate <change-id>
```

1. Read `proposal.md` — intent, scope, **out of scope**.
2. Read every delta spec in `specs/`. Build the requirement list: every ADDED
   and MODIFIED requirement is something the plan must make true.
3. Read `design.md` if it exists.
4. Read `openspec/specs/<capability>/spec.md` for every touched capability —
   the plan must not break requirements that already hold.
5. Read `openspec/config.yaml` for project context and rules.

If validation reports errors, stop and hand back to the proposer. Planning
against a broken delta wastes the whole downstream chain.

### Step 1: Read Project Rules

1. Read repo constraints if present (`AGENT.md`, `CLAUDE.md`, scoped instructions).
2. Read ALL checklists in `docs/checklists/`:
   - `docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md` — REQUIRED
   - `docs/checklists/DATA_PIPELINE_REVIEW_CHECKLIST.md` — REQUIRED
   - `docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md` — OPTIONAL (skip UI sections if not present)
3. If any REQUIRED checklist is missing, STOP and tell the user:
   "Checklists not found in docs/checklists/. Run the checklist-generator first to create project-specific checklists."

### Step 2: Extract Project-Specific Information from Checklists

From the ARCHITECTURE checklist, extract:
- **Layer model** (from the Layer Overview diagram)
- **Constraints** (from the Quick Reference Card)
- **File naming conventions** (from File Naming & Location sections)
- **Quality gate commands** (from the Code Quality / Quality Gate section)
- **Architecture pattern** (from the "Based On" header)

From the DATA PIPELINE checklist, extract:
- **Pipeline layers** (from the Pipeline Overview diagram)
- **Source-of-truth principle** (the Iron Rule)
- **Allowed vs prohibited client operations**

From the UI checklist (if present), extract:
- **Component rules** (from Component Structure section)
- **Accessibility requirements** (from Accessibility section)
- **Responsive requirements** (from Responsive/Mobile section)

### Step 3: Inspect Current Code

If code exists:
- Inspect current code paths relevant to the goal.
- Draft touched-file inventory BEFORE writing tasks.
- Map dependencies between affected files.

If greenfield (no code):
- Use the Idea Brief (`_IDEA/` folder) and Feature Spec (`_PM/` folder) if they exist.
- File inventory will be all `create` actions.

### Step 3b: Build the Requirement Coverage Matrix

This is the spine of a full-track plan. Every requirement in the deltas must
land somewhere in the file inventory:

| Requirement | Delta op | Implementing file(s) | Scenario → verification |
|---|---|---|---|
| Two-Factor Authentication | ADDED | `src/auth/totp.ts` (create) | 2FA enrollment → `test/auth/totp.test.ts` |
| Session Expiration | MODIFIED | `src/auth/session.ts:41` (modify) | Idle timeout → existing test, update bound |

Rules:
- **Every ADDED/MODIFIED requirement gets at least one row.** A requirement
  with no implementing file means the plan does not deliver the change.
- **Every scenario gets a verification.** Name the test file or the manual
  check. This is what the verifier and auditor check against later.
- **Every REMOVED requirement gets a deletion row.** Removing it from the spec
  without removing it from the code is a spec that lies.
- A file in the inventory that serves no requirement is either infrastructure
  (say so) or scope creep (drop it).

### Step 4: Create Master Plan

Create `openspec/changes/<change-id>/plan/master-plan.md` using `references/master-plan-template.md` with:

1. **Status** — change ID, current phase, base ref, last updated
2. **Objective** — 1-2 sentences from the proposal's Why
2b. **Requirement Coverage Matrix** — from Step 3b
3. **Non-Negotiable Constraints** — extracted from architecture checklist Quick Reference Card
4. **Architectural Boundaries** — layers and packages from architecture checklist Layer Overview + actual codebase structure
5. **File & Responsibility Inventory** — every file to create/modify/delete with:
   - Action (create/modify/delete)
   - Layer/area (from architecture checklist layer model)
   - Responsibility (SRP — one sentence)
   - SOLID notes (if relevant)
6. **Dependency / Call-Tree Sketch** — how files connect
7. **Checklist Coverage Matrices** — map which checklist rules apply to which files:
   - Data pipeline coverage (which pipeline layers are touched)
   - Architecture coverage (which architecture rules apply)
   - UI coverage (which UI rules apply, or N/A)
8. **Phase-by-Phase Tasks** — file-level tasks with:
   - File path
   - Action (create/modify/delete)
   - Specific change
   - Code region (if modifying existing file)
   - Notes (invariants, edge cases, failure modes)
9. **Three Phase Review Checklists**:
   - Phase 1 (Planner) — planning completeness
   - Phase 2 (Executor) — execution tracking with quality gate commands from architecture checklist
   - Phase 3 (Auditor) — production gate verification
10. **Artifacts list** — all required files

### Step 5: Create Review Doc Scaffolds

Create review docs with placeholder sections for the executor to fill:

- `openspec/changes/<change-id>/plan/data-review.md` — scope summary, checklist matrix, `Status: PENDING EXECUTION EVIDENCE`
- `openspec/changes/<change-id>/plan/architecture-review.md` — same structure
- `openspec/changes/<change-id>/plan/uiux-review.md` — same structure (or explicit N/A if no UI checklist exists)

Each review doc should reference the specific checklist rules that apply to this feature's scope.

### Step 6: Create Decision Log

Create `openspec/changes/<change-id>/plan/decision-log.md` using `references/decision-log-template.md`.

Write initial Phase 1 entries:
- Scope boundaries
- Key assumptions
- Planned exceptions (if any)
- Executor handoff notes

Use required entry fields: `Timestamp`, `Phase`, `Type`, `Decision`, `Impacted files`, `Reason`, `Approved by`, `Next action`

Log only high-signal decisions — no cosmetic changes.

### Step 7: Verify All Artifacts Exist

Before marking complete, verify EVERY artifact exists on disk. This is mandatory — do not skip.

```
REQUIRED FILES (verify each one exists):
  openspec/changes/<change-id>/plan/master-plan.md          — must end with "PLAN READY FOR REVIEW"
                                                              and contain the Requirement Coverage Matrix
  openspec/changes/<change-id>/plan/data-review.md          — must contain checklist matrix + "PENDING EXECUTION EVIDENCE"
  openspec/changes/<change-id>/plan/architecture-review.md  — must contain checklist matrix + "PENDING EXECUTION EVIDENCE"
  openspec/changes/<change-id>/plan/uiux-review.md          — must exist (with content OR explicit "N/A — no UI scope")
  openspec/changes/<change-id>/plan/decision-log.md         — must contain at least 1 Phase 1 entry

VERIFY:
  ls openspec/changes/<change-id>/plan/
  → Count must match expected artifact count (5 minimum)
  → If any file is missing, create it before proceeding
```

If any artifact is missing, CREATE IT NOW. Do not set the status marker until all artifacts exist.

### Step 8: Set Status

Set master plan final line to: `PLAN READY FOR REVIEW`

---

## Hard Rules

1. **Do NOT modify any files outside `openspec/changes/<change-id>/plan/`** — no production code, no config files, no checklist files.
2. **Do NOT edit the delta specs.** If a requirement is wrong, ambiguous, or
   missing, hand back to the proposer. The planner plans against the agreed
   behavior; it does not renegotiate it.
3. **Do NOT skip checklist scaffolding** for any phase.
4. **Do NOT leave artifact paths implicit** — list every file the executor and auditor will need.
5. **Do NOT plan work outside the proposal's declared scope.** If the plan
   needs it, the proposal needs updating first — say so and stop.
6. **Do NOT start execution** — planning only. Execution starts only after explicit user approval.
7. **Do NOT hardcode project-specific rules** — read them from the checklists in `docs/checklists/`.
8. **Do NOT plan fallback or legacy dual paths** — one clean implementation path per feature.
9. **Do NOT continue past planning** under any circumstance without explicit user approval.

## Handoff

- Execution starts ONLY after explicit user approval of the plan.
- Explicit approval means the user has reviewed the plan and directly instructed execution to begin.
- Until approval is provided, planner responses must remain planning-only.
- Executor input must be the approved plan path: `openspec/changes/<change-id>/plan/master-plan.md`
- Next skill: **executor**

## Completion

ALL of the following must be true before ending with `PLAN READY FOR REVIEW`:

- [ ] Master plan exists at `openspec/changes/<change-id>/plan/master-plan.md` and ends with `PLAN READY FOR REVIEW`.
- [ ] Data review exists at `openspec/changes/<change-id>/plan/data-review.md` with checklist matrix and contract map placeholder.
- [ ] Architecture review exists at `openspec/changes/<change-id>/plan/architecture-review.md` with component checklist matrix.
- [ ] UI/UX review exists at `openspec/changes/<change-id>/plan/uiux-review.md` with UI scope matrix (or explicit N/A).
- [ ] Decision log exists at `openspec/changes/<change-id>/plan/decision-log.md` with at least 1 Phase 1 entry.
- [ ] Requirement Coverage Matrix covers every ADDED/MODIFIED/REMOVED requirement in the deltas.
- [ ] All 5 files verified on disk via `ls openspec/changes/<change-id>/plan/`.
- [ ] The planner stops after producing/revising planning artifacts — no implementation work.

End response with: `PLAN READY FOR REVIEW`
