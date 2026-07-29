# Tasks: A Remedy That Exists

## Domain

- [x] 1. `src/domain/connection/remedy.ts` — `Remedy` type with two cases and
      `describeRemedy`. The sentence lives here so no surface holds a copy.
- [x] 2. `ConnectionRevokedError` takes a required `Remedy` and composes its
      message from it. No default — a default is how a call site inherits the
      wrong deployment's advice.
- [x] 3. Update the five structurally-delegated construction sites to pass
      `'reconnect'` explicitly (`resolve-authority.query.ts` ×4,
      `connect.commands.ts` ×1).

## Wiring

- [x] 4. `McpBattleGridAdapter` takes `remedy` in its config and uses it on
      401/403.
- [x] 5. Composition root chooses once, beside `heldScopes`.

## Surface

- [x] 6. `/connect` refuses in personal mode: states the deployment acts with a
      configured credential, renders no consent summary and no button.

## Tests

- [x] 7. `describeRemedy` returns the right sentence for each case, and the
      personal one names the variable to fix.
- [x] 8. A 401 in personal mode produces a message naming the key; in delegated
      mode, one naming reconnection.
- [x] 9. Composition binds `repair-the-key` when personal, `reconnect` when not.
- [x] 10. `/connect` in personal mode renders no submit control and no
      authorization link.
- [x] 11. Prove `OwnerOnlyUser` never returns `not-connected` — the claim the
      proposal makes about `NOT_CONNECTED` being unreachable.
- [x] 12. The delegated path's message is byte-identical to what it was.

## Gates

- [x] 13. `npm run typecheck`, `npm run lint`, `npm test`
- [x] 14. `next build`
- [x] 15. Serve personal mode with a refused key and read the page. The last two
      times, rendering found what assertions did not.
- [x] 16. Mutation sweep: at minimum — remedy inverted at the composition root,
      the personal sentence changed to name reconnection, the `/connect` guard
      removed, and the default reintroduced on `ConnectionRevokedError`.
- [x] 17. `python3 .claude/tools/openspec.py validate a-remedy-that-exists --strict`
