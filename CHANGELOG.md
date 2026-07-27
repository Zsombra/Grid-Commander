# Development Notes — dev-skills

## Status: v3.0 — Spec Layer + Tracking (2026-07-27)

Merged the best of [OpenSpec](https://github.com/Fission-AI/OpenSpec) (MIT) into
the v2.1 pipeline. v2.1 produced good plans that went nowhere; v3.0 adds the
half that makes them compound.

### The problem v2.1 had

- No source of truth. Every feature wrote `docs/plan/<slug>-*.md` files that
  piled up forever and never accumulated into a description of the system.
  Feature #2 started from zero.
- No lifecycle. Plans were never finished, only abandoned.
- No brownfield model. Changing existing behavior meant rewriting a plan.
- One size of ceremony: a typo fix cost five documents and a production gate.
- Changes collided — artifacts were distinguished by filename prefix, so two
  in-flight features shared one directory.
- "Done" was prose, so the auditor had nothing objective to hold code against.

### What was taken from OpenSpec

| Feature | Why |
|---|---|
| `openspec/specs/` as living source of truth | The thing v2.1 was missing entirely |
| Delta specs (ADDED/MODIFIED/REMOVED/RENAMED) | Makes brownfield work first-class |
| Change as a self-contained folder | Parallel work, clean review, real archive |
| Archive-merge cycle | Closes the loop; specs evolve with the system |
| Requirement + Scenario format (RFC 2119) | Objective, testable definition of done |
| Artifact dependency graph, enablers not gates | Order without waterfall |
| Progressive rigor (`lite`/`standard`/`full`, `skip_specs`) | Ceremony matched to stakes |
| Three verification dimensions | Completeness · correctness · coherence |
| Explore-before-propose | Catches wrong turns at the cheapest moment |
| `config.yaml` context + per-artifact rules | Project constraints injected everywhere |

Not taken: the TypeScript CLI, stores/multi-repo, telemetry. The on-disk format
is deliberately byte-compatible with the `openspec` CLI, so adopting it later
is optional rather than a migration.

### New

- **`.claude/tools/openspec.py`** — zero-dependency Python 3 tool implementing
  `list`, `status`, `validate`, `archive`. Turns "is this change ready?" into a
  computation. 15 validation codes; archive enforces validate → write specs →
  move folder, so a failure leaves the change intact and re-runnable.
- **`.claude/references/spec-format.md`** — normative requirement/scenario/delta
  format, validation codes, progressive rigor, right-sizing.
- **`.claude/references/change-lifecycle.md`** — folder layout, tracks, artifact
  graph, the loop, archiving rules, bootstrapping.
- **Skills**: `proposer` (entry point), `verifier` (advisory 3-dimension check),
  `archiver` (delta merge + archive).
- **Commands**: `/explore`, `/propose`, `/status`, `/verify`, `/archive`.
- **`openspec/`** scaffold with `config.yaml` template.

### Changed

- `planner` — now full-track only; reads delta specs; produces a **Requirement
  Coverage Matrix** mapping every requirement to implementing files and
  scenario verifications. Cannot edit deltas or plan out-of-scope work.
- `executor` — track-aware (steps marked `[full]` are skipped on lite/standard);
  reads the deltas as the definition of done; must update a delta rather than
  diverge from it silently; cannot touch `openspec/specs/`.
- `auditor` — new **Spec Parity** coverage section (§0), run first: every
  ADDED/MODIFIED/REMOVED requirement gets a delivered/not-delivered verdict with
  evidence. Also checks unspecified behavior, scope adherence against the
  proposal, regressions against existing specs, and task honesty. New categories
  `SPEC_PARITY`, `SCOPE`, `HANDOFF`. Cannot edit specs or archive.
- `/spec` — new Phase 4 converts the `_PM/` narrative into delta specs, with an
  explicit mapping table for what does and does not cross over.
- `/analyze` — reports spec coverage per component and flags drift.
- `/debug` — spec check before closing: bug in the code, or bug in the spec.
- All plan artifacts moved from `docs/plan/<slug>-*.md` into
  `openspec/changes/<change-id>/plan/*.md`.
- Templates updated: master plan gains the coverage matrix and out-of-scope
  list; production gate gains the spec parity table.

### Unchanged

`checklist-generator` and everything under `docs/specs/`. The review checklists
work exactly as before and remain binding — they are now one of two standards
the auditor checks, alongside the behavior contract.

### Tracking layer

The spec layer records what the system does and what shipped. It had no place
for work that is not a change yet, and no way for a new session or a different
agent to learn what the last one did. Both added:

- **`openspec/backlog/<item-id>.md`** — one file per item, YAML frontmatter
  (`type`, `status`, `priority`, `change`, `capability`, `blocked_by`, `tags`)
  plus What / Why it matters / Evidence / Notes. One file per item means
  parallel agents never conflict on a shared index, and the index is computed
  rather than maintained.
- **`openspec/JOURNAL.md`** — newest-first session log. Four fields: Did,
  State, Next, Watch out.
- **`board`** — one command showing capabilities, active changes with their
  computed next action, open backlog by priority, recent journal entries, and
  health. The session-start view.
- **`backlog list|show`** and **`journal`** commands; backlog validation folded
  into `validate --all`.
- **`tracker` skill** with five modes: session start, file, triage, promote to
  a change, session handoff.
- **`/board`**, **`/backlog`**, **`/handoff`** commands. `/status` narrowed to
  drilling into a single change.

**One rule holds it together:** exactly one place owns each piece of work at a
time. `idea → backlog item → change folder → archive`. A backlog item never
restates a change's tasks; it links and stops. Two systems tracking one thing
means both go stale.

**The backlog stays alive because the skills feed it.** The proposer files cut
scope, the executor files debt it took on and TODOs it left, the verifier files
warnings it did not fix, the auditor files MINORs and waivers with rationale,
the archiver files what a change did not finish, `/explore` files rejected
options, `/debug` files spec gaps. A deferral nobody records is
indistinguishable from an oversight three weeks later.

Ten new validation codes catch the specific way this dies — work finishes and
nobody updates the record: `backlog_change_archived`,
`backlog_status_behind_change`, `backlog_in_progress_without_change`,
`backlog_blocked_without_cause`, and the frontmatter/link integrity checks.

### Migration

`docs/MIGRATION_v3.md`. Mechanical; roughly ten minutes for a project with a
handful of plan docs. Existing checklists are untouched.

---

## Status: v2.1 — Full Pipeline Complete and Tested (2026-04-07)

---

## What's Finished and Working

### Universal Commands (7 commands — all tested)

| Command | Purpose | Tested On | Status |
|---------|---------|-----------|--------|
| `/idea` | Greenfield concept exploration: product definition, market context, business model, MVP prioritization (RICE), tech stack, risks | Chess Platform | ✅ |
| `/spec` | Feature specification: user stories, state machines, business logic flows, failure scenarios | AI Chatbot SaaS + Chess Platform | ✅ |
| `/logic` | Product logic validation: gap analysis, state machine extraction, concern prioritization (P0/P1/P2) | AI Chatbot SaaS + Chess Platform | ✅ |
| `/solutions` | Architecture exploration: 3 ranked options with comparison matrix, SOLID analysis, integration maps | Chess Platform | ✅ |
| `/analyze` | Architecture mapping: dependency matrix, data flow, layer identification (reads from checklist or discovers from code) | OpenBB | ✅ |
| `/debug` | Systematic debugging: read file first, trace call chain, isolate root cause, fix (works on any language/stack) | OpenBB (IMF swallowed error) | ✅ |
| `/document` | Architecture documentation: creates docs from code, weekly review mode, adapts to project structure | OpenBB | ✅ |

### Universal Pipeline Skills (4 skills — all tested)

| Skill | Purpose | Tested On | Gaps Found → Fixed |
|-------|---------|-----------|-------------------|
| checklist-generator | Creates 3 project-specific checklists from templates. Multi-architecture (Clean Architecture + Provider Pattern). Code scanning for existing codebases. | OpenBB (3 tests) + Chess Platform | Template redesign after OpenBB test |
| planner | Creates implementation plans by reading rules from checklists. 8-step workflow. | Chess Platform | 1 gap: added artifact verification step |
| executor | Implements plans, reads constraints from master plan. 11-step workflow. | Chess Platform (simulated) | 4 gaps: verification step, evidence format, rollback guidance, multi-command quality gates |
| auditor | Production gate: independent verification, violation tracking, PASS/BLOCKED. | Chess Platform (simulated) | 4 gaps: tracker verification, cannot-run handling, summary format, re-audit verification |

### Checklist Templates (2 architecture patterns)

| Pattern | Tested On | Status |
|---------|-----------|--------|
| Clean Architecture | Chess Platform | ✅ Generated 1,054 lines of project-specific checklists |
| Provider / Plugin Pattern | OpenBB | ✅ Generated 847 lines with 38 real code violations found |

---

## Complete Pipeline Flows

### Greenfield (no code)
```
/idea → /spec → /logic → /solutions (optional) → checklist-generator → planner → executor → auditor
```

### Existing Project (code exists)
```
/solutions → /spec → /logic → checklist-generator (update or create) → planner → executor → auditor
```

### Daily Development Tools
```
/analyze  → understand code before changing it
/debug    → systematic root cause analysis
/document → create/update architecture docs
```

---

## Testing History

| Test | Target | Result | What We Learned |
|------|--------|--------|-----------------|
| 1 | OpenBB (Clean Arch templates) | FAIL — 40% didn't fit | Need multi-architecture support |
| 2 | OpenBB (Provider Pattern templates) | PASS — all sections matched | Provider Pattern templates work |
| 3 | OpenBB (with code scanning) | PASS — found 38 violations | Code scanning makes v1 immediately actionable |
| 4 | AI Chatbot SaaS (/spec → /logic, no /idea) | PASS with gaps | /spec missed failure paths without /idea context |
| 5 | Chess Platform (/idea → /spec → /logic → /solutions → checklists) | PASS | Full greenfield pipeline works end-to-end |
| 6 | Chess Platform (planner test 1) | PASS with 1 gap | Missing artifact verification — fixed |
| 7 | Chess Platform (planner test 2 — after fix) | PASS | Verification step catches missing files |
| 8 | Chess Platform (executor test) | PASS with 4 gaps | Verification, evidence format, rollback, multi-command — all fixed |
| 9 | Chess Platform (executor retest — after fix) | PASS | All 4 fixes verified |
| 10 | Chess Platform (auditor test) | PASS with 4 gaps | Tracker verification, cannot-run, summary, re-audit — all fixed |
| 11 | OpenBB (/analyze test) | PASS | Discovers layers from code when no checklist exists |
| 12 | OpenBB (/debug test — IMF error) | PASS | Works on Python, no TypeScript assumptions |
| 13 | OpenBB (/document test) | PASS | Adapts to project structure, no hardcoded categories |

---

## Architecture Decisions Log

### Why /idea is separate from /solutions
- /idea = greenfield (no code, ONE stack recommendation)
- /solutions = existing code (THREE options compared)
- Different inputs, different outputs, different use cases

### Why template-per-architecture instead of one flexible template
- Tested one-size-fits-all against OpenBB — 40% didn't apply
- Adding new patterns = new folder with 3 files

### Why pipeline skills read rules from checklists (never hardcode)
- Planner, executor, auditor all read from docs/specs/ checklists
- Checklist-generator produces project-specific rules
- Pipeline skills automatically work for any project with checklists
- Trade-off: if checklists are weak, pipeline is weak. Mitigated by checklist-generator quality + auditor as safety net.

### Why every skill has a verification step before completion
- Found in planner test: artifacts could be forgotten without verification
- Applied same pattern to executor (Step 10a-d) and auditor (Gate Verification Checklist)
- Pattern: mandatory check (ls, grep, count) before status marker is set

### Why /solutions is optional for greenfield
- /idea already recommends tech stack and architecture
- /solutions after /idea re-does what /idea already did
- Only needed if user wants to explore alternatives

### Why commands are separate (not orchestrated)
- Manual handoff keeps user in control
- Each command does one job well

---

## What's Designed but UNTESTED

### UPDATE Mode (Checklist Generator)
- Designed in SKILL.md but never run
- Handles: bug reports → new rules, new patterns → new sections, code analysis → missing rules
- **Action needed**: Test on a project that already has checklists

### /document WEEKLY Mode
- Designed and built but not tested (no project with weekly doc history)
- **Action needed**: Test on a project with docs/LATEST.md

---

## What's Identified but NOT Built

### Auditor → Checklist Feedback Loop
- Auditor finds violations not in checklists → should update checklists
- **Decision**: Defer to v3.0. Build after real usage generates findings.

---

## Repo Structure

```
dev-skills/
├── SKILL.md                          ← Checklist generator (v2.1)
├── DEVELOPMENT_NOTES.md              ← This file
├── commands/                         ← Universal commands (7)
│   ├── idea.md                       ← Stage 0: Greenfield concept
│   ├── spec.md                       ← Stage 1: Feature specification
│   ├── logic.md                      ← Stage 1: Logic validation
│   ├── solutions.md                  ← Stage 2: Architecture options
│   ├── analyze.md                    ← Daily: Architecture mapping
│   ├── debug.md                      ← Daily: Systematic debugging
│   └── document.md                   ← Daily: Architecture documentation
├── skills/                           ← Universal pipeline skills (3)
│   ├── planner/
│   │   ├── SKILL.md                  ← 8-step planning with artifact verification
│   │   └── references/
│   │       ├── master-plan-template.md
│   │       └── decision-log-template.md
│   ├── executor/
│   │   └── SKILL.md                  ← 11-step execution with hard verification
│   └── auditor/
│       ├── SKILL.md                  ← Production gate with evidence resolution
│       └── references/
│           └── production-gate-template.md
├── references/                       ← Checklist templates (2 patterns)
│   ├── clean-architecture/
│   │   ├── architecture-checklist-template.md
│   │   ├── data-pipeline-checklist-template.md
│   │   └── ui-checklist-template.md
│   └── provider-pattern/
│       ├── architecture-checklist-template.md
│       ├── data-pipeline-checklist-template.md
│       └── ui-checklist-template.md
└── reference-originals/              ← BattleGrid original files (30 files)
    ├── README.md
    ├── commands/                     ← All 6 original commands
    ├── checklists/                   ← All 3 hand-written checklists
    └── skills/                       ← All 5 original pipeline skills
```
