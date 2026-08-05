# Tasks

## 1. Settle what is observed before modelling any of it

Read-only, live, with the real key. Record findings in the proposal before
building against them — three of the account's strategies carry conditions, so
none of this needs to be inferred.

- [x] 1.1 Done. 12 of 37 (primary) and 11 of 15 (second) carry conditions, up
      from 3 — eight platform strategies gained them across v5.0.0 → v5.1.0.
      Every declared form appears in real data
- [x] 1.2 Done. `conditionOutcomes` answers, per **ticker**, and carries three
      things nothing anticipated: clause-level `evidence` (observed vs
      required), `provisional`, and `counts` with an `unresolvedCount` third
      state
- [x] 1.3 Done — **NO**. A signal log has 31 keys, none about conditions, and
      `conditionKey` appears nowhere even nested. Checked against the control:
      an agent bound to a strategy that does define conditions. The pipeline
      page is permanently out of scope
- [x] 1.4 Done — **NO**. The roster carries no conditions; per-strategy read
      required

## 2. The domain

- [x] 2.1 A condition type in the domain covering the six declared forms:
      four comparison variants, a reference by key, and a group with its
      operator and members
- [x] 2.2 Nesting is preserved, not flattened
- [x] 2.3 An unrecognised form maps to an explicit "not understood" rather than
      being dropped — the same refusal discipline as every other mapper
- [x] 2.4 The domain must not import the MCP client; conditions arrive through
      the strategies port like everything else

## 3. Reading

- [x] 3.1 The strategy mapper reads `conditions` from `get_strategy`
- [x] 3.2 Absent, empty, and unreadable are three distinct states — an empty
      condition list is not a strategy whose conditions failed to load
- [x] 3.3 A `conditionRef` naming a condition the strategy does not define is
      carried as unresolved, not dropped
- [ ] 3.4 `conditionOutcomes` — DEFERRED. 1.2 confirmed it answers and carries
      more than expected: per-ticker, clause-level `evidence`, `provisional`,
      and an `unresolvedCount` third state. Rendering it belongs with the
      preview surface, not the strategy page, and is filed rather than rushed

## 4. Rendering

- [x] 4.1 `/strategies/[id]` shows the conditions the strategy defines
- [x] 4.2 Comparisons render in words against their column, not as payload
- [x] 4.3 A group states how many members must hold, out of how many
- [x] 4.4 A negation is visibly a negation
- [x] 4.5 Building blocks are distinguishable from directional calls, and the
      count of "ways this strategy decides direction" excludes building blocks
- [ ] 4.6 DEFERRED with 3.4 — the strategy page shows definitions; outcomes
      belong on the preview surface that produces them
- [x] 4.7 A strategy with no conditions says so, and does not silently look
      identical to one that failed to load them

## 5. Guards

- [x] 5.1 Nothing computes a verdict from column values — a test asserting the
      product derives no condition outcome locally
- [x] 5.2 The rendering test uses Berlin's real structure, including the
      `NOT( ref FLOW_UP )`, so a flattening regression fails
- [x] 5.3 A building block never renders in the directional-call count
- [x] 5.4 An unrecognised condition form renders the strategy and reports the
      gap

## 6. The boundary

- [x] 6.1 Confirm `read_strategy` over MCP carries conditions without a new
      tool — it calls the same use-case, which is the point
- [x] 6.2 Live probe: the MCP server answers Berlin's conditions to a real
      client

## 7. Gates

- [x] 7.1 `./scripts/ci.sh` green
- [x] 7.2 `openspec.py validate the-condition-layer-is-legible`
- [x] 7.3 Close backlog item `conditions-are-an-unmodelled-authoring-layer`,
      recording what stayed out of scope (authoring) so it is not read as done
- [x] 7.4 No credential in the diff
