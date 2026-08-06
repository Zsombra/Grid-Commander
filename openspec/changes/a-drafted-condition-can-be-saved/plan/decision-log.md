# Decision Log — a-drafted-condition-can-be-saved

## DL-1 (PLANNING) — the token is the apply pipeline's, not a new one

`confirmationTarget.strategyPlan(strategyId, intentDigest)`, minted by
`DescribeApplyQuery`. The digest is the compiler's own, computed once by
`CompilePlanCommand` from the request it sent and carried on the plan.

The alternative — a `strategyConditions(strategyId, revision, digestOf(list))`
target, by analogy with `strategyRule` — was rejected. It would be a second
binding for one act on one tool, and the two would disagree the first time
either changed. It would also mean a second digest site, which
`confirmation-binds-values.test.ts` records as the fifth dead write path: two
definitions of `digestOf` shipped, a plan digested by one and verified against
the other, and `apply_strategy_plan` died silently.

What the analogy *did* give this write is the reason the describe says more:
`strategyRule` binds the values so an agreement about allocation 1 cannot
authorise allocation 3. Here the values are the whole list, so the whole list is
what must be described. See DL-3.

## DL-2 (PLANNING) — two compile-intent builders, not one with options

`compileConditionsIntent` sends `operation/strategyId/expectedRevision/
intentSummary/assumptions/coinSelection/conditions` and nothing else.
`compileUpdateIntent` keeps sending tagline and sections and never mentions
conditions. Each surface's builder names exactly what that surface may change.

One builder with four optional fields would let a caller compose an UPDATE that
restates the whole strategy. That payload has never been observed, and it is the
one that could overwrite an axis nobody offered to change — the shape of six
previous dead or dangerous write paths.

## DL-3 (PLANNING) — the describe is over the list, and the list only

Three statements the scorecard's describe does not have to make: what the whole
list would become, what the edit would strand, and the bound agent count. All
three go into the text the token is issued against rather than beside it, because
a warning the audit cannot prove was shown is one nobody can be held to.

The bound agent count comes from the platform's plan when the plan carries one
and from the strategy as read otherwise, labelled as such. Two counts would read
as two facts; silence would be worse than either.

## DL-4 (PLANNING) — the dangling set is the delta

`unresolvedReferences(resulting)` minus `unresolvedReferences(before)`. Berlin's
`FULL_SEND_DOWN` already refers to `FLOW_UP` and `WINDOW_OPEN`, which that
strategy's condition subset does not define; listing them under "after this
change" would blame the edit for the strategy's own state at the exact moment
someone is deciding whether to proceed. The total set is still reported where the
strategy is read (`strategy-conditions.tsx`), so nothing is hidden — only
attributed correctly.

## DL-5 (PLANNING) — no local no-op check, unlike the retune

`DescribeRetuneQuery` refuses a change that changes nothing without minting,
because it has no dry run. This describe compiles first, and the compiler's own
"nothing to change" is both authoritative and better worded than ours. A local
check would have to compare a re-serialised draft against a stored platform
object, and the two differ legitimately — `mapDefinition` keeps `n` for `N_OF`
alone, so a group that arrived with a meaningless threshold goes back without it.
Being wrong in that direction refuses an honest write.

## DL-6 (EXECUTION) — the finding is re-established on every write, not assumed

`an-update-that-omits-conditions-is-unobserved` was settled once, on 2026-08-06,
against one fork: the compiler fills `postState` from the stored strategy, so an
UPDATE omitting `conditions` preserves them. The whole narrow-intent design rests
on that, and one observation is a thin foundation for a fleet-wide write.

So `postStateDrift` reads the compiler's answer back on every describe — the
condition keys in order, the tagline as text, the section keys as a set — and a
plan that would save something the update never named is refused as its own
outcome. Compiling writes nothing, so the check is free.

It is deliberately **not** a byte comparison of the conditions. The compiler
normalises what it returns and no capture in this repo establishes equality;
asserting it would refuse honest writes for a shape nobody has observed, which is
the same mistake as modelling one, pointed the other way.

## DL-7 (EXECUTION) — the try surface kept its structural promise

`tests/strategy/condition-draft.test.ts` asserts that the five files the compose
-and-try surface is made of contain no `compilePlan`, no `applyPlan`, no
`'use server'`, and no `updateSignalRule`. That check is owned by another change
in this round and was not touched; none of those five files gained any of them.
The write lives on its own route, in its own page file, with its own action.

What did change is copy. The composer said "there is no control on this page that
writes to the strategy", and the page now offers a link onward — so the sentence
was narrowed to the form it still describes ("nothing is saved by this form…
saving a draft is a separate act, with its own review and its own confirmation")
and the rendering assertion moved with it. A promise this product keeps loosely
is worse than one it does not make; the alternative — leaving the sentence and
linking past it — was the option rejected.

The spec requirement carrying the same promise is MODIFIED rather than quietly
outgrown: it said a user who has tried a draft *shall not be able to reach a save
from the same act*, and the narrowing is that saving is a separate act with a
fresh read and its own confirmation, rather than an act that does not exist.

## DL-8 (EXECUTION) — `conditions: []` is sent, and its meaning is checked

Removing the last condition submits an empty array. Whether BattleGrid reads that
as "define none" or as "unspecified" is unobserved, and the two are opposite.
Nothing is guessed: if it means "unspecified", the post-state comes back carrying
the stored conditions and DL-6's check refuses before anyone agrees to a removal
that would not happen. The live probe's read half records the answer either way,
and the result belongs in the surface record's notes when it is known.

## DL-9 (EXECUTION) — what the live walk must prove, and how

Not run here: live MCP calls are the integrator's to make. Two commands, and the
first writes nothing.

**Read half — retires the remaining unknowns without a write.** Every call is
`get_strategy` and `compile_strategy_plan`, both classified `read`:

```bash
BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/condition-write-probe.test.ts
```

It picks an unbound owned PRIVATE strategy that defines conditions and compiles
four UPDATE requests against it, each naming `conditions` and nothing else:
the list unchanged, the list with a drafted clause added, the list with one
removed, and the empty list. Expect for the first three: `postStateDrift` empty —
the post-state carries exactly the submitted keys, the strategy's own tagline and
its own section keys. The fourth prints `honoured` or `NOT honoured`, which is
DL-8's open question.

**Write half — the ceremony end to end, on a throwaway:**

```bash
BATTLEGRID_API_KEY=bg_live_… BATTLEGRID_LIVE_WRITES=1 \
  npx vitest run tests/live/condition-write-probe.test.ts
```

Slot shuffle (park an unbound PRIVATE strategy) → fork a SYSTEM strategy that
defines conditions → describe adding `GC_PROBE_DRAFT` → apply → re-read → describe
removing it → apply → re-read → archive the fork → restore the parked strategy, in
a `finally`. Expect: the describe returns a proposal whose `listKeys` contain
`GC_PROBE_DRAFT`; after the apply the re-read carries that key, the revision has
moved, and **the tagline and section keys are unchanged** — the assertion that
proves the narrow intent did not cost the strategy an axis. A `drift` result at
any point throws rather than being worked around: a plan that would save
something else is exactly what must never reach an apply.

Never against the operator's own agents; every one of them is in
`FULL_EXECUTION`, and a strategy write reconfigures every bound agent
immediately.
