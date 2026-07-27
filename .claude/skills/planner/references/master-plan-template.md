# <TITLE> - Implementation Plan (Master Handoff Document)

## Status

- Change ID: `<change-id>`
- Change folder: `openspec/changes/<change-id>/`
- Track: `full`
- Current phase: `Planning | Execution | Ready for Production Gate | Production Gate Audit`
- Base ref for diffs: `origin/main`
- Last updated: `<YYYY-MM-DD>`

## Objective

<1-2 sentences describing what will change and why — from the proposal's Why>

## Requirement Coverage Matrix

<!-- INSTRUCTION: One row per requirement in the change's delta specs. This is
     the contract between the plan and the behavior that was agreed. Every
     ADDED/MODIFIED/REMOVED requirement must appear. The auditor checks it. -->

| Requirement | Capability | Delta op | Implementing file(s) | Scenario → verification |
|---|---|---|---|---|
| `<name>` | `<capability>` | ADDED/MODIFIED/REMOVED/RENAMED | `<path>` (create/modify/delete) | `<scenario>` → `<test file or manual check>` |

Out of scope (from the proposal — do not implement):
- `<item>`

## Non-Negotiable Constraints

<!-- INSTRUCTION: Extract these from the project's ARCHITECTURE_REVIEW_CHECKLIST.md
     Quick Reference Card section. Do NOT hardcode. Examples of what might appear: -->

- <Constraint from architecture checklist Quick Reference Card>
- <Constraint from architecture checklist Quick Reference Card>
- <Quality gate commands from architecture checklist Code Quality section>

## Architectural Boundaries (Design Slice)

<!-- INSTRUCTION: Extract layer names from ARCHITECTURE_REVIEW_CHECKLIST.md Layer Overview.
     Extract actual package/folder names from the codebase (ls root). -->

- Packages/apps touched: `<from codebase structure>`
- Layers touched: `<from architecture checklist Layer Overview>`
- Contracts impacted: `<shared types/DTOs affected>`

## File & Responsibility Inventory (SOLID)

### Component / Module Hierarchy (Touched)

```text
<package or app>/
  <area>/
    <module>/
      <file>
```

### Inventory Table

| File | Action | Replace/Move To | Layer/Area | Responsibility (SRP) | SOLID Notes |
|------|--------|-----------------|------------|-----------------------|-------------|
| `<path>` | create/modify/delete | `<path or N/A>` | `<from checklist layers>` | `<1 sentence>` | `<DIP/ISP/OCP/LSP if relevant>` |

## Dependency / Call-Tree Sketch

```text
<entrypoint> -> <module> -> <module> -> <sink>
```

## DATA_PIPELINE_REVIEW_CHECKLIST Coverage

- Checklist source: `docs/specs/DATA_PIPELINE_REVIEW_CHECKLIST.md`
- Source-of-truth statement: `<where data originates — DB, external API, etc.>`
- Contract map status: `N/A (No contract changes) | Included`

### Layer Coverage Matrix

<!-- INSTRUCTION: Use layer names from the project's DATA_PIPELINE_REVIEW_CHECKLIST.md
     Pipeline Overview. Number of layers varies per project. -->

| Layer | Requirement | Planned Coverage | Status |
|-------|-------------|------------------|--------|
| `<layer from data pipeline checklist>` | `<requirement>` | `<how covered>` | Planned |

## ARCHITECTURE_REVIEW_CHECKLIST Coverage

- Checklist source: `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md`
- Architecture verdict: `Pass | Changes Requested`

### Component Checklist Matrix

| Component | Checklist Category | Mandatory Rule |
|-----------|-------------------|----------------|
| `<file>` | `<category from checklist>` | `<rule from checklist>` |

## UI_COMPONENT_REVIEW_CHECKLIST Coverage

<!-- INSTRUCTION: If docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md does not exist,
     set UI scope to N/A and skip this section entirely. -->

- Checklist source: `docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md`
- UI scope touched: `Yes | No | N/A (no UI checklist — backend-only project)`
- Verdict: `Pass | Violations Found | N/A`

### UI Scope Matrix

<!-- INSTRUCTION: Only include if UI checklist exists. Extract categories from
     the project's UI checklist sections. -->

| UI Category | Scope File(s) | Requirement | Status |
|-------------|---------------|-------------|--------|
| `<from UI checklist sections>` | `<files>` | `<rule from checklist>` | Planned |

## Phase 1 - Planning (Implementation Plan)

### Assumptions / Open Questions

- <assumption or question>

### Decision Log Requirements

- Decision log file: `openspec/changes/<change-id>/plan/decision-log.md`
- Required entry fields: `Timestamp`, `Phase`, `Type`, `Decision`, `Impacted files`, `Reason`, `Approved by`, `Next action`
- Phase 1 minimum entries:
  - scope boundaries
  - key assumptions
  - planned exceptions
  - executor handoff notes

### Phase-by-Phase Tasks

Phase 1: <phase name>
- File: `<path>`
  - Action: `create | modify | delete`
  - Change: <specific change>
  - Code region: <symbol + approximate line numbers> (if modifying)
  - Notes: <invariants, edge cases, failure modes>

Phase 2: <phase name>
- File: `<path>`
  - Action: `create | modify | delete`
  - Change: <specific change>
  - Code region: <symbol + approximate line numbers> (if modifying)
  - Notes: <invariants, edge cases, failure modes>

## Phase 1 Review Checklist (Planner-Owned)

- [ ] Objective and constraints are explicit and testable.
- [ ] Constraints extracted from project checklists (not hardcoded).
- [ ] File inventory covers all expected touched files.
- [ ] Dependency/call-tree sketch is included.
- [ ] Data pipeline checklist coverage is mapped.
- [ ] Architecture checklist coverage is mapped.
- [ ] UI checklist coverage is mapped (or N/A with rationale).
- [ ] Artifacts section lists all required review docs.
- [ ] Decision log exists and has Phase 1 entries.
- [ ] Final line is set to `PLAN READY FOR REVIEW`.

## Phase 2 - Execution (TODO Checklist)

- [ ] Phase 1: <phase name>
  - [ ] `<file>` - <short task>
- [ ] Phase 2: <phase name>
  - [ ] `<file>` - <short task>

## Phase 2 Review Checklist (Executor-Owned)

- [ ] Execution TODO checklist reflects real progress.
- [ ] Inventory and module hierarchy match actual changed files.
- [ ] Data review includes implementation evidence.
- [ ] Architecture review includes implementation evidence.
- [ ] UI/UX review includes implementation evidence or explicit N/A.
- [ ] Decision log has execution entries for scope changes/exceptions/handoff notes.

<!-- INSTRUCTION: Add quality gate commands extracted from the architecture checklist
     Code Quality section. Examples (DO NOT hardcode — read from checklist):
     - [ ] Type-check passes: <command from checklist>
     - [ ] Lint passes: <command from checklist>
     - [ ] <Any other quality gate from checklist>
-->

- [ ] Quality gate: `<command from architecture checklist Code Quality section>`
- [ ] Quality gate: `<command from architecture checklist Code Quality section>`
- [ ] Final line is set to `EXECUTION READY FOR PRODUCTION GATE`.

## Phase 3 Review Checklist (Production-Gate Auditor-Owned)

- [ ] Execution handoff integrity validated.
- [ ] Data pipeline parity verified against live code.
- [ ] Architecture parity verified against live code.
- [ ] UI parity verified against live code (or N/A evidence).
- [ ] Technical debt scan clean (no stale/redundant/deprecated/fallback code).
- [ ] Contract consistency verified across touched layers.
- [ ] Production gate tracker updated: `openspec/changes/<change-id>/plan/production-gate.md`.
- [ ] Decision log reviewed and updated with gate rationale/waivers.
- [ ] Gate decision is `PASS` only when zero open violations remain.

## Artifacts

- Master plan: `openspec/changes/<change-id>/plan/master-plan.md`
- Data review: `openspec/changes/<change-id>/plan/data-review.md`
- Architecture review: `openspec/changes/<change-id>/plan/architecture-review.md`
- UI/UX review: `openspec/changes/<change-id>/plan/uiux-review.md`
- Decision log: `openspec/changes/<change-id>/plan/decision-log.md`
- Production gate tracker: `openspec/changes/<change-id>/plan/production-gate.md`

PLAN READY FOR REVIEW
