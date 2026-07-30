# Tasks: Refused Is Not Unreachable

## Ports

- [x] 1. Add `cause: FailureCause` to the `unreadable` variant of
      `RosterResult`, `JournalResult`, `StrategiesResult`, `VocabularyResult`.
- [x] 2. Define `FailureCause = 'refused' | 'unreachable'` in one place both
      ports can reach, so the two adapters cannot drift.

## Adapters

- [x] 3. `agent-adapter.ts` — decide the cause at each catch: a
      `ConnectionRevokedError` is `'refused'`, everything else `'unreachable'`.
- [x] 4. `strategy-adapter.ts` — same, including the non-throwing
      `'no categories returned'` site, which is a malformed answer and therefore
      not a refusal.

## Views

- [x] 5. `agent-roster.tsx` — keep "your agents are gone" reassurance, vary only
      the cause clause.
- [x] 6. `strategy-list.tsx` — same.

## Tests

- [x] 7. A 401 produces `cause: 'refused'`; a network error produces
      `'unreachable'`.
- [x] 8. A malformed payload is `'unreachable'`, not `'refused'` — the platform
      answered, but not with an answer.
- [x] 9. Both views render the reassurance in both causes.
- [x] 10. The refused view does not say the platform could not be reached.
- [x] 11. The cause is carried, not parsed — no view or use case inspects
      `reason` text to decide.

## Gates

- [x] 12. `npm run typecheck`, `npm run lint`, `npm test`
- [x] 13. `next build`
- [x] 14. Serve personal mode with a refused key and read the whole page again —
      the same method that found this.
- [x] 15. Mutation sweep: cause inverted at each adapter, the branch removed from
      each view, the reassurance dropped, and the malformed-payload site
      reclassified as a refusal.
- [x] 16. `python3 .claude/tools/openspec.py validate refused-is-not-unreachable --strict`
