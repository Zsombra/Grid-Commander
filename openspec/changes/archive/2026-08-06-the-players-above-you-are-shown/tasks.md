# Tasks

- [x] `LeaderboardEntry` and `OwnStanding` carry `userId` (`src/ports/explorer.ts`)
- [x] `readLeaderboard` maps `userId` on rows; `mapOwnStanding` maps it on the standing
- [x] A row with no `userId` still renders — the id identifies, it does not gate
- [x] `/explorer` renders the rows as a table under the standing sentence
- [x] The account's own row is marked, matched on `userId` and nothing else
- [x] An empty `entries` says the platform ranked nobody — not that the read failed
- [x] Delta spec: MODIFIED `Where This Account Stands Is Shown First`
- [x] Tests: rows render; own row marked; own row absent from a top ten; no
      `userId` anywhere; empty list; unreadable still says unreadable
- [x] `npx tsc --noEmit`, `npx vitest run`, `npx eslint` on changed files
