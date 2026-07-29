# Tasks

## 0. The walk (complete)

- [x] 0.1 Serve the application against a live account and open every strategy
      route: list, detail, edit, fork, archive. Record what each renders
- [x] 0.2 Call `fork_strategy` on a platform strategy at capacity and record the
      platform's answer verbatim — `VALIDATION_ERROR: "Strategy limit reached —
      you can have at most 25 active strategies."`
- [x] 0.3 Count the links each page renders, and where they go
- [x] 0.4 Record what the walk found to be **fine**, not only what it found
      broken — the backlog item guessed both ways and was wrong about one

## 1. The guard, written first and seen failing

- [x] 1.1 `tests/architecture/reachability.test.ts` — a new block, not a new
      file: the route helpers live there and a second copy of `routeOf` is how
      the `page.tsx` separator bug survived in two places at once. Derive the
      entity routes from the route tree (a served route ending in a dynamic
      segment), then the pages scoped to one (a route with such a route as a
      strict prefix)
- [x] 1.2 A scoped page's render set must offer a link matching its entity route
      exactly. A sub-page of the same entity is not a way back, and neither is
      the list
- [x] 1.3 **Run it against the unfixed tree and record the output verbatim.** It
      must name every strategy sub-page and no agent sub-page — the agents side
      was fixed by hand this morning and is the control
- [x] 1.4 A derivation check: entity routes found, scoped pages found, and
      neither set is everything. An empty derivation passes vacuously

## 2. A way back, on every page scoped to a strategy

- [x] 2.1 `strategies/[id]/edit` — the compose form and the review both return to
      the strategy
- [x] 2.2 `strategies/[id]/archive` — "Leave it active" goes to the strategy, not
      to the list
- [x] 2.3 `strategies/[id]/fork` — "Cancel" goes to the strategy being copied
- [x] 2.4 `strategies/[id]/restore` — "Leave it archived" goes to the strategy
- [x] 2.5 The not-found branch of each keeps its link to the list: there is no
      strategy to go back to, and the list is the honest destination

## 2b. Declining does not dump you on the roster

Found by writing the second guard rather than by the walk.

- [x] 2b.1 A second check: no link inside an action-bound form on an
      entity-scoped page may **resolve** to that entity's list. Resolve every
      href against the route it appears on — reading the attribute as written is
      what let `..` pass for a way back
- [x] 2b.2 **Run it and record what it finds.** `plan-review.tsx` offers "Go
      back and change it" as `href=".."`, which resolves to `/strategies` — the
      roster — discarding the composed plan
- [x] 2b.3 `PlanReviewPanel` takes `changeIt` as a **required** prop. Not a
      default: a default is how a caller inherits a guess silently
- [x] 2b.4 Both callers on the edit page pass the compose form, which is what
      "change it" means
- [x] 2b.5 Re-inject both: restore `href=".."`, and point the archive decline at
      the list. Confirm the archive case fails **only** this check — its
      `Cannot archive` branch still links to the strategy, so the way-back check
      stays green. That is the proof the two properties are independent
- [x] 2b.6 Confirm DT-0002's acceptance lines are untouched — they govern
      treatment, not destination — and that
      `openspec/design/surfaces/strategy-editor.json` already recorded the
      intended effect ("Link back to the compose form"). The manifest was right
      and the implementation never matched it; no ticket to reopen

## 3. The copy that cannot be made

- [x] 3.1 `forkAffordance(strategy, quota)` in the domain — a union, so nothing
      can be offered and explained at once. `ListStrategiesQuery` uses the quota
      the platform returned with that very roster
- [x] 3.1b **Both surfaces.** `/strategies/[id]` offers the same control one
      click away; `ReadStrategyQuery` reads the roster too, concurrently, and the
      roster is allowed to fail. A read added to make a control honest must not
      be able to take a working control away
- [x] 3.2 Withhold only on a known refusal. `unknown` means the quota could not
      be read, and hiding a working control on a fact we do not have is the
      opposite mistake
- [x] 3.3 `strategy-list.tsx` — render the reason where the control would have
      been. A control that simply vanishes reads as the page forgetting
- [x] 3.4 Keep the list-level sentence. It says what to do about it; the row says
      why this one is missing

## 4. Verification

- [x] 4.1 The guard passes — R: Every Capability Is Reachable, scenario `A page
      scoped to one entity`
- [x] 4.2 Re-inject: delete one back-link and confirm the guard names that page;
      point one at the list instead of the strategy and confirm it still fails
- [x] 4.3 Re-inject: restore the ungated fork affordance and confirm the fork
      test fails — R: A Private Copy Is How A Platform Strategy Is Changed,
      scenario `The copy that cannot be made`
- [x] 4.4 `npm run typecheck`, `npm run lint`, `npm test`
- [x] 4.5 Serve against the live account at capacity and confirm: no fork control
      on any of the twelve platform strategies, a reason in each of their places,
      and a way back to the strategy from all four sub-pages
- [x] 4.6 File the backlog item for restore, recording that it could not be
      walked and why
- [x] 4.7 File the backlog item for the naming clause, recording which cheap
      static versions were rejected and why — a documented gap is still a gap,
      but an undocumented one is worse
