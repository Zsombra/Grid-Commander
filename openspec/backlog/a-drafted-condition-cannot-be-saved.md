---
id: a-drafted-condition-cannot-be-saved
title: A drafted condition can be tried and not saved — the write path, and what must be observed first
type: feature
status: done
priority: p2
created: 2026-08-06
updated: 2026-08-06
change: "a-drafted-condition-can-be-saved"
capability: strategy-authoring
blocked_by: [an-update-that-omits-conditions-is-unobserved]
tags: [battlegrid, conditions, authoring, write-path]
---

# The half `a-drafted-condition-can-be-tried` deliberately left out

`/strategies/[id]/conditions` composes a condition and has BattleGrid resolve it
against live market state. It cannot save one, and says so on the page. This is
the other half.

## What

An operator who has drafted a condition and seen how it resolves should be able
to add it to the strategy, change one the strategy has, or remove one.

## Why it was left out

Not appetite — three facts about the platform, recorded in that change's
proposal and repeated here so this item stands alone:

1. **No per-condition tool exists.** All 110 probed tools, 2026-08-06: nothing
   writes a condition. The only path is `compile_strategy_plan` (UPDATE) →
   `apply_strategy_plan`, which submits the strategy's **whole** condition list
   inside a post-state carrying its sections, thresholds and tagline, and
   reconfigures every bound agent atomically.
2. **`an-update-that-omits-conditions-is-unobserved`** — whether the compiler
   preserves conditions a request did not name is unknown, and the answer
   decides both whether this write is safe and whether today's edit page is.
   Blocking, hence `blocked_by`.
3. **`the-record-flattens-the-condition-union`** — the offline conformance guard
   cannot hold a composed condition payload, so the check that caught the sixth
   dead write path would not catch a seventh here.

## What the write needs when it is taken

**The ceremony is `describe → confirm → perform`, and the confirmation binds the
values.** `src/application/use-cases/retune-rule.command.ts` is the closest
precedent: it binds `strategy:<id>@r<revision>/rule:<signalId>#<digest of the
values>`, so an agreement about allocation 1 cannot authorise allocation 3. That
binding — the values inside the target, built only by `confirmationTarget` — is
what stops an agreement about one thing authorising another.

A condition write binds over the **whole composed condition list**, because that
is what the platform takes. `confirmationTarget.strategyPlan(strategyId,
intentDigest)` already exists for this pipeline and is what the existing
compile → review → apply flow uses; the digest is the compiler's own, carried on
the plan, so nothing here needs a second opinion about which bytes are the
intent.

Three things the describe must state, none of which the retune describe needs:

- **What the whole list would become**, not just the condition being changed. A
  list is submitted whole, so the blast radius is every condition, and a
  describe naming only the edited one would understate what is being agreed to.
- **Which conditions reference the one being changed or removed.**
  `unresolvedReferences` in `src/domain/strategy/condition.ts` already computes
  the dangling set; removing `FLOW_UP` while `FULL_SEND_DOWN` negates it leaves
  a rule nobody can evaluate, and the operator must see that before agreeing.
- **The bound agent count**, as every strategy write already does — changed axes
  propagate immediately and open positions do not block the edit.

## What already exists to build on

- `serialiseCondition` / `composeForResolution` (`src/domain/strategy/condition-draft.ts`)
  — the domain shape to the platform's declared wire shape, refusing any form
  the mapper read as unrecognised rather than guessing one
- `tests/strategy/condition-draft.test.ts` — the serialiser held against
  BattleGrid's own declared schema, every branch
- `/strategies/[id]/conditions` — the composer and the live resolution, which
  is the describe's natural neighbour: an operator should see how a condition
  resolves before agreeing to save it

## Notes

A drafted condition that has been resolved is a draft whose serialisation the
platform has already accepted structurally — the preview and the compiler take
the same grammar. So the compose-and-try surface is not a detour on the way to
this; it is the part of it that could be shipped honestly first.
