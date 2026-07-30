# Tasks: Build The Front Door

## The guard first

- [x] A walk that starts at `/`, follows every link the interface can render,
      and reports the served routes it never arrives at
- [x] Demonstrate it failing now — it named all six stranded destinations before
      anything was built
- [x] It resolves links through **what renders a page** — the page, every layout
      above it, and the modules those import, transitively

## The door

- [x] `app/page.tsx` — redirects to `/agents` when connected, `/connect` when not
- [x] Redirect rather than a rendered copy
- [x] Test: the root answers for both session states, and neither is a 404

## Moving between capabilities

- [x] `app/(app)/layout.tsx` carrying navigation to agents, strategies, audit
      and the assistant
- [x] One nav, in one file
- [x] Tokens only, no invented visual values
- [x] Marks the current section, and counts a sub-page as inside its section —
      reading an agent's journal is still being in Agents
- [x] Test: every top-level capability is reachable from every page in the group

## Guards

- [x] The walk runs in the suite and gates a change
- [x] Re-inject each defect and watch the guard fail — 10 injected, 10 caught
- [x] The existing link-resolution guard still fires; the walk complements it
      rather than replacing it

**Three misses on the first sweep, all one root cause.** The walk treated every
component's links as reachable from every page, reasoning that a nav lives in a
shared file. So deleting the layout, dropping a section, and breaking the root's
branch were all invisible: the nav *file* still existed and its links still
counted. A guard that cannot tell rendered from present is measuring the
filesystem — the exact mistake this change exists to correct, reproduced inside
the fix for it. Rewritten to resolve imports; all three then failed as they
should.

**A fourth needed a different kind of test.** Sending an unconnected user to
`/agents` is invisible to any static walk, because the text is identical either
way. `tests/access/front-door.test.ts` exercises the redirect itself.

**A fifth is caught by lint, not here.** Keeping the layout but not rendering
`<SectionNav />` leaves an unused import, which `@typescript-eslint/no-unused-vars`
fails. Verified rather than assumed, and deliberately not duplicated.

## Two bugs found in the guard itself

- [x] `routeOf` required a separator before `page.tsx`, so `app/page.tsx` became
      `/page.tsx` and the front door was reported missing after it was built
- [x] `/agents/[id]` shadowed `/agents/new` — the pattern matched first, the
      walk marked the *dynamic* route seen, and the static page it had just
      arrived at was reported unreachable. Exact match now wins, the way Next
      resolves a request

## Gates

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test` — 459 passing, up from 451
- [x] `npm run build` — `/` now in the route table
- [x] `./scripts/check.sh`
- [x] `./scripts/check-serving.sh`, with `/` added to the probed routes
- [x] Serve it and request `/` — 307 to `/connect` with no session
- [x] Render it and click through all four sections, light and dark

## What serving and rendering found

**The serving gate could only be run once per machine.** `npm start` spawns
`next start`, which spawns `next-server`, and by cleanup time the server has been
reparented to init — so killing npm reaped nothing and the orphan kept the port.
The next run refused against it. Invisible in CI, where every job is a fresh
container; immediate for anyone running it twice. Now started under `setsid` and
killed as a process group. Proven with three consecutive runs and no leftovers.

Then the gate was proven in both directions: `/` broken at runtime gives
`/  500  FAIL` and exit 1 while every other route stays green.

**The layout comment was wrong.** It claimed someone unconnected does not see
the nav. They do — typing `/agents` directly, or having a session expire, lands
exactly there. Left as it is, for reasons now written down instead of a claim
that was not true.

Proof: `docs/merge/proof/section-nav-light.png`,
`docs/merge/proof/section-nav-dark.png`. Clicking Strategies → Ask → Activity →
Agents lands on `/strategies`, `/assistant`, `/audit`, `/agents`.
