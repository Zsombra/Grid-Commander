# Grid-Commander as an MCP server

Grid-Commander exposes its read surface over MCP, so a language model of
your choosing can ask it questions about your BattleGrid agents.

**It contains no model.** Which model reads your agents is decided by
whichever MCP client you point at it — Claude Desktop, Claude Code, Cline,
Continue, an open-weights model behind any MCP-speaking client. Nothing in
this repository holds an inference credential, and no request leaves this
process except the ones to `mcp.battlegrid.trade` the product already
makes.

## Running it

```bash
npx tsx bin/grid-commander-mcp.ts
```

It speaks stdio and needs the same environment the web app needs:

| variable | why |
|---|---|
| `BATTLEGRID_API_KEY` | your `bg_live_…` key. Without it the server refuses to start |
| `DATABASE_URL` | the audit log lives there |
| `TOKEN_ENCRYPTION_KEY` | 32 bytes, base64 |
| `SESSION_SECRET` | unused over stdio, required by config |

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "grid-commander": {
      "command": "npx",
      "args": ["tsx", "/path/to/Grid-Commander/bin/grid-commander-mcp.ts"],
      "env": {
        "BATTLEGRID_API_KEY": "bg_live_…",
        "DATABASE_URL": "postgres://…",
        "TOKEN_ENCRYPTION_KEY": "…",
        "SESSION_SECRET": "…"
      }
    }
  }
}
```

Any other MCP client works the same way — the server has no client-specific
behaviour.

## It cannot change anything

Eighteen tools, every one a read. No create, update, rebind, archive,
deploy, apply or disconnect, and none is coming without a design change.

This is not caution for its own sake. Every write in Grid-Commander goes
through **describe → confirm → perform**, with a token digest-bound to the
exact values it was formed against. That design assumes *a human reads the
consequence before agreeing* — "this will archive Apex and stop three
deployments". Over MCP a model occupies that seat, and nothing in the
protocol compels it to show you anything before calling perform.

So writes stay in the web app, where a person agrees to them. If you ask
your model to change something, it is told that and told where.

`tests/architecture/mcp-read-only.test.ts` enforces this by deriving the
mutating use-cases from `src/composition.ts` and failing if any becomes
reachable. It is a test, not a convention, because the whole safety
argument rests on it.

## Why not just point the model at BattleGrid?

BattleGrid's own MCP server has 110 tools and the model could call them
directly. It would lose everything this product knows:

- **`get_agent_performance` answers zeros** on an agent carrying real
  losses — three observations across three sessions. `read_trading_record`
  computes the record from the closed trades instead, and says it is
  derived.
- **`unreadable` is not `empty`.** A roster that failed to load must not be
  reported as "you have no agents". Every tool here returns a state that
  names itself, and a failed read is never an MCP error for exactly this
  reason.
- **Distinctions the platform blurs**: a null win rate that is not 0%, two
  `skip` counters that must not be summed, `shown` versus `totalAgents`
  when the field list truncates, an evaluation scored against the threshold
  *in force at the time*.
- **Nine dead paths**, each found only by a real call, each now fixed.

## The tools

| tool | answers |
|---|---|
| `list_agents` | the roster, slot capacity, and whether another can be created |
| `read_agent_thinking` | what an agent reasoned, cycle by cycle |
| `read_agent_limits` | how close it is to each ceiling |
| `read_trading_record` | every closed trade, and a derived summary |
| `read_decision_pipeline` | why it did or didn't trade, and its evaluate-vs-act funnel |
| `read_evaluation` | one scorecard: every signal consulted, and what the decision cost |
| `read_deployments` | where it is actually scanning |
| `list_strategies` / `read_strategy` | the library, and one strategy |
| `read_signal_library` / `read_signal` | the 82 signals a rule can reference |
| `read_metric_index` / `read_metric` | the 75 metrics a column can be built from |
| `simulate_aggregate` | what a re-weighting would score, without saving it |
| `read_field` / `read_competitor` | the field, and one rival's whole public record |
| `watch_arena` | Market Grid sessions |
| `read_audit` | every write the product has made on your behalf |

`read_audit` earns its place *because* the writes are absent: it is how you
ask the model what has already been done for you.

## Proving it works

```bash
BATTLEGRID_API_KEY=bg_live_… DATABASE_URL=… \
  npx vitest run tests/live/mcp-server-probe.test.ts
```

Spawns the server as a real subprocess, drives it as a real client, and
asserts the read-only annotations, a real roster read, and that
`archive_agent` is refused.
