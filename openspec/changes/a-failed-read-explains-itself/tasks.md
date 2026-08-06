# Tasks

- [x] 1.1 Derive every rendered `kind === 'unreadable'` branch under `app/` and
      `src/presentation/` from the source — per branch, and by what the branch
      renders rather than by what its file imports
- [x] 1.2 Fail any derived branch that reaches neither `WhyNotLoaded` nor a
      stated exemption; fail an exemption that is stale, or whose branch has
      since been fixed
- [x] 1.3 Guard the sentence itself: one definition, reached from that module
      wherever it is rendered, and a subject that completes it grammatically —
      including on the two wrappers that take one as a prop
- [x] 1.4 Carry the `cause` where the type dropped it: `CatalogResult` to
      `@/ports/agents.js` beside its siblings, `PreviewCompositionResult`
      passed through and classified
- [x] 1.5 Sweep the twenty-six branches that should carry it, subject by
      subject; record the four that should not, with reasons
- [x] 1.6 Correct the two subjects that read "…this agent's limits gone"
- [x] 1.7 File the exposure panel's deferral; link the backlog item to this
      change

## What writing the guard found that the sweep would not have

**Two of the six surfaces already using the component were ungrammatical.**
`/limits` rendered *"This does not mean this agent's limits gone"* and
`/thinking` the same for its reasoning. Both had shipped, and a shared component
is exactly what is supposed to make that impossible. It did not, because nothing
read the sentence back — the component takes a `subject` and no one had asserted
that a subject completes the sentence it is spliced into.

**`/agents/new` was branching on the wrong side of its union.**
`catalog.kind !== 'catalog'` needed a `: 'unknown'` fallback for a state
`CatalogResult` does not have, and it discarded the `cause` — so this page told
every failed create the platform "could not be reached", including the 401 where
it was reached and answered. That is the defect `why-not-loaded.tsx`'s own header
was written about, alive on a page the component had never been added to.

**One read outcome could not carry a cause at all.** `CatalogResult` was the
only one declared in the domain rather than in a port, and the domain does not
know `FailureCause`. The adapter had been producing the cause all along through
`unreadable(err)`; the type was throwing it away. Moved beside `RosterResult`,
`BudgetResult` and `JournalResult`, where the question "why did this read fail"
is already answerable.

## The exemptions, argued rather than assumed

Four branches carry no shared sentence, each recorded with its reason:

- **`proposal-queue.tsx` and `pending/[id]`** read Grid-Commander's own
  database. `WhyNotLoaded` names BattleGrid, which was never asked — the
  sentence would be false, and `ProposalsResult`/`OpenProposalResult` carry no
  `FailureCause` for the same reason. `OpenProposalQuery` already reports a
  BattleGrid failure as `not-possible`, with the platform's words.
- **The column check on `metrics/[metric]`** validates a column being composed
  in the query string. Nothing was saved, so "does not mean it is gone" refers
  to nothing. The page's own unreadable branch, one section up, does carry it.
- **`exposure.tsx`** is owed the sentence and did not get it — outside this
  change's scope, filed as `the-exposure-panel-still-prints-its-reason` (p3).
  The exemption is what keeps that visible instead of letting the branch pass
  unnoticed.

## Verification

```
npx tsc --noEmit -p tsconfig.json          clean
npx eslint .                                clean
npx vitest run                              1405 passed, 40 skipped (key-gated live)
npx vitest run tests/architecture/ tests/rendering/   376 passed
```
