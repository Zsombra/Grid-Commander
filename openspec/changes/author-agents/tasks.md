# Tasks: author-agents

## 0. Establish the facts the form depends on

- [x] 0.1 Read `list_approved_models` against the live server and record the
      shape of a model entry in `findings-agents.md`
- [x] 0.2 Read `get_trading_config_catalog` and record the presets, every
      bounded field, and what a bound actually looks like
- [x] 0.3 Read `list_intelligence_agents` and record the agent shape: revision
      field name, lifecycle states, and how a SYSTEM agent is distinguished

## 1. Close the scope debt (MODIFIED requirement)

- [ ] 1.1 Replace `scopesFor()` with a read of the connection's recorded scopes
- [ ] 1.2 Thread the connection through `callTool` so the guard measures against
      the grant rather than a constant
- [ ] 1.3 Test: a grant narrower than requested refuses an uncovered operation
- [ ] 1.4 Close backlog item `scopes-from-connection`

## 2. Domain — the agent model and its rules

- [ ] 2.1 `src/domain/agent/agent.ts` — the agent as Grid-Commander sees it:
      identity, revision, lifecycle, ownership split, immutability
- [ ] 2.2 `src/domain/agent/field-ownership.ts` — which fields the agent owns and
      which it inherits, as data rather than as scattered conditionals
- [ ] 2.3 `src/domain/agent/rebind.ts` — rebinding as a named destructive
      operation carrying both the agent and the target strategy
- [ ] 2.4 `src/domain/agent/agent-repository.ts` — the port
- [ ] 2.5 Tests for every domain rule, one per scenario

## 3. Application — use cases

- [ ] 3.1 `list-agents.query.ts` — roster, distinguishing empty from unreadable
- [ ] 3.2 `create-agent.command.ts` — validates against the live catalogs, checks
      capacity before composing
- [ ] 3.3 `update-agent.command.ts` — agent-owned fields only, revision carried
- [ ] 3.4 `rebind-agent.command.ts` — confirmation-gated, revision carried
- [ ] 3.5 `archive-agent.command.ts` / reactivate — reversible lifecycle
- [ ] 3.6 `read-agent-journal.query.ts`
- [ ] 3.7 `describe-rebind.query.ts` — the consequence text the confirmation is
      issued against

## 4. Infrastructure — the BattleGrid side

- [ ] 4.1 Extend the adapter with the agent tool calls, all through
      `beginGuardedCall`
- [ ] 4.2 Catalog reads (`list_approved_models`, `get_trading_config_catalog`)
      with an explicit unreadable state, not an empty list
- [ ] 4.3 Map BattleGrid's agent payload to the domain model at the boundary
- [ ] 4.4 Persist nothing about agents locally — BattleGrid is the source of
      truth for agent state

## 5. Presentation

- [ ] 5.1 Roster view, with the three states: agents, none, unreadable
- [ ] 5.2 Create form, driven by the live catalogs, capacity checked first
- [ ] 5.3 Edit form, inherited configuration shown as inherited
- [ ] 5.4 Rebind confirmation naming the agent, the target, and the replacement
- [ ] 5.5 Archive / reactivate, described as reversible
- [ ] 5.6 Journal view, visually distinct from the audit log

## 6. Verification

- [ ] 6.1 A test per scenario — 21 ADDED, 3 MODIFIED
- [ ] 6.2 Boundary test extended: the agent domain imports nothing outward
- [ ] 6.3 Structural test: no agent mutation reaches the adapter without a
      revision
- [ ] 6.4 Structural test: no `mcp:wager` tool name appears in any call path
- [ ] 6.5 Mutation-check the rebind confirmation binding and the ownership split
- [ ] 6.6 All quality gates green
