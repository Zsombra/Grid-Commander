# Tasks

- [x] 1.1 Derive the move on a closed trade in the domain: signed by
      `direction`, from `entryFillPrice` and `exitFillPrice`, `null` where
      either is missing — never zero, which would read as a flat trade
- [x] 1.2 Fold the moves by close reason: count, median move, and the number of
      trades excluded for want of a price. Extend the derived summary rather
      than adding a second one beside it. The ending comes from `closeReason`
      and the result from `netPnl`, never one from the other — a trailed stop
      closes in profit (`HYPE`, +$0.0731 at `STOP_LOSS`)
- [x] 1.3 State the window and the sample on every figure; below the threshold
      that supports a median, carry the trades instead of a statistic
- [x] 1.4 Compare each capped field against the catalog's declared default,
      derived from the catalog — a field it declines to default gets no
      comparison, and equality is stated rather than omitted
- [x] 1.5 Carry the position-management values and the realised median position
      life beside them. Reuse `positionDrift()` where drift is shown — the
      contract belongs to `agent-authoring`, and a second implementation of it
      is the drift it was written to prevent
- [x] 1.5a Median, not mean. `summarize()`'s `averageDurationSeconds` is a mean
      and stays one; position life is skewed and a mean flatters it
- [x] 1.6 Render on `/agents/[id]/limits` — the page already titled "what would
      stop it". `app/` imports no domain (W-D); every reading is computed in the
      query
- [x] 1.7 Each source fails independently: the catalog, the budget and the trade
      record can each be unreadable without hiding the other two
- [x] 1.8 Tests over the observed shapes — a missing fill price, a single-trade
      agent, a reason the platform did not state, a preset the catalog cannot
      explain, and a catalog read that failed while the budget read succeeded
- [x] 1.9 An architecture test that no population constant from
      `_PM/TRADE_CATEGORIES_AND_MATHEMATICAL_FAMILIES.md` reaches the product —
      the rule this change is most likely to be violated by later
- [x] 1.10 A key-gated live probe in `tests/live/`, and `./scripts/ci.sh` green
- [x] 1.11 File what this change refused to guess: the account-balance read, and
      the stop-versus-excursion comparison deferred to the strategy. Reconcile
      `a-stop-inside-the-noise-looks-like-a-tight-stop` against what shipped

## What building it changed

**Three of the six rows the item asked for were already shipped or covered**,
found by reading the code before writing spec. `Ceilings` has rendered "no limit
set" and "Nothing will stop this agent on …" since `zero-does-not-mean-nothing`,
and the exposure gauge already sets the cap against what is at risk. Proposing
them would have been re-specifying shipped behaviour.

**The geometry went in the application layer, not the domain.** `@/ports` is not
on the domain's forbidden list, so a `src/domain/agent/geometry.ts` would have
passed `boundaries.test.ts` — but no domain file imports a port, and
`summarize()`, the same derivation over the same rows, lives in
`read-trading-record.query.ts`. Precedent beat a technically-permitted new one.

**The guard for 1.9 passed vacuously on first write.** Its transcription check
used `[A-Za-z_$][\w$]*` before the alternation, so the mandatory first character
consumed the `N` of `NOISE_FLOOR_PCT` and the pattern could never match its own
first letter however far the greedy quantifier backtracked. Found by planting a
constant and watching the test stay green — the same vacuity every guard in that
directory carries a comment about, reproduced while writing one. Both halves are
now proven against planted violations.

**A field the agent carries but cannot set needed its own treatment.** The v15
policy fields still come back on the agent read, so `maxStopLossPct: 1` renders
against the platform's declared default of 5 — `0.2×`, which is the item's
headline expressed against BattleGrid's own number. Shown apart from the
settings an operator can change, with where they are now set named, because a
number nobody can act on from this page sitting among eight they can is an
invitation to try. The delta spec gained a requirement paragraph and a scenario
rather than the behaviour shipping unspecified.

**Gates**: typecheck, lint, spec validation clean; **1,962 vitest** (60 new),
**81 db against real PostgreSQL**, **235 python harness**, drizzle-check,
migrate and build all green via `./scripts/ci.sh`. `freshness` and `serving`
skipped with named reasons — both need credentials this environment has not got.

## What /verify found, in this change's own work

Three scenarios the delta spec required and the first implementation did not
deliver. All three were written into the spec by the same session that then
failed to build them, which is the case for running the check on your own work
rather than only on someone else's.

- **`A value the platform has no default for`** said the agent's value is shown
  on its own. The panel named the fields and withheld their numbers — so
  `maxConcurrentExposureUsd: 250`, the item's own example and one of the six
  money questions, was the one setting on the page an operator could not read.
- **`A sample too small for a median`** said the individual trades are shown.
  The panel said only that a median was being withheld, leaving the reader with
  less than the platform gave them. It now prints the moves, which at two or
  three trades are shorter than the sentence explaining their absence.
- **`Management shown against realised position life`** said the life is shown
  *beside* the switches. It was rendering two sections away, in the geometry
  block — and the rendering test asserted the switches without ever asserting
  the life, so it passed against a scenario it did not check.

Fixed, and each now has a test that fails without the fix. Re-run after:
**1,963 vitest**, `./scripts/ci.sh` green.
