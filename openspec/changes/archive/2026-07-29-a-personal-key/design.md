# Design: A Personal Key

## Decision: two implementations at the composition root, never a branch inside

**Decision.** `ActingUser` and `HeldScopes` each get two implementations, picked
in `composition.ts` from `config.personal`.

**Why.** Every route calls `currentUser` and cannot tell which it got. A branch
inside `CurrentUserQuery` would be a runtime dual-path — the thing the
architecture review forbids — and it would put "am I personal?" into a use case
that has no business knowing.

**Precedent.** `AssistantPort` already works this way: `ClaudeAssistant` or
`NotConfiguredAssistant`, chosen once, invisible downstream.

## Decision: scopes become a seam, not a repository read

**Decision.** The adapter takes `HeldScopes` instead of `ConnectionReader`.

**Why.** `scopesFor` read `connections.scopes` and returned `[]` when there was
no row — which is correct for a delegated deployment and fatal for a personal
one, where the guard would refuse every call. The two answers come from
different places and are not the same kind of fact: one is a grant BattleGrid
issued, the other a declaration the operator made.

**What did not change.** Both go through the same guard. Policy P1 says scope
must never be the thing that decides, and this makes that concrete: the
classification and the confirmation gate are untouched.

## Decision: the declaration defaults to `mcp:read`

**Decision.** `BATTLEGRID_KEY_SCOPES` defaults to `mcp:read`; an unknown value
is refused rather than dropped.

**Why.** Defaulting to whatever the key might hold would have the product act
with authority nobody asked it to use, on the strength of a variable being
unset. Dropping an unrecognised scope silently narrows in one direction and — if
the parser ever changed — widens in the other.

**What it is not.** It is restraint, not protection. Declaring `mcp:read` stops
this product asking for a wager tool; it does not stop the key. `cannot-verify-what-a-key-grants`.

## Decision: the OAuth client is not required in personal mode

**Decision.** `BATTLEGRID_CLIENT_ID` and `BATTLEGRID_REDIRECT_URI` fall back to
empty when a personal key is set.

**Why.** Registration is the ceremony this path exists to remove. Demanding a
registered client in order to avoid registering one makes the path unreachable
by its own precondition, and forces the operator to invent values — the
fabrication this product refuses everywhere.

**Verified.** The application boots and serves all five routes with neither
variable set.

## Decision: the absence of a login is disclosed in the product

**Decision.** A `consequence`-toned notice on every page while personal mode is
on.

**Why.** Anyone who can reach the deployment acts as the owner, with a credential
that can reconfigure their trading agents. That is correct on one machine and
wrong anywhere else, and **nothing on the screen would otherwise distinguish the
two**. Documenting it in `.env.example` reaches whoever deploys it, not whoever
is looking at it.

**Why every page.** It is a property of the deployment, not an event. A warning
seen once at startup is not a warning.

**Why `consequence`.** The system's first principle is that consequence outranks
everything on a screen, and this is the only element in the product describing
what someone *else* could do with it.
