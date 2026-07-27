# CLAUDE.md — Project Configuration
<!-- FILL IN: Project + Architecture sections. Everything else is pipeline scaffolding. -->

## Project

- **Name**: [project name]
- **Description**: [one-liner describing what this project does]
- **Status**: [new / in-development / production]

## Architecture

- **Pattern**: [Clean Architecture / Provider Pattern / MVC / other — filled by /idea or manually]
- **Language**: [TypeScript / Python / Go / etc.]
- **Framework**: [Next.js / FastAPI / Express / etc.]
- **Database**: [PostgreSQL / MongoDB / none / etc.]
- **ORM**: [Drizzle / Prisma / SQLAlchemy / none / etc.]

## Pipeline

This project uses the SKILLMOREL pipeline (v3.0), bundled in `./.claude/`.

### Available Commands (type / to use)
```
Session
/board     — Everything at a glance: changes, backlog, journal, next action
/handoff   — Close out: file what was deferred, write the journal entry
/backlog   — View, file, or triage work that is not a change yet

Spec layer
/explore   — Think through a problem before committing (no artifacts)
/propose   — Create a change: proposal + delta specs + tasks
/status    — Detailed state of a single change
/verify    — Does the implementation match the change?
/archive   — Merge deltas into the source of truth and archive

UI design (two-agent handoff)
/surface   — Survey a built UI into a manifest for the design agent
/design    — Design agent: read surfaces, own tokens, write design tickets

Product & architecture
/idea      — Explore a new project idea (greenfield only)
/spec      — Deep feature specification → delta specs
/logic     — Validate product logic
/solutions — Explore architecture options (existing codebase)

Daily work
/analyze   — Map architecture of existing code + spec coverage
/debug     — Systematic debugging, with a spec check
/document  — Create architecture documentation
```

### Available Skills (invoked automatically or by name)
```
proposer            — Creates the change folder (entry point)
checklist-generator — Creates review checklists in docs/specs/
planner             — [full track] Master plan + review scaffolds
executor            — Implements the change, runs quality gates
verifier            — Advisory: completeness, correctness, coherence
auditor             — [full track] Production gate: PASS / BLOCKED
archiver            — Merges deltas into openspec/specs, archives
tracker             — Owns the backlog and the session journal
ui-surveyor         — [UI] Surveys built UI into a surface manifest
design-director     — [UI] Design agent: owns tokens, writes design tickets
```

### Tracks

Every change declares one in `.openspec.yaml`. Right-size the ceremony.

| Track | Use for | Chain |
|---|---|---|
| `lite` | Typo fixes, copy, dep bumps, isolated bugs | proposer → executor |
| `standard` | Most feature work | proposer → executor → verifier → archive |
| `full` | Contracts, migrations, security, cross-team, hard to reverse | proposer → planner → executor → verifier → auditor → archive |

### Pipeline Flow
```
Every session: /board → ... work ... → /handoff
Not sure yet:  /explore → /propose → ...
New feature:   /propose → [planner] → executor → /verify → [auditor] → /archive
Greenfield:    /idea → /spec → /logic → checklist-generator → /propose → ...
Bug fix:       /debug → /propose (lite) → executor → /archive
UI work:       executor (plain UI) → /surface → /design → executor → /verify
Understand:    /analyze
Document:      /document
```

### The tool
```bash
python3 .claude/tools/openspec.py board
python3 .claude/tools/openspec.py backlog list
python3 .claude/tools/openspec.py design
python3 .claude/tools/openspec.py journal --limit 5
python3 .claude/tools/openspec.py list
python3 .claude/tools/openspec.py status <change>
python3 .claude/tools/openspec.py validate <change>
python3 .claude/tools/openspec.py archive <change> --apply
```

## Project Structure

```
[project root]/
├── openspec/                   — the spec layer (behavior)
│   ├── config.yaml             — project context + per-artifact rules
│   ├── JOURNAL.md              — session handoff log (newest first)
│   ├── backlog/<item-id>.md    — work that is not a change yet
│   ├── design/                 — UI contract between dev and design agents
│   │   ├── system.json         — tokens, primitives, principles
│   │   ├── surfaces/           — dev → design: what exists
│   │   └── tickets/            — design → dev: how it should look
│   ├── specs/<capability>/spec.md   — SOURCE OF TRUTH
│   └── changes/
│       ├── <change-id>/
│       │   ├── .openspec.yaml  — track, created, skip_specs
│       │   ├── proposal.md     — why + what + capabilities
│       │   ├── specs/          — delta specs (ADDED/MODIFIED/REMOVED)
│       │   ├── design.md       — how                        [full]
│       │   ├── tasks.md        — implementation checklist
│       │   └── plan/           — master plan, reviews,      [full]
│       │                         decision log, production gate
│       └── archive/YYYY-MM-DD-<change-id>/
│
├── docs/
│   ├── specs/                  — review checklists (engineering standards)
│   │   ├── ARCHITECTURE_REVIEW_CHECKLIST.md
│   │   ├── DATA_PIPELINE_REVIEW_CHECKLIST.md
│   │   └── UI_COMPONENT_REVIEW_CHECKLIST.md
│   └── MIGRATION_v3.md
├── _IDEA/                      — idea briefs (from /idea)
├── _PM/                        — feature specs (from /spec)
├── CLAUDE.md                   — this file
└── [source code]
```

**Two things named "spec":** `openspec/specs/` is *what the system does*
(behavior contract, written by the archiver). `docs/specs/` is *how we build*
(review checklists, written by checklist-generator). Both are binding.

## Conventions

- **Commits**: Use conventional commits (feat:, fix:, docs:, refactor:)
- **Branches**: feature/<name>, fix/<name>, docs/<name>
- **Quality gates**: [set `quality_gates:` in openspec/config.yaml, or the
  Quality Gate section of docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md]

## Rules

- Do not modify production code while in planner mode
- Do not skip checklist verification steps
- Do not hardcode project-specific rules — read them from `openspec/config.yaml`
  and the checklists in `docs/specs/`
- Do not edit `openspec/specs/` directly — it is written by the archiver on merge
- Do not diverge from a requirement silently — update the delta spec and say so
- Do not archive a change that fails validation
- Do not leave a deferral unfiled — if you decide not to do something, file a
  backlog item before moving on
- Do not end a session that changed anything without a JOURNAL.md entry
- Do not duplicate a change's tasks in a backlog item — link and stop
- Do not let a design ticket change behavior — mark it requires-spec-change
  and block until a /propose change lands
- Do not put raw color/spacing values in a design ticket — reference tokens
- All architecture decisions must be documented in decision logs
- Follow the project's review checklists for every change

## Getting Started

New project with no checklists yet:
1. `/idea "your project concept"` to define the idea
2. `/spec` to write the feature specification
3. `/logic` to validate completeness
4. Run `checklist-generator` to create review checklists
5. `/propose` to create the first change
6. Run `executor` to build, then `/verify`, then `/archive`

Checklists already exist in `docs/specs/`:
1. `/board` to see where things stand
2. `/explore` if the problem is fuzzy, otherwise `/propose` directly
3. `/handoff` before you stop
