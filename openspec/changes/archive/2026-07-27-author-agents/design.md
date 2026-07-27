# Design: author-agents

Decisions that are not obvious from the requirements, and the reasoning that
would otherwise have to be reconstructed from the diff.

Every one of these is downstream of `findings-agents.md`. Reading the live server
before designing the form was not diligence theatre — it changed four of the nine
decisions below.

---

## D-A · The domain owns an agent model that is not BattleGrid's payload

**Decision**: `src/domain/agent/agent.ts` defines the agent as Grid-Commander
needs it. The adapter maps BattleGrid's 30-field payload onto it at the boundary.

**Why**: the payload carries `avatarUrl`, `modelImageUrl`, `last24hCostUsd`,
`activeGameCount` and a `performance` block — presentation and telemetry the
authoring rules never consult. Importing all of it into the domain would make
every rule look like it depends on things it does not, and would couple the
domain to a shape that changes when BattleGrid ships.

**What the domain actually needs**: identity, `revision`, `status`, the binding
(`strategyId`, `strategyRevision`, `strategyName`, `bindingState`), the
agent-owned fields, and `capabilities`. Nothing else participates in a rule.

**Cost**: a mapping function that must be updated when BattleGrid adds a field we
care about. Cheaper than the alternative, and the mapping is the one place a
schema surprise surfaces.

## D-B · `capabilities` drives edit affordances; `canDelete` is ignored entirely

**Decision**: `canEdit`, `canArchive` and `canEditOverlay` gate the corresponding
actions. `canDelete` is not read, not mapped, and not stored.

**Why**: F-1. The flag is true on a live agent and there is no delete tool in the
MCP surface. It describes what BattleGrid's own app can do. Mapping the flag set
to buttons mechanically would produce a delete button that cannot work.

**Why not just drop the whole `capabilities` block and infer from
`isSystemDefault`?** Because the server knows things inference does not — an
agent can be uneditable for reasons other than being platform-owned, and
`hasActiveAssignments` hints there are more. Take the server's answer where it
answers the question we are asking; ignore it where it answers a different one.

**Auditor note**: verify no code path reads `canDelete`, and that no delete
affordance exists. The requirement *Retiring An Agent Is Reversible And Described
As Such* has a scenario about this specific confusion.

## D-C · Validation reads two sources and names the third as unvalidatable

**Decision**: bounds come from `tradingDefaults.bounds` where the registry speaks,
from the tool's input schema where it does not, and a field governed by neither
is marked unvalidatable rather than treated as free.

**Why**: F-2. The registry covers sixteen limits and misses
`positionSizePresets.*Pct` (schema: 0.5–100), `signalTimeoutMinutes` (enum
5/10/15) and the monotonic ordering constraint on the three size presets, which
exists only in prose.

**The honest part**: `positionSizePresets` monotonicity is enforced client-side
because it must be, while we do not know whether the server enforces it (recorded
as unestablished — proving it needs a real create). If the server does not, we
are the only guard; if it does, we fail earlier and more kindly. Both are fine.
What is not fine is enforcing it silently and calling it a platform rule.

## D-D · `brain` is a discriminated union in the domain, not optional fields

**Decision**:

```
type Brain =
  | { kind: 'preset'; preset: BrainPreset }
  | { kind: 'custom'; modelId: string; behavior: { risk; outlook; conviction } }
```

**Why**: F-5 — the server accepts one variant or the other and rejects both
together. An object with optional `preset`, `modelId` and `behavior` makes
"preset *and* custom model" representable, and it is representable right up until
the user has filled in the whole form and pressed create.

Make the invalid state unconstructible and the failure moves from the server's
response to the type checker.

## D-E · Editing a limit reads first, and the read carries into the write

**Decision**: every trading-config edit is read-modify-write against the agent's
current config, sending the whole object and the revision it was read at.

**Why**: F-6 — `tradingConfig` is all-or-nothing; every field is required once the
object is present. There is no PATCH.

**Why this is a correctness rule and not an implementation detail**: sending a
partial config would not error, it would *reset* the omitted fields to whatever
the server defaults them to. A user who changed `maxLeverage` would silently lose
their `maxDailyLossUsd`. That is the class of bug this product exists not to
have, and it is why the read and the write are one use case rather than two.

## D-F · Rebind confirmation is bound to (agent, targetStrategy), not to "rebind"

**Decision**: the `ConfirmationToken` from change 1 is issued against both the
agent id and the target strategy id. Presenting a token issued for a different
pair is refused.

**Why**: rebind is the most destructive thing in this change — it replaces
context modules, signal rules, prose and timeframe wholesale. The consequence a
user reads and agrees to is *specific*: "Volatilis will be rebound to Momentum
Breakout, and everything it inherited from Volatilis — imported will be
replaced". A token that only says "a rebind was confirmed" would let that
agreement be applied to a different agent.

This is the requirement scenario *A confirmation is reused for a different
rebind*, and it is the first real use of the token design from DL-5.

## D-G · Nothing about an agent is stored locally

**Decision**: no `agents` table. The roster is read live on every view.

**Why**: BattleGrid is the source of truth and the agent can change without us —
the user's own app, an automation, the agent's own activity. A local copy would
be a second truth that is wrong most of the time, and the revision that makes
optimistic concurrency work has to be the one just read, not the one we cached.

**Cost**: a roster view costs a round trip and there is no offline mode. Correct
trade: this is a configuration workbench, not a dashboard, and showing stale
configuration as though it were current is worse than showing a spinner.

**What this does not change**: the audit log stays local, because it records what
*this product* did, which BattleGrid has no reason to keep.

## D-H · The roster distinguishes three states, and the type makes it do so

**Decision**: the roster query returns `{ kind: 'agents', ... } | { kind: 'empty' }
| { kind: 'unreadable', reason }` rather than an array that may be empty.

**Why**: the requirement has separate scenarios for "no agents" and "could not
load", and an empty array collapses them. The failure mode is specific and bad:
a user whose roster failed to load sees "you have no agents" and creates a
duplicate of one they already have — or worse, believes something deleted them.

The type is what makes the distinction survive. An `Agent[]` invites
`agents.length === 0 ? 'none yet' : ...` at every call site, and one of them will
get it wrong.

## D-I · `scopesFor()` is replaced now, not later

**Decision**: this change closes the debt from DL-14 / PG-004 before adding any
agent write.

**Why**: it fails open — it reports `mcp:read` held whether or not the grant says
so. Change 1 could carry it because nothing it did was a mutation on a user's
account. This change's first line of new behaviour is a mutation on a user's
account. Adding writes on top of a scope check that reports authority the
connection may not hold is the wrong order to do things in.

**What replaces it**: the connection is already the record of what was granted
(`connections.scopes`, written at exchange time). The guard reads it. There is
no new source of truth, only the correct one.
