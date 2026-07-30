# Tasks

## The guard first

- [x] 1. `tests/architecture/one-destination.test.ts` — the application reaches
  exactly one host. Derived from source, never a hardcoded allowlist, and it must
  **fail on the tree before the removal** (the Anthropic SDK is still a
  dependency). Record what it names.
- [x] 2. It must also fail if `@anthropic-ai/sdk` — or any other network SDK —
  returns to `package.json` as a runtime dependency.

## Remove

- [x] 3. Delete the capability: route, use cases, domain, port, both adapters,
  presentation components, tests. 16 files.
- [x] 4. `composition.ts` — drop the wiring and the `AssistantPort` field.
- [x] 5. `config.ts` — drop `anthropicApiKey`.
- [x] 6. `section-nav.tsx` — drop **Ask**. `layout.tsx` comment names four
  islands; it is now three.
- [x] 7. `package.json` — drop `@anthropic-ai/sdk`, then `npm install` so the
  lockfile matches.
- [x] 8. `.env.example` — drop the `ANTHROPIC_API_KEY` block.
- [x] 9. `scripts/check-serving.sh` — `/assistant` leaves `ROUTES`.
- [x] 10. `docs/DEPLOYING.md` — remove the assistant's deployment story.

## What stays, and why

- [x] 11. **`AuditActor` keeps `'assistant'`.** The audit log renders stored
  history; `actor` is `text` with a `'user'` default, not an enum, so nothing
  migrates. State the reason in the type so the stale-code scan reads it as a
  decision rather than an oversight.
- [x] 12. **`anthropic/claude-…` model ids stay.** They are BattleGrid's approved
  models for an agent's brain, reached by the platform and never by this product.
  Assert the distinction so a future cleanup does not delete them.

## Verify

- [x] 13. Re-run the guard from task 1: it passes for the right reason. Re-inject
  the dependency and watch it fail.
- [x] 14. Serve, and walk the nav. Three sections, no dead link, `/assistant`
  gone rather than 500ing.
- [x] 15. typecheck, lint, tests, `./scripts/check.sh`, `check-serving.sh`,
  `next build`.
- [x] 16. Close `assistant-unverified-against-live-api` and
  `assistant-has-no-spend-ceiling` as moot, naming this change.

## Two things this turned up that were not the assistant

**A hardcoded list broke because a capability left.** `reachability.test.ts` held
`TOP_LEVEL = ['/agents', '/strategies', '/assistant', '/audit']`. Removing the
assistant made it fail — the mild half of what a written-down list does. The
worse half is silent: add a fifth section and it keeps passing while nothing
links to it. Now derived from routes one segment deep inside the group. Not from
the nav, which would be circular — the nav is in the layout, so every page's
render set contains it by construction.

**A guard was pinning the deploy doc to a fact that had stopped being true.** It
required the doc to say *"no valid `bg_live_` key has existed in any environment
this was built in"* — correct when written, false since the personal path was
exercised against two live accounts. A guard aimed at the past fails on the
honest edit and passes on the stale one. Repointed at what is genuinely still
unproven: **no real OAuth authorization has ever been completed**, which is the
MVP's own exit criterion and the thing a deployer choosing the delegated path
most needs told.

The doc now also states what *has* been proven live, because a document that
reads as untested everywhere gets ignored everywhere.
