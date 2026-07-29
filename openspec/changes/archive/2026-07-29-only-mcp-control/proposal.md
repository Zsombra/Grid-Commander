# Only MCP control

## Why

The operator's read: *"I don't feel like we have API availability on the
application. This is only MCP control."*

Checked rather than assumed. The application reaches exactly **one** host:

```
src/config.ts:94   https://mcp.battlegrid.trade
```

That is the only URL in `src/` or `app/`. The single other network dependency is
`@anthropic-ai/sdk`, which powers `/assistant` and nothing else.

**It has never been exercised and cannot be here.**

```
ANTHROPIC_API_KEY     not set
ANTHROPIC_AUTH_TOKEN  not set
ANTHROPIC_BASE_URL    https://api.anthropic.com   (no credential)
```

`assistant-unverified-against-live-api` filed the same finding on 2026-07-28:
*"No `ANTHROPIC_API_KEY` was available in the environment where this was built,
so the first real request this code makes will be made by a deployment."* Two
days later that is still true, and the item is still P1.

### What the page does today

`NotConfiguredAssistant` renders:

> The assistant is not available on this deployment — no model has been
> configured for it. Everything it could tell you is on the pages themselves…

So `/assistant` is a route, a nav item and 16 files whose entire function is to
say they cannot do anything, and to name the pages that can. **The copy is
already an argument for deleting it.**

### It is not in the exit criteria

The idea brief lists the assistant as MVP scope — feature 14, the lowest-rated
entry in the table. The MVP **exit criteria** do not mention it:

> A user can connect their BattleGrid account without ever handling a raw
> credential, fork a system strategy, change it through the review pipeline
> while seeing exactly which agents the change will reach, bind an agent to it —
> and afterwards read back a complete record of every write made on their behalf.

Every clause there is BattleGrid over MCP. Removing the assistant does not move
the bar the product set itself.

### What removing it buys

One credential instead of two, and a deployment that needs nothing but a
BattleGrid key and a database. The product's thesis becomes literally true: it
controls BattleGrid over MCP, and talks to nobody else.

## What Changes

- The `assistant` capability is removed — 8 requirements, 16 files, 77 tests, the
  route, the nav entry, the port and both adapters.
- `@anthropic-ai/sdk` leaves `package.json`. `ANTHROPIC_API_KEY` leaves
  `.env.example`, `config.ts` and `check-serving.sh`.
- `app-access` loses `/assistant` from the set of top-level sections every page
  must offer. Its reachability guard is derived, so the list narrows to three.
- **`AuditActor` keeps `'assistant'`, deliberately.** The audit log is a
  historical record and must be able to render what it recorded. `actor` is
  stored as `text` with a `'user'` default — not a Postgres enum — so nothing
  needs migrating, and narrowing the type would leave the product unable to
  display its own past. A branch that renders stored history is not dead code.
- Two backlog items close as moot: `assistant-unverified-against-live-api` (P1)
  and `assistant-has-no-spend-ceiling` (P2).

## Track

`standard`, not `full`, and the reasoning is worth stating because removing a
capability contract would normally qualify as hard to reverse.

It is a deletion with no new behaviour. The one risk — something still
references what is gone — is caught mechanically by typecheck, lint, the
reachability guards and the architecture boundary tests, all of which fail loudly
on a dangling import or an orphan route. And the change lives on a branch behind
an unmerged PR: `git revert` restores every line.

## Capabilities

- `assistant` — removed entirely.
- `app-access` — one requirement modified.

## Out of Scope

- **Rewriting the idea brief.** `_IDEA/` is a record of what was decided then,
  not a description of what exists now. Editing it would destroy the only
  evidence of why the assistant was ever scoped.
- **The `anthropic/claude-…` model ids.** Those are BattleGrid's own approved
  models, chosen for an *agent's brain*, and have nothing to do with this
  product calling an API. They stay.
- **Any future assistant.** If one returns it should be proposed on its own
  merits, against a deployment that has a key. This removes what could not be
  verified; it does not rule on whether the idea was good.
