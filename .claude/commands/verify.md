---
description: Check that the implementation matches the change — completeness, correctness, coherence
argument-hint: [change-id]
---

## Context

Active changes: !`python3 .claude/tools/openspec.py list 2>/dev/null || echo "(no openspec/ yet)"`
Branch: !`git branch --show-current`
Changed files: !`git diff --name-only origin/main...HEAD 2>/dev/null | head -30`

## Task

Verify: **$ARGUMENTS** (if empty, infer the change or ask which one).

Invoke the **verifier** skill and follow it.

## Reminders

- This check is **advisory**. It reports; it does not block and does not fix.
- Read every artifact and the diff before judging anything.
- Every finding needs `file:line` and a specific recommended action.
- When uncertain, downgrade the severity. A verifier that cries wolf gets
  ignored, and then it protects nothing.
- Report what you could **not** check, and why.

## After

- Critical issues → back to the **executor**.
- Clean, track `full` → the **auditor**.
- Clean, track `lite`/`standard` → `/archive`.
