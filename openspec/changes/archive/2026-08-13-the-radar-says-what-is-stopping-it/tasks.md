# Tasks

- **R1** — A Deployment Says Why It Is Not Acting
- **R2** — A Resolution State The Product Does Not Recognise Is Named, Never Interpreted

## 1. The domain carries the resolution

- [x] 1.1 **(R1)** `RadarDeployment` gains the resolved facts: qualification,
      the named block, the regime it was judged in, and any cooldown.
- [x] 1.2 **(R2)** The section is carried as the platform's own value. The
      domain models the states it has observed and keeps anything else as an
      unrecognised value rather than mapping it to a default.

## 2. The mapper reads them

- [x] 2.1 **(R1)** `radar-adapter.ts` maps the fields from `resolvesNow`. It
      reads two of twenty-two today.
- [x] 2.2 **(R1)** Absence stays non-fatal, exactly as now — a missing
      `resolvesNow` nulls the fields and never fails the row. A `policyId`,
      `coinTicker` or `revision` still throws; those are write-critical and these
      are not.
- [x] 2.3 **(R2)** No default is substituted for an absent or unknown value.

## 3. The surface says it

- [x] 3.1 **(R1)** The deployment surface states not-qualifying with the block,
      the cooldown where one is running, and the regime.
- [x] 3.2 **(R2)** An unrecognised block or section is shown verbatim and
      labelled as unrecognised.
- [x] 3.3 A deployment with no resolution reads as neither, and is still shown.

## 4. Verification

- [x] 4.1 **(R1)** A not-qualified row with a block renders both. Fixtures use
      the two values actually observed — `AGGREGATE_BELOW_MIN`,
      `ATR_VOLATILITY_BELOW_MIN`.
- [x] 4.2 **(R1)** A qualified row is not described as blocked.
- [x] 4.3 **(R1)** A cooldown in the future renders; an elapsed one does not
      claim the deployment is sitting out.
- [x] 4.4 **(R2)** **The case that matters**: a block value no fixture has seen
      renders verbatim and produces no product sentence. Use a token that is
      deliberately not in the observed set.
- [x] 4.5 **(R2)** A `section` of `BLOCKED` — declared by the platform, never
      observed — renders as an unrecognised state rather than as idle or
      scanning. This is the whole reason the pass-through exists.
- [x] 4.6 **(R1)** A row with no `resolvesNow` still maps and still renders.
- [x] 4.7 **Mutation check.** Break the mapper to drop `qualificationBlock`, and
      to collapse an unknown section to a default; confirm 4.1 and 4.5 fail
      respectively.
- [x] 4.8 **Live**: re-read `list_radar_deployments` and confirm the surface
      shows what the payload actually carries — fifteen not-qualifying rows on
      this account today, not zero.
- [x] 4.9 Quality gates: `typecheck`, `lint`, `test`, `build`, drizzle check,
      `test:db` (against `grid_commander_test`).


---

## Execution notes

**The architecture guard caught me, and it was right.** The first draft compared
the cooldown against `Date.now()` inside the component.
`tests/architecture/boundaries.test.ts` refuses that, with its reason written
out: *"the age is measured in the read, against the injected clock, and the
surface only words it"* — a comparison against real time is a different string
on every run and can only be pinned by freezing global time.

So the decision moved where the precedent puts it. `ReadDeploymentsQuery` now
takes a `Clock` (matching `read-exposure.query.ts`, whose comment says injected
and required, never defaulted), `deploymentsFor` takes `now`, and the adapter
carries `cooldownActive: null` because it has no clock and must not invent one.
The component words what it was handed.

That threading is most of this change's diff, and it is the correct shape rather
than an overhead: the same rule already governs the one other surface that
states an age.

**Mutations.** M1 — dropped `qualificationBlock` from the mapper: the mapper
test and two surface tests failed. M2 — collapsed an unrecognised section to a
recognised one: the `BLOCKED` test failed. Neither touched the eight tests that
should not have moved.

**Live, task 4.8.** The real payload run through the real mapper and the real
surface function:

    WIF (1h):   sitting out a cooldown until 2026-08-13T11:15:27.625Z · regime bull_ranging (medium)
    TRUMP (1h): not qualifying — the platform gives AGGREGATE_BELOW_MIN · regime bear_expansion (high)
    SP500 (1h): not qualifying — the platform gives AGGREGATE_BELOW_MIN · regime bull_ranging (medium)

**20 of 20** deployments now say something they did not before, and one of them
is a cooldown nobody could see.

**Gates**: `typecheck` PASS · `lint` PASS · `vitest` PASS (**2281**, 174 files) ·
`build` PASS · Python harness PASS (255) · drizzle clean · `test:db` PASS (90).
