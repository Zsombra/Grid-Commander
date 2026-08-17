# The condition outcomes are legible

## Why

`the-condition-layer-is-legible` renders what a condition *says*. This is the
other half: what it *did*, on a real coin, a minute ago.

`preview_strategy_report` resolves every condition against live market state and
answers **per ticker**. Observed live 2026-08-04, and filed rather than rushed
because the payload is richer than the name suggests:

```json
{ "ticker": "BTC",
  "outcomes": [
    { "conditionKey": "ALL_AGREE_UP", "name": "Regime, HTF and ADX agree — up",
      "outcome": "FALSE", "provisional": true, "counts": null,
      "evidence": [
        { "kind": "clause", "sectionKey": "includeRegimeContext",
          "header": "regTrend_now", "op": "is",
          "operand": "ranging", "literal": "trending up", "outcome": "FALSE" } ] } ] }
```

And on a threshold group: `counts: {trueCount: 4, total: 4, unresolvedCount: 0}`.

`/strategies/[id]/preview` already answers *what would the agent read*. With the
same call it can answer *and which of your direction rules would fire, on which
coins, and why not* — which is the question an author actually has when they
open that page. Today the surface produces the payload and renders none of it.

## The three things that must not be flattened

Each one is a distinction this product has already paid for somewhere else, in a
new place.

1. **`evidence` is the clause-level reason.** `operand` is what the market
   actually showed; `literal` is what the condition required. Together they
   answer *why* a rule did not fire, not merely that it did not. Rendering the
   outcome without the evidence would keep the least useful half of the payload.
2. **`provisional: true` means the bar is not closed** and the outcome can still
   change. A provisional `FALSE` shown identically to a settled one is this
   product's characteristic mistake — the same shape as `empty` versus
   `unreadable`, and as a simulated score shown as what happened.
3. **`unresolvedCount` is a third state.** A member that is neither true nor
   false. The declared schema gives no hint it exists; it was found by calling.
   A surface that folds it into "not true" reports a rule as failing when the
   platform said it could not tell.

## What changes

1. **The preview sends the strategy's conditions and renders what comes back**,
   per ticker, beside the section text already shown. The tool takes
   `conditions` as an optional argument and returns `conditionOutcomes` only for
   what it was given — which is why the surface has been producing an empty
   array since v5.
2. **The conditions go back whole.** The platform's own condition payload rides
   the strategy read's *result* — not the strategy entity — and is returned
   verbatim, exactly as a custom table already is. Re-serialising them out of the
   domain shape would lose any form the mapper reports as `unrecognised`, and the
   grammar is still being rolled out. On the result rather than the entity
   because it is plumbing for one call: on the entity it would have shipped a
   byte-identical second condition list to every model calling `read_strategy`.
3. **Three states stay three.** The outcome word is carried as the platform's
   own string rather than narrowed to a union this product would have to widen
   after every deployment, `unresolvedCount` is shown beside `trueCount` rather
   than summed into it, and a false count is never derived.
4. **Grid-Commander computes none of it.** `Grid-Commander Never Decides Whether
   A Condition Holds` already forbids it and has a test; this change adds a
   second one over the outcome mapper.

## What is explicitly out of scope

- **Authoring conditions.** Still the separate change
  `conditions-are-an-unmodelled-authoring-layer` describes.
- **Outcomes on `/strategies/[id]`.** The strategy page has no coin selection,
  so it has no market state to resolve against. The preview surface is where the
  question is asked and where the answer arrives.
- **The per-ticker `verdict` field.** Declared and required by the output
  schema; **absent from every capture this repo holds**, including the one this
  change is built from. Modelling it would mean modelling a shape nobody has
  seen, which is the mistake this product has made and paid for four times.
  Filed as `preview-per-ticker-verdict-is-unobserved` with the exact call that
  settles it, and the live probe now logs the raw keys so the next run with a key
  answers it.

## Capabilities

- `strategy-authoring` — one MODIFIED (the preview requirement now enumerates
  the resolved conditions among what the preview shows) and three ADDED, one per
  distinction above.

No `mcp-control` delta. `The Product Is Reachable As An MCP Server` already
requires each tool to call the same use case the web surface calls, so nothing
new is promised to a model by widening a use case's answer.

## Track

`standard`. Read-only throughout: `preview_strategy_report` is annotated
`readOnlyHint: true`, no scope changes, no schema, nothing to migrate. It touches
one capability and has one intent.

The one thing that is not free: the preview call now carries an argument it did
not carry before, for strategies that define conditions. A strategy defining none
sends a byte-identical payload to today's, so the blast radius is bounded to the
conditioned strategies — and a platform refusal of the wider draft is already a
rendered result in the platform's words rather than a broken page.

Not `full`: no contract this product owns, no money, no autonomous authority,
and the whole change reverts by dropping one argument and one render.
