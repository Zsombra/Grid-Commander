# The inside of a section is composable

## Why

`strategy-section-editor` shipped the outer shell: *which* report sections a
strategy includes. It declared the inner one out of scope (SL-1) and filed it as
`strategy-metric-editor`, which is now unblocked.

Today a user can add or remove the RSI section and cannot see, let alone tune,
what RSI columns it contains. The section checklist renders 25 keys and nothing
about what any of them reads. Meanwhile `list_strategy_vocabulary` has been
returning each template's **columns** in the same payload the checklist is built
from — thirteen of them on the first template — and the mapper has been keeping
`sectionKey` and `label` and dropping the rest. That is the 35-vs-11 shape this
project has now paid for twice (`HANDOFF.md` findings 8 and 9): the data was
already on the wire.

BattleGrid publishes two tools for the inner shell, and this product wires both
but reaches them from one place only — the metric index, metric-first:

- `get_metric_construction_hints({metric})` — what a metric is and how each of
  its transforms configures
- `get_strategy_column_contract({column})` — compiles a proposed column into its
  normalized parameters, output contract, formula semantics and null
  presentation **without reading market values**

The contract read is the point. It is the only way to find out whether a column
is well-formed without spending a compile against a real strategy.

## Two controls the product cannot express

`v5-surface-additions-unconsumed` recorded them: `get_strategy_column_contract`
gained `bars` (`closed | all`) and `ordering` (`hi | lo | far | near`). The port
type and the adapter carry both — they were added with
`the-column-grammar-is-learnable` — but **no surface offers them**, so a column
an operator builds here cannot say either. The metric page reads `bars` and
`ordering` off the query string and renders no control that sets them.

Their permitted values are read at runtime from the discovered schema, the way
`brain.preset`, `deploymentTimeframe` and the ranking vocabulary are. Nothing in
this change types an enum value into source; `declared-values.ts` already
performs exactly this walk, and the same walk answers `column.timeframe.rel` and
`column.timeframe.abs` — which the metric page has had written down since it
shipped.

## What changes

1. **A section library** (`/strategies/sections`) — every section template the
   platform's vocabulary advertises, from the same read the edit checklist uses.
2. **A section opens** (`/strategies/sections/[sectionKey]`) to the columns it
   renders by default, each as the platform declared it, and each openable in a
   column editor seeded from its own values.
3. **The editor composes one column** — metric, transform, timeframe, window,
   offset, `bars`, `ordering`, side, operands, chained transform — and asks
   BattleGrid to compile it. A compiled contract renders as the contract; a
   refusal renders as the platform's own teaching, which
   `A Refused Column Teaches In The Platform's Words` already requires.
4. **Every enumerated control is read from the declaration.** `bars`, `ordering`,
   `side` and both halves of `timeframe` come from
   `get_strategy_column_contract`'s own schema at call time. A control the
   declaration cannot answer for is **not offered**, and the page says why —
   never silently absent, never guessed at.
5. **The template's columns are read, not remodelled.** They stay opaque on
   `SectionTemplate`, exactly as a custom table's columns already do on
   `StrategySection`, and a key this product does not carry is **named** rather
   than dropped.

## What this surface does not do, and why

**It cannot save a column.** This is deliberate and it is stated on the page,
following `/strategies/[id]/conditions`, which made the same call for the same
kind of reason (`a-drafted-condition-cannot-be-saved`).

The reason here is sharper than "not built yet". The recorded compile schema
closes a platform section to exactly two keys:

```
request.sections[] variant when {kind: platform}
  closed: true, accepts: [kind, sectionKey], required: [kind, sectionKey]
```

A platform section carries **no columns in the compile request at all**. Its
contents are the platform's; membership is the only thing an author chooses. A
column of your own can only travel inside a `{kind: custom}` section — which
needs a title, the timeframe-inertia law (a section holding any timeframe-inert
metric must declare no section timeframe), the create-by-definition /
modify-by-key loop, and round-tripping whatever custom tables the strategy
already owns. That is a change, not a step, and it is described in the report so
the integrator can file it.

So this surface answers the question that has no other answer — *is this column
well-formed, and what exactly will it render* — and says plainly where the
answer can and cannot be taken.

## Capabilities

`strategy-authoring` — three ADDED and one MODIFIED:

- ADDED: a section template shows the columns it renders
- ADDED: an enumerated column control is read from the declaration or withheld
- ADDED: a composed column says where it cannot be saved
- MODIFIED: `A Proposed Column Is Checked Against The Platform's Contract` — the
  check is now reachable from a section's own columns and covers every control
  the platform's declaration pins, `bars` and `ordering` among them

No `mcp-control` delta. Nothing new is offered to a model: the MCP server's tool
list is unchanged and every use case behind it still answers what it answered.

## Track

`standard`. Read-only end to end — `list_strategy_vocabulary`,
`get_metric_construction_hints` and `get_strategy_column_contract` are all
annotated `readOnlyHint: true`, and the one new port method calls no tool at all
(it reads the discovered schema, the way `deploymentTimeframes` does). No scope
change, no migration, nothing to reverse but two routes.

Not `full`: no contract this product owns, no money, no write path.

## Impact

- `src/domain/strategy/strategy.ts` — `SectionTemplate` carries the columns and
  the title the platform already sends
- `src/ports/strategies.ts` — `ColumnControls` + `columnControls()` (additive)
- `src/infrastructure/battlegrid/strategy-adapter.ts` — the template mapper stops
  dropping columns; `columnControls` reads the declared enums
- `src/application/use-cases/read-section-library.query.ts` — new
- `src/application/use-cases/compose-column.query.ts` — new
- `src/presentation/column-form.ts` — new; the query-string reader
- `src/composition.ts` — wires both
- `app/(app)/strategies/sections/page.tsx`, `.../[sectionKey]/page.tsx` — new
- `app/(app)/strategies/page.tsx`, `app/(app)/strategies/[id]/edit/page.tsx` —
  one link each, so the library is reachable from where sections are chosen
