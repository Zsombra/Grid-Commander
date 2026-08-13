# CLAUDE.md — Project Configuration

## Project

- **Name**: Grid-Commander
- **Description**: A web workbench for building, tuning, and understanding
  BattleGrid trading agents and the strategies that drive them, over BattleGrid's
  MCP server.
- **Status**: built and live-proven — 13 capabilities, 138 archived changes,
  every write walked against the real platform. `HANDOFF.md` is the current
  state; `docs/FIRST_SESSION.md` is how an operator starts using it. The idea
  brief this grew from is `_IDEA/Grid-Commander_Idea_Brief.md`.

## Architecture

- **Pattern**: Clean Architecture, lightly applied — the domain must not import
  the MCP client; BattleGrid sits behind a port
- **Language**: TypeScript
- **Framework**: Next.js (App Router)
- **Database**: PostgreSQL
- **ORM**: Drizzle

## Domain

Grid-Commander is a **third-party multi-tenant client** for BattleGrid
(battlegrid.trade), reached over MCP at `https://mcp.battlegrid.trade/mcp`.
The surface is fully mapped — **114 tools at v18.2.0** — in
`docs/BATTLEGRID_MCP_REFERENCE.md`,
with `docs/BATTLEGRID_SURFACE_MAP.md` as orientation and
`tools/generate_mcp_reference.py` to regenerate both.

Three facts that shape almost every decision:

1. **`mcp:read` is write-capable.** 27 of 114 tools mutate, but only 16 need
   `mcp:wager`. Eleven mutate on `mcp:read` alone, six of them destructive.
   Never treat scope alone as a safety boundary.
2. **The tool list goes stale after a BattleGrid deployment.** The server says
   so itself. Rediscover at runtime; never hard-code a tool list. The count
   held at 110 across six major versions while enums and semantics changed
   underneath — then **v14 moved it to 114**, so a count that has not moved
   proves nothing and a count that has says only that something changed.
   **v18.2.0 is the sharpest case**: a whole major version arrived between two
   probes a day apart, and *nothing* a count could see moved — 114 tools, none
   added or removed, no **input** schema changed, the read/write/destructive
   split identical. Probe the version, never the shape.

   That sentence is exactly true and was read as more general than it is. It is
   scoped to *inputs*, and **outputs grew by 188 schema leaves across 11 tools**
   — a whole `protection` block the platform now publishes per position among
   them. Nothing saw it, because the artifact holding output schemas
   (`docs/battlegrid-mcp-capabilities.json`) was itself a major version behind
   and nothing compared it to the surface record. Two of the three records were
   compared to each other; the third was not (#198).
3. **This product holds credentials that configure other people's agents**, and
   with wager scope, move their money. Read-only by default, explicit step-up,
   audit every write.

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
checklist-generator — Creates review checklists in docs/checklists/
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
               → /surface again (the round staled the manifests it designed
                 against — re-pinning is its last task, not the next round's
                 surprise; design-contract §8)
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

**Two directories, two jobs:** `openspec/specs/` is *what the system does*
(behavior contract, written by the archiver). `docs/checklists/` is *how we build*
(review checklists, written by checklist-generator). Both are binding.

## Conventions

- **Commits**: Use conventional commits (feat:, fix:, docs:, refactor:)
- **Branches**: feature/<name>, fix/<name>, docs/<name>
- **Quality gates**: [set `quality_gates:` in openspec/config.yaml, or the
  Quality Gate section of docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md]

## Rules

- Do not modify production code while in planner mode
- Do not skip checklist verification steps
- Do not hardcode project-specific rules — read them from `openspec/config.yaml`
  and the checklists in `docs/checklists/`
- Do not edit `openspec/specs/` directly — it is written by the archiver on merge
- Do not diverge from a requirement silently — update the delta spec and say so
- Do not archive a change that fails validation
- Do not leave a deferral unfiled — if you decide not to do something, file a
  backlog item before moving on
- Do not file a finding in only one place — **every backlog item gets a GitHub
  issue mirroring it**, linked by `github: <number>` in its frontmatter. The
  item is canonical; the issue is what anyone without a checkout can read.
  `github: none` is allowed and must say why in the body. See
  `.claude/references/tracking.md` §7 — `validate` enforces it
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

Checklists already exist in `docs/checklists/`:
1. `/board` to see where things stand
2. `/explore` if the problem is fuzzy, otherwise `/propose` directly
3. `/handoff` before you stop
