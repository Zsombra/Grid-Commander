# Tasks

Full track. The planner writes `plan/` before any of this is implemented.

## 1. Decide what is proposable, and write it down

- [ ] 1.1 Enumerate the product operations a proposal may name, from the web
      routes that already offer them — edit, rebind, archive, deploy, undeploy,
      retune, apply, stop trading
- [ ] 1.2 For each: is a fresh describe possible from target + values alone?
      Anything that needs state only the web form holds is out, and the reason
      is recorded rather than the operation quietly omitted
- [ ] 1.3 Set the staleness horizon, with the reasoning. Not the 300-second
      confirmation TTL, and not "never"

## 2. The store

- [ ] 2.1 Drizzle schema + migration: one table, no token column, no access
      token column
- [ ] 2.2 A test asserts the schema carries neither, so a later migration
      cannot reintroduce one quietly
- [ ] 2.3 Ownership enforced by PostgreSQL, exercised in `tests/db/` against a
      real database like confirmations and OAuth state
- [ ] 2.4 A proposal is immutable once recorded

## 3. Recording (the MCP side)

- [ ] 3.1 `propose_*` tools, one per proposable operation, named for what an
      operator would ask for
- [ ] 3.2 Recording contacts BattleGrid not at all — asserted, not assumed
- [ ] 3.3 The response carries a reference and a URL, and no token
- [ ] 3.4 An operation the product does not offer is refused, naming it, and
      stores nothing
- [ ] 3.5 The server's instructions tell a model that agreement happens in the
      web app and where

## 4. Agreeing (the web side)

- [ ] 4.1 `/pending` lists unresolved proposals with target and change
- [ ] 4.2 None exist, and could-not-be-read, are distinct states
- [ ] 4.3 `/pending/[id]` runs the real describe at open time and renders the
      same confirmation the corresponding web surface renders
- [ ] 4.4 Where the fresh describe differs from what was proposed, the
      difference is shown rather than reconciled
- [ ] 4.5 A target that is gone or no longer eligible says so and offers no
      confirmation
- [ ] 4.6 Agreeing runs the existing perform, and lands in the audit
- [ ] 4.7 Declining closes the proposal permanently

## 5. The guard rewrite

- [ ] 5.1 `mcp-read-only.test.ts` moves from a name-prefix rule to
      reachability: a tool may reach this product's own store, never a use-case
      that calls a mutating BattleGrid tool
- [ ] 5.2 Derived from the adapters, so a new platform write is covered without
      anyone remembering
- [ ] 5.3 Prove it is stricter than what it replaced: a tool wired to
      `updateAgent` under an innocent name fails it
- [ ] 5.4 A test asserts no code path performs a proposal without a human
      action — no worker, no scheduler, no retry
- [ ] 5.5 A test asserts no MCP response can carry a confirmation token

## 6. Live

- [ ] 6.1 Drive the whole loop against the real account with a real client:
      propose `stop trading` on an agent, open it in the web app, agree,
      confirm `tradingMode` actually changed and the audit recorded it
- [ ] 6.2 Prove the negative live: with a proposal recorded and unopened, the
      agent is unchanged
- [ ] 6.3 Prove the stale path: a proposal whose target moved shows the
      difference rather than agreeing on the operator's behalf
- [ ] 6.4 Live writes gated on `BATTLEGRID_LIVE_WRITES=1` like every other
      mutating probe

## 7. Gates

- [ ] 7.1 `./scripts/ci.sh` green, with and without a key
- [ ] 7.2 `openspec.py validate the-model-can-propose-and-only-a-human-agrees`
- [ ] 7.3 `docs/MCP_SERVER.md` rewritten — it currently states no writes are
      coming without a design change. This is that design change
- [ ] 7.4 Close `the-assistant-cannot-be-trusted-with-a-write`, recording that
      option 2 was taken and elicitation was not established
- [ ] 7.5 No credential in the diff
