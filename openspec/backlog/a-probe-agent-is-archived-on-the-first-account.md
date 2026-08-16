---
id: a-probe-agent-is-archived-on-the-first-account
title: Probe residue recurs because the reuse fixture binds only the two files that call it
type: debt
status: open
priority: p3
created: 2026-08-13
updated: 2026-08-16
change: ""
capability: agent-authoring
github: "201"
blocked_by: []
tags: [battlegrid, live, harness, testing, housekeeping, probe-residue]
---

# A probe that creates an agent outside the fixture leaves it behind

## What

Read live on 2026-08-13 with the argument the product itself uses --
`list_intelligence_agents` with `statuses: ['ACTIVE', 'ARCHIVED']`,
`src/infrastructure/battlegrid/agent-adapter.ts:147` -- the operator's first
account holds fifteen agents. Three are ACTIVE (`Vanguard`, `Undertow`,
`Breakwater`), three are the operator's own archived agents (`THE .0`,
`Volatilis`, `Quadratorum`), and **nine are residue left by this repository's
own live walks**:

```
GC probe shape II                 GC probe renamed 1785332728782
GC probe 1315                     GC probe renamed 1785332866870
GC probe 1315b                    GC probe renamed 1785333064996
Grid-Commander probe (off)        Grid-Commander probe (off) 1785331191732
Grid-Commander probe (off) 1785331381166
```

**The surface has no delete.** `capabilities.canDelete` reads `true` on the
agent, but no tool on the 114 removes one -- `archive_intelligence_agent` is the
whole of cleanup, and `canDelete` describes BattleGrid's own app rather than this
client (findings-agents F-1). So none of the nine can be tidied from here at any
priority. Only the accumulation is ours to stop.

> **Corrected 2026-08-16 by the operator.** The `findings-agents` F-1 reading —
> that `canDelete: true` describes BattleGrid's own app — is **wrong**. There is
> no delete on the platform either. `canDelete` is answered by nothing, in any
> client, including BattleGrid's own. F-1 was right that it is a trap and wrong
> about where the door is: there is no door. **Every "ask the operator to delete
> them in the UI" below is struck.**

## Why it matters

p3, and p3 for two reasons rather than one: the residue is now the majority of a
surface the operator actually reads -- nine of the fifteen rows
`src/presentation/components/agent-roster.tsx:70` prints -- and it stays at p3
only because not one of the nine holds a slot, a deployment, or the ability to
trade.

- **They hold no radar slot.** [[an-archived-agent-is-shown-on-duty]] found that
  an archived agent keeps its deployments and still reads as scanning. None of
  these nine was ever deployed to a coin, so that failure mode cannot reach them.
- **They cost no agent slot.** Archiving is what freed the slot for the newest
  one: `used` went 3 -> 2 on archiving `Vanguard`, and back to 3 when `Vanguard`
  returned. Archived agents are not counted.
- **They cannot trade.** Every one reads `tradingMode: OFF`, and with no
  deployment none is on duty for a coin regardless.
- **They are rendered anyway.** `agent-roster.tsx:70` maps the roster with no
  status filter, so `/agents` prints all fifteen rows. Six are the operator's.
- **They have already cost an answer once.** `tests/live/proposal-probe.test.ts`
  originally took `agents[0]` and got a leftover; it filters
  `status === 'ACTIVE'` and is named `anEditableAgent` for that reason.

## Evidence -- the fixture exists, and it does not bind

`tests/support/probe-agent.ts` already does in code what the first version of
this item asked for in prose. `acquireProbeAgent` (`probe-agent.ts:137`) finds an
existing throwaway and reactivates it rather than minting one;
`releaseProbeAgent` (`probe-agent.ts:277`) archives it afterwards. It landed
2026-08-06 as the change `a-probe-reuses-its-throwaway-agent`.

**Two files call it**: `tests/live/write-probe.test.ts:13` and
`tests/live/proposal-probe.test.ts:14`. Nothing else does, and nothing requires
anything else to.

The dates say what that means. The five stamped names decode to 2026-07-29 --
`1785332728782` is 2026-07-29T13:45:28Z -- a week *before* the fixture existed.
`GC probe shape II` was created 2026-08-13, seven days *after* it, by a hand walk
answering [[confirm-agent-write-response-shape]] and
[[preset-custom-in-the-preset-branch-is-unestablished]] rather than by a probe
file.

So the recurrence is **one create, not eight**, and the fixture did not fail --
it was not on the path. A live walk conducted outside `tests/live/` reaches
`create_intelligence_agent` through the same adapter and meets nothing that would
route it to the fixture.

The names carry a second consequence. The fixture's prefixes are slot-scoped --
`GC probe write` and `GC probe proposal`, `probe-agent.ts:62` -- and not one of
the nine starts with either. `selectProbeAgent` can never choose them. They are
not a pool a future run will draw down; they are permanently inert rows.

## What would fix it

Four options. None is free, and the evidence does not pick one outright.

- **Widen the fixture and route every live create through it.** The fixture is
  written, unit-tested (`tests/support/probe-agent.test.ts`), and already visible
  to `tests/architecture/live-writes.test.ts:120`, which reads helper modules and
  attributes their write reach to any probe that calls them. Cost: it binds code
  only, and the create that produced `GC probe shape II` was a hand walk.
- **A teardown in the live suite that archives what it created.** Already built:
  `releaseProbeAgent` is that teardown, and both probes call it in a `finally`.
  Extending it buys nothing until something new creates, and asking a hand walk
  to run a teardown is the same convention-in-prose that failed here.
- **A test that reads the roster and fails when residue exceeds a threshold.**
  This is **the only one of the four that would have caught this recurrence**;
  the other three prevent creates that pass through them, and this create did
  not. It is also the only one that **cannot run in the ordinary suite** -- it
  needs a real roster from a real account, so it lives in `tests/live/` behind
  the same opt-in as every other probe and runs when someone runs it. And it can
  only ever report: with no delete on the surface, it cannot clean up.
- ~~**Ask the operator to remove them in BattleGrid's own UI.**~~ **Struck
  2026-08-16 — this route does not exist.** The operator confirms BattleGrid
  offers no delete on its own platform. Nothing reduces the count, anywhere.

**Cheapest against what already exists: the residue test.** `tests/live/` holds
thirty-one probe files with an established opt-in and a skip-with-a-reason
convention, and a roster read is one call with no write and no confirmation -- so
it costs a file and no new machinery. It is also the weakest of the four, because
it reports rather than prevents. The strongest pairing available is the residue
test plus routing `tests/live/` creates through the existing fixture. Neither
reaches a hand walk, and nothing in this repository can.

## Notes

**A convention written in a backlog item is not reachable from the code that
would have to honour it.** This item's first version closed by advising the next
probe to reuse `GC probe shape II`. The advice was unreachable from any create
that would have had to honour it, and the create that did happen was a hand walk
-- which no fixture, teardown, or test here can reach either. That is why the
section above states what each option cannot do instead of naming a plan.

**Settled: it is one account, and this item's title names the wrong one.**
`get_account_state` on the credential every live read in this session used
answers `username: "Fibonacci"` -- which is the account
[[probes-have-littered-the-second-account]] surveyed and named on 2026-08-06.
The eight names besides `GC probe shape II` are that item's eight, byte for
byte, epoch stamps included. Display names carry millisecond stamps, so two
accounts cannot hold the same eight by coincidence.

So there is **no seventeen**. There are nine pieces of residue on one account:
the eight already filed and closed on 2026-08-06, plus `GC probe shape II` from
the 2026-08-13 hand walk, which is the one this item was actually filed for. The
`first account` in the id and title is unevidenced -- every roster read on
2026-08-13 was Fibonacci, and `GC probe shape II` is sitting on it beside the
other eight. The id is left alone because renaming the file would break the
wikilink; the title no longer makes the claim.

That also narrows what recurred. The eight predate the fixture and are closed.
One agent has been left behind since it landed, by a hand walk. The pattern is
real and the rate is one, not eight.

## 2026-08-13 -- filed at one, re-read at nine, and eight were already filed

The delta is the finding. This item was filed naming a single agent and priced as
one dead row. The first check passed `includeArchived: true`, which the tool
rejects, then read the default response -- three ACTIVE agents -- and concluded
the rest was uncheckable. The argument name was guessed rather than read off the
adapter that already calls the tool correctly (`agent-adapter.ts:147`). Re-read
with `statuses: ['ACTIVE', 'ARCHIVED']`, the answer was nine. Same defect as
reading `logs` where the payload says `entries`: the probe looked adjacent to
what it claimed to measure.

## Re-counted 2026-08-16 — the residue grew, and that is the finding

Read live at v19.1.0, `list_intelligence_agents` with
`statuses: ['ACTIVE','ARCHIVED']`. **Sixteen agents: 3 ACTIVE, 13 ARCHIVED.**

Three archived are the operator's own (`THE .0`, `Volatilis`, `Quadratorum`).
**Ten are this repository's residue — up from nine on 2026-08-13:**

```
Probe 238 Dedupe                              <- NEW since 2026-08-13
GC probe shape II
GC probe 1315                    GC probe 1315b
Grid-Commander probe (off)
Grid-Commander probe (off) 1785331191732
Grid-Commander probe (off) 1785331381166
GC probe renamed 1785332728782
GC probe renamed 1785332866870
GC probe renamed 1785333064996
```

**`Probe 238 Dedupe` is the whole point.** This item's claim was that the reuse
fixture binds only the two files that call it, so anything routing around it
leaves residue behind. Three days later there is one more, named after a
different probe than any already listed. The claim is now demonstrated rather
than restated.

That shifts the four options rather than just re-pricing them:

- An **account-side sweep** now has ten to clean, not nine, and the count is
  still moving.
- A **code-side binding alone** would not have prevented this one unless it also
  covers whatever created `Probe 238 Dedupe` — so "widen the fixture" must name
  that path before it can be claimed as sufficient.

Slot pressure is unchanged: `slotUsage` reads `limit 3, used 3, remaining 0`,
which counts ACTIVE only. The residue costs roster legibility, not capacity.


## 2026-08-16 — the open question is answered, and option 3 is taken

**"Widen the fixture must name that path" — there is no such path.**
`Probe 238 Dedupe` traces to `openspec/JOURNAL.md`: an **operator-authorized
hand walk** for the #238 dedupe probe, which archived `Vanguard` to free a slot,
created the agent with `tradingMode: OFF` carrying
`idempotencyKey: gc-probe-238-key-alpha`, archived it, and reactivated
`Vanguard`. `grep` finds no test file naming it, and only two files in the
repository call `acquireProbeAgent` — neither created this.

So both recurrences this item records were hand walks reaching
`create_intelligence_agent` through the adapter. **Options 1 and 2 cannot be
made sufficient**, because there is no code path to bind. That was the last
thing holding the choice open.

**Option 3 is taken**: `the-roster-says-when-residue-grew` (lite) adds
`tests/live/residue-probe.test.ts`.

**The design decision worth carrying forward.** The probe classifies **by
exclusion, not by prefix**. The nine residue agents known before today share
`GC probe` and `Grid-Commander probe`; the tenth is `Probe 238 Dedupe` and
shares neither — so a prefix match would have missed *precisely the create this
item was re-filed for*, which is this repository's characteristic defect. The
probe instead holds a six-name allowlist of the operator's own agents and treats
every other row as residue, with a vacuity guard that reports a stale allowlist
as a different failure from a new throwaway.

**Re-measured while writing it**, over the connector at v19.2.0:

```
16 agents | 6 the operator's | 10 residue, every one ARCHIVED, tradingMode OFF
slotUsage limit 3, used 3, remaining 0   (ACTIVE only — residue costs no slot)
```

Unchanged from this morning's count, so the threshold is 10.

**This item stays open, and the `change:` link is cleared on archive** — the
change's scope was the tripwire alone, not the residue.

**And there is no remaining action, because the count cannot fall.** The operator
confirmed on 2026-08-16 that BattleGrid offers **no delete on its own platform**,
so the plan written here — ask them to clear the ten in the UI — describes a
route that does not exist. All ten are archived, `archive_intelligence_agent` is
the whole of cleanup in every client, and `capabilities.canDelete: true` is
answered by nothing anywhere.

**So the residue is permanent and monotonic.** The tripwire is not the cheapest
of four responses, it is the *only* one, and `RESIDUE_AT_LAST_COUNT` is a floor
that can never be lowered — raising it records a new leak, never a cleanup. What
this item is for now is preventing the eleventh.
