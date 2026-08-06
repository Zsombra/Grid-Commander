# Design — a-drafted-condition-can-be-saved

## The shape

```
/strategies/[id]/conditions            compose and try (unchanged; writes nothing)
   │  link, carrying the draft's own query
   ▼
/strategies/[id]/conditions/save
   no edit in the query   → the strategy's condition list, each removable.
                            Nothing compiled, nothing minted.
   an edit in the query   → DescribeConditionWriteQuery:
                              read fresh
                              → resolve the edit into the whole list
                              → compile (a read; writes nothing)
                              → postStateDrift: did the compiler take it whole,
                                and leave what this write never named?
                              → DescribeApplyQuery mints against summary +
                                blast radius + this write's own addendum
   confirm form POST      → ApplyPlanCommand → apply_strategy_plan
   refusal                → back to the same route with ?problem= and the
                            same edit, so the describe re-runs against a
                            fresh read
   success                → /strategies/[id] — the re-read is the proof
```

## Decisions

**D1 — the write binds over the whole list, through the pipeline's existing
target.** `confirmationTarget.strategyPlan(strategyId, intentDigest)`, minted by
`DescribeApplyQuery`. The digest is the compiler's own — `CompilePlanCommand`
computes it from the request it sent and hangs it on the plan — so a plan altered
between review and apply digests differently and the consume misses. No new
target builder, and no second digest site: two of those is the fifth dead write
path, and `confirmation-binds-values.test.ts` says so.

**D2 — the compile intent names conditions and nothing else.** A second builder,
`compileConditionsIntent`, beside `compileUpdateIntent` rather than four optional
fields on it. The section editor restates `tagline` and `sections` and never
mentions `conditions`; this restates `conditions` and never mentions the other
two. One builder taking all of them would let a caller compose an UPDATE that
restates the whole strategy — the payload nobody has observed, and the one that
could overwrite an axis its surface never offered to change.

**D3 — the compiled post-state is checked, every time.** D2 is safe because an
omitted field is filled from the stored strategy. That is one live observation,
made on one day, against one strategy. `postStateDrift` turns it into a check
that runs on every write: the condition keys **in order**, the tagline as text
(empty and absent read alike), the section keys **as a set**. Drift is its own
result, not a refusal — a refusal is BattleGrid declining the change, and this is
BattleGrid accepting a *different* change.

Deliberately **not** a byte comparison of the conditions. The compiler normalises
what it returns and no capture establishes equality, so asserting it would refuse
honest writes for a shape nobody has observed — the same mistake as modelling one.

**D4 — the domain carries two readings of the same array, and neither replaces
the other.** `conditionsAsGiven` is what is sent: the platform's own objects,
back whole, because the grammar is still being rolled out and a form the mapper
read as `unrecognised` must not be dropped on the way back. `detail.conditions`
is what is reasoned about: `unresolvedReferences` needs definitions it can walk.
Only the draft passes through `serialiseCondition`, because only the draft has no
platform object of its own. `resolveConditionEdit` applies the edit to both by
one rule, so what is sent and what is described can never be two lists.

**D5 — no local no-op check.** The retune describe refuses a change that changes
nothing because it has no dry run to consult. This one compiles first: if there
is nothing to change, BattleGrid says so in its own words and that reaches the
operator. A local check would have to compare a re-serialised draft against a
stored object, and the two differ legitimately — `mapDefinition` drops a
meaningless `n`, for one. Being wrong in that direction refuses an honest write.

**D6 — the dangling set is the delta, not the total.** A reference that dangles
before and after is a property of the strategy; `strategy-conditions.tsx` reports
it where the strategy is read. Listing it under "after this" would attribute to
the edit something the edit did not do, at the moment someone is deciding whether
to proceed. Overstating a consequence spends the same credibility as understating
one.

**D7 — the write lives on its own route, and the composer keeps its promise.**
`tests/strategy/condition-draft.test.ts` holds that the five files the try
surface is made of reach no compile, no apply, and carry no server action. That
property is worth keeping, so none of them gained one: the save is a separate
route with its own page and its own action. The composer's copy was narrowed from
"there is no control on this page that writes" to "nothing is saved by this form"
— a link would have made the first quietly false, and a promise this product
keeps loosely is worse than one it does not make.

**D8 — the draft travels as its query.** The saved condition has to be the one
that was tried. It exists only as the composer's query string, so it travels
whole and is re-parsed by `draftFromQuery` on the other side, rather than being
rebuilt from the parsed definition — which would be a second serialisation of a
grammar that already has one. A refusal round-trips the same query through the
form, rebuilt with `URLSearchParams` so what comes back from a browser can only
ever be re-attached to a route this file names.

**D9 — the empty list is sent, and its meaning is checked rather than assumed.**
Removing the last condition submits `conditions: []`. Whether the platform reads
that as "define none" or as "unspecified" is unobserved; if it is the latter, the
post-state comes back carrying the stored conditions and `postStateDrift` refuses
before anyone agrees to a removal that would not happen. The live probe records
the answer either way.

## File changes

- `src/domain/strategy/condition-write.ts` — new: `resolveConditionEdit`,
  `listedKeys`, the standing and the dangling delta.
- `src/domain/strategy/compiled-plan.ts` — `compileConditionsIntent`,
  `postStateDrift` (the only place `postState` is read — S-A).
- `src/application/use-cases/describe-condition-write.query.ts` — new: the
  describe, holding the compile and the apply-describe.
- `src/application/use-cases/apply-plan.command.ts` — `addendum` on the describe
  request, appended before the token is minted.
- `src/composition.ts` — wiring.
- `app/(app)/strategies/[id]/conditions/save/page.tsx` — new: the surface and its
  server action.
- `app/(app)/strategies/[id]/conditions/page.tsx` — the way in, and the narrowed
  promise.
- `src/presentation/components/condition-composer.tsx` — the narrowed promise,
  said again at the point of action.
- Guards: `tests/architecture/reachability.test.ts` (the new action-bound route),
  `tests/architecture/write-results.test.ts` (the ledger row and its verdict).
- Tests: `tests/strategy/condition-write.test.ts`,
  `tests/rendering/condition-write.test.ts`,
  `tests/rendering/condition-draft.test.ts` (the narrowed sentence),
  `tests/rendering/support/fake-acting.ts`;
  live probe `tests/live/condition-write-probe.test.ts` — a read half under a key
  and a write half under `BATTLEGRID_LIVE_WRITES=1`.
