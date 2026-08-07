# Tasks

- [x] 1.1 `GridSessionSummary` widens additively with the list-only fields the
      session page renders — `hostDisplayName`, `itmPercent`,
      `calculatedItmCount`, `alpha`, `distributionCurveId`, `feeBreakdown`
      (the platform's five per-entry amounts), `pickRosterSize`, `hasPicks` —
      and the adapter maps them from the observed row shape
- [x] 1.2 `OpenGridSessionQuery` reads the list alongside the detail and
      resolves the session's own row into a three-state outcome: `summary`,
      `not-listed`, `unreadable` — no new port method
- [x] 1.3 `/arena/[id]` renders the list-row facts: players needed against the
      minimum, host or none named, entry fee and prize pool, the money split
      in the platform's own figures, the coin pool, and the roster fact; the
      unreadable branch carries `WhyNotLoaded`, the not-listed branch is its
      own named state
- [x] 1.4 No crowd panel: nothing reads `crowdUpPercent`, `crowdDownPercent`
      or `coinPicks.top`; `hasPicks: true` renders as "picks exist, not read";
      `payoutStructure` and `hostAvatarUrl` stay unmapped
- [x] 1.5 Tests: the query keeps the four reads independent and names the
      not-listed state; the page renders each summary state (present,
      unreadable, not-listed) without blanking the others; fixtures carry the
      new fields with observed-shaped values
- [x] 1.6 `npx tsc --noEmit`, the arena/rendering/architecture suites, and
      `eslint` on the changed files
