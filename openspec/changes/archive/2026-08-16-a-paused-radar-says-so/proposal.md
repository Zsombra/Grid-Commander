# A paused radar says so

## Why

The product tells this operator their agents are scanning markets that no radar
is serving, and has been doing so for at least three days.

`app/(app)/agents/[id]/page.tsx` renders, per deployment:

```
On duty: scanning ${d.coinTicker} on the ${d.timeframe} radar.
```

`list_radar_deployments` returns a `summary` beside `policies`, and
`src/infrastructure/battlegrid/radar-adapter.ts:36` reads
`payload['policies']` and nothing else. `summary` is discarded at the adapter,
and `grep -rn "paused\|Paused\|PAUSED" src/ app/` returns **zero** matches: no
layer of this product has any representation of a paused radar.

Three sessions have recorded the live account as `radarPaused: true`,
`platformPaused` 20 of 20 deployed coins, and `lastFireAt` frozen at
2026-08-13T18:01:18Z (`openspec/JOURNAL.md`, 2026-08-15 (reconcile) and (keyed);
`openspec/backlog/approvals-have-no-write-side.md` carries three sweeps).

Backlog item `a-paused-radar-is-rendered-as-on-duty`, issue #311, p2.

**This is the mistake that section already learned half of.** Its own comment
reads:

> ACTIVE means configured; only a radar deployment means scanning. The
> operator's account proved it: two ACTIVE agents, zero positions, absent from
> every slot, and nothing on this page said so.

The rule needs one more clause: a deployment means scanning *unless the radar is
paused*. `An Agent's Standing Is Read Against Its Lifecycle, Not From The Radar
Alone` (spec:81) is the same requirement one input short.

## What

Read `summary`, carry the pause through, and stop asserting activity the
platform says is not happening.

### The shape, read from the declaration rather than assumed

`summary` is in the tool's top-level `required` beside `policies`, and all
fourteen of its fields are required within it. It is a **status histogram over
deployments** — `coinsDeployed`, `scanning`, `idle`, `warming`, `sittingOut`,
`needsAttention`, `paused`, `platformPaused`, `blocked`, `onDutyNow`,
`inPosition` — plus `agentsActive`, `coinCap`, and one boolean, `radarPaused`.

Two of those are the subject:

- **`radarPaused`** — `boolean`. The radar itself.
- **`platformPaused`** — **`number`**, not a flag. How many deployed coins the
  platform has paused.

The item filed these as two comparable flags and asked "which pause wins the
sentence". That was the wrong question, and reading the declaration before
building is what corrected it (noted on #311).

### Where the pause has to live

`policies[].resolvesNow` carries **no** per-deployment pause field — its keys
are `section`, `isIdle`, `rotating`, the on-duty and open-position agent
triples, the matched-slot triple, `regimeUsed`, `regimeConviction`, `reason`,
`qualified`, `qualificationBlock`, `cooldownUntil`, `lastFlipAt`, `lastFireAt`,
`blockedReason`, `blockedSince`.

So the pause is knowable **only at fleet level**, and a per-row sentence derived
from `resolvesNow` is asserting something the row cannot know. The fleet fact
has to travel to the section and qualify every row under it.

### In scope

1. Map `summary` into a domain `RadarPause` at the adapter.
2. Carry it on `RadarReadResult`, through `ReadDeploymentsQuery`, to **all
   three** consumers — the agent page, the roster, and `src/mcp/tools.ts`,
   which serves this to a model that would act on the same false premise.
3. Qualify the standing sentences: a paused radar is stated, and no row claims
   to be scanning under one.
4. Say which pause it is — the radar off, or N deployments the platform paused.

### Not in scope

- No new platform call. `list_radar_deployments` is already read on every
  surface that would show this.
- No unpause affordance. The product does not write the radar's pause state,
  and this change does not begin to.
- The other twelve `summary` counts are mapped but only the pause is rendered.
  A fleet dashboard is a different change; this one is about a false sentence.

## Decisions

**D-1 — Absent maps to `null`, never to `false` or `0`.** A radar read that
omits `summary` is a read that did not answer, not a running radar. This is the
`=== true` mistake #285/#287 already paid for on `regimeAutoDerive`, where the
mapper turned platform silence into a confident `false`. `radarPaused` is
`boolean | null` and every count is `number | null`, and the surface renders
nothing about the pause where it is `null` rather than "not paused".

**D-2 — The two are never collapsed.** `radarPaused: true` and
`platformPaused: 17` are different facts with different remedies — one is the
radar being off, the other is the platform having paused specific deployments.
A surface that reduced them to "paused" could not tell an operator which, and
therefore could not tell them whether anything on their side would help.

**D-3 — The row keeps its own truth; the section carries the pause.** The
standing sentences stay derived from `resolvesNow`, because that is what the
platform says about each row. What changes is that they no longer read as
claims about *activity* while the radar is paused. Rewriting each row's
standing from a fleet-level flag would make the row say something the platform
did not say about it — the failure `A Resolution State The Product Does Not
Recognise Is Named, Never Interpreted` (spec:209) exists to prevent.

## Capabilities

- `agent-deployment` — ADDED: the pause is read and stated; MODIFIED: standing
  is read against the radar's pause as well as the agent's lifecycle.

## Track

`standard`. One mapped field and its presentation, reversible, no migration, no
new call, no confirmation path touched. It reaches three consumers and a port
signature, which is what keeps it off `lite`.
