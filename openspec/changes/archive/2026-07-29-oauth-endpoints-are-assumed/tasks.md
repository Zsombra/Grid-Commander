# Tasks

## Observe first

- [x] 1. Fetch `/.well-known/oauth-authorization-server` and record it as
  `docs/battlegrid-oauth-metadata.json`.
- [x] 2. Build the product's exact authorize URL against a registered client and
  confirm the server accepts it. Confirm PKCE is enforced by removing the
  challenge and watching it be refused.
- [x] 3. Re-register a client with `scope: "mcp:read"` and confirm `findings-dcr`
  F-1 and F-2 still hold — no secret, no management token, scope echoed.

## Guard

- [x] 4. `tests/architecture/oauth-conformance.test.ts` — compare every URL
  `loadConfig()` builds against the recorded document, plus scopes, grant types,
  response types and the challenge method. Offline, against the artifact, the way
  `mcp-conformance.test.ts` runs.
- [x] 5. Assert the *code* that builds the authorize URL sends what the server
  requires — a config match is not the same as a request match.
- [x] 6. `tests/live/oauth-metadata.test.ts` — re-fetch and diff against the
  recording, so drift is detectable. Skips without network, like the other live
  suites.

## Verify

- [x] 7. Re-inject: point `authorizeUrl` at a plausible-but-wrong path and watch
  the guard fail. Do the same for a scope the platform does not publish.
- [x] 8. typecheck, lint, tests, `./scripts/check.sh`, `check-serving.sh`.
- [x] 9. Narrow `oauth-path-may-be-dead-weight` to what actually remains —
  consent, exchange, refresh — and record what this change proved.

## What the probe corrected about my own recommendation

I proposed this work saying registration was untested. **It was not** —
`findings-dcr.md` recorded it on 2026-07-27, live, with two registrations and
both findings that matter (no `client_secret` whatever is asked for; registration
scope is a usable ceiling). I recommended re-doing proven work because I had not
read the archive before offering.

What was genuinely unproven, and is now proven, turned out to be different and
narrower: that the authorize endpoint accepts the exact URL `buildAuthorizationUrl`
builds, that PKCE is enforced rather than advertised, and that the product's
pinned endpoints match what the platform publishes.

The re-injection that matters most is the first one: pointing `authorizeUrl` at
`${BASE}/oauth/authorize` fails the guard, and that is not a strawman —
`battlegrid.trade/oauth/authorize` is exactly where the consent screen lives, so
it is the wrong answer someone would actually reach for.
