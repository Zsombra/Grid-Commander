# Tasks

- [ ] 1.1 Derive the move on a closed trade in the domain: signed by
      `direction`, from `entryFillPrice` and `exitFillPrice`, `null` where
      either is missing — never zero, which would read as a flat trade
- [ ] 1.2 Fold the moves by close reason: count, median move, and the number of
      trades excluded for want of a price. Extend the derived summary rather
      than adding a second one beside it. The ending comes from `closeReason`
      and the result from `netPnl`, never one from the other — a trailed stop
      closes in profit (`HYPE`, +$0.0731 at `STOP_LOSS`)
- [ ] 1.3 State the window and the sample on every figure; below the threshold
      that supports a median, carry the trades instead of a statistic
- [ ] 1.4 Compare each capped field against the catalog's declared default,
      derived from the catalog — a field it declines to default gets no
      comparison, and equality is stated rather than omitted
- [ ] 1.5 Carry the position-management values and the realised median position
      life beside them. Reuse `positionDrift()` where drift is shown — the
      contract belongs to `agent-authoring`, and a second implementation of it
      is the drift it was written to prevent
- [ ] 1.5a Median, not mean. `summarize()`'s `averageDurationSeconds` is a mean
      and stays one; position life is skewed and a mean flatters it
- [ ] 1.6 Render on `/agents/[id]/limits` — the page already titled "what would
      stop it". `app/` imports no domain (W-D); every reading is computed in the
      query
- [ ] 1.7 Each source fails independently: the catalog, the budget and the trade
      record can each be unreadable without hiding the other two
- [ ] 1.8 Tests over the observed shapes — a missing fill price, a single-trade
      agent, a reason the platform did not state, a preset the catalog cannot
      explain, and a catalog read that failed while the budget read succeeded
- [ ] 1.9 An architecture test that no population constant from
      `_PM/TRADE_CATEGORIES_AND_MATHEMATICAL_FAMILIES.md` reaches the product —
      the rule this change is most likely to be violated by later
- [ ] 1.10 A key-gated live probe in `tests/live/`, and `./scripts/ci.sh` green
- [ ] 1.11 File what this change refused to guess: the account-balance read, and
      the stop-versus-excursion comparison deferred to the strategy. Reconcile
      `a-stop-inside-the-noise-looks-like-a-tight-stop` against what shipped
