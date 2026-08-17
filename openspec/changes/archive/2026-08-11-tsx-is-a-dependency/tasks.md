# Tasks

## 1. Dependency

- [x] 1.1 `npm install --save-dev tsx` — lands in `devDependencies` and the
      lockfile
- [x] 1.2 Confirm `node_modules/.bin/tsx` exists and
      `npx tsx --version` answers without any download prompt

## 2. Records

- [x] 2.1 Note in `openspec/backlog/confirm-the-recorder-is-running.md`'s
      Windows recipe that `--yes` is no longer needed once this lands
- [x] 2.2 Close `openspec/backlog/tsx-is-not-a-dependency.md`
      (status: done, change linked) and close GitHub #152 on archive

## 3. Verification

- [x] 3.1 `npx vitest run` — full suite green (proves the dependency
      addition broke nothing)
- [x] 3.2 `npx tsx bin/grid-commander-record.ts` with no env — refuses
      with the named-missing-credential message, proving the entrypoint
      still boots through the locally resolved tsx
- [x] 3.3 `python3 .claude/tools/openspec.py validate tsx-is-a-dependency`
      — zero errors
