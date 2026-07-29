# Journal

## 2026-07-29 — It can be run against your own account now

**Did**: Proposed, planned, executed, audited (**PASS**) and archived
`a-personal-key` (full track, 23/23). `battlegrid-connection` 10 → 13
requirements, the nine untouched ones byte-identical. 511 tests, up from 492.

**The direction changed.** Grid-Commander is a personal controller — one person,
their own BattleGrid account, over the MCP surface. Not the multi-tenant product
the brief describes.

Which meant it **could not be run at all**: pressing *Continue to BattleGrid*
redirects to `/authorize` with a `client_id` nobody registered. To use a personal
tool against your own account you first had to register an OAuth client with a
third party — to talk to yourself.

**The architecture had already anticipated this.** `Authority` is
`{ userId, accessToken }`, `ResolveAuthorityQuery` is documented as *"the single
place a BattleGrid token is obtained"*, and the adapter does
`Authorization: Bearer ${accessToken}`. A `bg_live_` key **is** a bearer token to
that endpoint, so agents, strategies, compile/review/apply, audit and the
assistant all work unchanged. The port design paid off exactly as intended.

Three seams needed a second implementation, picked at the composition root and
never branched on downstream: who is acting, what token, what scopes.

**It now boots and serves all five routes with no OAuth client configured at
all.** Verified, not assumed.

**State**: archived. Production gate PASS, one MINOR filed.

**Next**: `personal-mode-says-reconnect` (P1) — see below. Then
`image-never-built`, still needing a Docker daemon.

**Watch out**:

- **`scopesFor` would have refused every call.** It read `connections.scopes` and
  returned `[]` with no connection — correct for a delegated deployment, fatal
  for a personal one where there is no row. Found by reading it before writing
  anything, which is why `HeldScopes` exists at all. Had I gone straight to
  wiring the key, personal mode would have booted cleanly and then refused every
  single tool call.
- **A declared scope is not a granted one, and that is the whole safety story.**
  The delegated path registers `mcp:read`, so wager is *unobtainable*. A
  `bg_live_` key carries whatever the account gave it and the product cannot
  read which. `BATTLEGRID_KEY_SCOPES` is restraint, not protection: declaring
  `mcp:read` stops this product asking, not the key. What still protects is the
  classification guard and the confirmation gate — where the boundary always
  was. Disclosed on every page, in the product.
- **Requiring a registered client would have made the path unreachable by its own
  precondition.** `BATTLEGRID_CLIENT_ID` and `BATTLEGRID_REDIRECT_URI` are no
  longer required when a key is set. Registration is the ceremony this path
  removes; it cannot be a precondition for removing it.
- **Serving it found the defect a diff could not.** A refused key renders
  *"Reconnect to continue"* — an action personal mode does not have, with
  `/connect` not in the navigation and the OAuth client deliberately unset.
  Wrong remedy, correct diagnosis. Not fixed here: both strings are domain
  constants and design W-C deliberately gives one message for every way authority
  is lost, so varying the remedy by mode is a design decision rather than a copy
  edit. Filed `personal-mode-says-reconnect` (P1). **Third time this session that
  rendering caught something no assertion would have.**
- **A route finally exercised the database.** `/audit` returned 500 mid-probe
  because PostgreSQL had stopped, and it was the *only* route to notice —
  personal mode has no session gate in front of it. First time a probe in this
  project has touched the database; it narrows
  `no-route-exercises-the-database` without closing it.
- **Regex edits on source cost a repair, again.** Moving three test harnesses
  from `connections` to `heldScopes` mangled the imports in `scope.test.ts`.
  Second time this session. Use them to *find*, not to rewrite.
- **The OAuth path was kept, not deleted.** It is audited, archived and correct
  for the product the brief describes, and the personal path had not run once
  when the direction changed. Filed `oauth-path-may-be-dead-weight` (P2) so the
  decision gets made rather than drifted into.

## 2026-07-29 — The serving gate passed with the database stopped

**Did**: Proposed, executed and archived `a-gate-that-checks-its-database`
(lite track, `skip_specs: true`).

`scripts/check-serving.sh` reported **"serving ok" with PostgreSQL stopped**.
Every route it probes resolves a session, finds none, and renders "Not
connected" — which needs no query. So all five returned 200 against a database
that was not running, and the gate whose job is proving a deployment serves said
it did. The first person to find out otherwise would be a user who connected an
account.

It now runs `tools/check-schema.mjs` first: reachable *and* migrated, using the
tool a deployment already runs as its release step. Before the routes rather than
after, because the routes cannot tell you.

**The new check found a second bug on its first run.** `.env.example` ships a
*placeholder* `DATABASE_URL` (`postgres://localhost:5432/grid_commander`,
documenting the shape), and the variable loop preferred the example's value over
the caller's — so a real one, CI's service container included, was silently
discarded. Nothing had ever noticed because no probed route used the connection.
**The CI `app` job has been passing a `DATABASE_URL` the script threw away**, and
would have started failing the moment the schema check landed. Precedence is now
caller → example → random.

Proven in three directions: reachable and migrated → exit 0 reporting
`schema ok — 1 migration(s) applied`; reachable but unmigrated → exit 1;
unreachable → exit 1.

**State**: archived. 492 tests, board clean.

**Next**: `image-never-built` (P1) and the CI payment block, both needing the
user.

**Watch out**:

- **Two of the three things I offered were declined, and the reasons matter.**
  Writing a product README: leave it. Registering a BattleGrid OAuth client:
  the user is not convinced it is the right architecture, because *"this is more
  of an MCP controller for the tools that BattleGrid offers"*. That is a real
  open question about how this product should authenticate at all, and nothing
  should be registered against BattleGrid until it is settled. **Do not register
  a client.**
- **What is still not proven**: that a *route* can query. Every route needs a
  session to reach the repositories, and `check-schema.mjs` connects with `pg`
  directly while the application connects through Drizzle's pool — two paths to
  the same database, one exercised. Filed as
  `no-route-exercises-the-database` (P2). Narrower than what was just closed, and
  not empty.
- The residual risk is now a permissions or pool problem, not a stopped
  database. That is a much smaller class, and a first deployment's connection is
  tested by the first person who connects an account.

## 2026-07-29 — Forms that work in the dark

**Did**: Proposed, executed, verified and archived `forms-that-work-in-the-dark`
(lite track, `skip_specs: true` — no behaviour changed). 492 tests, up from 486.

Every input, select and textarea in this product was
`className="w-full rounded border p-2"` — seven byte-identical copies, none
touching a token. `border` resolved to Tailwind's default grey and the
background stayed the browser's, which is white, so in dark mode each control
was a white box beside panels that *were* themed.

Not illegible, and worse than that: it read as an element that did not belong to
the page, and next to a themed panel it looked disabled.

`src/presentation/components/control.ts` now holds the treatment once, imported
by all four files. A constant rather than a component, because the three element
types take different props and the thing worth sharing is the treatment. **And a
constant rather than seven copies, because seven copies of a token-based
className is the same defect one layer along** — four files that can disagree,
invisibly, until someone notices one form looks different.

Dark mode measured, not eyeballed: background `rgb(24, 28, 34)` where it was
`rgb(255, 255, 255)`, border `rgb(57, 64, 74)`, text `rgb(242, 244, 247)`.

**State**: archived. Board clean, 0 errors / 0 warnings.

**Next**: unchanged — `image-never-built` (P1) and the CI payment block, both
needing the user.

**Watch out**:

- **The guard was wrong once and the code was right.** A first version asserted
  `CONTROL` contained no bare `border`, reasoning that a width with no colour
  was the defect. It failed against correct code: in Tailwind the bare `border`
  *is* the width and `border-border-default` is the colour, and both are
  required. The meaningful assertion was already the line above it. Worth
  recording because the reflex when a new test fails is to suspect the code —
  here the test had simply encoded a wrong idea about Tailwind, and the reasoning
  is now written into the test so it is not re-derived wrongly.
- **The `focus` token had existed since DT-0001 and was referenced by nothing.**
  Keyboard focus on a control got the browser default. It is now used, and
  `focus-visible` rather than `focus` — a mouse click should not draw a ring that
  only a keyboard user needs.
- **Buttons and labels were left, deliberately.** They use stock utilities too
  and are legible in both schemes: untokenised, not broken. Filed as
  `buttons-and-labels-untokenised` (P3). Sweeping them in would have made "the
  inputs are fixed" and "the forms were restyled" one commit, and only the first
  was verified by looking at it.

## 2026-07-29 — A control that did nothing, documented for two changes

**Did**: Proposed, executed, verified and archived `a-control-that-does-nothing`
(standard track, 17/17). `agent-authoring` 10 → 11 requirements, the nine
untouched ones byte-identical. 486 tests, up from 483.

The create-agent form rendered a **Position management** fieldset with a preset
select. A user chose how their agent should trail stops and decay positions,
submitted, and `app/(app)/agents/new/page.tsx:71` sent `tradingConfig: null`.
The choice was discarded, nothing said so, and the agent was created with
BattleGrid's defaults while the user believed otherwise.

**This is `close-the-reachability-gap`'s defect one level in.** That change made
every *form* reach its operation. This was a *control inside a form* reaching
nothing — less visible precisely because the rest of the form works.

The fieldset is removed. Wiring it was not available:
`tradingConfig.positionManagement` needs fifteen fields and
`PositionManagementPreset` carries three, so this product does not hold the
values a complete payload requires. Not offered is honest; offered and ignored
is not.

**State**: archived. Board clean.

**Next**: unchanged — `image-never-built` (P1) and the CI payment block, both
needing the user. Then `form-inputs-ignore-dark-mode` (P2).

**Watch out**:

- **The blind spot was written down and left, and that is the lesson.**
  `reachability.test.ts` has carried this since `close-the-reachability-gap`:
  *"It does not check that every control inside the form reaches that action's
  payload — `agent-form.tsx` renders a position-management select while the
  create action sends `tradingConfig: null`."* Naming the control, naming the
  line. It survived two further changes and a production gate in that state.
  **A documented gap is still a gap** — writing it down bought traceability, not
  safety, and the user whose choice was discarded would not have been consoled
  by the comment. DL-106 is now closed by the check that should have been
  written then.
- **The probe found four candidates and three were false positives.** `plan` is
  read through `compiledPlan(formData, 'plan')`, a project accessor my first
  scan did not know; `q` and `tagline` are GET forms read from `searchParams`.
  Only `positionManagementPreset` was real. Worth the extra pass: a guard that
  reported three false positives would have been turned off within a week, so
  the final check excludes GET forms — and a mutation removing `method="get"`
  from the assistant proves that exclusion is load-bearing rather than a blanket
  skip.
- Position management is still not settable, and that is now honest rather than
  hidden. Owned by `agent-edit-form` and `a-preset-does-not-constrain-its-config`.

## 2026-07-29 — A catalog with nothing in it, and a premise that was wrong

**Did**: Proposed, executed, verified and archived `a-catalog-with-nothing-in-it`
(standard track, 22/22). `strategy-authoring` 9 → 10 requirements, the eight
untouched ones byte-identical. 483 tests, up from 472.

`StrategyList` branched on `unreadable` and otherwise mapped the listings, so a
catalog with nothing in it rendered as an empty `<ul>` — indistinguishable from
the failure case directly above it, which had been written with real care to say
the strategies are not gone.

**The fix belonged in the port, and the asymmetry ran three levels deep.**
`RosterResult` and `JournalResult` both carry an `'empty'` kind;
`StrategyListResult` did not, and `strategy-authoring` said nothing about the
case while `agent-authoring` has required it all along. One capability having
learned something the other had not. A `listings.length === 0` check in the
component would have left the two modelling the same distinction differently,
which is how the next person gets it wrong again. Adding the kind made the type
checker find every call site, which is the argument for doing it there.

**State**: archived. Board clean, 0 errors / 0 warnings.

**Next**: still `image-never-built` (P1) and the CI payment block, both of which
need the user. Then `form-inputs-ignore-dark-mode` (P2, product-wide).

**Watch out**:

- **The backlog item's premise was wrong, and reading the reference before
  writing the copy caught it.** It framed this as a new user's first impression —
  *"the first screen a newly connected user reaches with nothing set up"*. But
  `list_strategies` returns *"the visible SYSTEM catalog **and** owned PRIVATE
  strategies"*, so a new user with none of their own still sees BattleGrid's
  catalog. Their list is not empty. An empty result means nothing came back at
  all — unexpected, and with **nothing left to fork from**.
- **My first draft of the empty state was an affordance leading nowhere.** It
  said *"This account has no strategies yet. Start from one of BattleGrid's own:
  forking makes a private copy…"* — an instruction pointing at strategies that
  were not returned. Worse than silence, because it reads as reassurance. That
  is the exact class of defect `close-the-reachability-gap` exists to prevent,
  and I wrote it into the fix for a different defect. **The lesson is narrow and
  useful: a backlog item's framing is evidence, not fact — this one was written
  from the component and never checked against what the tool returns.** Now
  guarded by a test asserting the empty branch renders no link and names no fork.
- `'empty'` carries no quota, unlike `RosterResult`'s which keeps `slots`. An
  account with no agents still has a capacity worth showing; a catalog that owns
  no strategies has no quota to report. Stated in the type so it does not look
  like an omission.
- Checked rather than assumed: `JournalResult` already carries `'empty'`, and
  `audit-list` handles its own empty case inline and reads correctly. Neither
  needed touching.

## 2026-07-28 — There is something to deploy

**Did**: Proposed, planned, executed, audited (**PASS**) and archived
`ship-a-deployable-image` (full track, 26/26). The user chose a Docker image over
a platform target, so it runs anywhere and commits to nothing.

A three-stage `Dockerfile` producing a runtime image with no toolchain, no
source and no secret. Two operations: `migrate` applies the committed journal,
`serve` checks the schema and then serves.

**The gate is the point, not the container.** A deployment missing a migration
exits non-zero and serves nothing, naming what is absent. Applying migrations was
already possible; noticing that nobody had was not. A deployment whose migration
was skipped is otherwise indistinguishable from one whose migration ran, until a
user touches the feature that needed it — by which point it reads as a defect in
the product rather than a missing step in the deploy.

Migrating and serving are separate so a release step runs once instead of every
replica racing on one journal (DL-2). A database *ahead* of the build serves with
a warning, because refusing there would turn a rollback into an outage (DL-4).

**State**: archived. `app-access` 12 → 14 requirements, the eleven untouched ones
byte-identical. 472 unit tests (up from 459) and 60 database tests (up from 51).
All eight gates green.

**Next**: `image-never-built` (P1). Someone with a Docker daemon runs
`docker build`, once, and records what happened.

**Watch out**:

- **The image has never been built.** No daemon here. What *was* proven: the
  Dockerfile's runtime `COPY` list assembled by hand and exercised end to end —
  `serve` refused an unmigrated database and exited 1, `migrate` applied the
  journal, `serve` then booted Next and answered on all six routes. Plus
  `next build` from a tree pruned exactly as `.dockerignore` prunes it. What is
  left is Docker's own mechanics: Alpine compatibility of the traced binaries,
  `COPY --from` paths, `--chown` readability. Waived at the gate as PG-501 with
  approver and expiry, and filed as `image-never-built` (P1). **This project
  exists partly because a type check is not a build and a build is not a boot; a
  Dockerfile nobody has built is the next instance of that, so it is named rather
  than left to be discovered.**
- **The pruned-tree build caught a real defect.** Excluding all of `openspec/`
  removed `design/system.json`, which `prebuild` reads to regenerate
  `app/tokens.css`. It would have failed on the first `docker build` and nowhere
  else — the design tokens are an *input to the build*, not documentation. Now
  an explicit exception, and guarded.
- **`drizzle-orm` is not traced into the standalone output.** Webpack bundles it
  into the server chunks, so it is present in the server and absent as a module —
  and `tools/migrate.mjs` is a separate process that must import it. Found by
  looking at `.next/standalone/node_modules` rather than assuming. Dropping that
  `COPY` breaks `migrate` only, so serving still works and nothing notices until
  a deploy needs it. That mutation is now caught.
- **A test helper dropped stderr and reported a real behaviour missing.** The
  ahead-of-this-build warning goes to stderr; `execFileSync` returns stdout only.
  The warning had been printed correctly the whole time. `spawnSync` now.
- **The out-of-band step that will bite someone**: `BATTLEGRID_REDIRECT_URI` must
  be registered at BattleGrid, exactly, before a new hostname can complete one
  connection. A deployment can serve every page and connect nothing, with no
  message that explains why. First section of `docs/DEPLOYING.md` for that
  reason.

## 2026-07-28 — The product had no front door

**Did**: Proposed, executed, verified and archived `build-the-front-door`
(standard track, 24/24).

`/` returned **404**, and no page linked to any other. Walking the link graph
from `/connect` — the only entry a user could arrive at — reached exactly one
route. Five top-level destinations served and unreachable by clicking:
`/agents`, `/agents/new`, `/assistant`, `/audit`, `/strategies`. Sixteen routes
of working capability, usable only by typing URLs.

**`app-access` already forbade this** and had passed a production gate four
times over code that violated it. The reason is worth keeping:
`close-the-reachability-gap` measured *every link the interface renders resolves
to a route*, which is green here — every link this product renders does resolve.
It never asked the other direction. **A destination nothing points at is
unreachable in exactly the way a link to nothing is**, and no check looked for
it. The requirement even named the shape of the mistake — *"a route table is not
the interface"* — and the guard written for it still started from a list instead
of a walk.

Now: `app/page.tsx` redirects by session, `app/(app)/layout.tsx` carries one
navigation, and the reachability test walks outward from `/`.

**State**: archived. `app-access` 11 → 12 requirements, the nine untouched ones
byte-identical. 459 tests, up from 451. Every gate green.

**Next**: `no-deployment-configuration` (P1, filed today). Everything else is
ready — the product builds, serves, and can now be used by someone who knows
only its address. The gap to a launch is entirely that item and
`apply-migrations-on-deploy`, which should be answered together.

**Watch out**:

- **The first version of the new guard reproduced the bug it was written to
  catch.** It treated every component's links as reachable from every page,
  reasoning that a nav lives in a shared file — so deleting the layout, dropping
  a section from the nav, and breaking the root's branch were all invisible: the
  nav *file* still existed and its links still counted. **A guard that cannot
  tell rendered from present is measuring the filesystem.** Rewritten to resolve
  imports transitively through the page and its layouts. Three of ten mutations
  had passed; all ten now fail.
- **Two bugs inside the guard, both found by using it.** `routeOf` required a
  separator before `page.tsx`, so `app/page.tsx` became `/page.tsx` and the
  front door was reported missing after it had been built. And `/agents/[id]`
  shadowed `/agents/new` — the pattern matched first, the walk marked the
  dynamic route seen, and the static page it had just arrived at was called
  unreachable. Exact match wins now, the way Next resolves a request.
- **The serving gate could only be run once per machine.** `npm start` spawns
  `next start` spawns `next-server`, and by cleanup time the server is
  reparented to init — killing npm reaped nothing, `pkill -P` found no children,
  and the orphan kept the port so the next run refused against it. Invisible in
  CI, where every job is a fresh container. Started under `setsid` and killed as
  a process group; proven with three consecutive clean runs, then proven to fail
  when `/` throws.
- **A comment I wrote was wrong and rendering showed it.** The layout claimed
  someone unconnected does not see the navigation. They do — typing `/agents`
  directly, or a session expiring mid-read, lands exactly there. The behaviour
  is fine and now says so; the claim was not.
- **There is no way to deploy this.** No Dockerfile, no target, nothing. Filed
  P1 as `no-deployment-configuration`, which also records the two things that
  make it more than adding a container file: migrations have no owner on deploy,
  and `BATTLEGRID_REDIRECT_URI` must be registered out of band before a new
  hostname can complete one connection.

## 2026-07-28 — Telling the user where their question goes

**Did**: Proposed, executed, verified and archived `disclose-the-assistant-model`
(standard track, 22/22). `/assistant` now names Anthropic as the recipient before
a question is asked, and says the data leaves the product.

Since this morning, answering sent someone's agents and strategies to a third
party and the page said nothing about it. Every other outbound path here is
BattleGrid, granted through an OAuth screen that names BattleGrid. This one was
not.

**Disclosure is the consent, which is why the change stops there.** Asking is
opt-in per question and the sentence comes first, so a user who reads it can
decline by not asking — a real choice, available immediately, needing no
preference store. The narrower question that remains is
`assistant-asking-cannot-be-declined` (P3, and likely closes as "already
answered").

**`AssistantPort.describe()` rather than reading configuration twice.** The port
exists because *which model answers is a deployment decision*; where a question
goes is the same fact, read rather than used. A deployment with no key says the
opposite — nothing typed there leaves — instead of being handed a warning about
a recipient it does not have. The sentence is composed in the domain, so no
surface owns a copy that could go stale against the deployment it describes.

**State**: archived. `assistant` 7 → 8 requirements, the six untouched ones
byte-identical. 448 tests, up from 435. Every gate green, including
`check-serving.sh`.

**Next**: `assistant-unverified-against-live-api` (P1) — one real request
against a real key. Then `strategy-catalog`'s design ticket, whose empty state
is still unwritten.

**Watch out**:

- **A missed mutation found a real hole this time.** Deleting the sentence from
  the page's JSX left all 75 assistant tests green — the structural guard
  asserted the query was *called*, not that its result was *shown*. A disclosure
  computed and never rendered is the exact failure the requirement describes,
  and worse than none, because the code would look like it discloses. Three
  tests added, all re-demonstrated failing. Compare yesterday's miss, which was
  the opposite: a property held better than the comment claimed. **Same symptom,
  opposite meaning — the only way to tell them apart is to go find the mutation
  that does fail.**
- **Rendering it moved it.** Placed after `<label>Your question</label>`, the
  disclosure put four lines between the label and the box it names. Moved above
  the label. No assertion in this change would have caught that, and it is the
  second time a render has corrected a placement the ticket got wrong.
- **A stale server nearly became the proof.** The second screenshot came back
  identical to the first because the restarted `npm start` had exited 1 on a
  held port and curl reached the *old* process. That is the same failure
  `check-serving.sh` was hardened against, hit again from the other direction —
  and this time by hand, where no guard was watching. Third run verified the
  port was free first and that the shot came from the pid it launched.
- **Text inputs ignore dark mode** — white box on a near-black page, visible
  directly under the disclosure in the dark proof. Pre-existing and product-wide;
  the token passes covered surfaces and never touched form controls. Filed as
  `form-inputs-ignore-dark-mode` (P2), to be fixed as one treatment rather than
  per page.

## 2026-07-28 — The assistant answers something

**Did**: Proposed, executed, verified and archived `wire-the-assistant-model`
(standard track, 29/29). `assistant` is no longer the capability that is fully
specified, tested, audited and answers nothing.

`ClaudeAssistant` implements `AssistantPort` against `@anthropic-ai/sdk` —
`claude-opus-5`, adaptive thinking, a manual tool-use loop. The loop is manual
rather than the SDK's tool runner for three reasons specific to this port, all
recorded in the file: the toolset is discovered per request, `MAX_ROUNDS` is a
cost ceiling something has to count, and `ConnectionRevokedError` has to *escape*
the loop rather than be caught and reported to the model as a bad day. A runner
that handles its own tool errors is precisely the harness the use case's
`revoked` flag was written to defend against.

**The discovered toolset was carrying no argument schema.** `rawDiscoverTools`
kept name, description and annotations and dropped `inputSchema`, which nothing
had needed until something had to *call* a tool. Threaded through
`DiscoveredTool` → `ReadOnlyTool` → the model, optional at every step: a tool
that reports no schema is still offered with an open object schema, because
withholding it would narrow the toolset on a BattleGrid deployment that changed
shape, silently and in the direction of answering less. The safety decision is
made from the annotations and is made elsewhere.

**A model can be unreachable and there was nowhere to put that.** The use case
rethrew anything that was not a revocation, so an Anthropic outage would have
been a 500 on `/assistant`. `AssistantUnavailableError` → `refused`, the same
shape a discovery failure already takes. It carries nothing from the provider's
error text — that string is written for whoever holds the account, and it is one
of the few in this system that could contain a key.

**`ANTHROPIC_API_KEY` is optional and commented out in `.env.example`.** Not a
style choice: `check-serving.sh` exports every *uncommented* variable and fills
blanks with `openssl rand`, so uncommenting it would boot the served application
with a garbage key — the gate that exists to catch a broken boot would be the
thing that broke it. There is now a test asserting the file never sets it.

**State**: archived. `openspec/specs/assistant/spec.md` 6 → 7 requirements, the
five untouched ones byte-identical (the sixth differs by the blank line the
append needed). 435 tests, up from 394. Every gate green: typecheck, lint, test,
build, `check.sh`, and `check-serving.sh` run twice — once with no key, once
with one, because both are deployments this ships.

**Next**: `assistant-unverified-against-live-api` (P1). One real request against
a real key, recorded here with what came back.

**Watch out**:

- **The assistant does not tell anyone their data leaves the product.** Filed
  P1 as `assistant-does-not-name-its-model`. Every other outbound path here is
  BattleGrid, which the user connected on purpose through a screen that named
  it. This one is not, and the page says nothing. On the surface whose whole job
  is answering honestly, that is the wrong gap to leave open — and it ships the
  moment a key is set.
- **23 defects injected across three sweeps, 22 caught — and the miss was the
  interesting one.** Fabricating a `consulted` list inside
  `NotConfiguredAssistant` left the suite green, and the comment I had written
  above that test said it would not. It does not, because `AskAssistantCommand`
  builds the citation from what *it* observed and discards what the port
  reports. So a lying port cannot reach the answer at all — the property is
  carried a layer up, and the comment was wrong about the codebase. Replaced
  with a mutation that can actually break it (the implementation calling a
  tool); it fails four tests. **The lesson is not "write more guards" — it is
  that a passing mutation can mean the property is held somewhere better than
  you thought, and the only way to tell the two apart is to find the mutation
  that does fail.**
- **`NotConfiguredAssistant` had never been tested.** Caught by verification as
  this change's one CRITICAL. It was referenced by the composition root and by a
  grep, and nothing asserted what it returns — while being the state this
  product ships in by default. Four tests now.
- **CI has a one-field diagnosis now.** Runs are created again and every job
  still dies in 2-9 seconds, but the API says why directly: `runner_id: 0` and
  `runner_name: ""` on all seven jobs, so no runner was ever assigned and the
  job never reached its own contents. It reproduces on `main` at `27fcd16`.
  Recorded in `ci-creates-no-runs`, because the probe job proved the same thing
  for the cost of a commit and a workflow edit and this costs one API call.
  Anyone finding a red board here should check `runner_id` before reading a
  diff.
- Nothing bounds how many questions a user asks. One answer is capped;
  a thousand are not, and every tenant's questions bill one key. Filed
  `assistant-has-no-spend-ceiling` (P2), which argues for recording token usage
  before picking a limit rather than guessing one.

## 2026-07-28 — The authoring surface never worked, and CI stopped starting

**Did**: Proposed, planned and executed `close-the-reachability-gap` (full
track, 24/24 tasks, `EXECUTION READY FOR PRODUCTION GATE`). **It is not
verified, not audited and not archived** — see State.

The session started as the design track: `/surface` → `/design` → implement,
because the product renders in browser defaults. Surveying the UI found
something first, and then something worse.

**Five links the interface renders returned 404** — agent edit and reactivate,
strategy fork, archive and restore. Each rendered by a deliberate permission
check (`isEditable`, `isReactivatable`, the strategy listing's own flags). Filed
`five-dead-links`.

**Four of six write paths could not be submitted.** Create, rename, rebind and
apply used `method="post"` with a string action or none, which does not invoke a
Server Action. Three actions — `create`, `rename`, `performRebind` — appeared
*exactly once* in the repository, at their own definition. The strategy edit
page had no `'use server'` at all. Filed `four-dead-write-paths`.

So the product could connect an account and archive an agent. Nothing else.
Every use case behind the dead paths was written, tested, audited and wired.

Both are fixed. All 16 rendered paths now serve; all four forms are bound; the
apply action was written from scratch, carrying the reviewed plan rather than
recompiling.

**Next**: `/verify` then the **auditor** on `close-the-reachability-gap`, then
`/archive`. Do not archive before the gate — the change modifies an archived
requirement.

**Watch out**:

- **CI has been broken since `7f1cb28` and it is not the diff.** Every run is a
  `startup_failure` with `name:""` and `path: BuildFailed`; the "Spec Layer"
  workflow does not run at all. `git diff 4890081..HEAD -- .github/` is empty.
  Three commits are unverified by CI. Filed `ci-startup-failure` (p1) with the
  evidence and the two things deliberately not tried. **Do not "fix" it by
  editing the workflow** — the file is provably unchanged, and an edit would put
  a fabricated cause in the history.

- **The reachability guard's own first version missed two of the five dead
  links.** It matched `href=` as a JSX attribute and not `href:` as an object
  property. Caught only because the defects were still present to count against
  — which is the whole argument for DL-101, writing the guard before the fix.
  Written afterwards it would have passed at 3-of-5 forever.

- **The guard has a stated blind spot (DL-106).** It checks that a *form* is
  bound, not that every *control inside* it reaches the payload.
  `agent-form.tsx` still renders a position-management select while the create
  action sends `tradingConfig: null`. Filed as
  `a-preset-does-not-constrain-its-config`. This was written down before the
  guard was built, on purpose.

- **This is the fifth instance of one pattern**, and it is worth stating as a
  rule rather than an anecdote: *every check this project built measured what
  the code contains, never what the interface offers.* Routes exist, the build
  succeeds, pages return 200 — all true while nothing could be submitted.

- **`agent-edit-form` cannot be built as specified.** Two live-server findings:
  three `tradingConfig` keys come back on read and are rejected on write
  (`trading-config-read-shape-is-not-write-shape`), and a position-management
  preset is a label supplied *alongside* fourteen independent values rather than
  a shorthand for them (`a-preset-does-not-constrain-its-config`). A preset
  dropdown cannot be the edit surface.

- **The ceiling is unchanged and stated in the proposal**: this proves the
  wiring is correct and the guard catches regressions. It does **not** prove a
  BattleGrid round trip, which needs an OAuth consent in a browser
  (`prove-token-lifetimes`). No agent was created — the MCP create call was
  blocked by the harness permission classifier and was not retried.

- PostgreSQL stops on its own in this container. `pg_ctlcluster 16 main start`.
  A `no response` in a log is that, not a defect.

## 2026-07-28 — It had never been built, and three predictions about the schema were all wrong

**Did**: Shipped `prove-it-runs` (full track, gate PASS, archived). `app-access`
gains three requirements and `battlegrid-connection` gains a scenario.

The P1 item said the blocker was the missing migration and predicted three
disagreements on first contact — `text[]`, the `(user_id, idempotency_key)`
unique index, the `onConflictDoUpdate` target. **All three were wrong.** The
migration generates, applies, and 51 repository tests pass against real
PostgreSQL 16. Reading the code produced three wrong predictions; running it
produced five real findings.

What was actually broken: **the application had never been built.**
`app/layout.tsx` did not exist, so App Router refused to assemble anything, and
once a layout existed webpack could not resolve the `.js` specifiers `tsc`
resolves happily under `moduleResolution: bundler`. Invisible because CI ran
typecheck, lint and test and never `next build`.

Also fixed: a duplicated first-time OAuth callback surfaced
`violates foreign key constraint "connections_user_id_users_id_fk"` to someone
mid-connect; `confirmation_tokens.actor` was written and read by nobody.

**State**: 7 capabilities, 0 active changes, 18 open backlog items. The product
builds, serves all thirteen routes against a real database, and every capability
page shows the not-connected outcome with no BattleGrid call and no row written.
390 unit + 51 database + 124 harness tests. CI now runs six gates in the `app`
job against a Postgres 16 service.

**Next**: `/surface` — there is a built UI to survey for the first time, and
`tailwind-classes-with-no-tailwind` (p2) is waiting on that decision. Otherwise
`wire-an-assistant-model` (p2) or `serving-is-not-gated` (p2).

**Watch out**:

- **A guard that misses its target, three times now.** The coercion scan matched
  three patterns and missed the fourth. CI ran three gates and never the build.
  And this time: `drizzle-kit check` reports `Everything's fine` against a schema
  with an added column — it validates the journal, not the schema. Adding it
  would have looked like coverage and provided none. The workflow comment says so
  explicitly so nobody "improves" it later. What actually detects drift is
  `db:generate` plus `git status --porcelain drizzle/`.
- **Fix both halves of a concurrency bug or you make it worse.** The plan said
  "Contracts impacted: none". Fixing only the storage side would have converted a
  loud foreign-key error into a silent wrong sign-in: the callback route passes
  the returned `userId` straight to `sessions.issue`, and the caller was
  returning its own proposal. `upsert` now returns `ResolvedConnection`.
- **The fake modelled a weaker rule than the database.**
  `FakeConnectionRepository.upsert` keyed on the proposed `userId`, so no unit
  test could ever have caught the identity defect. Corrected; all 390 still pass.
- **The no-skip rule demonstrated itself.** The first `test:db` run at the audit
  reported 51 failures because PostgreSQL had stopped in the container. It failed
  loudly rather than reporting a green run of zero tests. With `describe.skipIf`
  the audit would have recorded a pass.
- **PostgreSQL in this container stops.** `pg_ctlcluster 16 main start` before
  `npm run test:db`. Some of the `pkill` patterns used for the dev server were
  taking it down.
- **213 Tailwind class names and no Tailwind.** Every page renders in browser
  defaults. Do not fix by installing Tailwind — that pre-commits the design agent
  to a vocabulary it did not choose. `/surface` first.

Session handoff log. **Newest entry at the top**, directly under this header.

Every session that changes anything ends with an entry here. This is what a
fresh agent — or you in three weeks — reads to know where things stand and what
the last session learned the hard way.

Format:

```markdown
## YYYY-MM-DD — one-line summary of the session

**Did**: what actually changed. Name changes, items, files.
**State**: what is in flight right now and how far along.
**Next**: the single next action, named as a command or skill.
**Watch out**: gotchas, dead ends, decisions that are not obvious from the diff.
```

Only `## YYYY-MM-DD — summary` headings are parsed; everything else is free text.
Write `**Watch out**: none` rather than dropping the line — an empty field is a
signal, a missing one is ambiguous.

Read it with `python3 .claude/tools/openspec.py journal --limit 5`, or see it
folded into `board`.

**Merge conflicts** are expected here when two sessions run in parallel, and the
resolution is always the same: keep both entries, newest first.

---

## 2026-07-28 — Serving is gated, and the first version of the gate was broken

**Did**: `scripts/check-serving.sh` — starts the built application with only
what `.env.example` documents and requests four session-resolving routes. Wired
into the `app` job after migrations. Closes `serving-is-not-gated`, the gap that
produced two live defects.

**State**: 0 active changes, `validate --all` clean with zero warnings, 23 open
backlog items. Seven quality gates in the `app` job now.

**Next**: `wire-an-assistant-model` (P2) — the assistant is complete and has no
model behind it, which is an MVP scope bullet that does not work.

**Watch out**:
- **The first version of this check passed against the injected defect.** A
  server left over from an earlier run was still listening; the new process
  bound nothing, `curl` reached the stale correctly-configured server, and the
  check reported green. I nearly shipped a guard that could pass while the
  application could not boot — the exact failure mode it exists to prevent, one
  level up. Fixed by refusing to start when the port already answers, and by
  aborting the readiness wait when the server process dies.
- **Any check that talks to a process it started must verify it is measuring
  the thing it launched.** That is the transferable lesson, and it is not
  specific to this script.
- **The variable list is read from `.env.example`, never written in the
  script.** That is the whole design. Hardcoding it would let the check pass
  while the documentation is wrong.
- **`/connect` is deliberately excluded** from the probed routes. It does not
  resolve a session, which is why it stayed green through both incidents and is
  worthless as a canary.
- PostgreSQL 16 is in this container: `service postgresql start`, create the
  role and database, `npm run db:migrate`. The serving check needs it.

## 2026-07-28 — Archived: app-access now says what the product actually does

**Did**: `/archive close-the-reachability-gap`. Three operations merged into
`openspec/specs/app-access/spec.md` — one MODIFIED replaced in place, two ADDED
appended. The capability went 9 → 11 requirements. Closed `five-dead-links` and
`four-dead-write-paths`, which the tracking layer flagged as still in-progress
against an archived change.

**State**: **0 active changes**, 24 open backlog items, `validate --all` clean
with zero warnings. Seven capabilities, and `app-access` finally contains the
reachability requirements it has been enforcing since PR #3.

**Next**: the launch blockers — `wire-an-assistant-model` (P2, the assistant has
no model behind it) and `serving-is-not-gated` (P2, now with two recorded
instances). Then `strategy-catalog`'s design ticket.

**Watch out**:
- **This archive was the first live exercise of the P0 merge fix.** One MODIFIED
  and two ADDED against a nine-requirement spec. Verified byte-wise afterwards:
  all 8 untouched requirements identical, none lost, only the modified block
  changed. The defect this fixes would have silently deleted a neighbour.
- **The tracking layer caught its own drift immediately** — two items still
  `in-progress` pointing at a change that had just archived, reported as
  `backlog_change_archived` before I thought to look. That check earns its keep.
- Archiving is not the gate. The production gate passed separately and was
  recorded in `plan/production-gate.md`; archiving is what makes the delta the
  source of truth afterwards.

## 2026-07-28 — Production gate PASSED on close-the-reachability-gap

**Did**: Ran the auditor. **PASS**, zero open violations. Spec parity 3/3 with
every requirement located in code, scope clean, no technical debt in touched
paths, and all six quality gates green — typecheck, lint, 394 tests, build,
schema-matches-migrations, and 51 database tests against real PostgreSQL. Gate
tracker at `plan/production-gate.md`. Filed
`config-quality-gates-are-placeholders` (P2).

**State**: `validate --all` clean. The change is gated but **not archived** —
`openspec/specs/app-access/` still does not contain what it delivered.

**Next**: `/archive close-the-reachability-gap`.

**Watch out**:
- **The guard was re-demonstrated failing during the audit, not accepted on a
  green run.** This change exists because three earlier checks passed while
  measuring the wrong thing; taking its replacement on trust would have been the
  same mistake wearing a new name. All three halves caught their defect and
  named the file.
- **The audit ran a check no previous audit on this project had**: serving the
  built application and requesting every route. That is what found the
  `SESSION_SECRET` P1 — which was pre-existing, invisible to all six gates, and
  had every capability route returning 500.
- **`openspec/config.yaml` still holds the template's placeholder
  `quality_gates`.** The gate commands had to be read out of `package.json`. A
  gate whose own commands are undefined is a gate on trust; filed as P2 and it
  pairs with `checklist-says-pnpm`.
- **Auditing a change that already merged is fine** — the evidence window
  resolves historically (`7f1cb28..ed17330`) and every check ran against real
  code. What it does mean is that a BLOCKED verdict would have arrived after the
  fact, which is an argument for running the gate before the merge, not against
  running it late.

## 2026-07-28 — Verified the reachability change, and serving it found a P1

**Did**: Advisory verification of `close-the-reachability-gap` (full track,
24/24, never verified). It passes. Then served the built app against real
PostgreSQL — the first time anything had — and found `.env.example` missing
`SESSION_SECRET`. Filed, fixed, and recorded as a second instance on
`serving-is-not-gated`.

**State**: All 12 capability routes return 200 from a `.env.example`-only setup;
before the fix every one but `/connect` returned 500. `validate --all` clean.
PR #5 carries it.

**Next**: the **auditor** on `close-the-reachability-gap` — it is a full-track
change and the production gate has not run.

**Watch out**:
- **The guard was demonstrated failing on all three things it claims to
  catch** — a dead link, a string-bound form, an orphaned `'use server'` export
  — each naming the offending file. This change exists because three earlier
  checks passed while measuring the wrong thing, so its own guard did not get
  taken on trust.
- **The 500s were not this change's fault and looked exactly like they were.**
  Every capability route failed; only `/connect` worked. The cause was one
  undocumented environment variable read on every session-resolving request.
  When a whole product 500s uniformly, suspect configuration before code.
- **Nothing catches this class of defect.** Build, typecheck, lint, 394 unit
  tests and 51 database tests were all green throughout — the database suite
  builds its own config rather than going through `loadConfig()`. Second
  instance of the same gap; the first was a malformed encryption key during
  `prove-it-runs`.
- **PostgreSQL 16 is installed in this container and starts with `service
  postgresql start`.** Create the role and database, run `npm run db:migrate`,
  and the full stack runs locally. That is worth knowing — it is what made this
  finding possible and nothing in the repo says it.

## 2026-07-28 — DT-0002 implemented: the review panel is designed

**Did**: Restyled `plan-review.tsx` per DT-0002 — every declared state, tokens
only. Verified by building a throwaway harness route with three fixtures
(reaches-5-with-concerns, reaches-none-no-changes, unknown-reach-apply-refused),
screenshotting both colour schemes, then deleting it. `strategy-editor` is now
`status: designed`; both its tickets are `implemented`. Proof in
`docs/merge/proof/review-panel-*.png`.

**State**: `validate --all` reports **0 errors, 0 warnings**. typecheck, lint,
394 TS tests, build, 192 python tests all green. Branch restarted from `main`
after both PRs merged, so this is a fresh change and needs a new PR.

**Next**: `strategy-catalog` is the natural next ticket — same capability, and
its empty state is still unwritten. Then the remaining ~10 surfaces.

**Watch out**:
- **Rendering it found a flaw the ticket did not.** The page `<h1>` and the
  panel `<h2>` were both `type.size.xl`, so the hierarchy was flat. Raised the
  edit page's six headings to `2xl`. A design ticket can specify each element
  correctly and still be wrong about how they sit together — which is the
  argument for rendering before marking anything implemented.
- **The harness route had to be `dt0002-harness`, not `__dt0002`.** Next treats
  `_`-prefixed directories as private and excludes them from routing, so the
  first attempt 404'd and looked like a build problem.
- **The harness is deleted.** If a future session wants the same check, rebuild
  it rather than looking for it; a fixture route left in `app/` is a route
  users can reach.
- Both colour schemes verified: consequence reads warm, notice cool, and they
  share no colour with danger in either. `reaches-none` (a quiet line) and
  `unknown` (a bordered block) are distinguishable without reading them.

## 2026-07-28 — Both PRs landed; main holds the product, styled

**Did**: Merged PR #3 to `main` (`15baafc`), then integrated PR #4 on top —
conflicts resolved, test-side patch applied, surfaces and tickets moved into
`openspec/design/`, DT-0001 implemented. Verified with `npm ci` exactly as CI
would: typecheck, lint, 394 TS tests, `next build`, 192 python tests, `validate
--all` clean.

**State**: `main` has seven capabilities, 16 routes, a `designed` design system,
4 surfaces and 2 tickets. The product renders.

**Next**: **executor** on DT-0002 — the review panel. Then survey the remaining
~10 surfaces.

**Watch out**:
- **Two defects were found only by running the gates on the real branch**, not
  in the scratch worktree. `main` uses `package-lock.json` and the `app` job
  runs `npm ci`, but DT-0001 was built with pnpm — adding dependencies without
  regenerating the npm lockfile would have failed CI on the first run. And
  `pnpm lint` rejected `tools/generate-theme.mjs` for `no-console`, which the
  worktree sweep had not exercised. Verify on the branch that merges, not only
  on a copy of it.
- **The action pins matter and are easy to lose.** `main` carried `@v5`/`@v6` in
  jobs that have never executed. The merge normalises everything to `@v4`/`@v5`,
  the only pins this repository has ever run green. Do not "upgrade" them
  without a passing run to point at.
- **`pnpm-lock.yaml` was deleted deliberately.** Two lockfiles for one
  `package.json` is a drift generator, and the CI job that exists uses npm.
- CI still cannot execute — the account block is unchanged. Everything above was
  verified locally, and `./scripts/check.sh --matrix` remains the way to check.

## 2026-07-28 — The product renders

**Did**: Implemented **DT-0001** on the merged tree and verified it end to end.
`tools/generate-theme.mjs` turns `system.json` into `app/tokens.css` and
`tailwind.theme.json`; Tailwind installed and wired; `app/globals.css` written;
`layout.tsx` imports it. `pnpm build` green across all 16 routes, and `/connect`
served and screenshotted in **both colour schemes**. Patch and screenshots in
`docs/merge/`. DT-0001 marked `implemented`.

**State**: The product has rendered as something other than browser defaults for
the first time. Patch is not applied to any branch — it touches `app/` and
`package.json`, which live on PR #3.

**Next**: land the merge, apply `docs/merge/dt-0001-implementation.patch`, then
**executor** on DT-0002.

**Watch out**:
- **Tailwind `extend`, never a replacement theme.** The 28 components use stock
  utilities — `p-3`, `text-sm`, `max-w-2xl`. Replacing the theme breaks every
  one of them. The placeholder token scale already matched Tailwind's defaults
  (space.4 = 16px = `p-4`, type.size.sm = 14px = `text-sm`), which is what makes
  extending safe.
- **The generator refuses to emit a partial dark theme.** If any colour role
  lacks a dark counterpart it exits non-zero rather than letting the light value
  inherit. Verified by construction — all 37 roles have one.
- **Colours are CSS custom properties, not literals in the Tailwind theme.**
  That makes light and dark one declaration each instead of a `dark:` variant on
  every element, and it is why dark mode worked on the first try.
- **`layout.tsx` carried a comment saying it deliberately holds no visual
  design, deferring to the design agent (DL-007).** That deferral has now
  resolved, so the comment was updated rather than left to contradict the import
  sitting above it.
- The screenshots are `/connect`, which is not one of the two surveyed surfaces
  — it is static and needs no database, so it is the only route that renders
  without Postgres. It proves the tokens ship; it does not verify DT-0002.

## 2026-07-28 — Design system settled, first two tickets written

**Did**: `/design`. `openspec/design/system.json` is now `status: designed` —
three product-specific colour roles (`quiet`, `notice`, `consequence`), a
`consequence-callout` primitive, and five added principles. Two tickets:
**DT-0001** (tokens — make system.json render, plus the page shell every branch
uses) and **DT-0002** (the review panel, blast radius, changed axes). Zero
errors, every declared state styled, no raw values.

**State**: system.json committed here. Tickets in `docs/merge/tickets/`,
surfaces in `docs/merge/surfaces/`. 2 of ~14 surfaces designed.

**Next**: land the merge, then run **executor** on DT-0001 before DT-0002.

**Watch out**:
- **DT-0001 makes the Tailwind call the backlog deferred.** Keep Tailwind,
  generate its theme from `system.json`. The item was right that installing it
  blindly pre-commits the design agent to a vocabulary — but that vocabulary is
  already in 28 components, rejecting it means rewriting all of them for no
  visual gain, and a generated theme keeps `system.json` the single source. If
  theme and system can drift, DT-0001 is not done.
- **The placeholder palette had no way to say "notable but not wrong".** Only
  `warning` and `danger`, and concerns being misread as errors is the exact
  failure `plan-review.tsx` guards against in prose. `notice` exists so the
  ticket does not have to borrow danger's colour.
- **The apply button is deliberately not danger-styled.** Applying is the
  legitimate purpose of the page; styling it as a hazard trains people to flinch
  at the correct action. Weight goes on the consequence, not the control.
- **A tokens ticket cannot have empty `targets`** — `design_missing_field`.
  Resolved honestly by having DT-0001 also own the page shell, which it
  genuinely delivers for all seven branches, rather than listing states it does
  not style.
- **Tickets cannot live on this branch** — `design_ticket_unknown_surface`, 2
  errors, since they name a surface whose manifest is on PR #3. `system.json`
  can, and does: it references no source files.

## 2026-07-28 — First UI survey: two surfaces, and the empty state nobody wrote

**Did**: Surveyed the built UI for the first time, in the merged worktree where
it exists. Two `UISurface` manifests — `strategy-catalog` and `strategy-editor`
— covering the product's differentiating flow (compose → compile → review →
apply). Both validate clean on the merged tree with every component id
traceable. Delivered as `docs/merge/surfaces/` because they cannot live on this
branch. Filed `strategy-list-has-no-empty-state` (P2).

**State**: 2 of ~14 surfaces surveyed. PR #4 green, merge recipe verified.
Backlog 8 open.

**Next**: `/design strategy-editor` to establish the visual language, or survey
the remaining surfaces first. The design system is still `placeholder`.

**Watch out**:
- **Surfaces cannot be committed to this branch.** They reference `app/` and
  `src/` files that only exist on PR #3, so `validate --all` here reports
  `design_source_file_missing` — 2 errors. Verified, not assumed. They ship in
  `docs/merge/surfaces/` and get copied into `openspec/design/surfaces/` at
  merge.
- **I invented six components that do not exist.** `strategy-row`,
  `concerns-panel`, `apply-confirmation` and others were regions I could see in
  the JSX but that no ticket could target. `design_component_not_found` caught
  every one. Folded them into the real components as prefixed states, and added
  `edit-strategy-page` for the route's five render branches — that identifier
  does exist. The check maps kebab-case ids to PascalCase source identifiers.
- **Collapsing them naively lost real content.** The first pass dropped four
  page-level branches (`vocabulary-unavailable`, `compile-rejected`,
  `strategy-not-found`, the compose form) because they were not children of a
  kept component. Re-added under the route component. Check what a
  restructuring script discards, not just what it keeps.
- **The empty state is the first impression.** `StrategyList` has no
  `listings.length === 0` branch, so a newly connected user sees a heading and
  blank space — which reads exactly like the broken page the `unreadable`
  branch was carefully written to distinguish itself from.
- Every constraint in these manifests came from a comment in the code, not from
  my judgement. That code explains *why* unusually well, and it is what makes
  the constraints defensible rather than preferences.

## 2026-07-28 — Merge verified: clean auto-merge, 16 failing tests

**Did**: Merged this branch into PR #3 in a scratch worktree and ran the
combined suite. `openspec.py` auto-merges with **zero conflict hunks** and the
result failed **16 of PR #3's 124 harness tests**. Fixed the one that was mine
(`e23ca0d`), identified the other two causes, and drove the merged tree to
**192/192** with `validate --all` clean. Recipe filed as `merge-pr3-and-pr4`
(P1) with the test-side patch at `docs/merge/pr3-test-side.patch`.

**State**: PR #4 at 60 tests, green on 3.10-3.13. Merged tree 192/192. Backlog
7 open.

**Next**: Land PR #3, then PR #4. Everything needed is in `merge-pr3-and-pr4`.

**Watch out**:
- **A clean auto-merge is not a correct one, and this is the proof.** Zero
  conflict hunks in the one file both branches rewrite, and 16 tests failed
  anyway. Nobody would have run the combined suite before merging — that is the
  whole point of having run it.
- **My own defect was the interesting 4 of the 16.** `archive_change` returned
  on `tasks_incomplete` before reaching `merge_conflict` and
  `archive_target_exists`, so a policy stop hid a structural defect. It only
  showed up because PR #3's fixtures stack both conditions; my own tests never
  did.
- **PR #3's `ast` meta-test earned its keep.** I criticised it in the review for
  being unable to surface codes nobody wrote — true, but it caught all eight
  codes I added with no fixture. The limitation I named was real and so is the
  value.
- **I discarded my own uncommitted fix** with a `git checkout --` while
  restoring an injected defect, and only noticed because the next check failed.
  Inject into a copy, not the working tree.
- Pin CI to `actions/checkout@v4` / `setup-python@v5`. PR #3's `@v5`/`@v6` sits
  in a job that has never executed.

## 2026-07-28 — Verification no longer depends on GitHub

**Did**: The owner has no billing access, so Actions minutes are not coming
back on request. Added `scripts/check.sh` — every gate, runnable anywhere,
`--matrix` across every `python3.x` present. CI gained a `matrix` job that
calls the same script across 3.10–3.13, so the script stays exercised rather
than rotting while looking maintained. Verified the branch from a clean
checkout of the pushed commit on four interpreters: 58/58 and `validate --all`
exit 0 on each.

**State**: All five review findings fixed, 59 tests, `check.sh` green on
3.10/3.11/3.12/3.13. Backlog 6 open. GitHub has still executed none of it.

**Next**: If Actions matters, the repository has to go public (free unlimited
minutes) or get a self-hosted runner (free on private, needs admin). Both are
owner decisions. Neither blocks the work now that the gates run locally.

**Watch out**:
- **Failure injection found an untested guard, again.** Breaking
  `parse_requirements`'s `skip is None` fallback broke *no test* —
  `SpecDoc._parse` always passes `skip`, so the defensive path the comment
  justifies had nothing checking it. Now covered, and watched failing first.
  Third time on this branch that writing a guard was not the same as knowing it
  worked.
- **The first failure-injection attempt was itself invalid** and briefly looked
  like the check script was broken. Worth the reflex: when a guard does not fire,
  suspect the injection before the guard.
- **The two inline CI jobs were left alone deliberately.** They are byte-identical
  to PR #3's, so converting them to call the script would have turned a
  keep-one conflict into a semantic one. The new `matrix` job is additive.
- **A script CI never runs is not a fallback**, which is why the matrix job
  calls it rather than restating the commands a third time.

## 2026-07-28 — CI diagnosed properly: no runs are being created, and it is not a startup failure

**Did**: Stopped repeating the inherited diagnosis and actually queried the
Actions API. `ci-startup-failure` is wrong: there are **no `startup_failure`
runs in this repository at all** — 37 runs total, the 30 most recent all
`success`. Runs simply stopped being *created* at `2026-07-28T07:54:54Z`, on
every branch. Filed `ci-creates-no-runs` (P1) with the evidence, superseding the
misdiagnosis. Added `workflow_dispatch` to the workflow so a run can be
requested by hand.

**State**: Branch carries all five review fixes and 58 tests; `validate --all`
clean, 1 warning. Backlog 6 open. Nothing on this branch has ever been executed
by CI.

**Next**: The fix is not a commit — it needs repository settings. Billing
spending limit first (exhausted minutes stop run creation while leaving the
workflow `state: active`, which matches exactly what the API reports), then
Settings → Actions → General.

**Watch out**:
- **I repeated a wrong diagnosis for a day because it arrived pre-packaged.**
  `startup_failure` / `path: BuildFailed` came from a parallel session's backlog
  item, and I passed it into three PR comments without once checking it against
  the API. The check took one query. A borrowed diagnosis is a hypothesis, not
  evidence, and it deserves the same scepticism as one of my own.
- **The distinction is not pedantic — it changes who can fix it.** A
  `startup_failure` is a run that exists with a workflow GitHub could not start,
  and a commit can fix it. Zero runs created is Actions not dispatching, and no
  commit can. A day was spent believing the fix was on the wrong side of that
  line.
- **The decisive evidence was PR #3's own head, not mine.** Its `52ea2b5` also
  has zero check runs, which is what separates "repo-wide" from "something
  about my branch or my PR". Checking only my own branch would have left that
  ambiguous.
- The session token cannot dispatch a run (`403`, no `actions: write`) or read
  settings/billing, so this is where automated diagnosis ends.

## 2026-07-28 — The silent-check pass: last three review findings closed

**Did**: Fixed `archive-allows-incomplete-tasks` (P1),
`frontmatter-drops-block-lists` (P2) and `validate-change-metadata` (P2) in one
pass, since all three are the same failure mode — the check fails silently and
silence reads as a pass. `archive` refuses on unfinished tasks with
`--allow-incomplete` as the override; block-style YAML lists parse; an
unrecognised `track` is an error rather than a quiet downgrade to `standard`.
Also: bare `validate` no longer exits 1 on a repo with everything archived, and
a delta with no capability directory is refused.
`tests/test_silent_checks.py` adds 23 tests.

**State**: `validate --all` clean, 1 warning (design system placeholder). Suite
green: 58/58 across three files. Backlog 5 open (0×P0, 1×P1, 1×P2, 3×P3) — all
five review findings are closed. The P1 left is `add-harness-regression-tests`,
which PR #3 already marks done; it reconciles at merge.

**Next**: nothing outstanding from the review. The remaining items are PR #3's
(`ci-startup-failure` is the one that matters — CI has never actually run any
of this) plus three P3 chores.

**Watch out**:
- **The task gate is checked at archive, not in `validate_change`.** A change
  under development is *supposed* to have unfinished tasks; making that a
  validation error turns `board` and CI red for the normal case. Archiving is
  the single moment the delta becomes the contract.
  `test_validate_does_not_report_incomplete_tasks` exists to stop someone
  tidying the check into the wrong layer.
- **`[""]` had two sources and the report named one.** Fixing
  `parse_frontmatter` to read block lists left `BacklogItem` still wrapping an
  empty scalar into `[""]`, so the empty case — the one
  `backlog_blocked_without_cause` is *for* — was still broken after the filed
  fix was complete. Caught by writing the other side of the check as its own
  test. When a bug is "X is truthy when it should be empty", find every place
  that constructs X.
- **`--allow-incomplete` is a flag, not a config key**, so the decision to
  archive unfinished work is visible in the command someone ran rather than
  buried in a file.
- 16 of the 23 new tests fail against the unfixed tool. The 7 that pass are all
  regression guards — inline lists, scalars, a clean change, each valid track, a
  fully-checked change, a checkbox-free tasks.md, and the validate/archive
  layering.

## 2026-07-28 — P1 fixed: fenced examples are no longer parsed as structure

**Did**: Fixed `spec-parser-ignores-code-fences`. One `fenced_lines()` pre-pass
returns the line indices inside fenced blocks, and every scanner consults it —
`parse_requirements`, `SpecDoc._parse`, `_parse_renames`, `read_journal`, and
`BacklogItem._title_from_body`. Five sites; the item filed three.
`tests/test_fenced_blocks.py` adds 24 tests.

**State**: `validate --all` clean, 1 warning (design system placeholder). Suite
green: 34/34 across both files. Backlog 8 open (0×P0, 2×P1, 3×P2, 3×P3).

**Next**: `archive-allows-incomplete-tasks` (P1) — `0/N` tasks archives clean
and silent. After that the two P2s (`frontmatter-drops-block-lists`,
`validate-change-metadata`) are one pass, not two: both are the silent-check
pattern the review named.

**Watch out**:
- **The archive was rewriting the example, not just adding it.** Splitting the
  requirement at the phantom heading and rejoining the pieces injected a blank
  line after the opening fence. So the merge corrupted the block it should
  never have been reading — a second defect hiding behind the first, and not in
  the filed report.
- **My first version of the archive test was wrong in the bug's own shape.** It
  scanned the merged file for `### Requirement:` lines to prove the phantom was
  absent — but the file legitimately *contains* that line, inside the fence. A
  fence-blind assertion cannot tell the two cases apart. It now asserts on the
  merge plan (`result["operations"]`). Worth remembering when writing any test
  about this: the naive scan is the bug.
- **Evidence quality differs across the 24 tests.** 12 of the 13 behavioural
  ones fail against the unfixed parser. The other 11 unit-test `fenced_lines`
  directly and merely *error* without it, because the function is new — that is
  not the same as watching a guard fail, and it should not be counted as if it
  were.
- **`parse_requirements` computes the fence set when not handed one.** Deliberate:
  a caller that forgets the argument gets correct behaviour rather than silently
  fence-blind parsing. `_parse` computes once and threads it through.
- Four spaces of indent is an *indented* code block, not a fence opener. Getting
  that backwards would open a fence that never closes and take the rest of the
  file dark.
- Output on this repo is byte-identical before and after, for both `validate
  --all` and `journal`. The defect was latent here, not active.

## 2026-07-28 — P0 fixed: the archive merge now refuses ambiguous deltas

**Did**: Fixed `fix-archive-merge-integrity` at both layers and added
`tests/test_merge_integrity.py` (10 tests, plain `unittest`, no dependencies).
Validation refuses a requirement targeted more than once
(`requirement_multiple_operations`, `duplicate_requirement_in_delta`) and
reports duplicates already sitting in a main spec
(`duplicate_requirement_in_spec`). `build_merged_spec` asserts its edit ranges
are disjoint before splicing and raises `ValueError`, which `archive_change`
already turns into a clean abort. CI gained a `tests` job.

**State**: `validate --all` clean on the repo, 1 warning (design system
placeholder). Suite green: 10/10. Backlog 9 open (0×P0, 3×P1, 3×P2, 3×P3) —
`fix-archive-merge-integrity` is done, the other four review findings are not.

**Next**: `spec-parser-ignores-code-fences` (P1) — the remaining corruption
path into the source of truth, and the one most likely to bite this repo,
since `spec-validation` is a capability about the spec format.

**Watch out**:
- **Every test was run against the unfixed tool before being trusted.** 7 of
  the 9 merge tests fail without the fix. The 2 that pass are the regression
  guards and must pass in both states — `test_operations_on_different_
  requirements_still_merge` (PR #3's exact three-disjoint-ranges scenario) and
  `test_adjacent_requirement_ranges_are_not_treated_as_overlapping`, which
  catches the off-by-one that would refuse every delta touching two
  neighbours. A guard nobody watched fail is not known to work.
- **Rename pairs are not in `doc.sections`.** They parse into `doc.renames`
  and `sections["RENAMED"]` is left empty, so any code collecting "what does
  this delta target" from sections alone silently misses renames. That is how
  the original overlap went unnoticed, and PR #3 hit the same edge from a
  different direction.
- **The fix refuses rather than resolves.** REMOVED plus MODIFIED on one
  requirement has no correct interpretation; picking one would be guessing at
  intent. The tool names the requirement and stops.
- **The CI job is deliberately dependency-free**, and
  `test_the_tool_imports_only_the_standard_library` is what makes that
  meaningful — without it, no install step just means nothing checks.
- `.github/workflows/validate.yml` will conflict with PR #3, which adds its
  own `tests` job. Mine is byte-identical to theirs on purpose; resolve by
  keeping one. `openspec/JOURNAL.md` conflicts too — keep both, newest first.

## 2026-07-28 — Tool review: archive merge can corrupt the source of truth

**Did**: Read `.claude/tools/openspec.py` end to end (1,651 lines) and
exercised the write path against scratch fixtures. Filed 5 new backlog items,
one of them the first P0 this repo has had. Also costed the harness in tokens
— see below. No code changed; this session is a review.

**State**: `main` unchanged. 10 open backlog items (1×P0, 3×P1, 3×P2, 3×P3)
against `main`; two of them — `add-harness-regression-tests` and
`enforce-journal-entry` — are already closed on PR #3 and should be reconciled
rather than worked. `validate --all` clean, 1 warning (design system
placeholder). `CLAUDE.md` and `openspec/config.yaml` are still unfilled
templates **on `main`**; PR #3 fills them.

**CI is red on this PR and it is not the diff.** Every run since `7f1cb28` is a
`startup_failure` with `path: BuildFailed` — the workflow never starts, on
`main` and on both open branches, including commits that touch only markdown.
Already filed by the parallel session as `ci-startup-failure` (P1); nothing to
fix here.

**Next**: `/propose` `fix-archive-merge-integrity` together with
`add-harness-regression-tests` — the fix needs the tests in the same change,
because the two reproductions below are precisely the fixtures that item asks
for.

**Watch out**:
- **All five findings reproduce against PR #3's tool as well**, which ships 124
  harness tests and closes `add-harness-regression-tests`. Do not assume
  merging PR #3 closes any of them. `tests/test_archive_merge.py` even carries
  `test_multiple_operations_do_not_disturb_each_others_line_ranges`, which
  names the exact property the P0 violates and passes — it uses three
  *different* requirements, so the ranges are disjoint. The defect is two
  operations on the *same* requirement.
- **The archive merge can silently delete a requirement nobody mentioned.**
  A delta that both REMOVEs and MODIFIEs one requirement produces two line-range
  edits with the same start offset, computed against the pre-edit spec. The
  first splice invalidates the second. Reproduced: main spec with `Login` and
  `Logout`, delta touching only `Login`, result was a modified `Login` and no
  `Logout`. `validate` said clean, `archive` exited 0, the dry run showed the
  same wrong plan the apply executed. Nothing in the output distinguishes this
  from a correct merge.
- **Duplicate requirement names merge in unflagged**, after which every
  MODIFIED and REMOVED hits only the first. `find()` returns the first match
  and no uniqueness check exists at any layer.
- **Fenced code blocks are parsed as live structure.** No scanner in the file
  is fence-aware. A spec containing a markdown example of the spec format gets
  a phantom requirement archived into the source of truth, plus a false
  `requirement_without_scenario` on the real one. Relevant here specifically:
  `spec-validation` is a capability *about* the spec format.
- **Several checks fail silently, and silence reads as a pass.** Block-style
  YAML lists parse to `[""]`, which is truthy and defeats the
  `blocked_without_cause` check written for exactly that case. A typo'd
  `track:` coerces to `standard`, dropping planner, auditor, and the
  production gate with no diagnostic. The git staleness check and the JS-only
  import check already had this shape (`import-check-js-only`). Worth treating
  as a class, not four separate bugs.
- **`validate` with no active change exits 1** on a healthy repo —
  `resolve_change` dies before anything is checked. CI is unaffected only
  because it spells it `validate --all`.
- **Budget** (rough, chars/4): baseline ~3.1k tokens per session before any
  work. Instruction load per full chain — `lite` ~30k, `standard` ~34k,
  `full` ~50k, and that is with `docs/specs/` **absent**. Executor alone is
  ~11.3k. The tool's own output is negligible (`board` ~250 tokens), so the
  spend is prose, not tooling. When `checklist-generator` runs it lands three
  more mandatory reads into the executor, planner, and auditor chains — the
  largest uncosted item in the budget, and worth sizing deliberately at
  generation time rather than discovering after.
## 2026-07-28 — The MVP is complete, and a "redundant" guard turned out to be a live defect

**Did**: Two changes. First `extend-coercion-guard` — the P2 the last journal
entry said to do *before* the next mapper, done before the next mapper. Then
`assistant-readonly`, the last of the four MVP changes. **Seven capabilities in
`openspec/specs/`, 390 tests.**

The MVP exit criteria in the idea brief are met: a user can connect without
handling a credential, fork a system strategy, change it through the review
pipeline while seeing which agents the change will reach, bind an agent to it,
and read back a complete record of every write made on their behalf.

**The assistant's read-only guarantee is structural.** A model told not to write
will not write until something in its context suggests otherwise — a user asking
firmly, or text it just read out of a strategy field a user typed into. So it is
never handed a mutating tool: the set is filtered through the same `classifyTool`
the guard sequence uses. The port receives a question, a toolset and a
`callTool`, and nothing else — no adapter, no token, no `fetch`.

**Watch out** — one thing, and it is the most useful thing I have learned in this
project.

Mutation testing removed a `ConnectionRevokedError` re-throw from the assistant's
call path and **nothing failed**. The obvious reading is "redundant defensive
code" — precisely what a production gate exists to strip, and deleting it would
have been the confident move.

I wrote a test to prove the mutation mattered. **It failed against the unmutated
code.** The re-throw only reaches the use case if the assistant lets it
propagate, and a model harness that catches its own tool errors and carries on is
entirely ordinary — in which case the answer completed, grounded, about an
account the product had just lost access to. The guard was not redundant. It
simply was not what carried the requirement.

That is the second time in this project a surviving mutation was a missing test
rather than dead code, and the second time following it found something real.
**When a mutation survives, write the test that proves it mattered before
concluding the code is dead.** The test is cheap and it is the only way to tell
the two cases apart.

**State**: no active changes, seven capabilities, 11 open backlog items.

**Next**: `generate-initial-migration` (P1) the moment there is a database — four
repositories have still never executed a statement. Then
`wire-an-assistant-model` (P2): the assistant is complete and has no model behind
it, and every guarantee it makes is independent of which one.

---

## 2026-07-28 — Strategy authoring shipped; the guard I built last change missed the thing it was for

**Did**: Built, gated and archived `author-strategies` — the hardest of the four
MVP changes. `openspec/specs/` now holds six capabilities. 351 tests, up from
267 this morning.

Read the live server first. `compile_strategy_plan` is annotated `readOnlyHint:
true` by the server itself, so I ran a real one against a private strategy with
zero bound agents. **Seven of nine design decisions came from what came back**:

- **The plan token is a readable envelope** — `bgsp1.<claims>.<sig>`, and the
  claims carry expiry, owner, strategy and revision. So an expired plan is
  refused locally with a real reason rather than submitted and rejected. Used
  only to refuse; the signature can't be verified here.
- **`approvedPlan` is not the plan.** Apply takes a projection — two renames, one
  unwrap, eight omissions, each an unknown-key error. Handing back what compile
  returned fails every time.
- **`mismatches` are advisory.** A one-word tagline edit came back with two while
  `viable: true`. Blocking on them would refuse routine edits with no way around
  it, and an empty array *feels* like the success condition.
- **The server writes the confirmation copy.** `confirmationSummary` names the
  operation, revision, axes and blast radius. Ours would be a second description
  of one act.
- **The vocabulary genuinely can't be guessed** — two of my first three live calls
  were rejected for facts only the server holds.

**State**: no active changes, six capabilities, 10 open backlog items. One MVP
change remains: `assistant-readonly`.

**Next**: `generate-initial-migration` (P1) whenever there's a database, then
`/propose assistant-readonly`.

**Watch out** — one thing, and it is about me rather than the code.

The same defect appeared a **fourth** time: `mapStrategy` defaulted `id` to `''`
and `revision` to `0`, both of which flow into a destructive apply. Last change I
added `concurrency.test.ts::no identifier is coerced into existence` *precisely*
so a fourth occurrence would fail the build. It scans form coercions and
`<identifier> ?? <value>`. `String(s['id'] ?? '')` matches neither. **The fourth
occurred and the build stayed green** — a human reading scan output caught it,
which is the work the guard was supposed to replace.

A guard that misses the next instance is worse than none, because it creates a
belief the class is covered. `extend-coercion-guard-to-mappers` (P2) has the
concrete rule: inside a mapper or adapter, an `id` or `revision` assignment must
be preceded by a `throw`, as both mappers now are. Do that before the next
mapper is written, not after.

---

## 2026-07-27 — The product is reachable, and a defect appeared for the third time

**Did**: Built, gated and archived `wire-the-app` — the P1 the previous gate
found. `openspec/specs/` now holds `app-access` (6 requirements) alongside
`battlegrid-connection`, `agent-authoring`, `harness-integrity` and
`spec-validation`. 267 tests.

Session, authority resolution, composition root, ten routes — and the four
Drizzle repositories, because `src/infrastructure/db/repositories/` turned out to
be empty as well. **The backlog item understated the gap**: it said routes and a
session were missing; the truth was that nothing had ever written a row, and
every test in both prior changes ran against in-memory doubles.

`tests/access/end-to-end.test.ts` is the one that matters. Session → authority →
guard sequence → adapter → BattleGrid, doubled only at `fetch`. It proves through
the real path that a destructive call without a confirmation is refused before it
is attempted and writes no audit row. Three changes had been resting on that.

**State**: no active changes, five capabilities in `openspec/specs/`. 9 open
backlog items. Two MVP changes remain: `author-strategies`, `assistant-readonly`.

**Next**: `generate-initial-migration` (P1) the moment there is a database — see
below. Then `/propose author-strategies`.

**Watch out**: three things.

1. **The same defect has now appeared three times.** `expectedRevision ?? -1`
   (PG-003), `slotUsage.limit ?? 0` (PG-101), `Number(formData.get(...))`
   (PG-201) — different layers, different fields, one shape: a fabricated number
   standing in for one that was never supplied. Each was invisible to a green
   suite. I wrote the lesson into this journal twice and it recurred anyway,
   which is the argument that a written lesson is not a control. It is a test
   now: `concurrency.test.ts::no identifier is coerced into existence` fails the
   build on a fourth.
2. **`DrizzleConfirmationStore.consume` would have been replayable**, and it was
   caught by reading rather than by a test. The single-use check read from
   `.returning()`, which is the post-update row, so it could never fail. Both
   prior changes prove the *domain* enforces single use — against a fake that
   got it right. Which leads to:
3. **No repository has ever executed a statement.** Four of them, written and
   typechecked against the schema, and no migration has been generated because
   there is no database here. Filed as `generate-initial-migration` (P1). Expect
   the `text[]` column, the unique index on `(user_id, idempotency_key)`, and the
   `onConflictDoUpdate` target to disagree with something on first contact.

---

## 2026-07-27 — Agent authoring shipped; the product is complete and unreachable

**Did**: Built, gated and archived `author-agents`. `openspec/specs/` now holds
`agent-authoring` (10 requirements) alongside `battlegrid-connection`, whose
scope requirement was MODIFIED to say the authority an operation is measured
against is the one recorded on the connection. 223 TypeScript tests, up from 97
this morning.

Read the live server before designing the form — tasks 0.1–0.3 — and four of the
nine design decisions changed as a result:

- `capabilities.canDelete` is `true` on a live agent and **no delete tool exists
  over MCP**. The flag describes what BattleGrid's own app can do. Dropped at the
  mapper; a comment-stripped scan keeps it out of code.
- `tradingConfig` is all-or-nothing, so editing one limit is a read-modify-write.
  A partial send does not error — it *resets* the omitted fields.
- Five position-management presets live, four in our own docs, written a week
  ago.
- The bounds registry covers sixteen limits and is silent on three constrained
  fields. Silence is reported as `unvalidatable`, never as permission.

Closed the fail-open `scopesFor()` stub first, before any agent write landed.

**State**: no active changes. `openspec/specs/` has four capabilities. 8 open
backlog items, three filed by this gate.

**Next**: `/propose wire-the-app` — see the warning below. Then
`author-strategies`, then `assistant-readonly`.

**Watch out**: two things, and the second is the important one.

1. The `rg "??"` fallback scan has now found the most serious defect in *both*
   changes it has run on, and both were the same shape: a fabricated number
   presented to a user as fact (`expectedRevision ?? -1`, then
   `slotUsage.limit ?? 0` rendering as "you are using all 0 of your agent
   slots"). Both were invisible to a green suite for the same reason — the tests
   supplied the value the production path omits. Writing the lesson down after
   change 1 did not prevent change 2. Make the guard mechanical.
2. **Nothing renders any of this.** Two changes, 223 tests, every requirement
   delivered, and no user can reach a line of it: there is no session, no
   composition root, no route. Both delta specs are fully satisfied by
   unreachable code, because neither ever says *reachable*. Filed as
   `no-composition-root` (P1) and it should be built before the next feature,
   not after. A requirement set that never says reachable can be completed and
   still not be a product.

---

## 2026-07-27 — The first capability is real: gate passed, deltas archived

**Did**: Ran the production gate on `connect-battlegrid-account` and archived it.
`openspec/specs/battlegrid-connection/` now exists with 10 requirements — the
first behavior contract this project has that describes running code rather than
an intention.

The gate found two defects, both from the same mandated scan (`rg "??"` over
touched paths), and both fixed before the decision:

- **PG-001, critical.** `subject: json.sub ?? ''`. Every grant without a subject
  collided on the empty key, so the second person to connect would be recognised
  as the first — a stranger's workspace, a stranger's connection, a stranger's
  audit history. The grant is now refused.
- **PG-003, major.** `RevisionConflictError(..., expectedRevision ?? -1, ...)`.
  The one production call site passes no revision, so every conflict a user
  would actually see read *"expected revision -1"*. Nullable now, clause omitted
  when unknown.

Gate: **PASS**, zero open violations. 99 TypeScript tests, 124 harness tests,
typecheck/lint/validate green.

**State**: no active changes. Three MVP changes remain: `author-agents`,
`author-strategies`, `assistant-readonly`. Five open backlog items, two of them
filed by the gate as named deferrals rather than waived findings.

**Next**: `/propose author-agents`.

**Watch out**: both gate findings were invisible to a green test suite, and for
the same reason — the tests supplied the value the production path omits. A
suite can be fully green and never once execute the branch users hit. When a
default has a call site that never provides the value, the default *is* the
behaviour; test it as such. Also: `scopesFor()` still returns a constant
(`scopes-from-connection`, P2) and must be replaced by whichever change first
needs a scope other than `mcp:read` — it fails open, reporting authority the
connection may not hold.

---

## 2026-07-27 — Grid-Commander has application code; verification found a real gap

**Did**: Built `connect-battlegrid-account` end to end on the `full` track.
94 TypeScript tests alongside the 124 Python harness tests, all three gates
(typecheck, lint, test) green and running in CI as separate steps.

Proved DCR against the live server first (task 0.1), because the token model
depended on facts reading could not settle. Two findings changed the design and
are recorded in `findings-dcr.md`: every client is public regardless of the auth
method requested, and registration-time scope is a usable hard ceiling — so the
production client registers `mcp:read` only, making wager authority
*unrequestable* rather than merely unrequested.

**Verification earned its keep.** Checking scenario-by-scenario against the
delta spec found that R10's second scenario — authority withdrawn at BattleGrid
rather than through us — was **not implemented at all**. A 401 became a generic
"failed with 401" the user could not act on, instead of "disconnected,
reconnect". Fixed, and the fix now fails 3 tests when reverted. R2's
"history survives disconnection" had no test either. Both closed.

**State**: PR #3 open. Change is 25/26 tasks, 10 requirements / 22 scenarios all
covered. `validate --all` clean apart from the placeholder design system.

**Next**: auditor (production gate), then `/archive`. Then changes 2–4 of the
MVP: `author-agents`, `author-strategies`, `assistant-readonly`.

**Watch out**:
- **Task 0.2 is deliberately left unchecked at 25/26.** Whether scope can be
  stepped up without re-consenting needs a human in a browser. Ticking it would
  have made the board lie. The tool's checkbox regex ignores `[~]` entirely, so
  a "partial" marker silently drops the task from both numerator and
  denominator — `[ ]` is the honest marker.
- **`scopesFor()` in the adapter is a stub** returning `['mcp:read']` rather
  than reading the grant's recorded scopes. Correct today because the
  registration cannot obtain more; the next change must replace it. Filed as F-3
  in the architecture review rather than hidden.
- **The MCP SDK is not a dependency.** The adapter uses `fetch` against the
  documented Streamable HTTP surface. The lint rule and boundary test remain, so
  reintroducing it outside `src/infrastructure/battlegrid/` still fails.
- **npm, not pnpm.** pnpm 11 refuses to run any script while a dependency's
  build script is unapproved and no configuration cleared it. Deviation from the
  brief, logged in the master plan.
- A mutation that does not compile is not a surviving mutation. One guard here
  is enforced by the type system, which is why `typecheck` is a separate CI step
  rather than folded into the tests.

## 2026-07-27 — The full track is unblocked; first change promoted to it

**Did**: Ran `checklist-generator` in CREATE mode. `docs/specs/` now exists with
three checklists, which is what the planner, executor and auditor hard-require —
the `full` track had been blocked since the repo's first commit.

Promoted `connect-battlegrid-account` from `standard` to `full`. It handles
delegated OAuth authority over other people's trading agents; that is the
profile the full track exists for, and shipping it on `standard` would skip the
production gate on the riskiest change in the project.

The checklists are project-specific rather than generic:

- **Architecture** carries six binding project policies (P1–P6) drawn from
  `openspec/config.yaml`: scope is not a safety boundary, capabilities are
  discovered at runtime and unknown tools fail closed, audit is written before
  the attempt, concurrency conflicts are surfaced not retried, compile is free
  of effect while apply is not, and every BattleGrid call goes through one port.
- **Data pipeline** was adapted rather than filled in. The generic template
  assumes the database is the source of truth; here **BattleGrid is**, for
  everything about agents and strategies, and our Postgres owns only
  connections, audit and compiled plans. The Iron Rule was rewritten around two
  sources of truth, plus a corollary: a cached value must be displayed as a
  snapshot with its age.
- **UI** has a section the template does not: *Consequence & Confirmation*.
  Blast radius before the apply control, confirmations that name what is lost
  rather than which tool is called, no optimistic UI on any mutation, and
  compile/apply never styled as equal-weight siblings.

**State**: PR #3 open and green. One active change on `full`, 0/26 tasks, board
routing to `write design`. `validate --all` is 0 errors, 1 warning, 1 info.

**Next**: `planner` — the full track needs `design.md`, `plan/master-plan.md`,
`plan/architecture-review.md` and `plan/decision-log.md` before the executor may
start. After that, task 0.1 (prove DCR against the live server) still gates all
implementation.

**Watch out**:
- **The owner declined the optional rule sets** (security, testing, background
  jobs, observability), so those sections are deliberately absent. The domain
  constraints were still included as *core* architecture policies, because they
  come from `config.yaml` and are binding project context, not an optional
  add-on. That was a judgement call and was flagged as one — if it should come
  out, it is section "Project-Specific Policies".
- **P6 ("One way in") is the load-bearing rule.** If any feature reaches the MCP
  SDK without going through `BattleGridPort`, every other guarantee in P1–P5
  becomes advisory. Worth auditing specifically rather than trusting.
- The `full` track has still never actually been *run* — planner and auditor
  remain unexercised. Expect friction on this first pass and fix the
  instructions rather than working around them.

## 2026-07-27 — MVP specified; the first change is proposed and unblocked

**Did**: Ran `/spec` on the MVP. Two artifacts:
`_PM/Grid-Commander-MVP_Feature_Specification.md` (journeys, business logic,
metrics, risk, decision log) and the first change,
`connect-battlegrid-account` — `standard` track, capability
`battlegrid-connection`, 10 requirements / 22 scenarios, 26 tasks, validating
clean.

Also narrowed open question 1. No terms of service are published anywhere on
battlegrid.trade or its docs, so there is no written permission or prohibition.
But the OAuth deployment settles the technical half: DCR, public-client auth,
PKCE, scoped consent, revocation, and published per-account wager caps are all
apparatus that does nothing for a first-party app. **Technically intended;
commercially unconfirmed.**

Five decisions worth carrying (full rationale in the `_PM/` decision log):
- **D-1** BattleGrid OAuth is the *only* identity. No separate password. This
  deletes a whole feature from the MVP rather than building it.
- **D-2** The MVP ships as **four sequenced changes**, not one — greenfield
  makes everything ADDED, and 13 features in one change folder is unreviewable.
  Only change 1 has delta specs so far; 2–4 get written when proposed.
- **D-3** `mcp:wager` is never requested in MVP. Nothing in scope spends, and
  requesting authority you do not exercise undermines the whole trust position.
- **D-4** Unknown tools **fail closed** — treated as destructive until the
  server's annotations say otherwise.
- **D-5** Audit is written *before* the attempt, updated with the outcome. A log
  of successes cannot answer "what happened when it broke".

**State**: PR #3 open and green. 1 active change, 0/26 tasks. `validate --all`
is 0 errors, 1 warning, 1 info. Still no application code — this is the contract,
not the build.

**Next**: **Task 0.1 — prove Dynamic Client Registration against the live server
before building anything on it.** It is the one assumption in this change that
reading cannot confirm, and the token model depends on the answer. Then executor
on the rest.

**Watch out**:
- **Do not let a caller reach BattleGrid except through the classification
  layer.** The whole safety model in this change collapses if some later feature
  calls a tool directly. Task 3.7 exists for this and is easy to quietly skip.
- **The consent copy is a product surface, not boilerplate.** Requirement
  "Configuration Authority Is Described Honestly" forbids calling read scope
  read-only, because it can rebind agents. If a future change softens that
  wording to sound friendlier, it is a spec violation.
- The `_PM/` document is narrative; `openspec/changes/*/specs/` is the contract.
  Metrics, risks and decisions deliberately did **not** cross over.
- `checklist-generator` still has not run, so `docs/specs/` does not exist and
  the `full` track remains blocked. Worth running before change 1 is executed —
  this change touches credentials and would benefit from the full track.

## 2026-07-27 — The blocker is gone: Grid-Commander is defined and configured

**Did**: The owner defined the product, so `/idea` finally had something to run
on. Grid-Commander is a **third-party multi-tenant web workbench** for building
and tuning BattleGrid agents and strategies over MCP, with backtesting and
optimization as the eventual point.

Wrote `_IDEA/Grid-Commander_Idea_Brief.md` — product definition, market context,
22 features RICE-scored into a 13-item MVP, technical requirements, one
recommended stack, folder structure, risks, and seven open questions. Filled
`CLAUDE.md` and `openspec/config.yaml` from it. Both had been unfilled templates
since the repo's first commit; every skill reads config and had been getting
placeholders.

**Stack**: TypeScript / Next.js / PostgreSQL / Drizzle, Clean Architecture
lightly applied. The owner leaned toward Python + TS and asked for a
recommendation instead — the argument for one language is that nothing in the
MVP is computational, and the Python case is entirely about deferred backtesting.
Recommendation is TS now with a **job-queue seam** (`src/ports/jobs.ts`) that a
Python worker consumes later, so the capability stays reachable without paying
for two languages from day one.

**State**: PR #3 still open and green. `validate --all` is 0 errors, 1 warning
(placeholder design system). Backlog 3 open, all P3. No application code exists
yet — this session produced the foundation, not the product.

**Next**: **Retire open question 1 before writing any application code — does
BattleGrid permit third-party clients?** Everything else in the brief is
recoverable; that one is not. After that, `/spec` on the MVP scope, then
`checklist-generator` (which also unblocks the `full` track).

**Watch out**:
- **BattleGrid supports OAuth Dynamic Client Registration** — `/register`,
  PKCE S256, refresh tokens, `/revoke`, and `mcp:read`/`mcp:wager` as separable
  scopes. So this product must **never** ask users to paste a `bg_live_` key.
  That discovery is what made a multi-tenant product tractable at all.
- **`mcp:read` is write-capable and that is now a config-level constraint.**
  Eleven tools mutate on it alone, six destructive. Do not let a future change
  treat scope as the safety boundary.
- The revenue model is genuinely undecided and is marked as such in the brief
  rather than invented. Fine while exploring; urgent before launch.
- `generate_agent_grid` spends a billed LLM call on BattleGrid's side while
  wagering nothing — a "free preview" is not free, and that shapes UI generosity.
- `full` track is still blocked on `docs/specs/` until checklist-generator runs.

## 2026-07-27 — Grid-Commander is a BattleGrid project; MCP surface fully mapped

**Did**: Two threads.

**The domain finally landed.** Grid-Commander is about BattleGrid
(battlegrid.trade) — "where AI trading agents are built, trained, and proven".
Agents draft a 3x3 grid of 9 coins per market window, call UP/DOWN, name a
Captain worth 2x both ways, and trade high-conviction reads live on Hyperliquid.
The issued `bg_live_` key is an **MCP credential**, not a REST key: it
authenticates `https://mcp.battlegrid.trade/mcp` (server `battlegrid v3.0.0`).
Mapped the whole library from the live connection — 110 tools, 5 prompts,
3 resources — into `docs/BATTLEGRID_MCP_REFERENCE.md`,
`docs/battlegrid-mcp-capabilities.json` (diffable dump) and
`tools/generate_mcp_reference.py`, which asserts every tool in `tools/list` is
documented and fails on a coverage gap.

**`enforce-journal-entry` (P2) shipped** — `validate` now warns `journal_stale`
when `openspec/` has been committed more recently than `JOURNAL.md`. Advisory,
never blocking. Suite is 124.

**State**: PR #3, open and green, 11 commits. Backlog is 3 open, all P3. Two
capabilities in the source of truth; `spec-validation` is now 5 requirements.

**Next**: `CLAUDE.md` and `openspec/config.yaml` are **still unfilled templates**
— the owner said they will define what Grid-Commander is being built *as*
(client? orchestration layer? strategy authoring tool?) and the stack. Do not
guess it; the domain is mapped but the product is not.

**Watch out**:
- **`mcp:read` is write-capable.** 27 of 110 tools have `readOnlyHint:false` but
  only 16 need `mcp:wager`, leaving **11 that mutate on `mcp:read` alone, 6 of
  them destructive** — including `rebind_intelligence_agent`, which replaces an
  agent's whole configuration, and `apply_strategy_plan`, which propagates to
  every bound agent immediately. A "read-only" token can rebuild your agents. It
  just cannot move money. The live token has `mcpWagerEnabled: true` on a real
  balance — no wager tool has ever been called from here.
- **Never `git checkout --` to undo a mutation test on uncommitted work.** It
  restores from HEAD and silently deletes the feature under test. Cost a full
  re-implementation this session. Commit a checkpoint *before* mutating.
- **Ancestry, not timestamps, decides staleness.** Two commits in the same
  second share `%ct`, which is precisely the "commit the work, forget the
  journal" case. First implementation used timestamps and its own tests caught it.
- **A surviving mutation is a missing test, not always a redundant guard.** The
  no-journal-file guard looked redundant twice; the case that needed it was a
  journal deleted in one commit with work landing in a *later* one.
- The published BattleGrid docs and the live API disagree on enum labels
  (docs "Moderate" vs API `MEASURED`). Trust the API.
- `full` track is still unexercised and still blocked on `docs/specs/`.

## 2026-07-27 — Fixed the rename bug the tests found; container reset mid-session

**Did**: `fix-renamed-on-new-capability` (`lite`) — a `RENAMED` delta against a
capability with no main spec is now an error (`renamed_no_main_spec`) instead of
being silently discarded. Fixed in both places: validation reports it at
`/propose` time, and the merge guard now checks `delta.renames` as well as
`delta.sections`, because rename pairs never land in `sections["RENAMED"]` and
that gap is exactly what let the bug through. Archived into `spec-validation`
(now 4 requirements). Suite is 113, no expected failures left.

Also cleared `bump-actions-node20` (`lite`, `skip_specs`) — `checkout@v5` and
`setup-python@v6`. Verified by the run itself: an unresolvable action version
fails the job immediately, and the deprecation warning is gone from the log.

**State**: PR #3 on `claude/work-review-next-steps-clb36a`, four commits, all
checks green. `validate --all` is 0 errors, 1 warning (the placeholder design
system). Backlog is 4 open — 1×P2 (`enforce-journal-entry`), 3×P3. Two
capabilities in the source of truth, four changes archived.

**Next**: Unchanged and still the only blocker: **decide what Grid-Commander
is**, fill `CLAUDE.md` + `openspec/config.yaml`, then `/idea`. What is left in
the backlog is harness polish — one P2 and three P3 — and none of it needs the
project concept, nor substitutes for having one.

**Watch out**:
- **The container was reclaimed mid-session and the working tree reset to
  `main`.** Everything uncommitted was gone; everything pushed survived.
  `git checkout -B <branch> origin/<branch>` restored it. Push early — a commit
  that exists only in the container is not saved.
- **Both test guards earned their keep on this fix.** Adding the new code made
  the coverage meta-test fail by name, and fixing the tool flipped the
  `@unittest.expectedFailure` marker to UNEXPECTED SUCCESS, which also fails.
  Neither could be forgotten. Keep pinning known bugs that way.
- The `merge_conflict` backstop is still unreachable (`merge-conflict-unreachable`)
  and still worth keeping — this fix added a second check in front of it rather
  than relying on it.
- `full` track remains unexercised and blocked on `docs/specs/`.

## 2026-07-27 — The harness has tests; two real bugs found writing them

**Did**: Took `add-harness-regression-tests` (P1) through the `standard`
pipeline. `tests/` is 111 tests on plain `unittest`, no dependencies, plus a
`tests` job in `.github/workflows/validate.yml`.

- **Archive merge** pinned on written file content, not exit codes — ADDED
  appends, MODIFIED replaces the whole block, REMOVED deletes, RENAMED rewrites
  only the header, new capability seeded from Purpose, and multiple operations
  in one delta without disturbing each other's line ranges.
- **Archive abort** — validation failure and merge failure both leave every
  spec and the change folder untouched, and a re-run after the fix works.
- **All 55 validation codes** have a fixture, each asserting severity as well as
  the code. A meta-test reads the codes out of `openspec.py` with `ast`, so a
  new code with no fixture fails the suite by name.
- CLI contract, and the design import cross-check converging one layer per pass.

**State**: PR #3 open on `claude/work-review-next-steps-clb36a`, both checks
green — the `tests` job ran all 111 on a runner with no `pip install`. Archived
once CI had proven the spec, so `harness-integrity` is now the second capability
in `openspec/specs/` (5 requirements, 13 scenarios). `validate --all` is back to
0 errors and 1 warning, the pre-existing placeholder design system. Backlog is
6 open — 2×P2 (one new), 4×P3 (one new).

**Next**: The blocker is unchanged, and now the only thing in the way:
**decide what Grid-Commander is**, fill `CLAUDE.md` + `openspec/config.yaml`
from that, then `/idea`. Every skill reads config and gets nothing from
placeholders, so feature work before that produces specs written against a
project with no defined stack.

**Watch out**:
- **Two real bugs, filed not fixed.** `renamed-dropped-on-new-capability` (P2,
  a `RENAMED` delta against a capability with no main spec vanishes with no
  diagnostic — pinned with `@unittest.expectedFailure`, so fixing the tool
  without removing the marker fails the suite) and `merge-conflict-unreachable`
  (P3, dead but correct backstop). Tests describe the tool as it is; a test that
  is edited to match a regression is worse than no test.
- **`dedent()` flattens when you interpolate a multi-line value into it.** The
  common indent becomes empty and the whole block stays indented, so
  `## ADDED Requirements` silently stops being a heading. Build the block first,
  concatenate after.
- **Mutation-check new assertions.** Four deliberate regressions were injected
  into `openspec.py`; the first pass caught three. The fourth — REMOVED cutting
  one line short — was invisible until a formatting invariant (no run of blank
  lines, trailing newline) was added to every merge test. A test that passes
  against a broken tool is a liability, so break the tool on purpose and check.
- `full` track is **still** unexercised and still blocked on `docs/specs/`.

## 2026-07-27 — Harness proven on its first real change; CI is live

**Did**: Took `add-ci-validation` through the whole `standard` pipeline —
proposal → delta spec → tasks → verify → archive. `.github/workflows/validate.yml`
now runs `validate --all` on every PR and push to `main`. First capability landed
in the source of truth: `openspec/specs/spec-validation/` (3 requirements,
6 scenarios). Closed `add-ci-validation` and `dogfood-harness-end-to-end`; filed
`bump-actions-node20`.

**State**: `main` has the harness plus CI. One capability specified, one change
archived, 5 backlog items open (1×P1, 1×P2, 3×P3). PR #2 open and green.
`CLAUDE.md` and `openspec/config.yaml` are **still unfilled templates** — that is
the next blocker and it needs the project concept.

**Next**: Decide what Grid-Commander actually is, fill `CLAUDE.md` +
`openspec/config.yaml` from that, then `/idea`. Do not start feature work before
config is real — every skill reads it and placeholders give them nothing.

**Watch out**:
- **The `full` track is still unexercised.** Planner, auditor, and the production
  gate have never run and stay blocked until `checklist-generator` produces
  `docs/specs/`. Only `standard` and `lite` are proven.
- **A self-verifying change must let CI prove its spec before archiving.**
  Archiving first would have merged "validation runs on every pull request" into
  the source of truth on the strength of a local test. New habit, worth keeping.
- **`| tee` in a CI step swallows the exit code** and makes the check pass on
  every failure. Capture with `$(...)` and `exit $status`. This nearly shipped.
- PR #1 was squash-merged, so the old branch commits look unmerged to git
  (different SHAs) while the content is identical. Check with
  `git diff origin/<branch> origin/main` before force-pushing, not the log.

## 2026-07-27 — v3.0 complete and merged; harness ready, unproven

**Did**: Finished and merged the v3.0 harness (PR #1, branch
`claude/harness-openspec-merge-smkspq`). Three layers on top of v2.1:

- **Spec layer** (adapted from OpenSpec, MIT) — `openspec/specs/` as living
  source of truth, delta specs, change folders, archive-merge, lite/standard/full
  tracks. Format is byte-compatible with the `openspec` CLI.
- **Tracking layer** — `openspec/backlog/`, this journal, `board`, `tracker`
  skill, `/board` `/backlog` `/handoff`.
- **Design layer** — `UISurface` / `DesignTicket` DTO between a developer agent
  and a design agent, with `openspec/design/`, `ui-surveyor` +
  `design-director` skills, `/surface` `/design`.

10 skills, 17 commands, `.claude/tools/openspec.py` (zero-dependency, 25+
validation codes). Filed 6 backlog items for what this session deferred.

**State**: Merged to `main`. No application code exists — this repo is the
harness. `openspec/specs/` is empty, no changes have ever run, `docs/specs/`
checklists have not been generated, and `CLAUDE.md` + `openspec/config.yaml`
are still unfilled templates.

**Next**: Fill `CLAUDE.md` and `openspec/config.yaml` before anything else —
every skill reads config and gets nothing from placeholders. Then `/idea` for
the application concept, then a deliberately small `standard`-track change to
shake the pipeline out (`dogfood-harness-end-to-end`).

**Watch out**:
- **The harness is unproven.** The tool was tested against fixtures; the skills
  have never been executed. Expect friction on the first change and fix the
  instructions rather than working around them.
- **`full` track is blocked** until `checklist-generator` has run — planner,
  executor, and auditor hard-require `docs/specs/`. Stay on `standard` until
  then.
- **Greenfield inverts the delta model.** Everything is ADDED at first, which is
  a lot of requirements per change. That is a reason to keep changes small, not
  a reason to skip specs.
- The delta merge replaces a MODIFIED requirement's **entire block** — a partial
  MODIFIED silently drops the scenarios you left out. Copy the whole requirement
  from the main spec, then edit.
- Two directories named "spec": `openspec/specs/` is behavior, `docs/specs/` is
  review checklists. Filed as `rename-docs-specs-to-checklists`.
- No CI exists. Nothing runs `validate --all` automatically yet.

## 2026-07-27 — Spec layer merged; tracking system added (v3.0)

**Did**: Merged OpenSpec's data model into the pipeline — `openspec/specs/` as
source of truth, delta specs, change folders, archive-merge, tracks. Added the
tracking layer: `openspec/backlog/`, this journal, and the `board` command.
Opened PR #1.

**State**: Harness v3.0 on branch `claude/harness-openspec-merge-smkspq`. No
application code exists yet — this repo is the harness itself. Backlog is empty.

**Next**: `/board` at the start of the next session, then `/propose` the first
real change.

**Watch out**: The two directories named "spec" are different things —
`openspec/specs/` is behavior, `docs/specs/` is review checklists. Never edit
`openspec/specs/` by hand during a change; the archiver writes it.
