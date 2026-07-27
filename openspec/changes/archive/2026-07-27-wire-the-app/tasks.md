# Tasks: wire-the-app

## 1. Session

- [x] 1.1 `src/domain/session/session.ts` — a session as a signed pointer to a
      user; issue, verify, reject
- [x] 1.2 `src/ports/session.ts` — the cookie port, so the domain never touches
      `next/headers`
- [x] 1.3 `src/infrastructure/http/cookie-session.ts` — HMAC over the user id,
      cookie flags, lifetime
- [x] 1.4 Tests: valid, absent, unknown user, forged, tampered, expired

## 2. Authority

- [x] 2.1 `src/application/use-cases/resolve-authority.query.ts` — the single
      place a token is obtained; refreshes when `needsRefresh` says so
- [x] 2.2 Persist the refreshed grant; a second call in the same window does not
      refresh again
- [x] 2.3 Collapse every loss of authority into `ConnectionRevokedError`
- [x] 2.4 Tests: fresh, near-expiry, unrefreshable, absent, revoked

## 3. Composition root

- [x] 3.1 `src/composition.ts` — build the adapters once from `loadConfig()`
- [x] 3.2 Fail at import when configuration is missing
- [x] 3.3 Structural test: nothing under `app/` constructs an adapter

## 4. Routes

- [x] 4.1 `/connect` — start authorization
- [x] 4.2 `/api/auth/battlegrid/callback` — complete it, issue the session
- [x] 4.3 `/api/auth/battlegrid/disconnect` — revoke and clear the session
- [x] 4.4 `/audit` — the record of what this product did
- [x] 4.5 `/agents` — roster
- [x] 4.6 `/agents/new` — create
- [x] 4.7 `/agents/[id]` — detail (edit form partial — see WL-6)
- [x] 4.8 `/agents/[id]/rebind` — propose and perform
- [x] 4.9 `/agents/[id]/archive` — propose and perform
- [x] 4.10 `/agents/[id]/journal`
- [x] 4.11 A shared guard: no session → the connect path, in one place

## 5. Verification

- [x] 5.1 A test per scenario — 6 requirements, 16 scenarios
- [x] 5.2 Structural test: `app/` imports only `@/application` and
      `@/presentation`
- [x] 5.3 Structural test: only `resolve-authority` decrypts a token
- [x] 5.4 One end-to-end test: request → session → guard → adapter → response,
      proving a destructive call requires confirmation and writes an audit row
- [x] 5.5 Mutation-check the session signature and the refresh trigger
- [x] 5.6 All quality gates green
- [x] 5.7 Close backlog `no-composition-root`
