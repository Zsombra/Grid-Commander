---
description: Close out a session — file what was deferred and write the journal entry
argument-hint: (none)
---

## Context

!`python3 .claude/tools/openspec.py board 2>/dev/null || echo "(no openspec/ yet)"`
Today: !`date +%Y-%m-%d`
Uncommitted: !`git status --short 2>/dev/null | head -20`
This session's commits: !`git log --oneline origin/main..HEAD 2>/dev/null | head -20`

## Task

Close out the session. Invoke the **tracker** skill, Mode E.

### 1. Reconcile before writing

- Update every backlog item this session touched — status, linked change,
  `updated` date.
- **File items for everything deferred.** Bugs noticed and not fixed, verifier
  warnings not acted on, debt taken on deliberately, scope explicitly cut. This
  is the step that gets skipped, and it is the entire point of the system: an
  undocumented deferral is indistinguishable from an oversight three weeks later.
- Run `python3 .claude/tools/openspec.py validate --all` and fix what you can.

### 2. Write the entry

Prepend to `openspec/JOURNAL.md`, directly under the `# Journal` header and
above the previous entry:

```markdown
## <today> — one-line summary

**Did**: what actually changed. Name changes, items, files.
**State**: what is in flight and how far along.
**Next**: the single next action, named as a command or skill.
**Watch out**: gotchas, dead ends, non-obvious decisions. `none` if truly none.
```

### 3. Report

Say what you filed, what you updated, and what the next session should do
first.

## Reminders

- **Write from the board and the diff, not from memory.** Sessions drift from
  what you remember doing.
- **`Watch out` is the highest-value field.** "The delta merge silently drops
  scenarios omitted from a MODIFIED block" beats a clean-sounding summary.
- **Do not claim things work that you did not verify.** If tests were not run,
  the entry says so.
- Keep it to four fields and a few lines each. A journal nobody reads because
  the entries are essays is a journal that does not work.
