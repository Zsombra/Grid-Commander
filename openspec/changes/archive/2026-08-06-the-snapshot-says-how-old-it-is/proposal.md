# Proposal: The Snapshot Says How Old It Is

## Why

`list_user_active_positions` answers with its own instruction to the client:

```json
{"pricingStatus": "LIVE", "generatedAtMs": 1786038921702, "refreshIntervalMs": 10000}
```

Ten seconds. Every surface in this product is a server-rendered snapshot, and
`/agents/[id]` is the one whose numbers move that fast — mark price, unrealized
P&L, ROE, on a **5× leveraged** position where a 1% move against is 5% on
margin.

`what-it-holds-and-what-it-could-not-place` shipped the right floor. The panel
says when it was priced and calls itself *"a snapshot, not a live ticker"*, so
nothing on it is false. What it leaves the reader is arithmetic:

```
Priced 2026-08-06T17:55:21.702Z — a snapshot, not a live ticker.
```

An operator who opened that page and has been reading it for four minutes sees
the identical sentence they saw a second after it loaded. The timestamp is a
fact about the past; *staleness* is a relation between that fact and now, and
the page has never stated it. Twenty-four refreshes out of date and one second
out of date render byte-for-byte the same.

Filed as `a-priced-position-goes-stale-while-you-read-it`, which listed four
options and chose none.

## What Changes

**Both of the two options the backlog left live**, because they answer
different halves of one question and each is incomplete alone. The age says
*how stale*; the re-read is the only thing the reader can do about it. An age
with no affordance is a complaint; an affordance with no age is an action with
no reason to take it.

- **The age is stated beside the timestamp, not instead of it.**
  *"Priced 4 minutes ago, at 2026-08-06T17:55:21.702Z — a snapshot, not a live
  ticker."* The age is the reading; the stamp is the fact, and it stays because
  the age rounds down and the stamp is what makes the rounding harmless.
- **The panel offers a re-read** — `Read these figures again`, an ordinary `<a>`
  back to `/agents/[id]`. Full page load, server render, fresh read. No client
  JavaScript, no new component kind, nothing that could be mistaken for the page
  updating itself.
- **The clock comes through `Clock` (`src/ports/clock.ts`).**
  `ReadExposureQuery` takes it as a constructor dependency — the shape
  `ReadProposalsQuery` already uses to decide which proposals are stale — and
  emits `pricedAt` on the holding view. The component formats an `ageMs` it is
  handed and reads no clock of its own. `Date.now()` in a server component is a
  render that cannot be pinned, and this repo has already paid five days for one
  flaky fixture.
- **Two states that are not an age**, kept apart from it rather than folded in:
  a read carrying **no** `generatedAtMs` (the platform said nothing — the panel
  currently renders no line at all here, so the snapshot disclaimer disappears
  on exactly the read that most needs it), and a stamp **later than this
  server's clock** (two machines, two clocks; the age is negative and
  unstatable, so the stamp is shown and no age is claimed).
- **A guard in `tests/architecture/boundaries.test.ts`**: nothing that renders
  reads the clock directly. The rule is the reason the port exists, and it was
  enforced by nobody.

## What Was Rejected

- **Auto-refresh the section.** It would need the first client component in the
  product beyond `SectionNav` — which earns its `'use client'` on `usePathname`
  and says so. This product renders on the server on purpose. A polling panel is
  a real architectural change, and it would buy a page that is *nearly* live,
  which is a worse thing to hand an operator than a page that is honestly a
  photograph.
- **Say nothing more.** Defensible while the product offers no action against an
  open position — there is no close, no reduce, no move-stop, so no decision here
  turns on freshness. But the cost of stating the age is one injected clock and
  one sentence, and "the reader can refresh" is an argument that the reader
  should do the work the page could do for them.
- **Mapping `refreshIntervalMs`.** It is in the payload and it is the evidence
  for this whole item, and it is still not mapped. The panel would only be able
  to say *"BattleGrid asks for a re-read every 10 seconds"* — a number about the
  platform's advice, next to a number about this page's actual staleness. The
  second one is the one that matters, and the backlog's own first step said
  neither option needs a new read.

## Capabilities

**Modified**: `agent-understanding` — one requirement, *What An Agent Is Holding
Right Now Is Shown Where The Agent Is Read*, whose last paragraph already owns
this ground (*"The time the position was priced SHALL be stated … a rendered
page is a snapshot and SHALL NOT present itself as live"*). MODIFIED rather than
a new ADDED requirement: an added one would leave two requirements governing the
same sentence on the same panel, and the honest description of this work is that
the existing paragraph was too weak, not that a second obligation was discovered.

## Out of Scope

- **The `flat` and `unreadable` branches.** Neither has figures that can go
  stale; the unreadable one already explains itself through `WhyNotLoaded`, and
  a retry affordance there is a different question about a different failure.
- **Every other surface in the product.** They are all snapshots too, and none
  of them prices leveraged money. If this wants to generalise it should do so
  from a second real case, not from one.
- **Any action against an open position.** The backlog says this becomes p2 the
  moment one exists, because then a stale number is one somebody acts on. None
  is added here.
- **`refreshIntervalMs` on the port**, and any claim about what the platform
  advises.

## Impact

`read-exposure.query.ts` (a `Clock`, a `pricedAt`), `exposure.tsx` (one
paragraph and one link), `agents/[id]/page.tsx` (one prop), `composition.ts`
(one argument), the rendering test's composition root (an injectable clock), and
the delta above. `a-priced-position-goes-stale-while-you-read-it` links here.
