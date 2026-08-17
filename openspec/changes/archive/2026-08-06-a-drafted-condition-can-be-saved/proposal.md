# A drafted condition can be saved

## Why

`a-drafted-condition-can-be-tried` (2026-08-06) shipped half of authoring:
`/strategies/[id]/conditions` composes a condition and has BattleGrid resolve it
against live market state. It cannot save one, and says so on the page. This is
the other half — add a drafted condition to the strategy, change one the strategy
has, or remove one.

**The blocker cleared.** `an-update-that-omits-conditions-is-unobserved` was
settled live on 2026-08-06 with `compile_strategy_plan`, which performs no write,
against a user-owned fork carrying two conditions:

```
BEFORE  rev=4  conditions=2  [ALL_AGREE_UP, ALL_AGREE_DOWN]
postState.conditions: 2 entries [ALL_AGREE_UP, ALL_AGREE_DOWN]
AFTER   rev=4  conditions=2   (compile wrote nothing)
```

The compiler fills `postState` from the stored strategy. An update that omits
`conditions` does not clear them — so today's edit page has not been silently
erasing conditions on every tagline change, and an update that names *only*
`conditions` is a coherent, narrow request.

## The fact the whole design answers to

**There is no per-condition tool.** All 110 probed tools, 2026-08-06: nothing
writes a condition. The only path is `compile_strategy_plan` (UPDATE) →
`apply_strategy_plan`, which submits the strategy's **whole** condition list
inside a post-state carrying its sections, thresholds and tagline, and
reconfigures every bound agent atomically.

So an operator who asks to add `FLOW_UP` is in fact asking to resubmit every
condition the strategy has. Everything below follows from that.

## What changes

1. **A condition can be added, changed, or removed** — through
   `describe → confirm → perform`, on `/strategies/[id]/conditions/save`. The
   describe reads the strategy fresh, composes the whole list, has BattleGrid
   compile it (a read: `readOnlyHint: true`, no write), and mints the
   confirmation the confirm form spends. The perform is the existing
   `ApplyPlanCommand`; the confirmation is the existing
   `confirmationTarget.strategyPlan(strategyId, intentDigest)` — the compiler's
   own digest, carried on the plan, so nothing here needs a second opinion about
   which bytes are the intent.

2. **The describe states three things the retune describe does not have to.**
   - **What the whole list would become**, key by key, read off the array that is
     actually sent. The blast radius is every condition, and a describe naming
     only the edited one would understate what is being agreed to.
   - **Which references the edit would strand.** `unresolvedReferences` already
     computes the dangling set; removing `FLOW_UP` while `FULL_SEND_DOWN` negates
     it leaves a rule nobody can evaluate. The set the strategy *already* cannot
     resolve is subtracted — it is a property of the strategy, reported where the
     strategy is read, and attributing it to this edit would overstate the
     consequence in the one place someone is deciding whether to proceed.
   - **The bound agent count**, as every strategy write does. The platform's own
     count when the plan carries one; the strategy's own, labelled as such, when
     it does not — never silence.

   All three are part of the text the token is issued against, not merely
   rendered beside it, so the audit can prove what was agreed to.

3. **The compiled post-state is read back before anyone is asked to agree.**
   The finding above says an omitted field is filled from the stored strategy.
   Rather than carrying that forward as an assumption, every condition write
   re-establishes it: `postStateDrift` compares the plan's post-state against
   what was submitted — the condition keys in order, the tagline, the section
   keys as a set — and a plan that would save something this edit never named is
   refused as its own outcome rather than described. Compiling writes nothing, so
   this is free, and it is the only moment the product can see what its omissions
   actually did.

4. **The two halves stay two acts.** The composer still writes nothing and still
   says so. A tried draft reaches the write as the query it was tried under, so
   what is saved is what was resolved, read back by the same parser — and the
   describe runs *then*, against the strategy as it is *then*.

## What is deliberately out of scope

- **Editing thresholds, tagline, sections from this surface.** They have one,
  and the intent this write composes names neither. A builder taking all of them
  would let a caller compose the payload nobody has observed.
- **A local no-op check.** The retune describe refuses a change that changes
  nothing because it has no dry run; this one compiles first, and the compiler's
  own answer is better than a guess about equality between a re-serialised draft
  and a stored object. See DL-5.
- **Refusing a dangling reference.** Shown, never blocked — whether BattleGrid
  accepts one is its ruling, and pre-judging replaces its teaching with ours.
- **Composing nesting deeper than one group.** Unchanged from the try surface;
  a draft seeded from an existing condition still carries any depth.
- **A conformance case for the composed payload in `payload-conformance.test.ts`.**
  The probed record still flattens the recursive `definition` union
  (`the-record-flattens-the-condition-union`), so a case there would fail against
  correct code. The payload is held against BattleGrid's own *declaration*
  instead, where the full union survives.

## Capabilities

`strategy-authoring` — three ADDED requirements, one per property a later edit
could quietly remove, and one MODIFIED.

The MODIFIED is `A Drafted Condition Can Be Tried Without Being Saved`. Its last
clause said a user who has tried a draft *SHALL NOT be able to reach a save from
the same act*. That was written when no save existed, and it protected two
things: that trying never writes, and that nobody is one click from a fleet-wide
change. The first is unchanged and restated; the second is now carried by the
ceremony rather than by the absence of a link — the save is a separate request,
against a fresh read, with its own describe and its own confirmation. Narrowing
the clause rather than leaving it and quietly linking past it is the point of
having it.

## Track

`full`. A write that reconfigures every agent bound to a strategy atomically, on
a tool the platform flags destructive, composed from a list submitted whole —
hard to reverse and wide by construction. It also rests on a platform behaviour
established once, which is exactly the kind of claim a decision log exists to
record and a production gate exists to test.
