# Architecture Review: a-personal-key

## Dependency direction

`held-scopes.ts` sits in `src/domain/connection/` and imports only `Scope`.
`ConnectionScopes` is infrastructure and imports the domain. `OwnerOnlyUser` is
an application use case importing only domain types and the sibling
`Authority`. Confirmed — nothing points outward.

The adapter's dependency narrowed: it took `ConnectionReader` and now takes
`HeldScopes`, which is a domain interface rather than a repository. Strictly
better — the one file allowed to talk to BattleGrid no longer knows a
repository exists.

## No runtime dual-path

The central risk of this change, and the reason for two interfaces rather than
two branches. `CurrentUserQuery` is unchanged apart from `implements ActingUser`.
`OwnerOnlyUser` does not know the delegated path exists. Neither branches on
mode; the composition root picks, once.

`config.ts` does branch — `oauth()` returns a required or optional value
depending on `personal`. That is configuration resolution, not a runtime path,
and it happens once at import.

## No defensive fallback masking a contract

`DeclaredScopes` returns exactly what it was given. `ConnectionScopes` returns
`[]` for an absent or unusable connection, unchanged from the code it replaced —
and that is not masking: no grant is no authority, and the guard refusing
everything is the correct reading.

The one fallback added is `optional(name) ?? ''` for the OAuth client in personal
mode. It does not mask a missing requirement; it encodes that the requirement
does not apply, and the empty value reaches only `buildAuthorizationUrl`, which
personal mode never calls.

## Contract consistency

`Authority` is unchanged, so everything downstream is unchanged. `OWNER_USER_ID`
is a constant rather than a literal at each site, and the audit and confirmation
tables key on it exactly as they key on a real user id.

## P6 — one way in

Untouched. The adapter is still the only file that talks to BattleGrid, and the
personal key reaches it as an `accessToken` like any other.

## Verdict

No violations.
