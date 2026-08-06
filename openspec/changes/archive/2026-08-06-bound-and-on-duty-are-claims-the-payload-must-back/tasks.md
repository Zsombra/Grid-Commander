# Tasks

## The binding

- [x] 1.1 `isBound` / `isOrphaned` in the domain, so the platform's vocabulary
      lives in one place rather than in JSX
- [x] 1.2 `BindingSummary` and `BindingInheritance` — one component pair for
      both surfaces, with the orphaned case saying only that the strategy
      cannot be read and naming the revision it materialized from
- [x] 1.3 The roster row and `/agents/[id]` render them, and neither writes the
      word "Bound" itself
- [x] 1.4 A state the product has no reading of — including the mapper's
      `UNKNOWN` — shows the word and asserts nothing

## The standing

- [x] 2.1 `deploymentsFor` takes the agent's lifecycle and the roster's, and
      returns `slot-held-not-scanning` for an agent that is not ACTIVE — the
      join in the domain, not at each call site
- [x] 2.2 A position the radar attributes to the agent survives the lifecycle
- [x] 2.3 `occupancy` on each deployment: `no-active-agent` licenses the
      "deployed and unscanned" sentence, `unknown` licenses nothing
- [x] 2.4 `deploymentsNaming` for the two callers that want markets, not
      standing (`describeUndeploy`, `readQualification`)
- [x] 2.5 `ReadDeploymentsQuery` carries the agent and the roster; both web
      surfaces pass the roster they already read, and the MCP tool reads one
      and refuses the call when it cannot
- [x] 2.6 Both deployment surfaces render the fourth standing and the unscanned
      market

## Tests

- [x] 3.1 Domain: the four standings, the position that outranks lifecycle, the
      three occupancies, membership kept separate, `deploymentsByAgent` keyed by
      the roster it was given
- [x] 3.2 Rendering, binding: orphaned on both surfaces, no "Bound", no cause
      and no remedy asserted, bound unchanged, an unreadable state shown as
      itself
- [x] 3.3 Rendering, standing: archived-in-a-slot on both surfaces, the
      unscanned market, an active agent unchanged, an unreadable radar still
      claiming nothing, the held position still reported
- [x] 3.4 MCP: `read_deployments` joins the lifecycle, refuses when the roster
      will not answer, and says `no-such-agent` for an id the account lacks
- [x] 3.5 `npx tsc --noEmit -p tsconfig.json`, `npx eslint .`, and
      `npx vitest run tests/agent/ tests/rendering/ tests/architecture/` green

## Notes from the build

**The join had to move, not be added.** `deploymentsFor(deployments, agentId)`
could not be fixed in place — nothing in its inputs could tell an archived
agent's slot from an active one's. Taking the lifecycle makes the honest answer
the only one the type system will produce, and it turned up every call site: two
of them (`describeUndeploy`, `readQualification`) never wanted standing at all
and now say so by calling `deploymentsNaming`.

**`deploymentsByAgent` is keyed by the roster it was given, not by whoever the
radar names.** An agent in a slot and absent from the roster has no lifecycle to
judge against, and the map exists to be looked up by the rows the roster is
about to render — which are exactly the agents passed in. Inventing an entry for
it would mean inventing a status.

**The MCP tool pays for a read the web surfaces do not.** Both pages have
already read the roster where they render; a model has sent an id and nothing
else. It reads the roster itself and fails the whole call when that read fails,
because standing computed against a lifecycle nobody read is the defect this
change removes, not an acceptable degradation. An id the account does not hold
answers `no-such-agent` rather than borrowing `unreadable` — neither `refused`
nor `unreachable` describes a mistyped id, and both would send a model to the
wrong fix.

**Only the negative is claimed about a market.** `active-agent-present` is not
"covered": a policy can carry `enabled: false`, which this product does not read
onto any surface, so turning it into a positive would be a new false claim
inside the fix for an old one.

**The orphaned copy stops earlier than it wants to.** It names two facts — the
strategy cannot be read, the revision the configuration was materialized from —
and nothing else. Not why, not whether the agent goes on running it, not
rebinding. All three are unestablished, and the way to establish them is a live
write on a throwaway subject.
