# Tasks: A Personal Key

## The seams

- [x] `HeldScopes` — what the credential this request acts with carries. Two
      sources, because a grant and a declaration are not the same kind of fact
- [x] `ConnectionScopes` — the delegated answer, read from the connection
      BattleGrid issued. Absent or revoked holds nothing, which refuses
      everything
- [x] `DeclaredScopes` — the personal answer, consulting no database
- [x] `ActingUser` — who a request acts for. `CurrentUserQuery` implements it
      unchanged; `OwnerOnlyUser` is the second implementation
- [x] Both picked at the composition root, never branched on downstream — a
      runtime dual-path is what the architecture review forbids

## Configuration

- [x] `BATTLEGRID_API_KEY`, optional. Absent leaves the OAuth path exactly as it is
- [x] `BATTLEGRID_KEY_SCOPES`, defaulting to `mcp:read` — the least the product
      can act with, not whatever the key might hold
- [x] An unknown scope is refused, not dropped. Silently narrowing is a
      confusing afternoon; silently widening is worse
- [x] `BATTLEGRID_CLIENT_ID` and `BATTLEGRID_REDIRECT_URI` are not required in
      personal mode. **Requiring a registered client in order to avoid
      registering one would make the path unreachable by its own precondition**
- [x] `.env.example` documents both modes and which variables each needs

## The disclosure

- [x] `PersonalModeNotice` — says the deployment authenticates nobody, and that
      the scopes are declared rather than enforced
- [x] `consequence` tone, not `notice`: it is the only element in the product
      describing what someone else could do with it
- [x] Rendered by the layout on every page. A warning you saw yesterday is not a
      warning
- [x] Shown only when there is something to disclose

## Guards

- [x] 19 tests across config, both scope sources, the owner, and the disclosure
- [x] Re-inject each defect and watch the guard fail — 9 injected, 9 caught,
      including the two that matter most: the default widening to include wager,
      and the notice describing a declared scope as enforced

## Gates

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test` — 511 passing, up from 492
- [x] `npm run build`
- [x] `./scripts/check.sh`
- [x] `./scripts/check-serving.sh` — the delegated path, unchanged
- [x] **Served in personal mode with no OAuth client configured at all**, and
      looked at in both colour schemes

## What serving it found

**`/` redirects to `/agents` rather than `/connect`**, because the owner is
always acting. Correct, and worth having seen rather than assumed.

**The roster says "Reconnect to continue" when the key is refused**, and there is
nothing to reconnect to — `/connect` is not in the navigation and the OAuth
client is deliberately unset. A wrong *remedy*, not a wrong diagnosis: the
account genuinely cannot be read and nothing fake is shown.

Not fixed here. Both strings are domain constants, and the delegated path
deliberately gives one message for every way authority is lost (design W-C) so a
user never has to tell an expired token from a forged cookie. Making the remedy
vary by mode means threading that mode into error presentation — a design
decision, not a copy edit, and one worth making deliberately rather than at the
end of the change that surfaced it. Filed as `personal-mode-says-reconnect` (P1).

**A route finally exercised the database.** `/audit` returned 500 mid-probe
because PostgreSQL had stopped — and it was the *only* route that noticed, since
personal mode has no session gate in front of it. That is the first time a probe
in this project has touched the database, and it narrows
`no-route-exercises-the-database` without closing it.

Proof: `docs/merge/proof/personal-mode-light.png`,
`docs/merge/proof/personal-mode-dark.png`.
