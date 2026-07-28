# Proposal: Author BattleGrid strategies

## Why

A strategy owns what an agent reads and how it reasons. `author-agents` deliberately
stopped at *choosing* one, and that leaves the product able to configure an agent's
name, brain and money limits while the thing that actually decides its trades is
untouchable. This is where the workbench becomes a workbench.

It is also, by a distance, the most dangerous change in the MVP. **Editing a
strategy reaches every bound agent immediately.** The live account has a strategy
with five agents bound to it and another with four; a single apply reconfigures
all of them at once, and open positions are reported for awareness and *do not
block the edit*. Nothing built so far has a blast radius larger than one object.

BattleGrid's own design anticipates this, and the shape it chose is the reason
this change is worth doing carefully rather than quickly: strategy authoring is
not a setter. It is **compile → review → apply**, where compile writes nothing
and returns a complete post-state plus a digest-bound token that expires in five
minutes, and apply re-derives everything server-side and refuses anything that
does not match. The product's job is to make that asymmetry visible instead of
presenting two similar-looking buttons.

## What Changes

- A user browses strategies — the twelve SYSTEM personas and their own — each
  showing how many agents are bound to it.
- A user forks a strategy to get a private variant they can edit.
- A user composes an edit and **compiles** it, which changes nothing and returns
  what would happen: the diff by axis, whether it is viable, what it would break,
  and how many agents it would reach.
- A user reviews that and **applies** it, behind a confirmation issued against
  the plan the server compiled and naming the blast radius.
- An expired, superseded or foreign plan is refused with a reason the user can
  act on, rather than submitted and rejected.
- A user archives and restores a strategy.
- Every value the compiler needs — categories, metrics, transforms, signals,
  column contracts — is discovered from the platform, never written down here.

## Capabilities

**New**: `strategy-authoring` — how a user browses, forks, edits, reviews,
applies and retires the strategies that drive their agents.

## Out of Scope

- **Anything that spends.** Unchanged.
- **A visual section editor.** Composing report sections is a design problem of
  its own; this change delivers the pipeline and an honest form over it.
- **`update_strategy_signal_rule`.** A focused single-rule write that bypasses
  compile → review → apply. It exists and it is the wrong default: a second write
  path with weaker review, offered beside a stronger one, is how the stronger one
  stops being used. Deferred deliberately, not overlooked.
- **Deployment and scheduling.** `mcp:wager` territory.
- **Backtesting.** The eventual point of the product, and a change of its own.

## Impact

The first change whose failure mode is plural. Everything before it could damage
one agent's configuration; this can reconfigure a fleet in one action, and the
platform will not stop it because from the platform's side it is a legitimate
edit.

Three properties of the pipeline have to survive into the product intact, and
each is easy to lose:

1. **Compile is free of effect and apply is not.** If the interface makes them
   look alike, the safety the platform designed is gone.
2. **`approvedPlan` is not the plan.** Handing back what compile returned is an
   unknown-key error — the plan is a projection of it, with two renames and seven
   omissions (`findings-strategies.md` F-2).
3. **`mismatches` are advisory.** Treating a non-empty list as a blocker would
   make ordinary edits impossible; `viability.viable` is the gate (F-5).

The plan token turns out to be a readable envelope carrying its own expiry,
owner and revision (F-1). That allows a local refusal with a real reason — used
only to refuse, never to permit, because the signature cannot be checked here.
