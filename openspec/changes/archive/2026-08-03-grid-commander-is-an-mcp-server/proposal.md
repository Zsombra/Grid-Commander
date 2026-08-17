# Proposal: Grid-Commander Is An MCP Server

## Why

`an-assistant-over-the-use-cases` has been filed since 2026-08-01, gated on
two decisions. The operator settled both on 2026-08-03:

1. **Bring your own model.** Not Anthropic's alone — open weights, Hermes,
   the Claude Code SDK, whatever the user runs.
2. **MCP server first, chat UI later.** "The controller is the utmost
   priority… our heart and soul will be the MCP controller understanding
   and creating a data frame for this language model to have control over
   the things of the MCP and translate what the user wants."

**The second answer dissolves the first.** An MCP server contains no model.
It is driven by whatever client the user already runs — Claude Desktop,
Claude Code, Cline, Continue, an open model behind any MCP-speaking client.
Model choice becomes theirs, per session, with no code here and no
inference credential on our side. "Whose key pays" stops being a question.

This project has already paid for the alternative once.
`one-destination.test.ts` exists because `@anthropic-ai/sdk` sat in
`package.json` powering an assistant that could never run — "sixteen files
and a nav entry whose whole function was to announce their own absence". A
chat UI re-adds an outbound host to a model provider. **An MCP server adds
none: it is inbound.**

## What we are actually shipping

Not a passthrough of BattleGrid's 110 tools. A model can already call those
directly, and doing so would lose everything this product knows:

- **Derived truth.** `get_agent_performance` answers zeros on an agent that
  lost $9.64, so the trading record is computed from `list_trade_outcomes`
  and labelled as derived. A model calling BattleGrid raw gets the zeros.
- **Distinctions the platform blurs.** `unreadable` vs `none` vs `empty`.
  A null win rate that is not 0%. Two skip counters that must not be
  summed. `shown` vs `totalAgents` when the field list truncates
  intermittently.
- **Nine dead paths already found and fixed**, none of them findable
  without a real call. A model rediscovering `create_intelligence_agent`'s
  `brain.kind` casing is a model wasting the operator's money.

The forty-seven use-cases in `composition.ts` **are** the data frame the
operator described. Clean Architecture bought exactly this: the use-cases
do not know whether a Next.js route or an MCP tool is calling them, so the
server is a thin adapter beside the web one rather than a second
implementation.

## Reads only, and why that is the whole of v1

The safety spine is eight `describe → confirm → perform` pairs, each token
digest-bound to the values it was formed against. That design assumes **a
human reads the consequence**. Over MCP a model occupies that seat, and
nothing in the protocol compels it to show the operator "this will archive
Apex and stop three deployments" before calling perform.

That is a real hole and it is not closed by wording. So v1 exposes reads
only — and says so in its own tool descriptions, so a model asking to
archive an agent is told where that actually happens.

The writes are not abandoned; they are blocked on an approval channel that
does not yet exist here (MCP elicitation, or a token the operator releases
from the web app). Filed rather than hurried.

## What Changes

- **`src/mcp/`** — an MCP server over the existing use-cases, with
  `bin/grid-commander-mcp.ts` as a stdio entry point. Stdio because it
  needs no hosting, no second port, and works with every MCP client today.
- **Tools grouped as the operator thinks**, not as BattleGrid names them:
  the roster and one agent; why it did or didn't trade; what it did with
  the money; the strategy library and one strategy; the field and one
  competitor; the arena; the audit log.
- **Every refusal state survives the boundary.** A tool that cannot read
  says so as data — an MCP error would let a model report "you have no
  agents" when the truth is "we could not ask".
- **A read-only guard in CI**: no MCP tool may reach a use-case that
  mutates. Not a convention — a test, because the whole v1 safety argument
  rests on it.

## Capabilities

- `mcp-control` (ADDED)

## Out of Scope

- **Every write.** Blocked on the approval channel above.
- **A chat UI.** The operator's own sequencing, and it would re-add the
  outbound host this project removed.
- **Hosted multi-tenant transport.** Stdio serves one operator's own
  credential, which is what exists today. HTTP with our own OAuth is a
  later change with its own security review.
