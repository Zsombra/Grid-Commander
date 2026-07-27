# Proposal: BattleGrid MCP client (Tier 0 foundation)

## Why

Grid Commander needs one thing before anything else: a way to talk to
BattleGrid's MCP server that is typed, reliable, and — above all — safe around
the 16 tools that move real money. Every later feature (agent creation,
strategy authoring, dashboards, autonomous execution) is a consumer of this
client. Getting the money-safety boundary right *here*, once, is what makes the
rest of the project safe by construction rather than by vigilance.

## What Changes

- A headless TypeScript client that connects to `mcp.battlegrid.trade/mcp` over
  streamable-HTTP with a static Bearer key read from the environment.
- A three-tier capability boundary — **observe** (pure reads), **manage**
  (account writes that move no money), **wager** (the 16 money tools) — enforced
  so that a consumer holding observe/manage access **cannot** dispatch a wager
  tool, at compile time and at runtime.
- Tool invocation that survives the server's tool surface changing between
  deploys: an unrecognized tool is rejected, never silently passed through.
- A connection-health / identity check so a consumer can confirm *which*
  account it is connected to before acting.

The wager-capable client itself is **not** built here — this change delivers
observe + manage and the guarantee that wager is unreachable. Implementing the
wager path is a separate `full`-track change (see Out of Scope).

## Capabilities

**New**:
- `mcp-connection` — establishing an authenticated session and invoking tools
  over it, including health/identity and drift resilience.
- `capability-tiers` — the observe/manage/wager classification and the
  structural guarantees that keep money-moving and account-mutating tools behind
  explicit access.

**Modified**: none.

## Out of Scope

- **The wager client.** No code path in this change can place a wager. Building
  the wager-capable client and its confirmation/limit envelope is deferred to a
  `full`-track change (`wager-safety-envelope`).
- **Any specific product** — no agent creation, strategy authoring, dashboards,
  or persistence. Those are consumers of this client, proposed separately
  (`build-agent-strategy-creation` is next).
- **A UI.** Headless library only.
- **Auto-generating the full typed surface for all 110 tools.** The boundary and
  the invocation mechanism are in scope; an exhaustive per-tool typed facade can
  grow incrementally as consumers need each tool.
- **OAuth / dynamic client registration.** Static Bearer only — settled during
  the auth investigation.

## Impact

- New package `packages/battlegrid-mcp/` (TypeScript, Node ≥ 20, ESM, pnpm).
- New dependency: `@modelcontextprotocol/sdk`.
- Reads `BG_API_KEY` and `BG_MCP_ENDPOINT` from the environment; no secret enters
  the repo.
- Establishes the first real application code in the project and the package
  layout every later change extends.
- Consumers: all future Grid Commander features. This is their foundation, so
  its public shape is a contract worth reviewing carefully now.
