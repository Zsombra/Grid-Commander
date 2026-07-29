# Tasks: Unwrap What BattleGrid Answers

## The seam

- [x] 1. `mcp-adapter.ts` — unwrap the `tools/call` envelope in one place:
      `structuredContent` when present, else JSON parsed from the text blocks.
- [x] 2. Neither present, or text that is not JSON → throw. Never `{}`.
- [x] 3. `isError: true` → throw, carrying the platform's own message, so the
      audit entry completes as `failed`.

## The masking helper

- [x] 4. Delete `asObject` from both adapters; they receive the payload now.

## Tests

- [x] 5. A wrapped payload reaches the caller unwrapped.
- [x] 6. `structuredContent` and the text encoding produce the same value.
- [x] 7. An envelope with neither throws, and surfaces as `unreadable` with
      cause `unreachable` — not as `empty`.
- [x] 8. `isError: true` throws and the audit entry is `failed`.
- [x] 9. The regression, stated directly: a roster response carrying two agents
      renders as two agents and never as `empty`.
- [x] 10. Nothing outside `mcp-adapter.ts` knows the envelope exists.

## Gates

- [x] 11. `npm run typecheck`, `npm run lint`, `npm test`
- [x] 12. `next build`
- [x] 13. **Serve against the live account** and read the pages. This defect was
      invisible to every fake in the suite; only the real platform shows it.
- [x] 14. Mutation sweep: unwrap removed, `isError` ignored, the throw softened
      back to `{}`, one encoding dropped.
- [x] 15. `python3 .claude/tools/openspec.py validate unwrap-what-battlegrid-answers --strict`
