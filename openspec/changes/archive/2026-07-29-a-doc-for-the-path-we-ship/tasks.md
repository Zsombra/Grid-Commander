# Tasks: A Doc For The Path We Ship

- [x] 1. Rewrite `docs/DEPLOYING.md`: personal first, delegated second, local run
      documented, variable table split by path.
- [x] 2. Verify every factual claim against the code rather than memory — scope
      parsing, cookie behaviour, what `oauth()` does when personal is set.
- [x] 3. Walk the document literally: fresh database, migrate, build, the exact
      environment block, and read the pages it promises.
- [x] 4. Guard it — the doc must cover both paths, and must not list the OAuth
      variables as unconditionally required.
- [x] 5. Mutation-check the guard against the document it replaced.
- [x] 6. `npm run typecheck`, `npm run lint`, `npm test`
- [x] 7. `python3 .claude/tools/openspec.py validate a-doc-for-the-path-we-ship --strict`
