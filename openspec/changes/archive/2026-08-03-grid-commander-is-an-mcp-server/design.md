# Design: Grid-Commander Is An MCP Server

## The shape

```
operator ↔ any MCP client (Claude Desktop / Claude Code / OSS model)
                     ↓  stdio
        bin/grid-commander-mcp.ts
                     ↓
        src/mcp/server.ts  ── tools over ──▶  app (composition.ts)
                                                   ↓
                                        ports ▶ BattleGrid MCP
```

Grid-Commander becomes both an MCP **client** (of BattleGrid, as today) and
an MCP **server** (to the operator's model). Those are opposite directions
and share no code path.

## D-1 — Why the use-cases are the tool surface

`app` holds forty-seven use-cases. The web routes call them; the MCP tools
will call the same objects. Nothing new is written between the tool and the
port.

The alternative — tools that reach BattleGrid directly — would duplicate
every derivation and every honesty rule this project has accumulated, and
the duplicate would be the copy that drifts. This is the same argument that
moved `ConsultedSignal` to the domain when two adapters needed it, one
change ago.

## D-2 — Reads only, enforced by a test rather than a rule

The eight describe/perform pairs are the write surface. None is exposed.

A comment saying so decays. Instead a guard derives the mutating use-cases
from `composition.ts` — anything named `perform*`, `describe*`, `create*`,
`update*`, `set*`, `retune*`, `apply*`, `fork*`, `disconnect*` — and fails
if any appears in the MCP tool table. Derived, not an allowlist, for the
reason every guard in `tests/architecture/` carries: an allowlist passes
while the seventeenth is added.

**Why this is not over-caution.** The confirmation token is digest-bound to
the values it was formed against, which stops a *changed* payload being
performed. It cannot stop a model calling describe and perform back to
back without showing anyone. The ceremony's premise is a human reading the
consequence; MCP does not provide that seat. Until it does — elicitation,
or the operator releasing a token from the web app — writes stay out.

## D-3 — A refusal is data, not an error

Every read in this product distinguishes `unreadable` from `none`/`empty`.
If a tool throws on `unreadable`, the model sees a tool failure and will
very often paraphrase it as "you have no agents". That is the exact lie
`RosterResult` was shaped to prevent, re-introduced at a new boundary.

So every tool returns a payload that names its own state, and MCP-level
errors are reserved for the protocol failing (bad arguments, no
credential). The tool descriptions say which states exist, because a model
that knows `unreadable` is possible can say so to the operator.

## D-4 — Tools named for what the operator asks, not what BattleGrid calls it

BattleGrid's 110 tools are a platform surface. The operator asks "why
didn't it trade?" — one question that spans three of them and needs the
threshold-in-force distinction to answer honestly.

So the tool table follows the product's own surfaces, which were designed
around those questions:

| tool | use-case | answers |
|---|---|---|
| `list_agents` | `listAgents` | the roster and slot capacity |
| `get_agent` | `listAgents` (filtered) | one agent's binding, brain, limits |
| `read_agent_thinking` | `readThoughtLog` | what it reasoned |
| `read_agent_limits` | `readBudget` | how close it is to each ceiling |
| `read_trading_record` | `readTradingRecord` | closed trades + derived summary |
| `read_decision_pipeline` | `readPipeline` | funnel + the three stages |
| `read_evaluation` | `readOwnEvaluation` | one scorecard, and its cost |
| `read_deployments` | `readDeployments` | where it is scanning |
| `list_strategies` / `read_strategy` | … | the library, one strategy |
| `read_signal_library` / `read_signal` | … | the 82 signals |
| `read_metric_index` / `read_metric` | … | the 75 metrics |
| `check_column` | `checkColumn` | a column against the contract |
| `simulate_aggregate` | `simulateAggregate` | what a re-weighting would score |
| `read_field` / `read_competitor` | … | the field, one rival |
| `watch_arena` | `watchArena` | Market Grid sessions |
| `read_audit` | `listAudit` | every write made on the operator's behalf |

`read_audit` earns its place precisely because the writes are absent: it
lets the operator ask the model what the *product* has done for them.

## D-5 — Identity, and the one thing stdio settles

The web app resolves a session to a BattleGrid credential. A stdio server
has no session — it is launched by one operator's client, for that
operator.

So the entry point resolves authority once, at boot, from the same
`personal` configuration the web app already supports, and refuses to start
without it. No per-call identity, no multi-tenant surface, no new
credential store. A hosted multi-tenant server needs our own OAuth and is a
separate change with its own review.

## D-6 — No new outbound host

`one-destination.test.ts` derives every absolute URL the source can build
and permits exactly one host. An MCP server is inbound: the client connects
to *us* over stdio. Nothing in `src/mcp/` builds a URL, and the guard keeps
it that way for free.

This is the design's strongest property and the reason the operator's
sequencing is right: the chat-UI alternative would have re-added the
provider host this project deliberately removed.

## Decision log

| # | Decision | Alternative rejected | Why |
|---|---|---|---|
| 1 | Tools call use-cases | Tools call BattleGrid directly | Would duplicate every derivation and honesty rule; the copy drifts |
| 2 | Reads only in v1 | Writes behind the existing token | The ceremony assumes a human reads the consequence; MCP gives no such seat |
| 3 | Read-only enforced by a derived test | A comment and care | Allowlists pass while the next one is added |
| 4 | Refusals as data | MCP errors | A tool error becomes "you have no agents" in a model's mouth |
| 5 | Stdio | HTTP + our own OAuth | No hosting, no port, works with every client today; multi-tenant needs its own review |
| 6 | Product-shaped tool names | Mirroring BattleGrid's 110 | The operator asks questions, not tool names; the product already groups them |
