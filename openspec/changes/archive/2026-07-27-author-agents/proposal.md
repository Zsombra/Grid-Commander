# Proposal: Author BattleGrid agents

## Why

`connect-battlegrid-account` built the authority and proved it is safe to hold.
It delivers no user value on its own: a user can connect, see an empty audit log,
and disconnect. This is the change where the product starts being worth opening.

Agent authoring is also where the safety model built in change 1 stops being
theoretical. Three of the six destructive tools on `mcp:read` are agent tools,
and one of them — `rebind_intelligence_agent` — **replaces an agent's entire
configuration**: context modules, signal rules, prose and timeframe, wholesale.
It is not a merge. A user who thinks "rebind" means "point at a different
strategy" is about to lose everything they tuned. That is precisely the case
`ConfirmationToken` was designed for, and this change is where it is used in
anger for the first time.

There is a second reason to build agents before strategies. BattleGrid enforces a
split that anything built on top must preserve: **a strategy owns what the agent
reads and how it reasons; the agent owns its name, brain and money limits.**
`update_intelligence_agent` cannot rebind, by design. Building the agent side
first forces us to model that boundary before strategy authoring can blur it.

## What Changes

- A user sees their roster of agents, read from the live account.
- A user creates an agent by choosing a strategy, a brain and a personality,
  with optional trading configuration validated against the live catalog.
- A user edits the agent-owned fields of an existing agent. Strategy-owned
  fields are not editable here, because the platform does not permit it.
- A user rebinds an agent to a different strategy, behind a confirmation that
  states plainly that the agent's configuration will be replaced.
- A user archives and reactivates agents.
- A user reads an agent's journal — its thoughts, activity and decisions.
- Every one of the above mutations carries `expectedRevision` and is recorded in
  the audit log built in change 1.
- `scopesFor()` is replaced: the guard now measures a call against the scopes
  recorded on the connection, not a constant.

## Capabilities

**New**: `agent-authoring` — how a user creates, configures, rebinds, retires and
understands their BattleGrid agents through Grid-Commander.

**Modified**: `battlegrid-connection` — the held-scope check reads the
connection's recorded scopes rather than assuming `mcp:read`.

## Out of Scope

- **Anything that spends.** `submit_agent_grid`, `accept_entry_decision`,
  `close_agent_position` and every other `mcp:wager` tool stay unreachable.
  `generate_agent_grid` is `mcp:read` and drafts a grid without submitting it;
  even so, it belongs with the trading surface, not with authoring, and is
  deferred rather than half-built.
- **Strategy authoring.** Choosing a strategy is in scope; creating, forking or
  compiling one is `author-strategies`.
- **Halt / resume / protection overrides.** Operational controls over a running
  agent, not authoring. Separate concern, separate change.
- **SYSTEM agents.** They are immutable on the platform; the roster shows them
  and offers no edit affordance.
- **The assistant.** `assistant-readonly` comes last, deliberately.

## Impact

First change to call BattleGrid mutating tools on a real account. Everything it
does passes through `beginGuardedCall`, so change 1's guarantees are load-bearing
from here on: a gap in classification, confirmation or audit stops being a
hypothetical and becomes a way to damage a user's configuration.

Two facts must be established against the live server before the form can be
trusted, because guessing either produces a product that submits invalid work and
blames the user for it: the approved model list (`list_approved_models`) and the
trading-config bounds (`get_trading_config_catalog`). Both are read-only calls.

Also replaces the `scopesFor()` stub carried as known debt from change 1
(backlog `scopes-from-connection`, DL-14). It fails open — reporting authority
the connection may not hold — and this is the change that first depends on the
answer being right.
