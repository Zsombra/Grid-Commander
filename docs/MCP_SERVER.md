# Grid-Commander as an MCP server

Grid-Commander exposes its read surface over MCP, so a language model of
your choosing can ask it questions about your BattleGrid agents — and
suggest changes for you to decide on.

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

## It cannot change anything. It can propose.

Twenty-four tools. All but one are reads; the odd one out records a suggestion
and stops. (The count was already two stale when the recorder's tools arrived —
prose tallies rot, so trust `tools/list` over this sentence.) No tool here creates, updates, rebinds, archives, deploys, applies
or disconnects anything on your BattleGrid account. Two of the reads —
`read_signal_history` and `read_record_coverage` — read Grid-Commander's own
database rather than BattleGrid: they serve the signal record the capture CLI
grows, gaps and all.

This is not caution for its own sake. Every write in Grid-Commander goes
through **describe → confirm → perform**, with a token digest-bound to the
exact values it was formed against. That design assumes *a human reads the
consequence before agreeing* — "this will archive Apex and stop three
deployments". Over MCP a model occupies that seat, and nothing in the
protocol compels it to show you anything before calling perform.

So writes stay in the web app, where a person agrees to them.

### What proposing is

`propose_agent_change` records **what a model suggests, and nothing that can
be spent**: which agent, which settings, the values verbatim. BattleGrid is
not contacted. Nothing is reserved. No confirmation is minted, so the model
never holds one — the response carries a reference and a URL and no token.

The consequence is computed when *you* open it at `/pending/<id>`, against
your account as it is at that moment — not as it was when the suggestion was
made. That is the whole design, and it is why an old proposal is noise rather
than danger: it confers no authority, so nothing about it decays into a risk.
The page shows the product's own consequence sentence and, beside it, what
each proposed value actually does now — will change, already true, or not
accepted — so a suggestion the account has since outgrown says so instead of
being performed on your behalf.

Nothing performs a proposal but you. There is no worker, no scheduler, no
retry and no setting that changes that; `tests/architecture/proposals-are-inert.test.ts`
holds it as a property rather than an intention, because "nothing runs on its
own" is the kind of claim a small convenient commit undoes.

Applying a compiled strategy plan cannot be proposed. Its consequence is bound
to a plan token that expires in five minutes, so it cannot be recomputed later
— and recompiling instead can legitimately produce a different plan, at which
point you would be agreeing to something the model never suggested. Refused by
name rather than quietly omitted.

Six more operations are decided proposable and not yet built — rebind, archive
an agent, deploy, undeploy, retune a rule, archive a strategy. They are absent
from this surface until each has a describe the web app can run, because a
proposal you cannot open is a row you would open to find unusable.

`tests/architecture/mcp-read-only.test.ts` enforces the boundary by deriving
reachability end to end — the mutating tools from BattleGrid's own
classification, the port methods that send them, the use-case behind each, and
whether anything a tool reaches calls one. It is a test, not a convention,
because the whole safety argument rests on it, and it names no tool prefix: a
`propose_*` tool passes because it reaches nothing, not because of what it is
called.

## Why not just point the model at BattleGrid?

BattleGrid's own MCP server has 110 tools and the model could call them
directly. It would lose everything this product knows:

- **`get_agent_performance` measures a different thing than you expect.**
  It reports P&L against the agent's **risk-budget baseline**, so an agent
  with no budget configured reports zeros while carrying real closed losses
  — observed on four agents across three sessions. On an agent that *does*
  have a budget the two agree exactly (-0.23 against a -0.236 trade record).
  `read_trading_record` computes the record from the closed trades instead
  and says it is derived, so it answers the same in both cases.
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
| `read_qualification` | whether it would take a coin **right now**, which gate stops it, and where the screened coins came from |
| `list_strategies` / `read_strategy` | the library, and one strategy |
| `read_signal_library` / `read_signal` | every signal a rule can reference |
| `read_metric_index` / `read_metric` | every metric a column can be built from |
| `simulate_aggregate` | what a re-weighting would score, without saving it |
| `read_signal_history` / `read_record_coverage` | what the signals *said* — the recorder's own store, gaps stated as gaps |
| `read_field` / `read_competitor` | the field, and one rival's whole public record |
| `watch_arena` | Market Grid sessions |
| `read_audit` | every write the product has made on your behalf |
| `propose_agent_change` | records a suggested change to an agent, and nothing else |

`read_audit` earns its place *because* the writes are absent: it is how you
ask the model what has already been done for you.

`read_qualification` is the only one that asks about **now**. Everything else
here explains something that already happened, so a model asked "why is my
agent not trading" has to reason forward from backward evidence; this one has
BattleGrid score the agent's gates against live coins, which spends no decision
and does not make the agent act.

It is also the only tool whose *subject* the product may choose, so where the
coins came from is part of its answer rather than context for it — the coins
the agent is deployed on, a ranked list this product picked when the agent is
deployed nowhere, or the ones you named. The fallback says which of the two
reasons put it there: an agent deployed nowhere and an agent whose deployments
could not be read produce the same coins and mean opposite things. "None of
these qualify" is a finding about your agent only when your agent's own coins
were the ones screened, and the response opens by saying which.

`propose_agent_change` takes the agent's own field names — `displayName`,
`brain`, `tradingConfig` (which holds `tradingMode` and the money limits),
`arenaChallengeEnabled`, `overlayText`. A field the bound strategy owns, like
`signalRules` or `timeframe`, comes back reported as not accepted rather than
silently sent. A partial `tradingConfig` is merged onto what the agent already
runs under when you agree, never substituted for it.

## Proving it works

```bash
BATTLEGRID_API_KEY=bg_live_… DATABASE_URL=… \
  npx vitest run tests/live/mcp-server-probe.test.ts
```

Spawns the server as a real subprocess, drives it as a real client, and
asserts the read-only annotations, a real roster read, and that
`archive_agent` is refused.
