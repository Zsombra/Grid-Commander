# Tasks: author-agents

## 0. Establish the facts the form depends on

- [x] 0.1 Read `list_approved_models` against the live server and record the
      shape of a model entry in `findings-agents.md`
- [x] 0.2 Read `get_trading_config_catalog` and record the presets, every
      bounded field, and what a bound actually looks like
- [x] 0.3 Read `list_intelligence_agents` and record the agent shape: revision
      field name, lifecycle states, and how a SYSTEM agent is distinguished

## 1. Close the scope debt (MODIFIED requirement)

- [x] 1.1 Replace `scopesFor()` with a read of the connection's recorded scopes
- [x] 1.2 Thread the connection through `callTool` so the guard measures against
      the grant rather than a constant
- [x] 1.3 Test: a grant narrower than requested refuses an uncovered operation
- [x] 1.4 Close backlog item `scopes-from-connection`

## 2. Domain — the agent model and its rules

- [x] 2.1 `src/domain/agent/agent.ts` — the agent as Grid-Commander sees it:
      identity, revision, lifecycle, ownership split, immutability
- [x] 2.2 `src/domain/agent/field-ownership.ts` — which fields the agent owns and
      which it inherits, as data rather than as scattered conditionals
- [x] 2.3 `src/domain/agent/rebind.ts` — rebinding as a named destructive
      operation carrying both the agent and the target strategy
- [x] 2.4 `src/domain/agent/agent-repository.ts` — the port
- [x] 2.5 Tests for every domain rule, one per scenario

## 3. Application — use cases

- [x] 3.1 `list-agents.query.ts` — roster, distinguishing empty from unreadable
- [x] 3.2 `create-agent.command.ts` — validates against the live catalogs, checks
      capacity before composing
- [x] 3.3 `update-agent.command.ts` — agent-owned fields only, revision carried
- [x] 3.4 `rebind-agent.command.ts` — confirmation-gated, revision carried
- [x] 3.5 `archive-agent.command.ts` / reactivate — reversible lifecycle
- [x] 3.6 `read-agent-journal.query.ts`
- [x] 3.7 `describe-rebind.query.ts` — the consequence text the confirmation is
      issued against

## 4. Infrastructure — the BattleGrid side

- [x] 4.1 Extend the adapter with the agent tool calls, all through
      `beginGuardedCall`
- [x] 4.2 Catalog reads (`list_approved_models`, `get_trading_config_catalog`)
      with an explicit unreadable state, not an empty list
- [x] 4.3 Map BattleGrid's agent payload to the domain model at the boundary
- [x] 4.4 Persist nothing about agents locally — BattleGrid is the source of
      truth for agent state

## 5. Presentation

- [x] 5.1 Roster view, with the three states: agents, none, unreadable
- [x] 5.2 Create form, driven by the live catalogs, capacity checked first
- [x] 5.3 Edit form, inherited configuration shown as inherited
- [x] 5.4 Rebind confirmation naming the agent, the target, and the replacement
- [x] 5.5 Archive / reactivate, described as reversible
- [x] 5.6 Journal view, visually distinct from the audit log

## 6. Verification

- [x] 6.1 A test per scenario — 21 ADDED, 3 MODIFIED
- [x] 6.2 Boundary test extended: the agent domain imports nothing outward
- [x] 6.3 Structural test: no agent mutation reaches the adapter without a
      revision
- [x] 6.4 Structural test: no `mcp:wager` tool name appears in any call path
- [x] 6.5 Mutation-check the rebind confirmation binding and the ownership split
- [x] 6.6 All quality gates green

## Deviation: routes were not wired

Tasks 5.1–5.6 delivered the components. No `page.tsx` was added, because there
is nothing to construct them from: the product has no session, so no request can
answer "which user, which token". That gap predates this change — it is why
`connect-battlegrid-account` also shipped components and no routes — and it is
now filed as backlog `no-composition-root` (P1), which blocks the MVP rather
than this change. See AL-9.
