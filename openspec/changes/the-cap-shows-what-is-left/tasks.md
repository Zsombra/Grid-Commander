# Tasks

## 1. Carry the fields the platform already sends

- [ ] 1.1 Add `effectiveNotionalUsd`, `blockedReason` and `blockedSince` to
      `Budget` (`src/domain/agent/budget.ts`). The platform returns all three and
      `agent-mapper.ts` currently drops them. `capitalAtRiskUsd` and
      `headroomUsd` are already declared and already mapped — **do not add them
      again**; the defect is that nothing reads them.
- [ ] 1.2 Map the three new fields in `agent-mapper.ts`, beside the two that are
      already mapped at `:434-435`. Absent stays `null` — never `0`. A budget
      that did not report headroom is not a budget with no headroom, and
      `A Limit Nobody Set Is Not A Limit Of Zero` already governs that reading.
- [ ] 1.3 Assert the mapping against the observed payload rather than the
      declared schema. The record and the responses disagree in both directions;
      the payload in `openspec/backlog/the-exposure-cap-starves-silently-and-we-say-it-wrong.md`
      is the subject.

## 2. Read it into the surface

- [ ] 2.1 Extend `ReadRiskReadingQuery`'s `exposure` reading (or add a sibling
      reading) with the fill side: committed margin, headroom, what the headroom
      authorizes, and the block state. **One shape, from `readBudget`** — which
      this query's page already calls for this agent, so no new platform call.
- [ ] 2.2 Carry the gauge's `configured` flag through. It is the discriminator
      between "cap is empty" and "there is no cap", and the spec forbids
      rendering the second as the first.
- [ ] 2.3 Keep `unreadable` separate per reading. A budget read that fails must
      not blank the ceilings, the geometry or the exit management beside it —
      `A Summary Assembled Around A Refusal Says What It Could Not Reach`
      already requires this of the surface and it must keep holding.

## 3. Render it

- [ ] 3.1 Show committed / remaining beside the cap in `risk-reading.tsx`.
      Tokens only; no raw colour or spacing values.
- [ ] 3.2 State that new entries are sized from the remainder, and show what the
      platform says that remainder authorizes.
- [ ] 3.3 Show a platform-reported block with its own reason and start time.
- [ ] 3.4 **No projected order size, and no exchange-floor comparison.** This is
      the change's own PE-2 equivalent — see the proposal. A test asserts the
      surface produces no such figure.

## 4. Verification

- [ ] 4.1 Unit: an unconfigured cap renders no fill, and is not described as
      empty.
- [ ] 4.2 Unit: a failed budget read states its reason, renders no zero fill,
      and leaves the rest of the surface standing.
- [ ] 4.3 Unit: a block with no reason is reported without one being invented.
- [ ] 4.4 Unit: **no projected next-order figure is produced anywhere on this
      path** — scan the query and the component, the way
      `tests/agent/approval-queue.test.ts` scans the approvals path for currency
      formatting. This is the guard that keeps PE-2 from being overturned by a
      later well-meaning edit.
- [ ] 4.5 Rendering: the limits page shows the fill, the sizing-base sentence and
      the block state, across configured / unconfigured / unreadable / blocked.
- [ ] 4.6 **Live, read-only**: confirm against the account that the rendered
      figures match `get_agent_budget` for the same agent at the same moment.
      Undertow has a configured cap and open positions, so it is the subject that
      exercises a non-zero fill.
- [ ] 4.7 Quality gates: `npm run typecheck`, `npm run lint`, `npm test`,
      `npm run build`, `npm run db:generate && git diff --quiet drizzle/`.
      **`npm run test:db` needs a disposable `DATABASE_URL`** — it truncates the
      signal record, so it runs in CI and is reported as not-run otherwise.
- [ ] 4.8 `openspec.py validate` clean; re-survey the limits surface —
      `openspec/design/surfaces/` has no manifest for `/agents/[id]/limits` yet,
      so this change creates one rather than refreshing one.

## 5. Close the item

- [ ] 5.1 Update `the-exposure-cap-starves-silently-and-we-say-it-wrong` (#299):
      consequence 3 discharged (the fetched-and-discarded fields are now read),
      consequence 2 partly — the operator can see the cap filling, but the
      *projected* explanation is deliberately not built.
- [ ] 5.2 **Do not close #299.** Two things it names remain open and belong to
      it: the `minEquityUsd: 33.333333` floor test (**NOT DETERMINED**) and the
      `accountEquityUsd: 0` anomaly. Leave the item open with those two named as
      what is left, and say why here rather than in a second item.
- [ ] 5.3 Add the projected-size question to
      `a-confirmation-that-cannot-name-the-amount` (#305) as the second surface
      it now governs — it is one product question, and answering it twice is how
      two surfaces come to disagree about the same number.
