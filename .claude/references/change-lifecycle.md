# Change Lifecycle

How work is organized on disk, which artifacts a change owes, and how it moves
from idea to archived truth. Every pipeline skill reads this file.

---

## 1. The two halves of `openspec/`

```
openspec/
├── config.yaml                        project context + per-artifact rules
├── specs/                             SOURCE OF TRUTH — how the system behaves today
│   └── <capability>/spec.md
└── changes/                           PROPOSED MODIFICATIONS — one folder each
    ├── <change-id>/
    └── archive/
        └── YYYY-MM-DD-<change-id>/    completed work, full context preserved
```

`specs/` is what is true. `changes/` is what is proposed. A change stays
isolated in its own folder until it is archived, at which point its deltas
merge into `specs/` and `specs/` becomes true again.

That loop is the whole point:

```
specs describe current behavior
  → a change proposes deltas
    → implementation makes them real
      → archive merges the deltas
        → specs describe the new behavior
          → the next change builds on updated specs
```

Without it, every feature starts from zero. With it, the system accumulates a
description of itself that the auditor can hold code against.

### Two things named "spec" — keep them straight

| Path | What it is | Written by |
|---|---|---|
| `openspec/specs/` | **What the system does.** Behavior contract. | archiver, on merge |
| `docs/specs/` | **How we build.** Review checklists — architecture, data pipeline, UI. | checklist-generator |

Behavior lives in `openspec/`. Engineering standards live in `docs/specs/`.
The auditor checks code against both.

---

## 2. Anatomy of a change

```
openspec/changes/add-order-idempotency/
├── .openspec.yaml           track, created date, skip_specs
├── proposal.md              why + what + capabilities touched
├── specs/                   DELTA specs (see spec-format.md)
│   └── ordering/spec.md
├── design.md                how — technical approach + decisions   [full track]
├── tasks.md                 implementation checklist
└── plan/                    the governance layer                   [full track]
    ├── master-plan.md
    ├── architecture-review.md
    ├── data-review.md
    ├── uiux-review.md
    ├── decision-log.md
    └── production-gate.md
```

Everything about the change is in one folder. That is what makes parallel
changes, clean review, and a meaningful archive possible.

`.openspec.yaml`:

```yaml
track: standard        # lite | standard | full
created: 2026-07-27
skip_specs: false      # true only when no observable behavior changes
```

---

## 3. Tracks — required artifacts by stakes

| Artifact | lite | standard | full |
|---|:--:|:--:|:--:|
| `proposal.md` | ● | ● | ● |
| `specs/**/spec.md` (deltas) | ● | ● | ● |
| `tasks.md` | ● | ● | ● |
| `design.md` | | optional | ● |
| `plan/master-plan.md` | | optional | ● |
| `plan/*-review.md` | | | ● |
| `plan/decision-log.md` | | | ● |
| `plan/production-gate.md` | | | ● |
| Skill chain | proposer → executor | proposer → executor → verifier | proposer → planner → executor → verifier → auditor |

`skip_specs: true` drops the delta requirement on any track. Use it only for
pure refactors, tooling, and docs.

**Choosing a track** — pick `full` when any of these is true: the change touches
a public contract or API, migrates data, affects auth/payments/privacy, spans
packages, or is hard to reverse. Otherwise `standard`. Drop to `lite` when a
reviewer would be annoyed to receive five documents for it.

Escalation is free: edit `track:` in `.openspec.yaml` and create the artifacts
the new track requires. Nothing already written is wasted.

---

## 4. The artifact graph

```
              proposal
                 │
        ┌────────┴────────┐
        ▼                 ▼
      specs            design
        └────────┬────────┘
                 ▼
               tasks
                 │
                 ▼
              plan/            [full]
                 │
        ┌────────┴────────┐
        ▼                 ▼
     reviews        decision-log
```

**Dependencies are enablers, not gates.** They say what is *possible* to write
next, not what you are *forbidden* from writing. Skip `design.md` when the
approach is obvious. Write `tasks.md` before `design.md` if that is how the
thinking went. What the graph guarantees is that when you write an artifact,
the context it depends on already exists.

Check state at any time:

```bash
python3 .claude/tools/openspec.py status <change>
```

Statuses: `done` (file exists) · `ready` (dependencies satisfied) ·
`blocked` (a dependency is missing) · `skipped` (`skip_specs`) ·
`n/a` (not required at this track).

Status is file-existence only. `done` means the file is there, not that it is
good — that is what review, verify, and audit are for.

---

## 5. The loop

```
  /explore          think — no artifacts, no code, no commitment
      │
      ▼
  /propose          create the change folder + proposal + deltas + tasks
      │             ── HUMAN REVIEW: read the plan while it is still words ──
      ▼
  planner           [full] master plan, review scaffolds, decision log
      │
      ▼
  executor          implement tasks, keep artifacts truthful
      │
      ▼
  /verify           completeness · correctness · coherence   (advisory)
      │
      ▼
  auditor           [full] production gate — PASS or BLOCKED   (blocking)
      │
      ▼
  /archive          merge deltas into openspec/specs, move to archive
```

Daily tools sit outside the loop: `/analyze`, `/debug`, `/document`.

### The review that pays for itself

After `/propose` and before any code, read `proposal.md`, then the deltas, then
`tasks.md` — in that order, so you can quit early. Three questions:

1. **Proposal** — is this the right problem, and has anything crept into scope?
2. **Deltas** — is "done" defined correctly? *What is missing?* The AI writes
   down what you said; your job is noticing what you forgot to say.
3. **Tasks** — does every task trace to a requirement?

Catching a wrong turn in a one-paragraph plan is nearly free. Catching it in
300 lines of code is not.

### Fluidity rules

- Any action can run at any time, as long as its inputs exist.
- Implementation that reveals a design flaw should **update the artifacts**,
  not route around them. A change folder that no longer matches reality is
  worse than no change folder.
- Re-running an action is always safe.
- The blocking gates are exactly two: the human review after `/propose`, and
  the auditor on `full`. Everything else informs.

---

## 6. Archiving

```bash
python3 .claude/tools/openspec.py archive <change>            # dry run
python3 .claude/tools/openspec.py archive <change> --apply
```

Archive validates first, then merges every delta into `openspec/specs/`, then
moves the folder to `openspec/changes/archive/YYYY-MM-DD-<change-id>/`.

Ordering is not negotiable: **validate → write specs → move the folder.** If
validation or a merge fails, nothing is written and nothing is moved, so the
change is left intact and re-runnable. Never move a change folder while a sync
is still in flight — that is how you end up with an archived change whose
specs never landed.

---

## 7. Bootstrapping a project

```bash
mkdir -p openspec/specs openspec/changes/archive
cp .claude/references/templates/config.yaml openspec/config.yaml
```

Then fill in `openspec/config.yaml` — the `context` and `rules` blocks are
injected into every artifact the skills write, so this is where project-wide
constraints ("this runs on Windows too", "prefer explicit lookups over regex")
belong.

**Existing codebase with no specs?** Do not try to specify the whole system up
front. Write specs for the capability you are about to touch, as part of the
first change that touches it. The source of truth fills in behind your work
instead of ahead of it.
