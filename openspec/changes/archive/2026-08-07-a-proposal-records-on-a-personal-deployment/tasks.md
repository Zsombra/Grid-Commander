# Tasks

## 1. The fix

- [x] 1.1 Drop `.references(() => users.id)` from `proposals.userId` in
      `src/infrastructure/db/schema/index.ts`, with a comment naming why
      (personal mode has no users row; ownership lives in the WHERE)
      → "On a personal deployment"
- [x] 1.2 `npm run db:generate` — the drop-constraint migration; gate clean

## 2. The proof

- [x] 2.1 `tests/db/proposals.test.ts`: record and read back as `owner` with
      **no** users row (the recorder suite's load-bearing test, applied
      here); drop the fixture's users-row dependency
      → "On a personal deployment"
- [x] 2.2 Re-run the live FK probe against the migrated database — the same
      call that failed must record and list

## 3. Verification

- [x] 3.1 Full gates: typecheck · lint · vitest · build · drizzle-check ·
      test:db
- [x] 3.2 `openspec.py validate` clean; backlog item updated to the change
