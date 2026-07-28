# Tasks

## 0. Recon (complete)

- [x] 0.1 Probe every link the presentation layer renders against the served
      application — five 404s, recorded in `five-dead-links`
- [x] 0.2 Establish which forms are bound to a Server Action and which are not —
      four dead write paths, recorded in `four-dead-write-paths`
- [x] 0.3 Confirm the three unreferenced actions appear exactly once each, at
      their own definition

## 1. The guard, written first and seen failing

- [ ] 1.1 `tests/architecture/reachability.test.ts` — half one: extract every
      path the presentation layer can render and resolve each against the route
      tree, expanding dynamic segments
- [ ] 1.2 Half two: no `<form>` carries a string or template `action`, and every
      exported `'use server'` function is referenced by an `action={...}`
- [ ] 1.3 **Run it against the unfixed tree and record the output verbatim.** It
      must name all five dead links and all four unbound forms. A guard that has
      only been seen passing is a comment

## 2. Bind the forms

- [ ] 2.1 `agent-form.tsx` — require an `action` prop; drop the hardcoded
      `method`/`action`
- [ ] 2.2 `rebind-confirm.tsx` — same
- [ ] 2.3 `plan-review.tsx` — same
- [ ] 2.4 `agents/new/page.tsx` — pass `create`
- [ ] 2.5 `agents/[id]/rebind/page.tsx` — pass `performRebind`
- [ ] 2.6 `agents/[id]/page.tsx` — render a rename form and pass `rename`; it is
      currently an action with no form at all
- [ ] 2.7 `strategies/[id]/edit/page.tsx` — write the apply action that does not
      exist, and pass it to `PlanReview`

## 3. The five missing routes

- [ ] 3.1 `agents/[id]/edit` — the agent-owned fields, using `UpdateAgentCommand`.
      Render `rejected` and `invalid` results as named field errors, not a
      generic failure
- [ ] 3.2 `agents/[id]/reactivate` — its own consequence copy, not archive's
- [ ] 3.3 `strategies/[id]/fork` — no confirmation token; forking changes nothing
      that exists
- [ ] 3.4 `strategies/[id]/archive` — confirmation token carrying the blast
      radius, following the agent archive page
- [ ] 3.5 `strategies/[id]/restore` — handle `repair-required` as a state with a
      way forward, using `REPAIR_REQUIRED_GUIDANCE`

## 4. Verification

- [ ] 4.1 The guard passes — R: Every Affordance The Interface Offers Resolves,
      R: Every Form The Interface Renders Can Be Submitted
- [ ] 4.2 Re-inject each defect class and confirm the guard fails: one link to a
      route that does not exist, one form with a string action, one unreferenced
      `'use server'` export — three separate failures, three separate messages
- [ ] 4.3 Serve the built application and request all thirteen-plus routes; none
      returns 404 — R: Every Capability Is Reachable, scenarios Authoring agents
      and Authoring strategies
- [ ] 4.4 Submit each of the six write paths against the served application and
      confirm the action runs — reaching the not-connected refusal is success
      here, because it proves the request reached the use case rather than
      re-rendering the page
- [ ] 4.5 Confirm the honest ceiling in writing: no BattleGrid round trip was
      proven, and why — R: the proposal's stated limit
- [ ] 4.6 `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`,
      `npm run test:db`, `python3 .claude/tools/openspec.py validate --all`
