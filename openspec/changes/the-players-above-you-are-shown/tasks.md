# Tasks

- [ ] `LeaderboardEntry` and `OwnStanding` carry `userId` (`src/ports/explorer.ts`)
- [ ] `readLeaderboard` maps `userId` on rows; `mapOwnStanding` maps it on the standing
- [ ] A row with no `userId` still renders — the id identifies, it does not gate
- [ ] `/explorer` renders the rows as a table under the standing sentence
- [ ] The account's own row is marked, matched on `userId` and nothing else
- [ ] An empty `entries` says the platform ranked nobody — not that the read failed
- [ ] Delta spec: MODIFIED `Where This Account Stands Is Shown First`
- [ ] Tests: rows render; own row marked; own row absent from a top ten; no
      `userId` anywhere; empty list; unreadable still says unreadable
- [ ] `npx tsc --noEmit`, `npx vitest run`, `npx eslint` on changed files
