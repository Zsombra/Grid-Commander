---
id: the-keyless-live-check-is-never-run
title: The one live check that needs no credential is the one nothing runs
type: debt
status: open
priority: p2
created: 2026-08-10
updated: 2026-08-10
change: ""
capability: battlegrid-connection
github: "117"
blocked_by: []
tags: [ci, oauth, verification, battlegrid]
---

# The keyless live check is never run

Tracked on GitHub as **#117**, which carries the three options and the tradeoff.

## What

`tests/live/oauth-metadata.test.ts` re-fetches the OAuth discovery document and
compares it against `docs/battlegrid-oauth-metadata.json` — the recording every
other OAuth check trusts, since `tests/architecture/oauth-conformance.test.ts`
runs offline against it.

It needs **no credential**. It is gated on `BATTLEGRID_OAUTH_LIVE`, and
`./scripts/ci.sh` never sets it, so it has been available and unrun.

## Why it matters

Its own header names the failure: *a recording nothing re-fetches is a recording
that can quietly stop describing the platform — and then the guard built on it
passes while a user is sent to an endpoint that has moved.* BattleGrid shipped
three majors in three days, so a recording going stale is the ordinary case
here, not the exotic one.

Run 2026-08-10 it **passes** — the recording still describes the platform.
Nothing is broken; the check has just never been part of the routine that would
notice when it stops being true.

## Evidence

- `tests/live/oauth-metadata.test.ts:24` — the `BATTLEGRID_OAUTH_LIVE` gate
- `scripts/ci.sh` — ten `gate` calls, none sets that variable
- Live run: `BATTLEGRID_OAUTH_LIVE=1 npx vitest run tests/live/oauth-metadata.test.ts` → 2 passed

## Notes

**Not just wired in, because the tradeoff is real.** A keyless gate has no
natural off-switch, so `ci.sh` would depend on the network — and a red CI from a
dropped connection is the "red noise that meant nothing" the operator removed
Actions for (`docs/CI_WITHOUT_BILLING.md`, option D). The `CI_SERVING=1` pattern
is the closest precedent and probably the answer, but it is the operator's call.

Found while closing out the `freshness` gap on PR #83. `freshness` genuinely
needs a key — proven rather than assumed: an unauthenticated `initialize`
answers `Missing or invalid Authorization header`, so the MCP handshake is
auth-gated and the server version is unreadable without one. The discovery
document is the only part of the platform contract verifiable without
credentials, which is what makes running it worth something.
