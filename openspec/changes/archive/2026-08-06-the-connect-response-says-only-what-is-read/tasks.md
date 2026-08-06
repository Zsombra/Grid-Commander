# Tasks

- [x] 1.1 Done. `CompleteConnectionResponse` carries `userId` only, and the doc
      records why the other two left — including that `isReturningUser` was
      widened for a consumer that never existed
- [x] 1.2 Done. `ResolvedConnection` carries `userId` only. Its doc keeps the
      reason `userId` is returned rather than assumed, and adds that
      `connectionId` was dropped rather than repaired because the value was wrong
      on reconnection, not merely unused
- [x] 1.3 Done. `DrizzleConnectionRepository.upsert` returns the resolved
      identity alone; the docblock states that the id minted for the insert is
      not handed back because the upsert leaves the existing row's key in place
- [x] 1.4 Done. `FakeConnectionStore.upsert` follows the port
- [x] 1.5 Done. `expect(res.connectionId).toBeTruthy()` becomes a whole-shape
      assertion on the response, and the two `isReturningUser` assertions become
      assertions on the fact: a returning subject leaves one connection in the
      store and resolves to the one holding that subject; a second subject leaves
      two. Mutation-checked — re-adding `isReturningUser` to the response fails
      `answers with the identity to act as, and nothing else` with
      `+ "isReturningUser"`, and passes again when reverted
- [x] 1.6 Done. `npx tsc --noEmit -p tsconfig.json` clean, `npx eslint .` clean,
      `npx vitest run tests/connection/ tests/access/ tests/architecture/`
      340 passed / 33 files. `openspec.py validate` clean
