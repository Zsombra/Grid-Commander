# Proposal: Bound And On Duty Are Claims The Payload Must Back

## Why

Two surfaces state something definite that the payload contradicts. Both were
found on 2026-08-06 while surveying the second account, both on the same agent,
and both are the same defect: a sentence written into the JSX beside a field
that was mapped and never read.

```
Volatilis [ARCHIVED] rev7  strategy=Volatilis — imported (ORPHANED)

deployments: 15 with an ACTIVE agent, 1 with only archived agents, 0 empty
  SP500@15m  slots=Volatilis[ARCHIVED]
```

**The binding.** BattleGrid declares exactly two binding states on
`list_intelligence_agents` — `BOUND` and `ORPHANED`. `agent-mapper.ts` maps
`agent.binding.state`, the domain carries it, and nothing renders it. Meanwhile
`agent-roster.tsx` hard-codes the word:

```tsx
Bound to <span className="font-medium">{agent.binding.strategyName}</span>{' '}
at revision {agent.binding.strategyRevision}
```

An agent whose strategy is gone renders identically to a healthy one, and reads
*"Bound to Volatilis — imported at revision 7"*. `/agents/[id]` is the same
sentence with a second one after it: the "Inherited from its strategy" section
tells the operator the context, rules, prose and timeframe "come from there and
are changed by editing that strategy" — for a strategy that cannot be read.

**The deployment.** `deploymentsFor` filters the radar by `agentId` and takes no
account of lifecycle, so `/agents/[id]` renders, for an archived agent:

> On duty: scanning SP500 on the 15m radar.

An agent that is not ACTIVE scans nothing. And the same join produces the other
half: SP500 is a market nobody scans, the radar reports its slot as occupied, so
it reads as covered and no surface says otherwise.

One change rather than two: they are the same defect on the same agent, and they
share `agent-roster.tsx` and `/agents/[id]`. Splitting them would have two
changes editing the same two files to fix one thing.

## What Changes

### The binding is rendered, and nothing more is claimed

`BindingSummary` renders the state BattleGrid reported, on the roster row and on
the agent's page, through one component so the two cannot drift. `BOUND` reads
as it always has. `ORPHANED` says the strategy it was bound to can no longer be
read and names the revision its configuration was materialized from. A state
this product has no reading of — including the `UNKNOWN` the mapper writes when
the payload carried none — is shown as the platform's own word with no meaning
asserted for it.

The inheritance sentence moves to the bound case, which is the only case it is
true of.

**What is deliberately not said.** Why a binding is orphaned, whether the agent
goes on running the configuration it materialized, and whether rebinding repairs
it. `an-orphaned-agent-is-shown-as-bound` records all three as unestablished and
says how to establish them: archive a strategy an agent is bound to on the test
account, with `BATTLEGRID_LIVE_WRITES=1` and a throwaway subject, and read the
agent back. Until then a surface that named a cause would be the same defect
pointing the other way.

### Standing is computed from the pair, in the domain

`deploymentsFor` takes the agent's lifecycle rather than its id alone, and gains
a fourth standing — `slot-held-not-scanning` — for an agent that is not ACTIVE.

**Decision: the join goes in the domain, not at each call site**, as the backlog
item recommends. Three surfaces render standing today — the roster, the agent
page, and the `read_deployments` MCP tool — and a check repeated three times is
three chances to forget it once; that is exactly how the roster and the detail
page came to say different things about the same agent before. Putting it in
`deploymentsFor` makes the honest answer the only answer the type system will
produce: a caller that has not read the lifecycle cannot call the function.

Holding a position is the one thing lifecycle does not override. The radar
attributing an open position to an agent is a statement about money at stake
now, and an archive is not evidence that the position closed.

### A market nobody active is deployed on says so

`AgentDeployment` carries `occupancy` — whether any agent the policy names is
still ACTIVE — and both deployment surfaces state the negative: *no active agent
holds this deployment, so SP500 is deployed and unscanned*. Only the negative is
claimed. `active-agent-present` is not turned into "covered": a policy can carry
`enabled: false` and this product does not read what BattleGrid schedules.

A slot naming an agent whose lifecycle was not read leaves the occupancy
`unknown`, and nothing is said. "Nobody is scanning this market" must not be
said on the strength of an agent nobody looked up.

### What the callers do

The two surfaces that render standing already read the roster on the page they
render; they pass it to the query rather than paying for a second read. The MCP
tool has only an id, so it reads the roster itself, and refuses the whole call
when it cannot — an answer computed against a lifecycle nobody read is the
defect, not the fallback.

Two callers of `deploymentsFor` wanted only the markets — which coins to screen,
and whether an undeploy has anything to remove — and neither holds a lifecycle.
They move to `deploymentsNaming`, which is membership and nothing else, so
neither is taught to invent a status to satisfy a signature.

## Capabilities

**Modified**: `agent-understanding` — one ADDED requirement for the binding, and
one MODIFIED (`Whether An Agent Is Acting Is Stated Where The Agent Is Read`),
which enumerated three standings and now has to admit a fourth. The rule that
produces it lives in `agent-deployment`; this is the obligation on the two
surfaces where an agent is read, which is where that requirement already lives.

**Modified**: `agent-deployment` — two ADDED requirements: standing read against
lifecycle, and a deployment no active agent holds.

## Out of Scope

- **What `ORPHANED` means.** Named above; it needs a live write on a throwaway
  subject and it is not this change.
- **Whether BattleGrid intends an archived agent to keep its slot.** Whether
  archiving is meant to vacate the radar and does not, or the slot is preserved
  so reactivation restores coverage. Both plausible, neither established. The
  product reports the pair accurately without settling it.
- **The other two places that describe a binding.** `agent-edit.tsx` says the
  inherited fields "change by editing that strategy", and the reactivate copy
  says an agent "returns to your roster bound to X". Both make the same
  assumption and neither is a surface these backlog items named; filed as
  `the-edit-and-reactivate-copy-assume-the-binding-is-intact`.
- **Vacating the slot.** Nothing here undeploys an archived agent. The product
  reports; the operator decides.
- **`enabled: false` policies.** A deployment the platform has switched off is
  another way a market can be deployed and unscanned, and this product does not
  read that flag onto any surface yet.

## Impact

- `src/domain/agent/deployment.ts` — `AgentLifecycle`, the fourth standing,
  `SlotOccupancy`, `deploymentsNaming`; `deploymentsFor` and
  `deploymentsByAgent` take lifecycles. **Breaking to callers**, deliberately:
  every existing call site had to be looked at.
- `src/domain/agent/agent.ts` — `isBound` / `isOrphaned`.
- `src/application/use-cases/read-deployments.query.ts` — the request carries
  the agent and the roster.
- `src/application/use-cases/deploy-agent.command.ts`,
  `read-qualification.query.ts` — membership instead of standing.
- `src/presentation/components/binding.tsx` (new), `agent-roster.tsx`,
  `app/(app)/agents/page.tsx`, `app/(app)/agents/[id]/page.tsx`,
  `src/mcp/tools.ts`.
- No new BattleGrid call on the web surfaces, and no change to any payload sent.
  `read_deployments` over MCP makes one extra read — the roster — because it has
  no page that already did.
