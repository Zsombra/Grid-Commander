# Tasks

## 1. Carry the fields the platform already sends

- [x] 1.1 **DONE** — added `effectiveNotionalUsd`, `blockedReason` and `blockedSince` to
      `Budget` (`src/domain/agent/budget.ts`). The platform returns all three and
      the mapper had been dropping them. `capitalAtRiskUsd` and
      `headroomUsd` are already declared and already mapped — **do not add them
      again**; the defect is that nothing reads them.
- [x] 1.2 **DONE** — mapped the three new fields in `agent-mapper.ts`, beside the
      two that were already mapped. Absent stays `null` — never `0`. A budget
      that did not report headroom is not a budget with no headroom, and
      `A Limit Nobody Set Is Not A Limit Of Zero` already governs that reading.
- [x] 1.3 **DONE** — asserted the mapping against the observed payload rather than the
      declared schema. The record and the responses disagree in both directions;
      the payload in `openspec/backlog/the-exposure-cap-starves-silently-and-we-say-it-wrong.md`
      is the subject.

## 2. Read it into the surface

- [x] 2.1 **DONE — in `ReadBudgetQuery`, not `ReadRiskReadingQuery`. Deviation,
      and the better place.** The task named the wrong query. The limits page
      already calls `readBudget` (`page.tsx:37`), and `ReadBudgetQuery` already
      owns every derived reading on this surface for a stated reason — *"the
      readings live here rather than in the page; `app/` may not import the
      domain"*. Putting the fill side in `ReadRiskReadingQuery` would have made a
      second query answer questions about a payload the first already holds.
      `ReadBudgetResult` gains `sizing` and `block`; no new platform call, as
      proposed.
- [x] 2.2 **DONE** — carried the gauge's `configured` flag through. It is the discriminator
      between "cap is empty" and "there is no cap", and the spec forbids
      rendering the second as the first.
- [x] 2.3 **DONE, unchanged** — kept `unreadable` separate per reading. A budget read that fails must
      not blank the ceilings, the geometry or the exit management beside it —
      `A Summary Assembled Around A Refusal Says What It Could Not Reach`
      already requires this of the surface and it must keep holding.

## 3. Render it

- [x] 3.1 **DONE — in `ceilings.tsx`**, following 2.1's deviation: that is the
      component the limits page feeds from `readBudget`. Tokens only.
- [x] 3.2 **DONE** — states that new entries are sized from the remainder, and show what the
      platform says that remainder authorizes.
- [x] 3.3 **DONE** — shows a platform-reported block with its own reason and start time.
- [x] 3.4 **DONE — and guarded.** No projected order size and no exchange-floor
      comparison. This is the change's own PE-2 equivalent — see the proposal.
      `tests/agent/sizing-base.test.ts` asserts the query and the component
      produce no such figure, scanning with comments stripped so the rule can be
      explained in the files it governs.

## 4. Verification

- [x] 4.1 **DONE** — unit: an unconfigured cap renders no fill, and is not described as
      empty.
- [x] 4.2 **DONE** — unit: a failed budget read states its reason, renders no zero fill,
      and leaves the rest of the surface standing.
- [x] 4.3 **DONE** — unit: a block with no reason is reported without one being invented.
- [x] 4.4 **DONE** — unit: **no projected next-order figure is produced anywhere on this
      path** — scan the query and the component, the way
      `tests/agent/approval-queue.test.ts` scans the approvals path for currency
      formatting. This is the guard that keeps PE-2 from being overturned by a
      later well-meaning edit.
- [x] 4.5 **DONE** — rendering: the limits page shows the fill, the sizing-base sentence and
      the block state, across configured / unconfigured / unreadable / blocked.
- [x] 4.6 **DONE, and it corrected a claim this change had already written.**
      `get_agent_budget` for Undertow, read live: `capitalAtRiskUsd 8.28`,
      `headroomUsd 36.72`, `effectiveNotionalUsd 36.72`,
      `gauges.exposure {fill 8.28, remaining 36.72, configured true}`,
      `blockedReason null`, `blockedSince null`. The mapping produces exactly
      that.

      **`effectiveNotionalUsd` equals `headroomUsd`** — here, and on #299's
      earlier reading (36.45/36.45), at 4x leverage. A doc comment written
      earlier in this change asserted the two *differ by the leverage term*.
      Two observations say they do not, and the claim was withdrawn rather than
      kept as a plausible story. The field is still carried separately, because
      the platform publishes it as its own with its own meaning and equality on
      one account at one leverage is not identity — but nothing in this product
      asserts a relationship between them.

      Also re-observed: `accountEquityUsd: 0` while the account holds a balance.
      Out of scope here and still recorded-not-concluded on #299 and #107.
- [x] 4.7 **DONE** — `tsc` clean, `npm run lint` clean, **2708 tests across 212
      files**, `npm run build` compiled, `db:generate` leaves `drizzle/` clean.
      **`npm run test:db` NOT run and not claimed**, for the standing reason.
      Original text: Quality gates: `npm run typecheck`, `npm run lint`, `npm test`,
      `npm run build`, `npm run db:generate && git diff --quiet drizzle/`.
      **`npm run test:db` needs a disposable `DATABASE_URL`** — it truncates the
      signal record, so it runs in CI and is reported as not-run otherwise.
- [x] 4.8 **DONE** — `validate --all` 0 errors. `agent-limits.json` created:
      the limits page had never been surveyed, so this is a first manifest rather
      than a refresh. Its `sizing-panel` constraints carry the PE-2 rule and name
      the guard that enforces it. No existing manifest went stale — nothing else
      describes `ceilings.tsx`.

## 5. Close the item

- [x] 5.1 **DONE** — #299 updated: consequence 3 discharged, consequence 2
      partly.
- [x] 5.2 **DONE — #299 left open deliberately.** Two things it names remain open and belong to
      it: the `minEquityUsd: 33.333333` floor test (**NOT DETERMINED**) and the
      `accountEquityUsd: 0` anomaly. Leave the item open with those two named as
      what is left, and say why here rather than in a second item.
- [x] 5.3 **DONE** — added the projected-size question to
      `a-confirmation-that-cannot-name-the-amount` (#305) as the second surface
      it now governs — it is one product question, and answering it twice is how
      two surfaces come to disagree about the same number.
