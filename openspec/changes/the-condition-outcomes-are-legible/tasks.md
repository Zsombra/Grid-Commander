# Tasks

## 1. Settle how the payload is actually produced

- [x] 1.1 Establish why the surface's `conditionOutcomes` has always been empty.
      `preview_strategy_report` takes `conditions` as an **optional** input and
      resolves only what it is given; the tool takes no `strategyId`, so it has
      no other way to know them. The probed record shows it: the surface's own
      capture (`docs/battlegrid-mcp-surface.json`) observed
      `conditionOutcomes: []` from a call that sent no conditions
- [x] 1.2 Establish what the declared output schema promises against what has
      been seen. Declared: `{ticker, outcomes[], verdict}` with
      `outcome ∈ {TRUE, FALSE, UNRESOLVED}` and two evidence variants (`clause`,
      `conditionRef`). Observed: `ticker`, `outcomes[]`, and the `clause`
      variant only. `verdict` and `conditionRef` evidence are declared and
      unobserved
- [x] 1.3 Decide the round trip. Conditions go back **whole**, as the platform
      sent them — the custom-table precedent. Re-serialising from the domain
      shape would drop any `unrecognised` form, and the grammar is still being
      rolled out (eight platform strategies gained conditions in one deployment)

## 2. The domain

- [x] 2.1 An outcome type covering what was observed: per ticker, per condition,
      the platform's outcome word, `provisional`, `counts`, and `evidence`
- [x] 2.2 The outcome word is carried as the platform's own string, not narrowed
      to a union — the third state is protected by carrying, not by enumerating
- [x] 2.3 `counts: null` and counts of zero are distinct — null is "not a
      threshold group", never "nothing held"
- [x] 2.4 The domain must not import the MCP client; outcomes arrive through the
      strategies port like everything else
- [x] 2.5 Nothing in the domain resolves a condition, counts a false, or reads a
      column value

## 3. Reading

- [x] 3.1 The strategy read's result carries the platform's own condition
      payload, opaque, for the round trip — on the result and not on
      `StrategyDetail`, so `read_strategy` over MCP does not answer a model with
      two copies of one list
- [x] 3.2 The preview sends it — and omits the argument entirely when the
      strategy defines no conditions, so those previews are unchanged
- [x] 3.3 The preview mapper reads `conditionOutcomes` into the domain shape
- [x] 3.4 The outcome mapper lives outside `condition-mapper.ts`, which has a
      test asserting it reads no outcomes at all
- [x] 3.5 An evidence entry in an unmodelled form is carried as unmodelled,
      keeping its outcome, rather than dropped
- [x] 3.6 A ticker row with no usable ticker is dropped rather than rendered
      under a placeholder — a coin nobody can name is a row nobody can act on

## 4. Rendering

- [x] 4.1 The preview shows outcomes per ticker, beside the section text
- [x] 4.2 Evidence renders observed against required, naming the column
- [x] 4.3 `provisional` is marked on the outcome itself and in the per-coin
      summary, never rendered identically to a settled outcome
- [x] 4.4 `counts` shows held, unresolved and total as sent; no false count is
      derived, and absent counts render as nothing rather than as zero
- [x] 4.5 A strategy defining no conditions says so; a strategy defining some
      for which no outcome came back says *that*, differently
- [x] 4.6 An unmodelled evidence form renders the outcome and reports the gap

## 5. Guards

- [x] 5.1 The mapper is tested over the payload observed live 2026-08-04,
      including the `counts: null` case and the threshold-group case
- [x] 5.2 An outcome word the product has never seen passes through verbatim —
      the regression that would flatten the third state
- [x] 5.3 A test asserting nothing in the outcome path derives an outcome,
      compares an operand to a literal, or sums unresolved into false
- [x] 5.4 The rendering test proves a provisional outcome is distinguishable
      from a settled one
- [x] 5.5 Live probe: the preview probe previews a strategy that **carries**
      conditions and asserts outcomes come back, logging the raw ticker keys so
      the unobserved `verdict` is settled by the next run with a key

## 6. Deferrals, filed

- [x] 6.1 `preview-per-ticker-verdict-is-unobserved` — the declared, required,
      never-seen field, with the call that settles it
- [x] 6.2 The backlog item this change implements links the change rather than
      restating its tasks

## 7. Gates

- [x] 7.1 `npx tsc --noEmit -p tsconfig.json`
- [x] 7.2 `npx eslint .`
- [x] 7.3 `npx vitest run tests/strategy/ tests/rendering/ tests/architecture/`
- [x] 7.4 `python3 .claude/tools/openspec.py validate the-condition-outcomes-are-legible`
- [x] 7.5 No credential in the diff
