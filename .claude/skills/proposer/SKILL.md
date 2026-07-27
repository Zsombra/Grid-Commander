---
name: proposer
description: Creates a change folder with a proposal, delta specs, and tasks — the entry point to the pipeline. Right-sizes ceremony by track (lite/standard/full), writes requirements in testable Requirement/Scenario form, and validates structure before handing off. Use when starting any feature, fix, or refactor, or when the user says "propose", "let's build X", or describes something they want changed.
---

# Proposer

## Lane

This skill owns turning intent into a reviewable change.

It creates:
1. The change folder under `openspec/changes/<change-id>/`.
2. `proposal.md` — why, what, which capabilities are touched.
3. Delta specs — `specs/<capability>/spec.md` in ADDED/MODIFIED/REMOVED form.
4. `design.md` — when the approach is non-obvious or the track is `full`.
5. `tasks.md` — the implementation checklist.

It does NOT:
- Write or modify production code.
- Create the master plan or review scaffolds (that's the planner, on `full`).
- Archive anything.

## Read First

| File | Why |
|---|---|
| `.claude/references/spec-format.md` | The normative requirement/scenario/delta format |
| `.claude/references/change-lifecycle.md` | Folder layout, tracks, artifact graph |
| `openspec/config.yaml` | Project context and per-artifact rules — constraints on you, never content to copy into artifacts |
| `openspec/specs/**/spec.md` | Current behavior — required before writing any MODIFIED or REMOVED delta |

If `openspec/` does not exist, bootstrap it (see change-lifecycle.md §7) and say so.

## Required Inputs

A change name in kebab-case, or a description you can derive one from
("add user authentication" → `add-user-auth`).

If neither is clear, ask with **AskUserQuestion** (open-ended): "What do you
want to build or fix?" Do not proceed without understanding the goal.

---

## Workflow

### Step 1: Scope and Track

Restate the intent in one sentence. If you cannot, the change is too big —
propose a split before writing anything.

Pick the track (`lite` / `standard` / `full`) using the table in
change-lifecycle.md §3. State the choice and the reason in one line. When the
signals are mixed, choose the heavier track — escalating later costs a
`.openspec.yaml` edit; a missed contract change costs a rollback.

### Step 2: Create the Change Folder

```bash
mkdir -p openspec/changes/<change-id>/specs
```

Write `.openspec.yaml`:

```yaml
track: <lite|standard|full>
created: <YYYY-MM-DD>
skip_specs: false
```

Set `skip_specs: true` only for pure refactors, tooling, and docs — work with
no observable behavior change. It is not an escape hatch for "specs are
tedious". If behavior changes, write the delta.

If a change with that ID already exists, stop and ask whether to continue it or
pick a new name.

### Step 3: Survey Current Behavior

Before writing any delta:

1. `ls openspec/specs/` — which capabilities exist.
2. Read the spec of every capability this change touches, in full.
3. Inspect the actual code paths involved.

You cannot write a correct MODIFIED or REMOVED delta without the exact current
requirement text in front of you. Read from disk every time, even if you saw
the file earlier in this conversation — the user may have edited it.

### Step 4: Write `proposal.md`

```markdown
# Proposal: <Title>

## Why
1-2 sentences. The problem or opportunity. Why now.

## What Changes
- Bullet list. Specific new capabilities, modifications, removals.
- Mark breaking changes **BREAKING**.

## Capabilities
**New**: `<kebab-case-name>` — each becomes `openspec/specs/<name>/spec.md`
**Modified**: `<existing-name>` — only when spec-level behavior changes
(leave empty if none; check `openspec/specs/` for real names)

## Out of Scope
What this deliberately does not do. Name the adjacent things a reader would
otherwise assume are included.

## Impact
Affected code, APIs, dependencies, data, consumers.
```

The **Capabilities** section is the contract with the specs step. Every
capability listed here needs a delta file, and every delta file must be listed
here. Research existing specs before filling it in.

### Step 5: Write Delta Specs

One file per capability: `openspec/changes/<change-id>/specs/<capability>/spec.md`.

Follow `spec-format.md` exactly. The failure modes that actually happen:

- Scenarios with 3 hashes instead of 4 — parses as nothing, fails silently.
- MODIFIED with partial content — archive replaces the whole block, so the
  scenarios you did not copy are deleted. Copy the entire existing requirement,
  then edit.
- `## Purpose` on an existing capability — ignored at archive.
- New capability with no `## Purpose` — archives to a `TBD` placeholder.
- ADDED for behavior that already exists — use MODIFIED.

Aim the scenarios at what matters: the empty input, the expired token, the
double submit. A scenario that restates its requirement in other words tests
nothing.

### Step 6: Write `design.md` — When Warranted

Required on `full`. Optional otherwise; write it when the approach is
non-obvious, when you rejected a plausible alternative, or when the change
spans components.

```markdown
# Design: <Title>

## Technical Approach
How this gets built, in a paragraph or two.

## Decisions
### Decision: <what was decided>
Chosen because <reason>. Rejected: <alternative> because <reason>.

## Data Flow
Diagram or numbered walkthrough, when the change moves data between components.

## File Changes
- `path/to/file` (new|modified) — one-line responsibility
```

Skip it silently when it would only restate the proposal. Say so in your summary.

### Step 7: Write `tasks.md`

```markdown
# Tasks

## 1. <Group>
- [ ] 1.1 <concrete, completable in one sitting>
- [ ] 1.2 ...

## 2. Verification
- [ ] 2.1 <test or check proving a specific requirement holds>
```

Rules:
- Every task traces to a requirement, or is explicitly infrastructure.
- Every requirement is covered by at least one task.
- Include verification tasks that map to scenarios — that is what makes the
  verifier's job mechanical instead of interpretive.
- No task called "implement the feature". That hides every real decision.

### Step 8: Validate

```bash
python3 .claude/tools/openspec.py validate <change-id>
python3 .claude/tools/openspec.py status <change-id>
```

Fix every error. Warnings need either a fix or a one-line justification in your
summary. Do not hand off with a failing validation.

If `python3` is unavailable, run the checks in spec-format.md §7 by reading the
files, and say that you did it manually.

---

## Hard Rules

1. **Do NOT write or modify production code.** Proposal only.
2. **Do NOT write a delta without reading the current main spec** for that
   capability first.
3. **Do NOT copy `context` or `rules` from `openspec/config.yaml` into
   artifacts.** They constrain what you write; they are not content.
4. **Do NOT invent a requirement to satisfy the validator.** If nothing
   observable changes, set `skip_specs: true`.
5. **Do NOT bundle unrelated work.** One intent per change. Propose a split
   instead.
6. **Do NOT skip the Out of Scope section.** It is where scope creep gets caught.

## Handoff

Report:
- Change ID, track (and why), folder path.
- Capabilities touched, with requirement counts per delta.
- Any conditional artifact skipped, and why.
- Validation result.
- **Ask the user to review the proposal and deltas before implementation.**
  This is the review that pays for itself — see change-lifecycle.md §5.

Next skill:
- `lite` / `standard` → **executor**
- `full` → **planner**

## Completion

- [ ] `openspec/changes/<change-id>/.openspec.yaml` exists with a track.
- [ ] `proposal.md` exists with Why, What Changes, Capabilities, Out of Scope, Impact.
- [ ] A delta spec exists for every capability listed in the proposal — or
      `skip_specs: true` is set and justified.
- [ ] Every requirement has at least one scenario.
- [ ] `tasks.md` exists and every requirement is covered by a task.
- [ ] `openspec.py validate` reports zero errors.

End response with: `CHANGE PROPOSED — READY FOR REVIEW`
