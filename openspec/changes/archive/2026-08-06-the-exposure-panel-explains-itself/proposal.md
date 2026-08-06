# Proposal: The Exposure Panel Explains Itself

## Why

`a-failed-read-explains-itself` swept twenty-eight unreadable branches onto the
shared `WhyNotLoaded` sentence and wrote down four exemptions. Three of them are
arguments — a queue read from our own database, a prompt page whose only failure
is the proposal store, a contract check on a column being typed right now.

The fourth is not an argument. It is a deferral, and it says so:

> Owed, and deferred rather than denied. … it was simply out of scope where the
> rest of the sweep happened.

That is `src/presentation/components/exposure.tsx  (exposure)`, tracked as
`the-exposure-panel-still-prints-its-reason`. The panel renders

```
What this agent is holding could not be read: {exposure.reason}
```

and stops. `the-outage-explains-itself` already fixed the reason at the
boundary, so the sentence a user reads is accurate as far as it goes. What a
reason cannot carry is the other two things: the **subject-specific
reassurance**, and the **refused-versus-unreachable** branch, which reads the
`cause` the adapter carried out rather than re-deriving it from the words of a
message.

This is the panel where that costs the most. It is the one that says what the
agent has at stake — open positions, margin, unrealized result — so a blank
where money should be is the place in this product where a reader is most likely
to conclude something was closed out. And the two causes send an operator to
opposite actions: a refused credential is fixed by reconnecting, an outage by
waiting, and neither is legible from the reason alone.

## What Changes

- The unreadable branch of `Exposure` renders `WhyNotLoaded` beside the reason,
  with the cause read from the result. `AgentExposure`'s unreadable arm already
  carries a `FailureCause`, so nothing widens — this is one component edit.
- **The subject is `this agent’s positions are`**, forming: *"This does not mean
  this agent's positions are gone — Grid-Commander could not reach BattleGrid to
  ask."* Four reasons it is that and not the backlog's first sketch,
  `these positions are`:
  - It completes the sentence. The subject carries its own verb, which is the
    defect two shipped surfaces had — "this does not mean this agent's limits
    gone" — and the guard now reads back.
  - **Nothing is listed on this branch.** "These positions" is a demonstrative
    with no referent: the list it would point at is the thing that failed to
    load. Naming them as the agent's names what was being read.
  - It is the wording `/explorer` already uses for a stranger's holdings
    (`this agent’s positions are`). The same failure on two surfaces must not
    read as two different facts.
  - The reassurance stays about the read. A position is a live market fact that
    genuinely can cease to exist between the read and the page, so this is the
    one subject where "gone" could be misread as a claim about the market. The
    sentence only ever denies that the *failure* is evidence — and the reason
    line above it, which says "could not be read", stays exactly where it is so
    the two are read together.
- The declared exemption leaves `tests/architecture/failure-is-explained.test.ts`.
  The guard checks exemptions in both directions, so it fails until the entry
  goes — which is the intended way to be reminded.
- `tests/rendering/exposure.test.ts` asserts the sentence on the unreadable
  branch, in both causes, against the rendered page rather than the source.

## Why No Delta Spec

`app-access` already requires this, in the requirement that change added — **A
Failed Read Says What It Does Not Mean**: where a surface renders a read that
produced nothing, it states what the failure does not establish, names the cause
the read carried out, and names its subject.

The exposure panel is such a surface. What let it stand was the requirement's own
exemption clause — "where a surface should not carry the sentence, the exemption
SHALL be stated and checked" — and the entry filed under it was a deferral, not
a claim that the sentence does not belong here. Deleting it makes a stated
exemption unnecessary; it does not change what the product promises. Nothing is
ADDED, MODIFIED or REMOVED, so this ships `skip_specs: true` on the `lite`
track. The behavior is already covered by that requirement's scenarios —
*A read that could not reach the platform*, *A read the platform refused*, and
*The subject of the reassurance* ("the sentence it forms is grammatical").

## Out of Scope

- **The other three exemptions.** Each is an argument someone made and none is
  weakened here.
- **Everything the panel renders when the read succeeds.** No figure, no
  ordering, no wording on the readable branch is touched.
- **The reason itself.** It stays verbatim above the new sentence; it is the
  only specific information there is.
- **The audit table's repeated paragraph**, still open on
  `an-unreadable-branch-need-not-explain-itself`. A presentation question about
  the same sentence, on a different surface.

## Impact

One component (`src/presentation/components/exposure.tsx`), one entry out of the
guard's exemption list, one rendering test extended, and
`the-exposure-panel-still-prints-its-reason` linked to this change.

## Capabilities

**Touched, not changed**: `app-access` — brings one surface into compliance with
a requirement already in the source of truth. No delta.
