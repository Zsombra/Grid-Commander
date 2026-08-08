# Verification — a-closed-trade-has-no-story

Verified 2026-08-08 against the two delta specs. Standard track:
completeness, correctness, coherence.

## Completeness — every requirement, every scenario

### agent-understanding: A Closed Trade's Unfolding Is Readable

| scenario | evidence |
|---|---|
| A settled trade shows its chart | `tests/rendering/trade-story.test.ts` "renders the chart with the platform's labels and the placed-levels caveat" — level labels (`Stop Loss 0.1368296`), marker roles, freeze stamp asserted. Live: probe drew 83 candles, both levels, both markers off a real WIF outcome |
| Never-filled has no chart and says so | rendering "says an evaluation never became a trade, as an answer" — asserts the not-an-error sentence. Adapter: UNAVAILABLE → `no-trade` pinned in `tests/agent/trade-story.test.ts` |
| Unreadable says so, not not-found | rendering "keeps not-found and unreadable apart" — two different h1s; adapter test pins a thrown call to `unreadable`, never `not-found` |
| Trades list links each trade to its story | rendering "links each trade with an evaluation to its story" — one link for the outcome carrying `signalLogId`, none for the null one |

The three-way platform discrimination is pinned both directions: READY /
UNAVAILABLE / NOT_FOUND each map to their own kind, an unknown status maps
to `unreadable` **naming the platform's word**, and READY-without-a-chart is
malformed, not a crash.

Placed-vs-moved labelling: the component prints "the levels as placed" and
the page's caveat sentence; the live probe showed the placed stop
(0.1368296) five moves behind the trail's final stop (0.13947) — the exact
disagreement the labelling exists for.

Unrecognised vocabulary: level/marker roles pass through and render (mapper
defaults role to `(unnamed)` only when absent); audit event kind
`MARGIN_TOPPED_UP` asserted end-to-end (adapter + rendering).

### agent-understanding: The Protection That Moved Is Shown Moving

| scenario | evidence |
|---|---|
| A trailed stop is a sequence of moves | rendering "shows a reprice with both prices exactly as sent" — `0.13682960 → 0.13802000`, delta, source, the platform's improved judgement. Live: five reprices printed with sources BREAK_EVEN then TRAILING ×4 |
| Unreadable trail keeps the chart up | rendering: trail-unreadable page still contains `Stop Loss 0.1368296`; query test "an unreadable trail does not take the chart down" |
| No address ≠ empty trail | query: `positionId: null` → `audit: null` with **no audit call made** (`auditedPositions` empty); rendering asserts the "named no position" sentence; empty trail asserts "no lifecycle events" — different sentences |
| Unrecognised event kind shown | adapter + rendering, as above |

Decimal-string discipline: `'0.14099120'` and `'0.13682960'` asserted by
string equality at the adapter, through the MCP boundary, and in the page
text — a float excursion anywhere would eat the trailing zero. The entry
event's null `vsEntryPct` (the baseline) survives to the port.

### mcp-control: A Trade's Story Is Readable By A Model

| scenario | evidence |
|---|---|
| A model reads a settled story | `tests/mcp/trade-story-tool.test.ts` — chart facts, platform labels, trail events with exact price strings |
| The states stay apart over MCP | no-trade / not-found / unreadable each cross as data (`isError: false`) with their own kind; no-address trail crosses as `audit: null`, not empty |

Mutates nothing: both new tools are read-annotated; the write-reachability
derivation (shared by `live-writes` and `mcp-read-only` guards) classifies
`ReadTradeStoryQuery` as reaching no mutating tool — derived, not spelled.

## Correctness

- Join direction verified against reality: outcome rows carry **no**
  position key (26 keys checked raw, 2026-08-08), so the chart is the only
  address for the trail. The query asks the chart first and only asks the
  trail with an id the chart supplied — pinned by `auditedPositions`.
- Nothing derived except the SVG scale: prices, deltas, `improved`, order
  of events, labels are all pass-through. The scale's domain spans candles
  **and** levels **and** markers, so a far stop draws instead of clipping.
- The chart read failing is the story failing (there is nothing to show);
  the trail failing is not (the chart stands). Asymmetric on purpose; both
  directions tested.

## Coherence

- Terminology matches the surfaces it joins: "as placed" mirrors the
  pipeline page's "at the decision" relabelling from
  `the-stop-that-moved-is-shown-as-moved`; `WhyNotLoaded` used for both
  unreadable states with distinct subjects.
- The MCP tool description names states in product words — no platform
  status vocabulary (guard-checked).
- Docs: surface map 53 → 56 consumed (including the pre-existing
  `get_agent_coin_qualification` omission, corrected with a note),
  MCP server doc 24 → 25 tools, backlog item updated with what was taken
  and what remains (open orders still unobservable — recorded, not built).

## Gates

typecheck ✓ · lint ✓ · vitest 1,902 ✓ (+24 this change) · build ✓ ·
db 81 ✓ · drizzle diff clean ✓ · live: trade-story probe green through the
product path; full serial sweep run this session.

## Advisory notes

- `get_trade_chart` for an **open** position's log is unobserved (no open
  position existed at build time). The discrimination handles whatever it
  answers; the probe prints which branch it saw. Not a spec gap — the spec
  scopes the chart to what the platform serves.
- The SVG carries its facts as text (`<title>`, level/marker labels), which
  is what the rendering harness asserts; visual regression is out of scope
  for this suite by design.
