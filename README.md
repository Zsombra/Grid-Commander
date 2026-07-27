# SKILLMOREL

A universal development pipeline for [Claude Code](https://docs.claude.com/en/docs/claude-code) — a portable bundle of **skills**, **slash commands**, and a **spec layer** that gives any project a structured workflow from idea to audited production code, and a living description of what the system actually does.

**Version**: 3.0
**Scope**: multi-architecture (Clean Architecture + Provider / Plugin Pattern, extensible to others)
**Distribution**: per-repo, self-contained
**Spec format**: compatible with [OpenSpec](https://github.com/Fission-AI/OpenSpec) (MIT)

---

## What changed in 3.0

v2.x produced good plans that went nowhere. Every feature wrote
`docs/plan/<slug>-*.md` files that piled up forever and never accumulated into
a description of the system. Feature #2 started from zero. There was no way to
run two changes at once, no way to finish one, and a typo fix cost five
documents and a production gate.

3.0 adds the missing half — a spec layer adapted from OpenSpec, plus a tracking
layer so nothing is lost between sessions or agents:

| | v2.1 | v3.0 |
|---|---|---|
| **Source of truth** | none | `openspec/specs/` — living behavior contract |
| **Change unit** | filename prefix `<slug>-` | self-contained folder |
| **Brownfield** | rewrite the plan | ADDED / MODIFIED / REMOVED deltas |
| **Lifecycle** | plans accumulate forever | archive merges deltas into the truth |
| **Ceremony** | one size (heavy) | `lite` / `standard` / `full` tracks |
| **Parallel work** | collides | one folder per change |
| **Definition of done** | prose | testable Requirement + Scenario |
| **Deferred work** | lost | `openspec/backlog/` — one file per item |
| **Session handoff** | none | `openspec/JOURNAL.md` + `/board` / `/handoff` |
| **Validation** | none | `openspec.py validate` |

What v2.1 already did well — lane separation, evidence-based review, the
production gate — is unchanged. It now runs *inside* the change folder and
audits against the requirements as well as the checklists.

Upgrading an existing project: `docs/MIGRATION_v3.md`.

---

## What's in the box

### The spec layer

```
openspec/
├── config.yaml                     project context + per-artifact rules
├── JOURNAL.md                      what happened, session by session
├── specs/<capability>/spec.md      SOURCE OF TRUTH — how the system behaves today
├── backlog/<item-id>.md            work that is not a change yet
└── changes/
    ├── <change-id>/                one folder per proposed change
    └── archive/YYYY-MM-DD-<id>/    completed work, full context preserved
```

`openspec/specs/` is what is true. `openspec/changes/` is what is proposed.
Archiving merges the deltas and the cycle closes:

```
specs describe current behavior → a change proposes deltas → implementation makes
them real → archive merges them → specs describe the new behavior → repeat
```

That loop is why the harness compounds instead of producing paperwork.

### The tracking layer

Four places, one rule each — **exactly one owns each piece of work at a time**:

```
idea/bug ──► backlog item ──► change folder ──► archive
             (owns it)        (owns it)         (owns it)
                                  │
             item links to it ────┘  and says nothing more
```

| Where | Tracks |
|---|---|
| `openspec/backlog/<id>.md` | Bugs, debt, ideas, deferred findings — one file per item, so parallel agents never conflict |
| `openspec/changes/<id>/tasks.md` | Steps inside an in-flight change |
| `openspec/changes/archive/` | What shipped, with full context |
| `openspec/JOURNAL.md` | What happened each session, and what to do next |

Every session **starts with `/board`** (read state) and **ends with `/handoff`**
(write state). That bracket is what lets a different agent — or you in three
weeks — pick up without losing anything.

The backlog stays alive because the skills feed it: the proposer files cut
scope, the executor files debt it took on, the verifier files warnings it did
not fix, the auditor files MINORs and waivers, the archiver files what a change
did not finish. A deferral nobody records is indistinguishable from an oversight.

### Skills (8)

| Skill | Purpose |
|---|---|
| `proposer` | Creates the change folder: proposal, delta specs, tasks. Picks the track. **Entry point.** |
| `checklist-generator` | Creates project-specific review checklists (architecture, data pipeline, UI) in `docs/specs/`. |
| `planner` | **[full]** Master plan, requirement coverage matrix, review scaffolds, decision log. Never touches code. |
| `executor` | Implements the change, keeps tasks and artifacts truthful, runs quality gates. |
| `verifier` | Advisory check: completeness · correctness · coherence. Non-blocking. |
| `auditor` | **[full]** Production gate. Spec parity + checklist parity + tech debt. PASS / BLOCKED. |
| `archiver` | Merges deltas into the source of truth and archives the change. |
| `tracker` | Owns the backlog and the session journal. Files, triages, and writes handoffs. |

### Slash commands (15)

| Command | Purpose |
|---|---|
| `/board` | **Start here.** Everything at a glance: changes, backlog, journal, next action |
| `/handoff` | **End here.** File what was deferred, write the session journal entry |
| `/backlog` | View, file, or triage work that is not a change yet |
| `/explore` | Think before committing — investigate, weigh options, sharpen scope. No artifacts. |
| `/propose` | Create a change: proposal, delta specs, tasks |
| `/status` | Detailed state of a single change |
| `/verify` | Does the implementation match the change? |
| `/archive` | Merge deltas into the source of truth and archive |
| `/idea` | Greenfield concept exploration — product, market, MVP scope, tech stack |
| `/spec` | Deep product specification — user stories, state machines, business rules → deltas |
| `/logic` | Validate product logic — gap analysis, state extraction, concerns (P0/P1/P2) |
| `/solutions` | Architecture exploration — 3 ranked options with SOLID analysis |
| `/analyze` | Map the architecture of existing code, and report spec coverage |
| `/debug` | Systematic root-cause debugging, with a spec check before closing |
| `/document` | Create or update architecture documentation from code |

### The tool

`.claude/tools/openspec.py` — zero-dependency Python 3, no install:

```bash
python3 .claude/tools/openspec.py board                     # everything at a glance
python3 .claude/tools/openspec.py list                      # active changes
python3 .claude/tools/openspec.py status <change>           # artifact graph + progress
python3 .claude/tools/openspec.py backlog list              # open items
python3 .claude/tools/openspec.py journal --limit 5         # recent sessions
python3 .claude/tools/openspec.py validate --all            # specs + backlog
python3 .claude/tools/openspec.py archive <change> --apply  # merge deltas + archive
```

This is what makes "is this change ready?" a computation instead of a judgment
call. Every skill degrades gracefully to reading files by hand if `python3`
is unavailable.

---

## Tracks — right-size the ceremony

Declared per change in `.openspec.yaml`.

| Track | Use for | Chain |
|---|---|---|
| `lite` | Typo fixes, copy changes, dependency bumps, isolated bugs | proposer → executor |
| `standard` | Most feature work | proposer → executor → verifier → archive |
| `full` | Contract/API changes, migrations, security, privacy, cross-team, hard-to-reverse | proposer → planner → executor → verifier → auditor → archive |

Escalating is free: edit `track:` and write the artifacts the new track wants.

---

## Pipeline flow

```
  /board            read state — changes, backlog, journal, next action
      │
      ▼
  /explore          think — no artifacts, no code, no commitment
      │
      ▼
  /propose          the change folder: proposal + deltas + tasks
      │             ── HUMAN REVIEW: read the plan while it is still words ──
      ▼
  planner           [full] master plan, review scaffolds, decision log
      │
      ▼
  executor          implement, keep artifacts truthful, quality gates
      │
      ▼
  /verify           completeness · correctness · coherence        (advisory)
      │
      ▼
  auditor           [full] production gate — PASS or BLOCKED      (blocking)
      │
      ▼
  /archive          deltas merge into openspec/specs
      │
      ▼
  /handoff          write state — file deferrals, journal the session
```

Greenfield still starts at `/idea → /spec → /logic`, then joins at `/propose`.
Daily tools sit outside the loop: `/analyze`, `/debug`, `/document`.

**The two blocking gates** are the human review after `/propose`, and the
auditor on `full`. Everything else informs. Catching a wrong turn in a
one-paragraph plan is nearly free; catching it in 300 lines of code is not.

---

## Folder layout

```
your-project/
├── .claude/                       ← the portable bundle
│   ├── skills/
│   │   ├── proposer/  planner/  executor/  verifier/  auditor/  archiver/
│   │   └── tracker/  checklist-generator/
│   ├── commands/                  ← 12 slash commands
│   ├── references/                ← shared, read by every skill
│   │   ├── spec-format.md         the requirement/scenario/delta format
│   │   ├── change-lifecycle.md    folder layout, tracks, artifact graph
│   │   ├── tracking.md            backlog + journal conventions
│   │   └── templates/
│   └── tools/openspec.py          ← zero-dep validator, status, archiver
│
├── openspec/                      ← the spec layer (behavior)
│   ├── config.yaml
│   ├── specs/                     source of truth
│   ├── backlog/                   work that is not a change yet
│   ├── JOURNAL.md                 session handoff log
│   └── changes/                   active + archive
│
├── docs/specs/                    ← review checklists (engineering standards)
├── CLAUDE.md                      ← project config
└── [source code]
```

### Two things named "spec" — keep them straight

| Path | What it is | Written by |
|---|---|---|
| `openspec/specs/` | **What the system does.** Behavior contract. | `archiver`, on merge |
| `docs/specs/` | **How we build.** Review checklists. | `checklist-generator` |

Both are binding. A change can satisfy every checklist and still fail to
deliver its requirements — the auditor checks both.

---

## How to use this repo

### Workflow A — template for a new project

1. **Use this template** → create a new repository, clone it.
2. Fill in the project fields at the top of `CLAUDE.md`.
3. Fill in `openspec/config.yaml` — context and rules inject into every artifact.
4. Start:
   - `/idea "your project concept"` (greenfield), or
   - `/propose "the thing you want to build"`

### Workflow B — copy into an existing project

```bash
git clone https://github.com/<you>/SKILLMOREL /tmp/skillmorel
cp -r /tmp/skillmorel/.claude   /path/to/your/project/
cp -r /tmp/skillmorel/openspec  /path/to/your/project/
cp    /tmp/skillmorel/CLAUDE.md /path/to/your/project/
```

Then fill in `CLAUDE.md` and `openspec/config.yaml`, and commit.

**Existing codebase with no specs?** Do not specify the whole system up front —
that is how spec layers die. Write specs for the capability you are about to
touch, as part of the first change that touches it. `/analyze` will tell you
which capabilities are unspecified. The source of truth fills in behind your
work instead of ahead of it.

---

## Design principles

- **Per-repo self-contained.** The pipeline travels with the project in git. No
  global install, no "did you set it up?" step. No runtime dependency beyond
  `python3` — and the skills degrade gracefully without it.
- **The specs are the product of the process.** Plans are scaffolding; the
  behavior contract is what survives. If archiving stops happening, the layer
  rots into a pile of stale proposals and is worse than nothing.
- **Two independent standards.** `openspec/specs/` says what the system must
  do; `docs/specs/` says how it must be built. Neither substitutes for the other.
- **Lanes don't cross.** The planner never touches code. The executor never
  clears its own gate. The auditor never edits the contract it audits against.
  The archiver never fixes a delta to make a merge fit.
- **Dependencies are enablers, not gates.** The artifact graph says what is
  possible to write next, not what you are forbidden from writing.
- **Right-size everything.** Three tracks, so a typo fix costs a typo fix.
- **Nothing is lost between sessions.** Read state at the start, write state at
  the end, and file every deferral when you make it — not later, when the
  reasoning is gone.
- **Format compatibility is a feature.** `openspec/` matches the OpenSpec CLI's
  on-disk layout, so `npx openspec@latest` is an optional upgrade, not a rewrite.

---

## Conventions

- **Commits**: conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`)
- **Branches**: `feature/<name>`, `fix/<name>`, `docs/<name>`

See `CHANGELOG.md` for version history and `docs/MIGRATION_v3.md` to upgrade
a v2.x project.

---

## Credits

The spec layer — delta specs, the change-folder model, artifact dependency
graphs, the archive-merge cycle, and the three verification dimensions — is
adapted from [OpenSpec](https://github.com/Fission-AI/OpenSpec) by Fission AI
(MIT). The governance layer — checklists, lanes, evidence requirements, and the
production gate — is SKILLMOREL's own.
