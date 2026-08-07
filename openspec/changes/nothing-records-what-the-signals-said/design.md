# Design: Nothing Records What The Signals Said

## Technical Approach

A capture is one application-layer command: resolve the coin set (named, or
the account's radar deployments), call one read per coin
(`get_coin_signal_preview`), map, and persist — a capture header row, one row
per evaluated signal, and the platform's raw answer stored verbatim beside
them. The command is reachable from a CLI entry (`bin/grid-commander-record.ts`,
built exactly like `bin/grid-commander-mcp.ts`: composition root, stub cookie
store, `OwnerOnlyUser`, refuse without authority) and from the web app.
History and coverage are read queries over the product's own store; the web
pages and two MCP tools call the same queries. Timeframe enums are never
compiled in — the interval a capture uses comes from the operator or from the
deployment rows, both of which the platform owns.

The domain never imports the MCP client: the platform read sits behind the
existing BattleGrid port surface as a new port method, the store behind a new
`SignalRecordStore` port, and only `src/composition.ts` wires either to
infrastructure.

## Decisions

### Decision: The source is `get_coin_signal_preview`

Chosen because it is the only read that answers "what does every signal say
right now" — all ~84 evaluated signals with triggered flag, scores,
allocation, raw indicator values and the platform's sentence — plus the
coin's price in the same payload, one read-only call per coin, observed whole
at v11.0.0 with zero declared/observed drift.
Rejected: deriving history from agent signal logs — they exist only when an
agent evaluated, carry that agent's weighting baked in, and live on the
platform's retention. Rejected: `preview_strategy_report` — strategy-shaped
and budget-bound, answers what one composition feeds an agent, not what the
signal layer said.

### Decision: Store the raw answer whole beside the normalized rows

Chosen because all nine historical data bugs in this product were mapper
drops, and a recorder's mapper drop is not a bug fix away — it is history
permanently lost. The raw payload makes every future mapper improvement
retroactive over already-recorded data. Rejected: normalized rows only —
cheaper, and exactly the shape of the 35-vs-11 mistake with permanent
consequences this time.

### Decision: Unweighted capture

Chosen because the unweighted preview is the neutral record: raw per-signal
scores and allocations are captured, and any agent weighting is recomputable
over them later (`simulate_aggregate_score` exists for precisely this).
Rejected: capturing per-agent overlays — privileges one agent's lens, and
multiplies rows for data that is derivable.

### Decision: The schedule is the operator's; the product ships no daemon

Chosen because the product has a deliberate precedent (the proposals store:
no worker, no scheduler, no retry) and a Next.js app has no resident process
to own one; a CLI the operator crons composes with any scheduler. The risk —
a dead cron recording nothing in silence — is answered by the coverage
requirement and the CLI's exit status, not by owning the clock. Rejected: an
in-process scheduler or a route a hosted cron must hit — both make the
product responsible for a liveness it cannot see.

### Decision: Every capture stamps the platform server version

Chosen because BattleGrid deploys often, changes semantics without changing
the tool count, and this product has already been bitten by observed data
predating a deployment. A longitudinal record that cannot say which platform
generation produced each row cannot be trusted across one. The version is
already read at connect time by the freshness gate; the capture writes it per
capture. Rejected: recording it nowhere and correlating by date against the
surface map — reconstructive, and only as good as the map's own probing
cadence.

### Decision: A new capability, not an extension of `strategy-authoring`

Chosen because recording is not authoring: it observes the platform's signal
layer over time on the product's own store, and it is the first capability
whose value is the accumulation itself. Rejected: folding into
`strategy-authoring` — that spec is already the largest in the product and
describes acting on strategies, not observing the market.

## Data Flow

1. Operator's cron (or a web action) invokes the capture.
2. CLI resolves authority via the composition root (`OwnerOnlyUser` path);
   refuses and exits nonzero without it.
3. The capture command resolves the coin set: named coins with a named
   interval, else `list_radar_deployments` → (coin, timeframe) pairs;
   records provenance either way; refuses (nonzero) when nothing can be
   covered.
4. Per coin: BattleGrid port → `get_coin_signal_preview` → mapper → one
   capture row + ~84 reading rows + the raw answer, in one transaction per
   coin. A refused coin becomes a failed-capture row with the platform's
   reason; the loop continues.
5. Exit zero if at least one coin recorded; the summary names what recorded
   and what failed.
6. Web pages and MCP tools serve history and coverage from the store via the
   same read queries; coverage (first, latest, count, gaps) is derived from
   capture rows at read time, never stored as a flag that could disagree
   with them.

## File Changes

- `src/domain/recording/capture.ts` (new) — SignalCapture, SignalReading,
  CaptureCoverage, provenance and failure types
- `src/ports/strategies.ts` (modified) — one read: the coin signal preview
- `src/ports/signal-record.ts` (new) — SignalRecordStore port
- `src/infrastructure/battlegrid/signal-preview-mapper.ts` (new) — observed
  shape → domain; prints raw-vs-mapped key counts in its probe
- `src/infrastructure/db/schema/index.ts` (modified) — `signal_captures`,
  `signal_readings` (+ raw payload column on captures); generated migration
  under `drizzle/`
- `src/infrastructure/db/signal-record-repo.ts` (new)
- `src/application/use-cases/capture-signals.command.ts` (new)
- `src/application/use-cases/read-signal-history.query.ts` (new)
- `src/application/use-cases/read-record-coverage.query.ts` (new)
- `src/composition.ts` (modified) — wire store + use-cases
- `bin/grid-commander-record.ts` (new) — headless capture entry
- `app/(app)/recorder/page.tsx`, `app/(app)/recorder/[ticker]/page.tsx`
  (new) — coverage + per-coin timeline + per-signal history
- `src/mcp/tools.ts` (modified) — two read tools: history, coverage
- `tests/recording/*.test.ts`, `tests/db/signal-record.test.ts`,
  `tests/live/recorder-probe.test.ts` (new); architecture suites pick the
  new files up by construction
- `docs/BATTLEGRID_SURFACE_MAP.md`, `docs/MCP_SERVER.md` (modified)
