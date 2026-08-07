---
id: forking-a-name-that-exists-is-a-500
title: fork_strategy answers INTERNAL_ERROR when a strategy of the fork's name already exists
type: risk
status: open
priority: p2
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: strategy-authoring
blocked_by: []
tags: [battlegrid, fork, platform-defect, refusal]
---

# A duplicate fork name is a 500, not a refusal

`fork_strategy` names the new strategy `<parent> (fork)`. When a strategy of
that name already exists on the account, the platform answers:

```
INTERNAL_ERROR   Internal server error
```

Established live 2026-08-06, on account 1, by isolating the variables:

| source | forks of that name already on the account | result |
|---|---|---|
| `Dunkirk` | **22** | `INTERNAL_ERROR` — twice, minutes apart |
| `Leningrad` | 0 | **OK** — `Leningrad (fork)` r1, all 8 conditions |
| `Tobruk` | 0 | **OK** — `Tobruk (fork)` r1, all 5 conditions |

Same account, same session, same slot state. The only variable that moves is
whether the name is taken.

## It is not the quota, which refuses properly

The obvious explanation was the strategy cap, and it is ruled out — the cap has
its own clean refusal:

```
VALIDATION_ERROR   Strategy limit reached — you can have at most 25 active strategies.
```

`list_strategies` also publishes `quota: {used: 25, limit: 25, remaining: 0}`.
Both 500s happened with a slot deliberately freed first.

## Why it matters here

**It is a refusal wearing the wrong clothes.** This product classifies platform
answers by their `code` — `ToolRefusedError` carries it, and every surface
decides between "BattleGrid declined" and "BattleGrid broke" on that basis. A
duplicate name is a thing the operator can fix by choosing another name; an
`INTERNAL_ERROR` is not, and this product will correctly render it as the
platform being unwell, because that is what the platform said.

So an operator who forks a strategy they have already forked is told the server
is broken. Nothing in Grid-Commander can improve on that without guessing at a
cause the platform did not state — and guessing is the wrong fix.

**And it degrades any repeated automation.** Each run leaves behind the name
that breaks the next one. The live condition-write walk failed exactly this way
before its source selection was changed to skip taken names.

## What has been done

`tests/live/condition-write-probe.test.ts` now picks a SYSTEM source whose
`<name> (fork)` is not already present, with the reasoning at the selection
site. That makes the walk reliable; it does not make the platform behaviour
right.

## What is left

- **Report it to BattleGrid.** A duplicate-name conflict should be
  `VALIDATION_ERROR` or `CONFLICT`, both of which the server already uses well
  elsewhere — the revision check answers `CONFLICT` with
  `{expectedRevision, actualRevision}`, which is exactly the right shape.
- **Decide whether `fork_strategy` should take a name.** It accepts an optional
  `name`, so a product surface offering a fork could ask for one and avoid the
  collision entirely. This product does not offer forking with a name today.
- **Do not add a pre-check.** Counting existing names before forking would be
  this product enforcing a constraint the platform owns and has not published,
  and it would be wrong the moment BattleGrid allows duplicates or changes the
  naming rule.

## Evidence

Direct MCP calls, 2026-08-06, both accounts' key handling unchanged. The
duplicate-name run and the two clean runs are in the same session, minutes
apart. Cleanup verified: every probe fork archived, every parked strategy
restored.

## Product-side half: landed (2026-08-07)

The fork can be named — change `the-copy-can-be-named`. The fork form offers
an optional name (blank keeps the platform's `<parent> (fork)`, and the page
says so; the reason to name is stated only as telling copies apart, with no
claim about avoiding errors, since a colliding *chosen* name has never been
probed). `ForkStrategyCommand` threads the name; the adapter sends it only
when non-blank, against the declared 1–50 bound. A refused fork is now a
result rather than a crashed action: the platform's answer — this
`INTERNAL_ERROR` included — renders on the fork form in the platform's own
words with the typed name preserved, unre-diagnosed. No pre-check against
existing names was added, per this item.

The platform defect itself stands, so this item stays open: **reporting it to
BattleGrid remains.** A duplicate-name conflict should be `VALIDATION_ERROR`
or `CONFLICT`, as above.
