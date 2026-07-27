---
name: archiver
description: Completes a change by merging its delta specs into openspec/specs (the source of truth) and moving the change folder to the dated archive. Use when implementation is done and verified, or when the user says "archive this change" or "land it".
---

# Archiver

## Lane

This skill owns closing the loop: deltas become truth, the change becomes history.

It does NOT:
- Modify production code.
- Author or fix specs. A delta that will not merge goes back to the executor.
- Override a `BLOCKED` production gate.

## Why This Matters

Archiving is the step that makes the harness compound. Merge the deltas and
`openspec/specs/` becomes an accurate description of the system that the next
change can build on and the auditor can hold code against. Skip it and the
specs rot into a pile of stale proposals — at which point the whole spec layer
is worse than nothing, because it looks authoritative and isn't.

## Required Inputs

A change ID. If not given, run `python3 .claude/tools/openspec.py list` and ask
with **AskUserQuestion**. Do not auto-select when more than one change is active.

---

## Workflow

### Step 1: Readiness

```bash
python3 .claude/tools/openspec.py status <change-id>
python3 .claude/tools/openspec.py validate <change-id>
```

| Condition | Action |
|---|---|
| Validation errors | **Stop.** Report them. Archiving a change that fails validation corrupts the source of truth. |
| Artifacts `ready` or `blocked` (not `done`) | Warn, list them, confirm with **AskUserQuestion** before proceeding. |
| Incomplete tasks | Warn with the count, confirm before proceeding. |
| Track `full` and `plan/production-gate.md` is `BLOCKED` | **Stop.** Only the auditor clears its own gate. |
| Track `full` and no production gate exists | Warn that the change was never audited, confirm. |

Warnings do not block — they inform and require an explicit confirmation.
Validation errors and a blocked gate do block.

### Step 2: Preview the Merge

```bash
python3 .claude/tools/openspec.py archive <change-id>
```

This is a dry run. It prints exactly what will happen to each capability:

```
  auth: - Remember Me
  auth: ~ Session Expiration
  auth: User Authentication -> Primary Authentication
  auth: + Two-Factor Authentication
  create notifications: + OTP Delivery
```

Show this to the user. Confirm before applying, especially when the preview
includes removals (`-`) or a rename, which are the operations that lose
information if the delta was wrong.

If the preview fails with `merge_conflict`, the delta does not match the main
spec. Report which requirement and hand back to the executor — do not
hand-patch the main spec to make the merge fit.

### Step 3: Apply

```bash
python3 .claude/tools/openspec.py archive <change-id> --apply
```

The tool enforces the ordering: **validate → write specs → move the folder.**
Every spec write succeeds before the change folder moves. If anything fails,
nothing moves and the change is intact and re-runnable.

**Never move a change folder yourself while a merge is in flight.** That is how
you get a change filed under `archive/` whose requirements never reached the
source of truth — invisible, and only discovered when the next change builds on
a spec that lies.

### Step 4: Verify the Merge Landed

For every capability in the preview, re-read `openspec/specs/<capability>/spec.md`
and confirm:

- ADDED requirements are present, with their scenarios.
- MODIFIED requirements carry the new text **and** retain the scenarios the
  delta included.
- REMOVED requirements are gone.
- RENAMED requirements appear under the new name and not the old one.
- A newly created spec has a real `## Purpose`, not `TBD`.

Then:

```bash
python3 .claude/tools/openspec.py validate --all
```

A `main_spec_purpose_tbd` warning means a new capability shipped without a
Purpose — fix it now by editing the main spec directly. Nobody comes back for it.

### Step 5: Report

```markdown
## Archived: <change-id>

**Archived to**: `openspec/changes/archive/YYYY-MM-DD-<change-id>/`
**Specs updated**: <list>
**Merged**: <n> added · <n> modified · <n> removed · <n> renamed
**Archived with warnings**: <list, or "none">
```

---

## Hard Rules

1. **Never archive a change that fails validation.**
2. **Never hand-edit a main spec to make a merge succeed.** Fix the delta.
3. **Never move the change folder before the specs are written.**
4. **Never override a `BLOCKED` production gate.**
5. **Always show the dry-run preview before applying.**
6. **Always verify the merge landed** — writing is not the same as landing.

## Fallback Without `python3`

Perform the merge by hand, in this order, per capability:

1. Read the delta and the main spec.
2. Apply REMOVED (delete the block), then MODIFIED (replace the whole block),
   then RENAMED (rewrite the header), then ADDED (append).
3. Save every main spec.
4. Only then `mv openspec/changes/<id> openspec/changes/archive/<YYYY-MM-DD>-<id>`.
5. Re-read every file you wrote and confirm against the checklist in Step 4.

Say explicitly that the merge was done by hand.

## Completion

- [ ] Validation passed before the merge.
- [ ] Dry run shown and confirmed.
- [ ] Every delta merged into `openspec/specs/`.
- [ ] Merge verified by re-reading the main specs.
- [ ] Change folder in `openspec/changes/archive/YYYY-MM-DD-<change-id>/`.
- [ ] `openspec.py validate --all` reports no new errors.

End response with: `CHANGE ARCHIVED`
