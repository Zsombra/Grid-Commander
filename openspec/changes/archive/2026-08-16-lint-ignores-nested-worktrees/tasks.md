# Tasks

- [x] 1. Add `.claude/worktrees/**` to the `ignores` array in
      `eslint.config.mjs`, with the reasoning beside the `next-env.d.ts` note it
      generalises.
- [x] 2. Verify `npm run lint` from the repository root is green with a
      worktree open. (exit 0, 20.6s)
- [x] 3. Verify the ignore is not over-broad by planting a lint error under
      `src/` and confirming lint still fails on it, then restoring.
- [x] 4. `npm run typecheck`, `npm test`, `validate --all`.
