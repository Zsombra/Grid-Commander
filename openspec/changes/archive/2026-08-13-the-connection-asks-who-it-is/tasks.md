# Tasks

Requirement keys used below:

- **R1** — A Grant Carries Authority, Not Identity
- **R2** — A Connection Whose Account Cannot Be Identified Is Refused, And Its
  Grant Released
- **R3** — The Coverage Around Consent Is Stated Where It Is Read
- **R4** — The Connection Is The Identity *(modified)*

## 1. The grant stops claiming an identity

- [x] 1.1 **(R1)** Remove `subject` from `TokenGrant` in `src/ports/battlegrid.ts`.
- [x] 1.2 **(R1)** Delete the subject requirement from `tokenRequest` in
      `mcp-adapter.ts` — the read of `json.sub`, the throw, and the mapped field.
      Move the reasoning it carries (an empty default collides every connection
      on one key) into the connect path, where the refusal now lives; do not
      delete the sentence.
- [x] 1.3 **(R1)** Confirm `refresh` still returns a usable grant with no subject
      — it shares `tokenRequest`, so this is the same removal, and the refresh
      path must not acquire an identity read (out of scope by decision).

## 2. The account read answers honestly

- [x] 2.1 **(R1, R4)** Change `AccountPort.subjectFor` to return an
      answer-or-cause result rather than `BattlegridSubject | null`. Rewrite the
      port's contract note: which caller tolerates unknown, which cannot, and why
      the tolerance now lives at the call site.
- [x] 2.2 **(R1)** Update `McpAccountAdapter.subjectFor` to report the cause —
      the tool being absent, the call failing, and a payload carrying no `userId`
      are three distinguishable answers, not one.
- [x] 2.3 **(R4)** Update `OwnerOnlyUser.battlegridSubject` to collapse the
      result to `null`, with the "unknown must never become a refusal" reasoning
      carried to that call site. Personal-mode behaviour must not change,
      including the caching of a `null` answer.

## 3. Connecting asks, refuses, and releases

- [x] 3.1 **(R1)** Give `CompleteConnectionCommand` the account port, and key
      `findUserIdBySubject` / `upsert` on the answer it returns.
- [x] 3.2 **(R2)** On an unanswered read: store nothing, issue nothing, call
      `revoke` with the just-issued access token, and raise a named outcome the
      callback can render — not a bare `Error`.
- [x] 3.3 **(R2)** Handle a failed release distinctly from a successful one, so
      the surface can tell the user authority may still stand at BattleGrid.
- [x] 3.4 **(R2)** Render both outcomes in
      `app/api/auth/battlegrid/callback/route.ts`, alongside `declined`,
      `incomplete` and `untrusted`. Nothing on this path may throw past the
      `catch`.
- [x] 3.5 **(R2)** Name the new reasons on `app/connect/page.tsx`, including
      where authority can be withdrawn when the release failed.

## 4. The record stops misleading

- [x] 4.1 **(R3)** State beside `oauth-live` in `scripts/ci.sh`, and in
      `tests/live/oauth-metadata.test.ts` (the file the `oauth-live` *gate* runs
      — see decision log DL-1), that it verifies the authorization
      server's published description and that **no gate exercises a token
      exchange**, because an authorization code needs a person at a consent
      screen.
- [x] 4.2 **(R3)** Correct the registration comment at `src/config.ts:95`
      against `docs/battlegrid-oauth-metadata.json`, which records
      `registration_endpoint` and a secretless `"none"` auth method, and which
      `oauth-live` re-verifies on every run. Keep the original claim visible as
      what was believed, per the tracking convention on corrected findings.

## 5. Verification

- [x] 5.1 **(R1)** A grant carrying no subject completes a connection, keyed on
      the account the read named. *This is the test that would have caught the
      bug.*
- [x] 5.2 **(R1)** A returning subject lands on the same `users.id`; two
      different subjects never collide on one row — assert against the store,
      not against the command's return value.
- [x] 5.3 **(R2)** An unanswered identity read stores no connection, issues no
      session, and calls `revoke` with the access token from the exchange.
      Assert the revoke argument, not merely that revoke was called.
- [x] 5.4 **(R2)** A failed release still stores nothing, and surfaces the
      distinct outcome.
- [x] 5.5 **(R2)** The callback returns a redirect for every refusal branch —
      no branch escapes as a throw.
- [x] 5.6 **(R4)** Personal mode is unchanged: an unreadable account read leaves
      the deployment working, and the `null` is still cached rather than re-asked.
- [x] 5.7 **Mutation check.** Re-run 5.1 and 5.3 against a deliberately broken
      implementation before trusting them — restore the `sub` requirement for
      5.1, and drop the `revoke` call for 5.3. A test that passes both ways
      proves nothing, and three checks written this way were caught in the
      2026-08-12 session. Record the failed versions in the files.
- [x] 5.8 Quality gates, **all six green**: `npm run typecheck` PASS ·
      `npm run lint` PASS · `npm test` PASS (2253) · `npm run build` PASS ·
      drizzle schema check PASS ("No schema changes, nothing to migrate",
      `git diff --quiet drizzle/` clean) · `npm run test:db` PASS (85 tests,
      against `grid_commander_test`) — see DL-9.
- [x] 5.9 **Live, and this change is not done without it.** — **DONE 2026-08-13.**
      Walked by the operator: consent, exchange, identity read, session, `/agents`
      served. `users.battlegrid_subject` = `0eccbf37-…`, the same account the
      personal key resolves to; connection `active`, scopes `["mcp:read"]`,
      tokens encrypted. It also found a second defect — see DL-11 — which is what
      the gate was for. Original text: One delegated
      connection walked end to end by the operator at a consent screen: consent,
      exchange, identity read, session, and a second authorization recognising
      the same account. This is the only thing that proves
      `list_user_active_positions` answers for a delegated token rather than
      only for a personal key. Revoke the tokens afterwards and confirm they are
      dead, as the 2026-08-13 walk did.
