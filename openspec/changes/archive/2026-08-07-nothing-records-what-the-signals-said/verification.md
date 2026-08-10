# Scenario Walk — every scenario, and what proves it

Task 10.2's record. One row per scenario in the two delta specs; "proof"
names a test that fails if the behavior regresses, or states plainly where
the proof is weaker than a test.

## signal-recording

| Scenario | Proof |
|---|---|
| A capture on a connected account | `tests/recording/capture.test.ts` "stores a capture per coin with readings, price, clock time, and the run version"; live: `tests/live/recorder-probe.test.ts` (key-gated) |
| The account is untouched | `tests/architecture/live-writes.test.ts` pins `commandCanWrite('CaptureSignalsCommand') === false` by derivation (surface record → adapters → composition → what the file calls); the port shape cannot express an agentId or a confirmation, asserted in `capture.test.ts` "sends the ticker and interval it was given, and nothing else can be sent" |
| A field the product does not yet read | `tests/db/signal-record.test.ts` "round-trips fields the domain type does not carry" (`comparison`, `coinImageUrl` survive with no domain field) |
| The whole answer is retrievable | `tests/db/signal-record.test.ts` "round-trips…" — `rawAnswer` returns the stored payload `toEqual` the platform answer |
| One coin fails, the rest record | `tests/recording/capture.test.ts` "records the failure with the platform reason and captures the siblings"; the thrown-read belt in "turns a thrown read into that coin's failure and continues" |
| The platform is down | `tests/recording/capture.test.ts` "records every coin as failed and exits nonzero" — failures stored with reasons, run recorded with version-unknown |
| A gap is visible | Definition: `tests/recording/coverage.test.ts` "states a three-day hole in a daily cadence as exactly one gap"; rendered: `tests/rendering/recorder.test.ts` "renders the gap, the counts, and the failed attempts" (including the not-a-quiet-market sentence) |
| Nothing recorded yet | `tests/recording/coverage.test.ts` "says recording has not started, and how it starts"; rendered distinctly from unreadable in `tests/rendering/recorder.test.ts` |
| A coin's timeline | `tests/recording/history.test.ts` "orders newest first with failures as themselves, run facts on every entry"; rendered in `tests/rendering/recorder.test.ts` |
| One signal across time | `tests/recording/history.test.ts` "returns the reading and the price at each capture, newest first"; rendered with per-reading capture times |
| A reading is never passed off as now | `tests/rendering/recorder.test.ts` asserts a "captured <stamp>" per rendered capture (count = captures) and per signal-history point |
| The store cannot be read | `tests/recording/history.test.ts` + `coverage.test.ts` "unreadable…" (store throw → unreadable result, never empty); rendered and MCP-crossed distinctly |
| No credential | `tests/recording/cli-spawn.test.ts` — the real process, spawned: a keyless boot with dummy config refuses with "no BattleGrid authority", names `BATTLEGRID_API_KEY`, exits 1, and prints no capture summary (no empty capture recorded). The usage refusal is spawn-tested too, before any config is read. *(The first draft of this walk called the branch "cannot be unit-driven"; the verifier disagreed, and it could — the session read touches no database, so dummy config boots.)* |
| A scheduler can tell success from failure | `tests/recording/cli-exit.test.ts` — ≥1 recorded → 0; zero recorded → 1; covered-nothing → 1; summary sentences asserted |
| Named coins | `tests/recording/capture.test.ts` — provenance `{kind:'named', interval, coins}` stored on the run |
| Defaulting to the deployments | `tests/recording/capture.test.ts` "captures each deployed coin at its deployed timeframe, once" (dedupe across slots asserted) |
| Nothing to cover | `tests/recording/capture.test.ts` — unreadable-radar and no-deployments both record covered-nothing with distinct reasons; named-normalising-to-none records too; all exit nonzero |
| Another account's record is not shown | `tests/db/signal-record.test.ts` "never serves another account, on history, series, or the raw answer"; query level in `history.test.ts` |

## mcp-control

| Scenario | Proof |
|---|---|
| A model reads a coin's recorded history | `tests/mcp/recorder-tools.test.ts` "receives captures with times and the platform generation each observed" |
| A gap crosses the boundary as a gap | `tests/mcp/recorder-tools.test.ts` "states the hole with its span, apart from the captures around it" |
| Recording has not started | `tests/mcp/recorder-tools.test.ts` "is told so, with how it starts — distinctly from a record that failed"; unreadable crossing asserted for both tools as data, `isError: false` |

## Standing guards that picked the change up

- `mcp-read-only`: the two new tools resolve to files that reach no mutating
  port method (12/12 green, no exemption).
- `annotations`: the new tools inherit honest read-only annotations (neither
  declares `persists`).
- `descriptions`/no-counts rule: neither description states a count of
  anything the platform owns; the vocabulary guard rejected the draft that
  named a real signal id in an example, and the shipped description does not.
- `reachability`: `/recorder` and `/recorder/[ticker]` are in the derived
  section and entity lists.
- `failure-is-explained`: the two own-store unreadable branches carry their
  own survival sentences, exempted with reasons on the proposal-queue
  precedent.
- `live-writes`: the probe runs key-only, because the guard now derives what
  a `*Command` reaches instead of matching its spelling (see DL-008).

## Not run in this environment

Task 8.2 — one full capture against the real platform into a real database —
needs `BATTLEGRID_API_KEY`, which this environment holds no copy of, by
design. The key-gated probe (`recorder-probe.test.ts`) is written, asserts
the ~84-signal population and prints the raw-vs-mapped keep-rate, and runs
with the rest of `tests/live/` the first time the operator supplies a key.
