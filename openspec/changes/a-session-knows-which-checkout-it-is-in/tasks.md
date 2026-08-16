# Tasks

## 1. The guard

- [x] 1.1 `tools/assert_checkout.py` — resolve `--show-toplevel`, `--git-dir`
      and `check-ignore` for the working directory, and refuse when the
      directory is ignored by the repository answering for it.
- [x] 1.2 Distinguish the three outcomes the scenarios name: healthy, ignored
      by the answering repository, and not a checkout at all.
- [x] 1.3 On failure, name the directory, the answering repository and the
      matched ignore rule — the rule is what makes the diagnosis actionable.

## 2. The wiring

- [x] 2.1 `.claude/settings.json` with a `SessionStart` hook invoking the guard.
      The file does not exist yet; create it without disturbing other settings.

## 3. Verification

- [x] 3.1 The guard passes in this live worktree — the no-false-positive case,
      which is what decides whether anyone leaves it enabled.
- [x] 3.2 **The guard fails in a simulated dead worktree.** Create a directory
      under `.claude/worktrees/` with no `.git`, run the guard there, and confirm
      it refuses and names the exclude rule. A guard never seen to fail is not
      known to work.
- [x] 3.3 The guard reports plainly outside any repository.
- [x] 3.4 Quality gates: `npm run typecheck`, `npm run lint`, `npx vitest run`
      — confirm the failure count is unchanged at the known six, not zero.
- [x] 3.5 `openspec.py validate` clean.
