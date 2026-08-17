# Proposal: Nothing Records What The Signals Said

## Why

Every claim about what makes a strategy work — "this signal leads price on
this market", "conflicting signals predict chop" — rests on knowing what the
signals said *before* the outcome arrived. Nothing records that. The platform
serves current readings only: `get_coin_signal_preview` answers for *now*,
`get_coin_candles` keeps at most 100 closed candles, and only the regime
module has a server-side history. Agent evaluations exist only when an agent
evaluated, carry that agent's weighting baked in, and live on the platform's
retention, not ours.

So every strategy claim in the operator's analysis sits at the weakest
evidence tier for one reason: no forward data exists. And the loss compounds —
each day without a recorder is a day of signal history that can never be
re-captured. The prerequisite for ever grading a claim is to start recording,
and the cost of deferring it is permanent.

The source is already mapped and observed: `get_coin_signal_preview` returns,
in one read-only call per coin, all ~84 evaluated signals — each with its
`triggered` flag, bias, direction, score, allocation, primary/required flags,
raw indicator values, and the platform's own sentence — plus the coin's price
at that moment, the aggregate score, the dominant bias, and the conflict flag.
Observed whole on 2026-08-06 against battlegrid v11.0.0, zero drift between
declared and returned.

## What Changes

- **A capture**: one invocation reads what every signal says for a set of
  coins at an interval and persists it — signal readings normalized for
  querying, and the platform's answer kept whole beside them, because a
  recorder's mapper drop is a permanent loss (nine of the nine historical
  bugs in this product were mapper drops).
- **Unattended operation**: a CLI entry (`bin/`, beside the MCP server) that
  resolves authority the way the MCP server does, refuses without it, and
  exits nonzero when the capture failed — so an operator's cron can run it
  and alert. The schedule itself belongs to the operator; the product ships
  no daemon.
- **Provenance on every row**: capture time, the platform server version
  observed (deployments change semantics without changing the tool count),
  which coins were covered and why (named, or defaulted to the account's
  radar deployments), and which account captured.
- **Honest coverage**: the record states when recording started, when it last
  ran, and where the gaps are. A failed read is recorded as a gap with its
  reason — never rendered as a calm market.
- **A read surface**: recorded history per coin (aggregate, bias, price over
  time) and per signal (what one signal said across captures), every reading
  shown with its capture time.
- **The record crosses the MCP boundary**: read tools so the operator's model
  can analyze the history — which is where claim-grading will actually
  happen. Reads only, like the rest of that surface.

One new platform tool is consumed (`get_coin_signal_preview`); the
deployments fallback uses `list_radar_deployments`, already consumed.

## Capabilities

**New**: `signal-recording` — the forward record of what the platform's
signals said: capture, persistence, coverage, and readability.

**Modified**: `mcp-control` — one ADDED requirement: the recorded history is
readable by a model, with coverage and provenance carried across the
boundary.

## Out of Scope

- **Grading claims against the record** — forward returns per signal state,
  correlation, evidence-tier upgrades. That is the point of the data, and it
  starts only once data exists. Filed: `recorded-signals-are-not-yet-evidence`.
- **Recording agent evaluations** (`list_signal_logs`) — a second source with
  different semantics (exists only when an agent evaluated, weighting baked
  in, platform-owned retention). Filed: `agent-evaluations-are-not-recorded`.
- **Agent-weighted captures** — deliberately not recorded, and safely so: the
  unweighted capture carries every signal's raw score and allocation, and the
  platform's own `simulate_aggregate_score` recomputes any weighting over
  them later. Recording unweighted loses nothing; recording one agent's
  overlay would privilege one lens.
- **Recording candles, regime, or market context** — candles and regime are
  retroactively readable on the platform (bounded candles; regime history to
  500 bars), and each snapshot already carries the coin's price. Signals are
  the one thing that is current-only; they are what gets recorded.
- **An in-product scheduler** — consistent with the proposals store's
  precedent: no worker, no scheduler, no retry in the product. The coverage
  surface makes a dead cron visible instead.
- **Deleting or trimming the record** — retention controls are real work with
  destructive semantics. Filed: `the-record-cannot-be-forgotten`.

## Impact

- **Database**: new tables for captures and readings (additive migration;
  `npm run db:generate` gate applies). The product's first longitudinal
  store — rows accumulate by design, roughly tens of MB per month at ten
  coins and a few captures a day.
- **Code**: new domain types and store port; one read added to the
  BattleGrid port surface; a mapper with an observed shape to conform to;
  capture command + history/coverage queries; CLI entry; web pages; two MCP
  read tools (`src/mcp/tools.ts`).
- **Docs**: surface map's consumed-tool count moves 52 → 53; `MCP_SERVER.md`
  tool list grows; `HANDOFF.md` at close.
- **Guards**: read-only MCP reachability, payload conformance against the
  observed shape, and the live-writes gate (capture names no mutating tool)
  all apply as-is; a key-gated live probe proves the capture against the
  real platform.
- **Consumers**: none change; everything added is new surface.
