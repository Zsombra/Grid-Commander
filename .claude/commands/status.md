---
description: Show the state of the spec layer — active changes, artifacts, tasks, validation
argument-hint: [change-id]
---

## Context

Active changes: !`python3 .claude/tools/openspec.py list 2>/dev/null || echo "(no openspec/ yet)"`
Capabilities: !`ls openspec/specs 2>/dev/null | grep -v README || echo "(none yet)"`
Branch: !`git branch --show-current`

## Task

Report the state of the spec layer. If **$ARGUMENTS** names a change, focus on it.

### 1. Gather

```bash
python3 .claude/tools/openspec.py status <change-id>
python3 .claude/tools/openspec.py validate --all
```

For a whole-project view with no change named, run `list` and then `status` for
each active change.

### 2. Report

```markdown
## Spec Layer

**Source of truth**: <n> capabilities, <n> requirements
**Active changes**: <n>

### <change-id>  ·  track: <track>
| Artifact | Status |
|---|---|
| proposal | done |
| specs | done — <n> deltas across <n> capabilities |
| tasks | done — <x>/<y> complete |
| ... | ... |

Validation: <clean | n errors, n warnings>
Next: <the specific next action>
```

### 3. Recommend

End with the single next action, named as a command:

| State | Next |
|---|---|
| Artifacts missing | `/propose` to finish them, or name the artifact to write |
| Artifacts done, tasks open | implement — invoke the **executor** |
| Full track, no master plan | invoke the **planner** |
| Tasks complete | `/verify` |
| Verified, track `full` | invoke the **auditor** |
| Verified (or gate PASS) | `/archive` |
| Validation errors | fix them first — list them |

If several changes are in flight, say which one to pick up and why. If a change
looks stalled — tasks untouched, or artifacts done with no code — say so
plainly rather than just listing it.
