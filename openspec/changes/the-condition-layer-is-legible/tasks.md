# Tasks

## 1. Settle what is observed before modelling any of it

Read-only, live, with the real key. Record findings in the proposal before
building against them — three of the account's strategies carry conditions, so
none of this needs to be inferred.

- [ ] 1.1 `get_strategy` on Berlin, El Alamein and Dunkirk — confirm the
      condition shape and record whether every form in the declared grammar
      actually appears in real data
- [ ] 1.2 `preview_strategy_report` on Berlin — **does `conditionOutcomes`
      actually come back, and in what shape?** It is declared, not observed
- [ ] 1.3 Does a signal log or entry decision carry a condition outcome?
      `get_signal_log` and `get_entry_decision` on an agent bound to Berlin.
      **If not, the pipeline page stays out of scope** and the proposal's
      out-of-scope note becomes permanent rather than provisional
- [ ] 1.4 Does `list_strategies` carry conditions, or only `get_strategy`?
      Decides whether the roster can show a count without a per-row read

## 2. The domain

- [ ] 2.1 A condition type in the domain covering the six declared forms:
      four comparison variants, a reference by key, and a group with its
      operator and members
- [ ] 2.2 Nesting is preserved, not flattened
- [ ] 2.3 An unrecognised form maps to an explicit "not understood" rather than
      being dropped — the same refusal discipline as every other mapper
- [ ] 2.4 The domain must not import the MCP client; conditions arrive through
      the strategies port like everything else

## 3. Reading

- [ ] 3.1 The strategy mapper reads `conditions` from `get_strategy`
- [ ] 3.2 Absent, empty, and unreadable are three distinct states — an empty
      condition list is not a strategy whose conditions failed to load
- [ ] 3.3 A `conditionRef` naming a condition the strategy does not define is
      carried as unresolved, not dropped
- [ ] 3.4 `conditionOutcomes` read from preview, if 1.2 confirms it answers

## 4. Rendering

- [ ] 4.1 `/strategies/[id]` shows the conditions the strategy defines
- [ ] 4.2 Comparisons render in words against their column, not as payload
- [ ] 4.3 A group states how many members must hold, out of how many
- [ ] 4.4 A negation is visibly a negation
- [ ] 4.5 Building blocks are distinguishable from directional calls, and the
      count of "ways this strategy decides direction" excludes building blocks
- [ ] 4.6 Where an outcome exists it sits with its condition; where none exists
      the absence is stated
- [ ] 4.7 A strategy with no conditions says so, and does not silently look
      identical to one that failed to load them

## 5. Guards

- [ ] 5.1 Nothing computes a verdict from column values — a test asserting the
      product derives no condition outcome locally
- [ ] 5.2 The rendering test uses Berlin's real structure, including the
      `NOT( ref FLOW_UP )`, so a flattening regression fails
- [ ] 5.3 A building block never renders in the directional-call count
- [ ] 5.4 An unrecognised condition form renders the strategy and reports the
      gap

## 6. The boundary

- [ ] 6.1 Confirm `read_strategy` over MCP carries conditions without a new
      tool — it calls the same use-case, which is the point
- [ ] 6.2 Live probe: the MCP server answers Berlin's conditions to a real
      client

## 7. Gates

- [ ] 7.1 `./scripts/ci.sh` green
- [ ] 7.2 `openspec.py validate the-condition-layer-is-legible`
- [ ] 7.3 Close backlog item `conditions-are-an-unmodelled-authoring-layer`,
      recording what stayed out of scope (authoring) so it is not read as done
- [ ] 7.4 No credential in the diff
