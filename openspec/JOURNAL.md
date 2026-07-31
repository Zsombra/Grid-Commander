# Journal

## 2026-07-31 — position management: editable, and the label stops lying

**Did**: `position-management-is-editable` (standard, archived) — the second
offline feature while BattleGrid's outage holds. The edit page gains a
Position management section: preset select (platform's own fourteen values,
wholesale), CUSTOM (the fields as edited), or leave-alone (nothing sent);
the fourteen fields prefilled from the agent's current values. Drift is a
domain fact now — `positionDrift` names exactly the fields on which an
agent differs from the preset it claims, and the section says so before
offering anything. One typed coercion (`positionFromTransport`) serves the
review and the apply, so the digest-bound confirmation survives the
round-trip; the consequence names what position management becomes. The
AL-1 vocabulary guard caught a preset name in a comment mid-build. Closes
`position-management-can-be-edited`. ADDED requirement in
`agent-authoring` (4 scenarios), 12 new tests.

**State**: 0 active changes · 27 open backlog items · 63 archived changes ·
916 vitest (+9 key-gated skips) + 60 db + 217 harness green · validation
clean. Restore walk still waiting out the platform outage.

## 2026-07-31 — the pages are finally rendered: naming is enforced, not walked

**Did**: `pages-name-what-they-render` (standard, archived) while BattleGrid's
database outage blocks the restore walk. The project's first
component-rendering test layer: `tests/rendering/support/render.ts` resolves
a server component's returned tree into text + headings, expanding
everything and throwing on anything it cannot expand (a walker that skips is
the vacuity the item warned about); `support/fake-acting.ts` wires the real
use-case classes over the suite's fakes into the `{app, user}` shape
`acting()` returns, mocking exactly one seam (`@/presentation/session.js`).
Sixteen per-branch assertions: agent detail/limits/archive/reactivate/
deploy/undeploy + strategy detail/archive/restore each name their entity in
the rendered heading, per branch — including the branch that historically
said "Nothing will stop this agent" naming nobody — and the
legitimately-anonymous branches assert their required copy instead.
`vitest.config.ts` gains `esbuild: { jsx: 'automatic' }` (Next's JSX
runtime). Closes `naming-an-entity-is-held-by-the-walk-only` — the last
buildable P2.

**State**: 0 active changes · 28 open backlog items · 62 archived changes ·
904 vitest (+9 key-gated skips) + 60 db + 217 harness green · validation 0
errors. Restore walk still armed, still waiting out BattleGrid's outage
(operator-corroborated: front end up, database down).

## 2026-07-31 — the P2 sweep: two bugs fixed, two questions closed, one walk armed

**Did**: Worked the P1/P2 backlog down under the operator's "move this
forward" (CI stays GitHub-hosted — self-hosted plan dropped; key stays live;
Docker stays parked).

- **`repair-required-can-actually-fire`** (lite, archived): the
  REPAIR_REQUIRED branch read `payload['status']` — a key the declared
  output never carries — so the whole repair-required surface was
  unreachable. Detection moved to the refusal channel (`ToolRefusedError`
  code, message fallback), carrying the platform's words. Found on the way:
  every other platform refusal from archive/restore *threw*, crashing the
  server action — `LifecycleResult` gained a `refused` case so the page's
  `?problem=` finally receives what the platform said.
- **`a-stale-session-cannot-500-every-page`** (standard, archived): built
  the authenticated serving probe `no-route-exercises-the-database` asked
  for (`tools/check-route-queries.mjs` — mints a signed cookie, requests
  `/audit`, asserts a `pg_stat_database` transaction delta, self-poll
  arithmetic corrected). **Its first run caught a real outage-shaped bug**:
  a stale session made `CurrentUserQuery` clear the cookie during render,
  which Next.js forbids — 500 on every page for anyone holding one. Reads
  no longer mutate; the spec scenario now says so. check-serving green
  end-to-end: "every session-resolving route answered, and one queried".
- **`cannot-verify-what-a-key-grants`** closed *not knowable*: no
  introspection endpoint (discovery + /introspect 404), no scope-reporting
  tool in all 110; nearest fact is `get_account_state.mcpWagerEnabled`, an
  account-level upper bound that cannot verify a declaration.
- **`a-preset-does-not-constrain-its-config`** closed (answered; create
  path shipped earlier; edit-surface remainder filed as
  `position-management-can-be-edited`, P3 — `positionManagement` confirmed
  writable on update). **`performance-and-allocation-are-unmodelled`**
  re-triaged P3 (tripwire in place; the P&L discrepancy waits on evidence).
- **`restore-has-never-been-walked`** → in-progress: the full walk is built
  (`tests/live/restore-probe.test.ts` — fork→archive→roster-check→restore→
  cleanup) but BattleGrid's MCP endpoint began hanging on every call
  (~17:10Z; discovery answers, tools/list times out) after answering the
  radar probes fine at 15:2xZ. Run it when the platform recovers.
- **`ci-creates-no-runs`** updated: operator direction is GitHub-hosted;
  repo side verified done (vars unset → ubuntu-latest); the one remaining
  step is settling the account billing.

**State**: 0 active changes · 29 open backlog items · 61 archived changes ·
888 vitest (+9 key-gated skips) + 60 db + 217 harness green · validation 0
errors.

## 2026-07-31 — deploy and undeploy are offered; the create path turned out not to exist

**Did**: `deploy-and-undeploy-are-offered` (full track, proposed → planned →
executed → gated PASS → archived): step 2 of the deployment gap, the first
destructive radar surface. New capability `agent-deployment`. RadarPort gains
`upsertDeployment` / `deleteDeployment` / `deploymentTimeframes` (the enum
read from the runtime-discovered upsert schema, never compiled in);
`confirmationTarget.agentDeploy/agentUndeploy` bind the agent+coin pair AND
the verb; describe→confirm→perform pairs mint and spend tokens the performs
recompute from submitted values — a tampered coin spends nothing. Pages:
`/agents/[id]/deploy` (coin + runtime timeframe chooser → consequence →
confirm) and `/agents/[id]/undeploy/[coin]` (coin as a path segment so the
reachability walk sees a plain link), wired from the agent page's deployment
rows. `RadarDeployment` now carries `revision`; the mapper refuses a policy
without one — a defaulted 0 would feed a blind write.

**The unknown resolved against everyone's expectation**: the proposal's plan
was to verify the first-deploy `expectedRevision` with an enabled:false
probe. The live answer (AAVE, verbatim payloads in DL-3): the schema demands
`expectedRevision > 0`, and a coin with no policy answers every value with
`CONFLICT … actualRevision: null`. **The MCP surface cannot create a
market's first deployment — only replace or remove existing ones.** The
describe now refuses unoccupied coins with that reason; filed as
`radar-first-deployment-not-creatable-over-mcp` (the create-refusal live
test fails the day BattleGrid changes this). Live proof of the path that
does exist: HYPE replaced-in-place through the product commands (r1→r2, read
back). Undeploy is composition-proven, deliberately not live-walked — the
only deletable deployments are the operator's real ones (DL-4).

**Guards that shaped it**: concurrency (no `?? 0` on a revision),
reachability (query-string links are invisible → the `[coin]` segment),
controls (CONTROL treatment), the entity heuristic refined (a dynamic
segment under an entity is scoped, not an entity). `tests/live/radar-probe.test.ts`
joins write-probe as a key-gated live gate.

**State**: 0 active changes · 32 open backlog items · 59 archived changes ·
8 capabilities · 883 vitest (+8 key-gated skips) + 60 db + 217 harness green ·
validation 0 errors. `the-app-authors-agents-it-cannot-deploy` closed (both
steps shipped).

## 2026-07-31 — PR #11 merged; the roster says who is acting

**Did**: Merged PR #11 (presets, deployment visibility, binding guard, product
model — squash `b43acba`) under the operator's standing delegation, restarted
the branch, and shipped the roster half of deployment visibility
(`the-roster-says-who-is-acting`, lite, archived): every roster row now
carries its agent's deployment line — same words as the detail page, produced
by the same domain derivation (`deploymentsByAgent`), so the two surfaces
cannot disagree — or "Not deployed — scanning no market". An unreadable radar
is one notice above the list and no per-row claim. MODIFIED requirement in
`agent-understanding` gains the roster scenario. agent-roster surface
manifest refreshed at 4ea8f4b.

**State**: 0 active changes · 32 open backlog items · 58 archived changes ·
862 vitest + 217 harness green · validation 0 errors. Left on the deployment
item: step 2 only — the guarded deploy/undeploy writes, recommended for a
fresh session (first destructive radar surface; wants full ceremony).

## 2026-07-31 — an agent now says whether it is acting

**Did**: `an-agent-says-whether-it-is-acting` (standard, proposed → executed →
archived): the read-only half of the deployment gap found this morning. New
radar read path — `RadarPort` / `McpRadarAdapter` over
`list_radar_deployments` (mapped against the same-day observed shape),
`ReadDeploymentsQuery` answering per agent — and a Deployment section on the
agent detail page with three distinct states: each deployment's market,
timeframe and standing (holding the position / on duty / in the rotation);
"configured but scanning nothing", naming battlegrid.trade's Radar as where
deployment happens today; and unreadable-as-unknown, never dressed as idle.

**The guard that improved the design**: the identifiers scan refused the first
mapper, which silently dropped malformed policies — and it was right for a
deeper reason than identifiers: a dropped policy would render its slotted
agent as "not deployed", the exact lie the unreadable state exists to prevent,
one level down. The mapper now refuses the whole read (`RadarPayloadError` →
unreadable) rather than dropping rows.

**Live-proven on day one**: VELOCITY → deployed / on-duty / HYPE / 15m;
Fade Master → not-deployed. Same facts the morning's raw investigation found,
now spoken by the product path.

**Spec**: 1 ADDED requirement in `agent-understanding`. 17 new tests.

**State**: 0 active changes · 32 open backlog items · 57 archived changes ·
857 vitest + 217 harness green · validation 0 errors. Left on the item: the
roster indicator, and the guarded deploy/undeploy writes (step 2).

## 2026-07-31 — the operator's product model, and the go button the app doesn't have

**Did**: The operator described BattleGrid as they use it — four modules:
Agents (risk + strategy + LLM assignment), Strategies (signal/data tables +
market-data reads), Radar (deployment: per token, one agent per slot), and
Market Grid (a nine-coin prediction game a configured agent plays). Recorded
as `docs/BATTLEGRID_PRODUCT_MODEL.md` (hand-maintained — the generated
surface map lists tools; this says what they are for). The "87 unused tools"
now have semantics: two of the four modules are entirely unmodelled.

**The question that fell out, answered the same hour, read-only**: does an
agent act without a radar deployment? No. Live account: three per-coin
policies (FARTCOIN/HYPE/PURR, 15m, one slot each — "per token, one agent at a
time", verbatim) filled by CONFLUENCE, VELOCITY, CONTRARIAN, all scanning;
the two undeployed lifecycle-ACTIVE agents (Fade Master I/II) hold zero
positions; the radar summary counts agentsActive: 3, not 5. **Radar is the go
button** — an agent Grid-Commander creates is configured, not acting, and no
surface says so.

**Filed**: `the-app-authors-agents-it-cannot-deploy` (P2 feature — say where
an agent is deployed first, read-only; then the guarded upsert/delete writes)
and `market-grid-is-an-unmodelled-module` (P3).
`does-an-agent-act-without-a-radar-deployment` opened and closed with the
evidence in one session.

**State**: 32 open backlog items · validation 0 errors / 14 warnings ·
PR #11 open, watched.

## 2026-07-31 — the values-binding risk closed, and its claimed guard made real

**Did**: Re-triaged `confirmation-is-not-bound-to-values` (P2 risk) against
`a-confirmation-binds-to-what-was-agreed`, which landed the day after the item
was filed and never came back to close it. Verified flow by flow: every flow
carrying agreed values binds them into the token's target (edit: intent
digest, recomputed from the submitted values at spend; rebind: the
agent→strategy pair; apply: the compiler's plan digest); the two lifecycle
flows are identity-only by documented design. The item's headline case —
agreed $25, submitted $25,000 — is `edit-binding.test.ts`'s own scenario,
refused. Item closed with the evidence table.

**The gap the re-triage found**: `confirmation.ts` cited
`confirmation-binds-values.test.ts` — a file that does not exist — for the
claim that no caller composes a target string inline. The claim is now true:
`edit-binding.test.ts` scans `src/` for target-shaped template literals and
requires exactly one composer, the builder itself (lite change
`the-binding-guard-that-was-claimed-exists`, archived).

**State**: 0 active changes · 30 open backlog items · 56 archived changes ·
840 vitest + 217 harness green · validation 0 errors. PR #11 (position
presets) still open, watched.

**Also — reactivate live-proven** (same session, operator's yes): one of the
archived probe agents went ARCHIVED r3 → ACTIVE r4 → ARCHIVED r5 through the
product path — no confirmation on activate (non-destructive by annotation,
matching the page's design), a bound confirmation on the re-archive. Account
restored exactly. Of the write surface the app uses, only rebind and
apply/restore now lack live proof; rebind deliberately waits for a real
agent+strategy choice.

**Next**: remaining code-ready P2s are `naming-an-entity-is-held-by-the-walk-only`
and `no-route-exercises-the-database` (debt), plus the answerable questions
(`oauth-path-may-be-dead-weight`, `performance-and-allocation-are-unmodelled`).

## 2026-07-31 — an operator can finally say "manage positions like a COLT"

**Did**: `preset-configs-are-discarded` (standard track, proposed → executed →
verified → archived). The catalog states each position-management preset's
complete fourteen-field configuration and `mapPositionPresets` discarded it at
the boundary — so the create form had removed its preset select (a control the
action dropped was worse than none) and every agent was created CUSTOM under
values nobody picked deliberately.

**What landed**: `PositionManagementPreset` carries `config` (platform's
values or null — never invented), `tagline`, `cardSummary`;
`positionManagementForPreset` answers with the label beside the fourteen
values or null; the create command takes `positionPreset` and refuses a name
the catalog cannot answer for (the unknown-brain-preset shape); the form's
fieldset is back, offering CUSTOM (default — today's behavior, named as a
choice) plus every preset whose configuration actually arrived. De-risked by
the same-day live probe: the observed catalog carries the config blocks, and
the schema's closed fifteen-key `positionManagement` object is exactly a
preset's config plus its label.

**OURS**: kept, scope narrowed — the three product-answered booleans apply to
the CUSTOM path only; a chosen preset answers all three itself.

**Spec**: 1 ADDED requirement merged into `agent-authoring` (now 21).
12 new tests (mapper carry-through, preset-or-refusal, CUSTOM unchanged,
enum-conformance against the live artifact, payload-conformance preset case).

**State**: 0 active changes · 31 open backlog items · 55 archived changes ·
839 vitest + 217 harness green · validation 0 errors / 15 warnings.

**Next**: `confirmation-is-not-bound-to-values` re-triage against the landed
binding change is the top code candidate. The edit surface (fourteen-field
editor with preset-drift display) stays with `a-preset-does-not-constrain-its-config`.

## 2026-07-31 — the operator's key: live probe, live writes, and what they flushed out

**Did**: The operator supplied a live key and delegated the CI verdict, the PR
decision, and the P2 work. Everything below ran against the real platform;
the key lives in env only and appears in no artifact (verified by grep).

**Live probe**: 43 of 110 tools observed (21 argument-free + 22 via harvested
ids — the pass the first generation could not make), 66 writes skipped by the
code-level safety filter, 1 failed. Declared and observed are one generation
again. Closed `observed-data-predates-a-platform-deployment` and
`probe-skips-every-read-that-needs-an-id`. `get_open_orders` recovered (its
INTERNAL_ERROR was transient); `get_market_context` still fails identically —
its declared schema (nothing required) understates the live server (demands
`sessionId` or `primaryTimeframe`); `two-read-tools-do-not-answer` narrowed
to that one tool and kept as its record.

**`three-actions-silence-their-refusals` fixed and archived** (lite):
reactivate, agent-archive, and strategy-archive now read their results and
send a refusal's reason back to the surface acted from as `?problem=`,
rendered role=alert — the rename-fix pattern. A fourth instance found on the
way: restore read its result but silently treated `refused` as success; fixed
in the same change. The three ledger rows left `write-results.test.ts` as the
guard demands; `tests/agent/refusals-reach-the-operator.test.ts` (17 tests)
pins the shapes, including that repair-required stays guidance, not an alert.

**Live writes**: the write-probe's spend-side confirmations still carried the
`'t'` placeholder target from before `a-confirmation-binds-to-what-was-agreed`
hardened the binding — the guard refused them, which is the guard being right
and the test being stale. Fixed both spends (`agent.id`, `fork.id`). Two runs
before the fix left two throwaway agents ACTIVE on the account; both archived
same-session through the product's own guarded path (which is itself live
proof the archive path works). Account verified clean: the operator's five
real agents, nothing else. Create → read-back → rename → limits-edit →
archive all succeeded live. Two account-state assumptions became runtime
skips (no unbound SYSTEM strategy to fork; a thought log with no decisions
yet). One flake remains — the fake-confirmation wiring trips inconsistently
across two describe→update cycles — filed as
`live-write-probe-confirmation-flake` (P3) with suspects named.

**Harness**: `test_probe_id_sources` failed on the fresh artifact because
`list_entry_decisions.entries` is legitimately empty on this account — the
assert conflated a wrong row (the defect it guards) with an empty account
(a state). Split: field-exists still fails, empty-list is recorded, rows that
exist must carry ids.

**State**: 0 active changes · 32 open backlog items (3 closed, 1 filed today
on top of the morning's work) · 54 archived changes · 827 vitest + 217
harness green · validation 0 errors / 16 warnings. PR #10 merged (delegated).

**Next**: the fork→compile→apply live walk needs a SYSTEM strategy with
nothing bound — none was visible to the key today. Restore and
repair-required remain unwalked. CI: the runner registration and `CI_RUNNER`
flip are still the operator's two steps.

**Watch out**: the key reaches an account whose agents have made no entry
decisions — `decisionId`-gated tools stay unobserved until they have. And the
live tests create real (trading-off) agents; a failed run can orphan one, so
check `list_intelligence_agents` for `GC probe` names after any red run.

## 2026-07-31 — quality gates made real; a dropped write result now fails the gate

**Did**: Two lite changes, both archived same-session, continuing down the P2
backlog after the CI routing work.

**`quality-gates-are-real`**: `openspec/config.yaml` carried the template's
bracketed example `quality_gates` since day one, and named pnpm as the package
manager while the repo is npm (`package-lock.json`, `npm ci` in CI, no pnpm
lockfile — a third instance of the same inconsistency the backlog described).
Now: the six real gates (typecheck, lint, test, build, drizzle-schema check,
test:db) in config.yaml, and the two checklist lines corrected from pnpm to
npm. Closed `config-quality-gates-are-placeholders` (P2) and
`checklist-says-pnpm` (P3).

**`a-dropped-write-result-fails-the-gate`**: the requirement "The Outcome Of A
Write Reaches The Person Who Asked For It" always carried the scenario that an
unread result must fail a gating check — the check now exists.
`tests/architecture/write-results.test.ts` scans `app/**/*.tsx` for
statement-position `await app.<name>.execute(` and holds every hit against a
two-way `KNOWN_DROPPED` ledger (new drop fails; fixed-but-listed fails, so the
ledger only shrinks). It found **five** drops on day one: two benign
(`rebindAgent`, `applyPlan` — single-arm results, refusals throw), **three
real** — `setLifecycle` on reactivate and agent-archive drops its
`not-permitted` arm, `setStrategyActive` on strategy-archive drops `refused`
and the repair arms. Filed as `three-actions-silence-their-refusals` (P2 bug);
the fix pattern is the rename action, and each fix must delete its ledger row.
Closed `no-action-may-discard-a-write-result` (P2).

**Also checked**: `repair-required-cannot-be-detected` (P2) is not actionable
offline — its own text requires one live observation; it stays open on the
operator list. Note the strategy-archive drop above would swallow that branch
even after it becomes reachable — the two items are now cross-linked.

**State**: 0 active changes · 34 open backlog items (4 closed, 1 filed today)
· 53 archived changes · 810 vitest + 217 harness green, typecheck/lint clean,
validation 0 errors / 18 warnings.

**Next**: `three-actions-silence-their-refusals` is the natural next change
(pattern exists, guard enforces completion). Then the remaining P2s. The
operator list (runner + CI_RUNNER variable, account billing, live key for
re-probe/apply/repair-observation) is unchanged.

## 2026-07-31 — CI routed to a self-hosted runner behind a repo variable

**Did**: The operator chose the self-hosted route for `ci-creates-no-runs`
(P1). Lite change `route-ci-to-a-self-hosted-runner`, archived same-session:
all four `runs-on: ubuntu-latest` pins in `validate.yml` became
`${{ vars.CI_RUNNER || 'ubuntu-latest' }}` — unset, byte-identical behavior;
set to `self-hosted`, every job routes to a registered runner with no further
commit. `docs/SELF_HOSTED_RUNNER.md` is the operator handout: registration,
machine needs (Docker for the `app` job's postgres service), the public-repo
fork-PR security controls, verification via `workflow_dispatch`, revert.

**Checked first**: the operator believed a runner might already be registered
by an earlier agent. Searched the repo and their mail — no registration
evidence anywhere; the "self-hosted checker a previous agent built" is
`scripts/check.sh` (local gates, cannot green the board). The Runners settings
page (admin-only) is the single source of truth; the handout says exactly what
to look for.

**Remaining, operator-only**: register the runner, set `CI_RUNNER=self-hosted`.

**Also this session — stale design surfaces re-surveyed** (`agent-roster`,
`strategy-catalog`, `audit-log`; `strategy-editor` was already fresh): the
roster and catalog rows' names became links to their detail pages (recorded
as actions + must-keep constraints), `agent-actions` gained the two
always-offered read links (thinking, limits), `strategy-list` gained the
per-row fork-withheld state (reason rendered where the control would be),
and `actor-assistant` on the audit log is recorded as historical-only but
must-keep. Validation: 3 `design_surface_stale` warnings cleared (22 → 19),
import cross-check quiet. Design work is unblocked.

**Amended same-session** (`dockerless-runner-still-greens-six-jobs`, lite):
the operator's machine has no Docker, which only the `app` job needs (its
postgres service container). `app` now routes through its own
`CI_APP_RUNNER` variable — with only `CI_RUNNER` set, six of seven jobs
green on the Docker-less runner and `app` stays GitHub-hosted, no worse
than today. Handout documents the path and that the machine need not be
always-on (jobs queue while it is offline).

## 2026-07-31 — PRs #8 and #9 merged; conformance sweep built, verified, archived

**Did**: Un-wedged the repository and shipped the sweep, in that order.

**Merges**: Marked draft PRs #8 (`brain-with-no-model`, squash `7e4b772`) and
#9 (reconciliation docs, squash `a739f98`) ready and merged them, accepting the
red checks — every failure was the account-level CI outage
(`ci-creates-no-runs`), verified identical on `main` itself. The JOURNAL.md
conflict between the two (both added a top entry) was resolved keeping both,
newest first; #9's HANDOFF.md was updated in the same merge so it landed
already knowing #8 was in.

**The sweep** (`conformance-sweep-for-required-and-accepted-params`, standard
track, proposed → executed → verified → archived this session):
- `tools/probe_mcp_surface.py` now derives `input_required_paths` (nested
  required as dotted paths) and `input_accepts` (closed accepted sets; union
  paths as per-branch variants keyed by discriminator const — `operation=…`,
  `kind=…`) from declared input schemas, resolving the dump's 370 local `$ref`
  pointers with a cycle guard. `input_constants` resolves refs now too.
- `--refresh-declared` regenerates the artifact's declared fields offline from
  `docs/battlegrid-mcp-capabilities.json` — no key needed for facts the server
  declares; observed data byte-untouched; refuses on mismatched tool sets.
- `tests/architecture/payload-conformance.test.ts` builds every
  product-constructed payload through the product's own builders and fails on
  a missing required path at any depth or a key outside a closed accepted set.
  `apply_strategy_plan`'s `request.plan` is a named pass-through. The
  historical defect is replayed as a test: the raw 23-field read must fail for
  exactly the three non-writable fields.
- Verifier found one real gap (a lone closed object branch of a union —
  nullable objects — went unrecorded); fixed in-session, zero instances today.
- Deltas merged: 2 ADDED requirements into `battlegrid-connection` (now 20).

**Found on the way**: the artifact's declared fields were **stale against the
committed capabilities dump** — a BattleGrid deployment dropped
`conditions`/`conditionVerdicts` and `entryStrategy` after the last live
probe. The refresh corrected 12 stale constant paths; observed data is still
the older generation. Filed `observed-data-predates-a-platform-deployment`
(P3, needs the operator's key). Also filed
`compile-intent-shape-lives-in-two-places` (P3): the edit page's compile
`UPDATE` intent has no exported builder, so the guard mirrors its literal.
And the "124 harness tests" figure carried by HANDOFF.md was itself stale —
`check.sh` discovery runs 217 today (201 before this session's 16).

**State**: 0 active changes · 36 open backlog items (sweep closed, two filed)
· 0 open PRs · 49 archived changes. Gates: 806 vitest green, 217 harness
green, typecheck and lint clean, spec validation 0 errors (23 warnings — the
21 known plus `backlog_change_archived` on the two new items, both carrying
full context by design).

**Next**: CI account fix (P1, not fixable by code), live re-probe + live apply
test (both need the operator), stale design surfaces (`/surface` before design
work). Per HANDOFF.md's next steps, which are current as of this entry.

**Watch out**: CI on the PR for this session's branch will be red for the same
outage reason — same signature, all 7 jobs, pre-existing on `main`. Don't
re-diagnose it. And the surface artifact is now mixed-generation (declared
fields newer than observed) — deliberate, recorded, and closed by one live
probe run.

## 2026-07-31 — reconciliation review: main is authoritative, one draft PR ahead

**Did**: Full reconciliation of the clone, the handoff artifacts, and the backlog against the live repo. Answer to "who's ahead": **`origin/main` (`3a115fd`) is the authoritative tip — everything through PR #7 is merged — and the only work ahead of it is draft PR #8** (`claude/hand-off-file-review-3gpveo`, 3 commits: propose / fix / archive for `brain-with-no-model`), which merges into `main` with zero conflicts (`git merge-tree` verified). All other remote branches are fully contained in `main`. Verified `main` green locally: 792 vitest tests passing (6 skipped), typecheck clean, `./scripts/check.sh` both gates ok.

**Reconciled**:
- `HANDOFF.md` had gone stale three ways and was wrong at birth on a fourth: (1) counts updated 46→47 archived changes, 775→792 tests; (2) `strategy-section-editor` was listed as unbuilt — it shipped and archived in PR #7; (3) `brain-with-no-model` was described as "the assistant has no model wired" — it is actually the mapper fallback bug (PR #8 fixes it), and (4) the assistant it referred to **was removed entirely in `3d54fab` (2026-07-29, PR #5)** — yet HANDOFF.md, written a day later, still advertised it as a live capability. All four corrected; PR #8 recorded as the open head.
- Closed `ci-startup-failure` (P1) as superseded by `ci-creates-no-runs` — HANDOFF.md had already said "can be closed" and the sharper framing lives on the other item. Backlog: 37 → 36 open.

**State**: 0 active changes · 36 open backlog items · 1 open draft PR (#8). Validation: 0 errors, 21 warnings, all known — ~11 `backlog_change_archived` (deferrals from archived changes, legitimately open but each needs a "what is left" note or a close), 4 stale design surfaces (`strategy-editor`, `agent-roster`, `audit-log`, `strategy-catalog`), 2 `backlog_capability_not_found` on wontfix assistant items.

**Next**: Merge PR #8 (takes the backlog to 35). Then the CI account fix, the conformance sweep, or the operator-gated live apply — per HANDOFF.md's next steps.

**Watch out**: The stale remote-tracking refs — a fresh clone shows `origin/main` at "Initial commit" until `git fetch --prune`; don't diagnose from an unfetched clone. And the `backlog_change_archived` sweep needs per-item judgement (most are genuine deferrals, not forgotten closes) — don't bulk-close them to silence the validator.

## 2026-07-30 — brain-with-no-model: proposed, executed, verified, archived

**Did**: Full pipeline in one pass for `brain-with-no-model` (lite track, a
P3 bug from the `strategy-section-editor` production gate, PG-104).

**The bug**: `mapBrain` in `agent-mapper.ts` fell through to the `custom` arm
when a BattleGrid payload carried neither `brainPreset` nor `modelId`,
producing `{kind: 'custom', modelId: ''}` — a fabricated custom brain with no
model, rather than reporting that the brain was undescribed.

**What landed**:
- `Brain` (`src/domain/agent/brain.ts`) gained a third variant:
  `{ readonly kind: 'unknown' }`.
- `mapBrain` (`src/infrastructure/battlegrid/agent-mapper.ts:96-111`) now
  returns `{ kind: 'unknown' }` when both fields are absent; the `?? ''`
  fallback on `modelId` is gone.
- `brainToArgument` throws if called with an `unknown` brain — a
  programming-error guard, since the create form never produces one.
- `app/(app)/agents/[id]/page.tsx:78-82` renders "Not configured" for an
  unknown brain instead of a blank model name.
- 3 new tests (795 total, up from 792): two in `mapper.test.ts` (unknown case,
  custom-without-preset still works), one in `brain.test.ts` (throw guard).
- Delta merged into `openspec/specs/agent-authoring/spec.md` — MODIFIED
  "Agent Fields Are Offered Only From Values The Platform Confirms", new
  scenario "A brain the platform did not describe".

**Verification**: 13/13 tasks, 1/1 requirement implemented, 4/4 scenarios
covered, no critical or warning findings. `pnpm typecheck` / `pnpm lint` /
`pnpm test` all green.

**Archive**: Change folder moved to
`archive/2026-07-30-brain-with-no-model/`. Backlog item `brain-with-no-model`
closed (`status: done`). `validate --all` — 0 errors, 24 warnings (pre-existing
drift, no new ones introduced).

**Branch/PR**: Pushed to `claude/hand-off-file-review-3gpveo`
(commits `d63d66e` proposal, `120919a` implementation). PR
[#8](https://github.com/Zsombra/Grid-Commander/pull/8) open as draft,
subscribed to activity, a 60-minute check-in is scheduled.

**CI**: All 7 checks fail on PR #8 — `checks (py3.10/11/12/13)`, `app`,
`tests`, `validate`. Confirmed pre-existing: the same 7 jobs fail on `main`
itself (run 30520930429). Account-level CI infrastructure issue, not caused by
any code in this repo. Tracked as backlog items `ci-startup-failure` and
`ci-creates-no-runs` (both P1, both open) — that is the right place for a next
agent to pick this up, not this PR.

**State**: 0 active changes · 37 open backlog items (1 moved to done this
session, net still 37 as no others were swept) · PR #8 (draft) open, watched.

**Next for another agent picking this up**:
1. If continuing product work: next candidates are the P2 backlog items —
   `confirmation-is-not-bound-to-values` (money confirmation not bound to
   specific values), `preset-configs-are-discarded` /
   `conformance-sweep-for-required-and-accepted-params` (edit path can't fully
   succeed), `no-action-may-discard-a-write-result`. Run `/propose <item-id>`
   on whichever is prioritized.
2. If continuing infra work: `ci-startup-failure` and `ci-creates-no-runs`
   (P1) are the account-level CI breakage — worth escalating outside this
   repo's code, since nothing here is the cause.
3. `design_surface_stale: strategy-editor` still needs a `/surface` re-run
   before any design work on the strategy edit page (flagged since the prior
   session's `strategy-section-editor` change).
4. 12 pre-existing `backlog_change_archived` warnings remain unswept — backlog
   items whose linked change is archived but `status` was never set to `done`.
   Not blocking, but worth a cleanup pass.

**Watch out**: PR #8 is subscribed for activity; a check-in Routine fires in
~60 minutes to re-verify CI/mergeability. Don't re-run the same CI diagnosis —
it's confirmed pre-existing infrastructure, not this change.

## 2026-07-30 — strategy-section-editor: verified and archived

**Did**: Verified and archived the `strategy-section-editor` change. `/verify` passed with no critical issues (7/7 scenarios covered, 792 tests green, 0 typecheck errors). `/archive` merged 2 requirements into `openspec/specs/strategy-authoring/spec.md` — ADDED "Report Sections Can Be Composed When Editing" (4 scenarios) and MODIFIED "Vocabulary Is Discovered, Never Written Down" (added section vocab fetch scenario). Change folder moved to `archive/2026-07-30-strategy-section-editor/`. Backlog item `strategy-section-editor` closed (`status: done`). Committed and pushed `1c36975` to `claude/hand-off-file-review-3gpveo`; PR #7 draft still open.

**State**: 0 active changes · 37 open backlog items · PR #7 (draft) on `claude/hand-off-file-review-3gpveo`. 12 pre-existing `backlog_change_archived` warnings (backlog items referencing changes archived in prior sessions, items not yet swept to `done`) — no new errors introduced this session. `design_surface_stale: strategy-editor` is also now flagged; the edit page changed, so the surface manifest hash is stale.

**Next**: `/propose brain-with-no-model` to wire the assistant model (P3 — the next product-facing capability). Or sweep the 12 stale backlog items first to clear the warnings.

**Watch out**: `design_surface_stale: strategy-editor` — run `/surface` on the edit page before any design work; the old manifest targets the pre-checklist version of the form. CI is still fully broken at the account level (all 7 jobs fail on `main` too, run 30520930429) — nothing in this codebase caused it.

## 2026-07-30 — strategy-section-editor: execution complete

**Did**: Implemented the full `strategy-section-editor` change (standard track, 31/31 tasks). Users can now compose which report sections a strategy includes, not just its tagline.

**What landed**:
- `SectionTemplate` discriminated union (`platform` / `custom`) in domain
- `listVocabularyTemplates` on `StrategiesPort`; `VocabularyTemplatesResult`, `SectionOptionsResult` types; `VocabularyCategory` extended with optional guidance fields
- `McpStrategyAdapter.listVocabularyTemplates`: calls `list_strategy_categories` first for a valid key, then `list_strategy_vocabulary` once; maps defensively, skipping entries with neither `sectionKey` nor `templateKey`; `ToolRefusedError` → `unreadable`
- `ReadSectionOptionsQuery`: concurrent `Promise.all` over `readStrategy` + `readVocabulary` + `listVocabularyTemplates`
- Composition root wired (`readSectionOptions`)
- Edit page refactored: `readSectionOptions` replaces `listStrategies`+`readVocabulary`; section checklist grouped by vocabulary category; current sections pre-checked; unknown sections round-tripped as hidden inputs; `compile=1` param triggers compile (not tagline presence); `intentSummary`/`assumptions` reflect what actually changed
- 17 new tests; 792 total passing; typecheck 0 errors; lint clean

**Branch**: `claude/hand-off-file-review-3gpveo` — PR #7 (draft, updated). CI shows 7 pre-existing failures that also appear on `main` run 30520930429; not caused by this change.

**Next**: `/verify` → `/archive` for `strategy-section-editor`. Then: wire the assistant model (`brain-with-no-model`, P3), or a live apply test (needs operator key + strategy they will let change).

## 2026-07-30 — Repo reconciliation: all branches merged, main is current

**Did**: Audited all open branches. Merged PR #5 (`claude/tool-review-budget-s46qk0`) into `main` — 62 commits, 775 tests, 46 archived changes, live BattleGrid round trips proven. Added `HANDOFF.md` at the repo root. Deleted all stale branches.

**State**: `main` is now the authoritative, most-current state of the project. No active changes. See `HANDOFF.md` for a full orientation.

**Next**: Wire the assistant model (`wire-an-assistant-model`, P2). Apply DT-0002 (strategy editor). Resolve CI (account billing or self-hosted runner).

## 2026-07-30 (later) — the apply was dead a second way, and the delegated path too

**Did**: Archived `a-plan-is-checked-against-the-account-that-compiled-it` (full
track, gate PASS). 775 tests. 7 capabilities, 76 requirements, 46 archived changes.

**A check that could never pass.** `refuseLocally` compares BattleGrid's claim about
which account compiled a plan against `Authority.userId` — which is `'owner'` on a
personal deployment and `random.token(16)` on a delegated one. Neither can equal a
BattleGrid account id, so **applying a compiled plan was refused in every deployment
configuration since the feature was written.** The review rendered, named the blast
radius, and offered no Apply button:

> This plan was compiled for a different account. Compile it again on yours.

It was compiled on that account. Found by driving the served application in a browser
against a live account, then decoding the token: `userId =
bb334a1e-2ac2-4956-8dea-7c7cf01097b9`.

**Wider than the backlog item said.** I filed it as personal-mode-only. The delegated
path is equally dead — `connect.commands.ts` mints the local id randomly and stores
`grant.subject` in a separate column — and OAuth has never been completed, which is
why nobody noticed.

**Two identities were doing one job.** `users.id` and `users.battlegrid_subject` have
been separate columns since the schema was authored, with the subject commented as
the natural key, and nothing that needed BattleGrid's identity ever read it. The fix
separates them in the application layer too. **Nothing stored changes** — the other
reading, replacing the local id with BattleGrid's, would relabel every audit row
already written as `'owner'`, which is the opposite of the `AuditActor` decision.

**`null` skips the check.** Unknown is not mismatched — the same rule as
`forkAffordance`, and precisely the rule this defect broke: a substituted identity
read as a mismatch and the user was told their own plan belonged to someone else.

**The fixture was part of the defect.** `context` reused the same constant as the
token's claim, so both sides agreed by construction. The test proved the comparison
works and could never show that nothing supplies a comparable value. Third fixture
this week modelling a world that cannot exist.

**A decision log asserted a verification it had not run — again.** DL-2 claimed
renaming the field to `battlegridSubject` made passing the local id a compile error.
It does not: `battlegridSubject: req.userId` type-checks when both are `string`. The
re-injection caught it — four behaviour tests failed and typecheck said nothing. Now
a **branded** type, so the claim is true and reads
`TS2322: Type 'string' is not assignable to type 'BattlegridSubject'`. That is the
second decision log in two changes to do this, so it is a pattern and not an
incident: **a claim about a guard is worth nothing until the defect has been put
back.**

**The verifier then found the brand itself unguarded** — widen it to `string` and
every call site silently compiles again. Closed with `@ts-expect-error`, which `tsc`
enforces; removing the brand now yields `TS2578`.

**What the gate does not say.** It does not say applying works. It says the product
no longer refuses it. The last two changes here each removed one block and revealed
another — a confirmation target that never matched, then an account check that never
matched. A third is possible, and only a live apply against a strategy the operator
will let change would find it.

**CI is still allocating no runner.** `runner_id: 0`, one-second jobs, on every
commit including a fresh run at 04:58. Reproduces on `main`. The operator's billing
hypothesis matches the signature. If they have registered a self-hosted runner, note
that `validate.yml` says `runs-on: ubuntu-latest` at all four jobs and will not claim
it without a matching label.

**Next**: a live apply is the highest-value thing and it needs the operator — a key,
and a strategy they will let change. `restore-has-never-been-walked` is the same
shape. OAuth Part B still needs their browser.

## 2026-07-30 — the apply path was dead twice, and the second one is still open

**Did**: Archived `a-confirmation-binds-to-what-was-agreed` (full track, gate
BLOCKED then PASS). Triaged the backlog 38 → 36. 765 tests. 7 capabilities, 76
requirements, 45 archived changes.

**A confirmation authorised any amount.** A token issued against *"sets the most it
may lose in a day to $25"* was accepted by a submission carrying **$25,000** —
`consume` matches who, which tool, which agent and the token, never the values. Four
of five destructive flows already bound their values into `target`; the agent edit
did not, and it is the one carrying money. So the defect was five places composing
one string by hand, four of which happened to be right. Now one construction that
cannot be called without the values.

**Writing the spender half of the guard found a fifth dead write path.**
`apply_strategy_plan` issued `strategy:<id>#<intentDigest>` and the adapter spent
`strategy:<id>`. Never matched. The call that reconfigures every agent bound to a
strategy had been refused by the product, for the life of the feature, through two
production gates. `FakeStrategiesPort.applyPlan` does not go through `enforce()`,
and `mapper.test.ts` asserted the broken string as correct. My own plan called that
flow *"already correct and the control group"* — from reading the issuer alone.

**Reading the two coercions before writing the binding caught the failure the plan
had predicted.** The review kept `"25"`, the apply produced `25`; those digest
differently, so every honest edit would have been refused and the obvious fix would
have restored the defect. One reader now. The first re-injection of that defect
failed nothing, so the property got its own tests — the gap between *fixed* and
*guarded*.

**The production gate blocked my own change on a CRITICAL.** `digestOf` existed
twice: moved to the domain and left in place. The change duplicated the one thing it
exists to consolidate. Every quality gate was green — 770 tests, typecheck, lint,
build, `check.sh`, `check-serving.sh`. It was found by reading the master plan's
file inventory against `git diff --name-status`, which no command runs. Three
artifacts claimed the work had happened: a ticked task, a review line asserting
*"one definition"*, and an inventory row.

**Then the live walk found a sixth dead path on the same call.** With the operator's
key, driving the served application in a browser: the review renders, names the
blast radius, and offers **no Apply button** —

> This plan was compiled for a different account. Compile it again on yours.

It was compiled on that account. The plan token carries
`userId = bb334a1e-2ac2-4956-8dea-7c7cf01097b9`; `OwnerOnlyUser` hands down the
literal `'owner'`. In personal-key mode they can never match, so **every apply is
refused unconditionally in the only mode this operator runs.** Fixing the inner
block revealed the outer one. Filed P1 as
`apply-is-refused-for-every-personal-deployment` — it needs a deliberate answer for
audit rows already written as `'owner'`, so it is a change, not an edit. **Do not
weaken `refuseLocally`**: a plan compiled for one account must not apply to another.

Compiling is effect-free, so nothing on the account moved — the strategy is still
revision 2 with its original tagline, verified after. Key deleted from disk.

**Next**: `apply-is-refused-for-every-personal-deployment` is now the highest-value
work and it is fully doable here. OAuth Part B still needs the operator's own
browser.

## 2026-07-30 — a confirmation authorises what it described, and a fifth dead write path

**Did**: Archived `a-confirmation-binds-to-what-was-agreed` (full track). 771
tests. 7 capabilities, 76 requirements — both deltas MODIFIED, so the count holds
and five scenarios were added. Backlog triaged 38 → 34 before starting.

A token issued against *"sets the most it may lose in a day to $25"* was accepted
by a submission carrying **$25,000**. `consume` matches who, which tool, which
agent and the token — not the values. The consequence is stored, so the mismatch
was recorded in the audit log and prevented nowhere, and the audit log is what this
product offers in place of trust.

**The interesting finding was that the product already had the answer, four times
out of five.** `apply_strategy_plan` and `rebind` bound their values into `target`;
the agent edit did not, and it is the one carrying money. So the defect was never a
missing mechanism — it was **five places composing the same string by hand**, four
of which happened to be right, which is precisely what made the exception
invisible. There is now one construction, `confirmationTarget`, in the domain
beside `ConfirmationToken`, and `agentEdit` cannot be called without the intent.

**The write ports now carry `confirmation: { token, target }`.** A token and the
target it is bound to are one fact, and they travelled as two independent
parameters with every adapter composing its own target — so the adapter decided
what the user had agreed to. That is the root cause, not the symptom.

**Then the guard found a fifth dead write path.** Writing the *spender* half — I
had read the issuer and concluded the flow was fine —

```
issued:  strategy:<id>#<intentDigest>     DescribeApplyQuery
spent:   strategy:<id>                    McpStrategyAdapter.applyPlan
```

`consume` never matched, so **every `apply_strategy_plan` was refused by the
product before it reached BattleGrid** — the call that reconfigures every agent
bound to a strategy, dead for the life of the feature, through two production
gates. `FakeStrategiesPort.applyPlan` does not go through `enforce()`, and
`mapper.test.ts` asserted the broken string as *correct*. A guard pinning the
defect, for the third time here. My own plan called this flow "already correct and
the control group"; the plan's byte-identical constraint would have locked the
break in.

**And the failure mode the plan predicted was already present.** DL-5 said the
danger was a binding that refuses honest edits too. The review read a query string
and kept `"25"`; the apply read a form and produced `25`. Those digest
differently — every honest edit would have been refused, and the obvious fix would
have been to loosen the binding. Found by comparing the two readers before writing
anything. `editIntent` is now the one reader; `pick` and `numberish` are gone.

**The production gate earned its keep.** Every quality gate was green — 770 tests,
typecheck, lint, build, `check.sh`, `check-serving.sh` — and the change had
shipped **two** definitions of `digestOf`: added to the domain, left in place in
`compile-plan.command.ts`. It duplicated the one thing it exists to consolidate.
Found by reading the plan's file inventory against `git diff --name-status`, the
one check no command runs. Three artifacts said otherwise: a ticked task, a review
line asserting *"one definition"*, and an inventory row for a file that was never
touched. BLOCKED on 1 CRITICAL + 3 MAJOR, fixed, PASS on re-audit. The guard now
asserts digest uniqueness and fails on a re-injected copy.

**What is not proven**: the revived apply path is locally spendable, not
platform-accepted. No key on disk. **The next live session should compile and apply
a real strategy plan before anything else** — it is the most consequential fix here
and the only one untested against BattleGrid.

**Next**: OAuth Part B — consent, code exchange, refresh. Needs the operator's own
browser; this container is not reachable from it.

## 2026-07-29 (later) — twelve controls that cannot work, and four pages with no way back

**Did**: Archived `the-strategies-walk`. 741 tests. 7 capabilities, **76
requirements — unchanged**: all three deltas were MODIFIED, so `app-access` and
`strategy-authoring` gained five scenarios between them and no new requirement.
(The commit message for the archive says 78. It is wrong; this is the count.)

Walked `/strategies` as an operator against the older live account, which sits at
25/25 strategies. The section had never been walked, and the two guards added
this morning covered reachability only.

**Twelve affordances offered under a sentence saying they cannot work.** The
roster prints *"You have all 25 of your strategies"* and then renders **Make my
own copy to edit** on all twelve platform strategies. `fork_strategy` refuses
every one — `VALIDATION_ERROR: "Strategy limit reached"`. This product already
has the rule, written in `agent-actions.tsx` and acted on twice: a control that
cannot work is not offered, and its absence is explained. It broke it twelve
times on one screen, directly beneath the constraint that made them impossible.

**The guard found twice what the walk did.** The walk found two dead-end
sub-pages, because two are the ones a person opens on the way somewhere. Run
before any fix, the guard named all four — `edit`, `archive`, `fork`, `restore` —
and no agent sub-page, which is the control group: the agents side was fixed by
hand this morning and the guard confirms that fix holds rather than merely
describing it.

**The worst instance was invisible to every scan, including the first new one.**
Writing the *decline* half — a confirmation must not send you to a list — turned
up `plan-review.tsx` offering *"Go back and change it"* as `href=".."`. That does
not resolve to the page above:

```
new URL('..', 'http://h/strategies/abc/edit').pathname   ->  /strategies/
```

The one control promising to change the composed plan discarded it and landed the
user in a list of thirty-seven, and the label said otherwise. Every link scan in
`reachability.test.ts` matches paths beginning with `/`, so none of them could
see a relative href at all. The new check resolves each href against the route it
appears on, the way a browser does.

**The surface manifest had been right the whole time.**
`openspec/design/surfaces/strategy-editor.json` records that link's effect as
*"Link back to the compose form"*. Declared intent and implementation had
disagreed since the panel was built, and the survey that wrote it down did not
check. A manifest is not a guard either.

**Two properties, and they are independent — with a receipt.** Re-injecting the
archive defect fails *only* the decline check: the page's own `Cannot archive`
branch still links to the strategy, so the way-back check stays green while the
button beside Archive goes to the roster. That is why it is two checks.

**Both fork surfaces, not just the one that was walked.** `/strategies/[id]`
offers the same control for the same strategy one click from the list. Gating the
roster alone would have left the defect somewhere no test looked. `get_strategy`
does not report the quota, so `ReadStrategyQuery` reads the roster too —
concurrently, and allowed to fail, because a read added to make a control honest
must not be able to take a working control away.

**Unknown is not at-capacity**, and the re-injection for it matters as much as
the one for the defect: withholding on a `null` quota fails three tests. That
mistake is the silent one — the user simply cannot fork any more and nothing says
why.

**Filed rather than fixed.** `restore-has-never-been-walked`: both accounts have
zero archived strategies, so the `!isActive` branch has never rendered and
`restore_strategy` has never been called by this product. Whether
`list_strategies` returns archived strategies at all is unknown, and if it does
not, restore is unreachable the way `/thinking` and `/limits` were.
`naming-an-entity-is-held-by-the-walk-only`: the requirement's other clause. Every
cheap static form is either misleadingly weak (`{x.name}` anywhere passes) or
wrong (`No such strategy` legitimately names nothing), and the property is
per-branch, which needs a rendering layer this project does not have. Naming was
verified by walking all five strategy routes and all eight agent routes.

**Next**: OAuth Part B — consent, the code exchange, refresh. All three need the
operator's own browser; this container is not reachable from it. Client
`20d80ad5-…` is registered `mcp:read`-only with redirect
`http://localhost:3000/api/auth/battlegrid/callback`.

## 2026-07-29 (late) — money limits are editable, and someone reads the consequence

**Did**: Archived `money-limits-are-editable`. 728 tests. `agent-authoring`
16 → 17 requirements.

Two defects, and the second was the one worth finding.

**The page refused, citing a reason that had been fixed.** `/agents/[id]/edit`
said money limits were not editable because "a form that sends one value would
quietly clear the rest" — which `the-edit-path-cannot-succeed-either` had already
solved by rewriting `applyEdit` to merge onto the current config. The product
declined to do something it could demonstrably do.

**The confirmation confirmed nothing.** The rename action called `describeEdit`
and spent the token it was handed four lines later, in the same request. The
consequence was computed, stored for the audit, and read by nobody.
`update-cannot-carry-a-confirmation` had named that exact shape as *the fix that
would be wrong* — it was fixed in the **command** and reappeared in the
**action**. The comment directly above it read "the thing that performs the write
must not be the thing that authorises it".

Two offenders, not one: the agent detail page did it too, under a doc comment
saying "Nothing here issues a token to itself".

**A guard had been enforcing the defect.** `rename.test.ts` asserted
`confirmationToken: proposed.proposal.confirmationToken` on the agent page — it
would have failed the correct fix. Guards that pin *where code is* rather than
*what it does* were a theme today; the deploy-doc guard was the other.

**My own new guard had the same hole.** `SPENDS` matched `confirmationToken:`,
so threading the token through a variable and passing it shorthand walked
straight past it. Caught by a re-injection that did exactly that. It now looks
for the *call* — mint and perform in one request — because how the token travels
is incidental.

**The browser found what nothing else could.** Playwright against the
pre-installed Chromium, after Next's server-action wire protocol proved not worth
reverse-engineering. First press:

```
$ACTION_ID_405…: "$ACTION_ID_405…" is not a field this agent owns.
```

The apply action swept `formData.entries()` and skipped two known keys, so the
framework's own field became a proposed change. **A denylist of framework
internals can never be complete.** Now an allowlist. `partitionEdit` refused it
rather than sending it — the layered defence working, and the form still wrong.

**Proven end to end against BattleGrid**, on a throwaway agent cloned from a real
config, archived afterwards:

```
dailyLoss 10 → 42 · drawdown 20 → 99 · exposure 30 unchanged · revision 1 → 2
23 fields present afterwards — the form sent six, applyEdit merged the rest
```

**Walking the finished form is what improved it most.** The confirm screen first
read *"Replaces every trading limit this agent runs under."* and nothing else —
accurate, and useless, on the one screen whose entire purpose is that a person
reads what they are agreeing to. It now names every value, and says **"to no
limit at all"** where the platform reads `0` as no cap. That is
`zero-does-not-mean-nothing` carried to the last screen before the write.

**A checkbox that vanished.** Task 9 was briefly marked `[~]` while the live
write was unfinished, and the tally read 10/10 — the honest marker made the
incomplete task *invisible*. Changed to `[ ]` and it read 10/11. An unchecked box
that explains itself is the record; one the count cannot see is checkbox theatre
with the sign flipped. Then the work was finished properly rather than waived
with `--allow-incomplete`.

**Filed**: `confirmation-is-not-bound-to-values` (P2). `consume(token, userId,
tool, target)` matches the operation and the agent, never the values — so a token
issued for $25 is accepted with $25,000. Product-wide, `rebind` carries the same
shape, and a UI change is the wrong place to alter the confirmation contract.

**Next**: OAuth Part B still needs the operator's browser. The remaining fourteen
`tradingConfig` fields are filed, not urgent.

## 2026-07-29 (night, later) — the OAuth endpoints were assumed

**Did**: Archived `oauth-endpoints-are-assumed`. 722 tests, up from 712.
`battlegrid-connection` 17 → 19 requirements.

`CLAUDE.md` states the lesson: *the tool list goes stale after a BattleGrid
deployment — never hard-code it.* **That lesson was applied to tools and nowhere
else.** Four OAuth URLs are built from a constant in `config.ts` and were
compared to nothing, on the one path whose failure mode is sending a user to a
consent screen that does not exist.

They agree. That is the finding, and recording it is the difference between
*correct* and *known to be correct* — only the second survives a deployment
nobody announced.

**Three things were genuinely unproven and now are not**, none of which needed a
credential:

```
authorize accepts the product's exact URL   302 → the consent screen
PKCE enforced, not merely advertised        no challenge → invalid_request
pinned endpoints match what is published    authorize / token / revoke
```

The PKCE one is worth keeping. The server issues no `client_secret` whatever a
registration asks for, so PKCE is the *only* thing between this public client and
a stolen authorization code. Knowing the server rejects a request without it is a
different fact from knowing it advertises S256.

**I recommended re-doing work that was already done.** I proposed this saying
registration was untested. `findings-dcr.md` recorded it on 2026-07-27 — live,
two registrations, both findings that matter. I had not read the archive before
offering the recommendation. The same pattern the journal already names: a claim
made while the intention was fresh, without checking. It cost nothing this time
because re-registering was cheap and reconfirmed F-1 and F-2, but the
recommendation was wrong when I gave it and the user acted on it.

**Deliberately not done: resolving the endpoints at runtime.** Tempting, since
that is what the tool list does, and wrong here. A client that reads its
authorization endpoint off the network on each request follows a redirect an
attacker controls the first time discovery is poisoned. Tools change weekly and
carry annotations the product must obey; an issuer's endpoints are meant to be
stable, and a change in them is news rather than routine. **Pin, and check.**

**The re-injection that mattered was not a strawman.** Pointing `authorizeUrl` at
`${BASE}/oauth/authorize` fails the new guard — and that is precisely where
BattleGrid's consent screen actually lives (`battlegrid.trade/oauth/authorize`),
so it is the wrong answer a person would genuinely reach for.

**What is left of OAuth is exactly three things**, and all three need a browser:
consent, the code exchange, refresh. Token lifetimes and refresh rotation remain
unknown — `findings-dcr` predicted that on 2026-07-27 and it is still the honest
answer. `oauth-path-may-be-dead-weight` is narrowed to say so rather than
implying the whole path is untested.

**Next**: the operator has a registered `mcp:read`-only client and a redirect URI
pointing at localhost. The remaining segment is a two-minute browser round trip
on their machine — this container is not reachable from their browser.

## 2026-07-29 (late night) — only MCP control

**Did**: Archived `only-mcp-control`. The `assistant` capability is gone — 8
requirements, 16 files, 77 tests, the route, the nav entry, the SDK. 712 tests,
7 capabilities where there were 8.

The operator said they did not think this product had API availability, and that
it was only MCP control. Checked rather than assumed:

```
outbound hosts in src/ and app/   →  mcp.battlegrid.trade   (one)
ANTHROPIC_API_KEY                 →  not set
ANTHROPIC_AUTH_TOKEN              →  not set
```

`assistant-unverified-against-live-api` filed exactly this on 2026-07-28 and was
still P1 two days later. The page meanwhile shipped rendering *"The assistant is
not available on this deployment"* and then naming the pages that do work — copy
that is already an argument for deleting the page.

**It was never in the exit criteria.** The idea brief scopes the assistant as
MVP feature 14, the lowest-rated row in the table, and the exit criteria do not
mention it. Every clause there is BattleGrid over MCP. Removing it does not move
the bar the product set itself, and it takes a deployment from two third-party
credentials to one.

**Two things were kept on purpose, with the reason in the code**, because both
would read as oversights to a stale-code scan:

- `AuditActor` still admits `'assistant'`. The audit log renders stored history,
  `actor` is `text` not a Postgres enum, and narrowing it would render an old row
  as "you" — a false statement about who acted, on the one surface whose entire
  job is saying who acted.
- BattleGrid's `anthropic/claude-…` model ids. Those name a brain *the platform*
  runs for an agent. A grep-and-delete on "anthropic" would break agent creation.

**The new guard's second half is the interesting one.** A URL scan of `src/`
would have called this a single-destination product all along — the SDK carried
its own base URL, so `api.anthropic.com` never appeared in source. That is how a
dependency stayed unexercisable for the life of the repository without any check
noticing. So `one-destination.test.ts` reads the dependency list too, and derives
the vendor-client test rather than banning one name.

**Two findings that were not the assistant.**

A hardcoded list broke because a capability left. `reachability.test.ts` held
`TOP_LEVEL = ['/agents', '/strategies', '/assistant', '/audit']` and failed on
the removal. That is the *mild* half of what a written-down list does; the silent
half is adding a fifth section and having it keep passing. Now derived from
routes one segment deep — deliberately not from the nav, which would be circular,
since the nav lives in the layout and every page contains it by construction.

And a guard was pinning a document to a fact that had stopped being true. It
required `DEPLOYING.md` to say *"no valid `bg_live_` key has existed in any
environment this was built in"* — correct when written, false from the moment the
personal path was exercised against two live accounts. **A guard aimed at the
past fails on the honest edit and passes on the stale one.** Repointed at what is
genuinely still unproven: no real OAuth authorization has ever been completed.
The doc now also states what *has* been proven live, because one that reads as
untested everywhere gets ignored everywhere.

**Five new validation warnings, left standing.** Four backlog items name a
capability that no longer has a spec. Two I closed as moot with the reason
written in; two are historical `done` items. Rewriting their `capability:` field
to clear the board would falsify what they were about. A truthful warning beats a
clean board.

**Next**: OAuth is now unambiguously the largest gap — it is the MVP exit
criterion, it has never been completed against BattleGrid, and it is the only
remaining way to connect that nobody has run. The other standing P1s are the
unbuilt image and the CI runner block, neither a code defect.

## 2026-07-29 (night) — a second account, and what age reveals

**Did**: Archived `performance-was-already-in-the-payload`. 780 tests, up from
758. `agent-understanding` gained one requirement and modified another.

A temporary key for an older account of the same operator's — nine agents, one
with **97 games played**. Everything below came from calling it.

**The tool named `get_agent_performance` is not where the performance is.**

```
get_agent_performance   pnlCurveUsd empty on all nine agents, every figure zero
get_agent_fund_allocation   zeros across all nine
```

Twelve agents across two accounts and neither tool has ever returned a populated
value. Meanwhile `list_intelligence_agents` — which this product calls on every
agents page — carries the whole record per agent, and `mapAgent` discarded it:

```
Fade Master II   97 games · 39% win · 50% accuracy · $73.87 · 18 trades 5W/13L
Fade Master      20 games · 65% win · $36.90
Apex             42 games · 26% win · $22.96 · 3 trades 0W/3L
```

Anyone modelling this from the schema would have built a surface on a tool that
has never once answered.

**The exclusion was reasoned, and the reasoning stopped one step short.**
`Agent`'s doc comment named the performance block as one of the fields "none of
which participates in a rule", and a test asserted it never reached the domain.
That rule is right for a domain type and it is the wrong test for what the
product may *show* — this is a workbench for building, tuning and
*understanding*. A comment that reads as settled is why nobody asked again. Both
the comment and the guard were amended rather than deleted, so the reversal is
recorded where the original reasoning was.

**A fixture modelling a platform that cannot exist, for the third time on this
branch.** `performance: { winRate: 0.5 }` sat in `mapper.test.ts` — invented, and
wrong: the rate is nested under `gameStats`, never at the top. It was never
exercised because the only assertion on it was that the block got *dropped*.

**Eight names the first account was too young to contain**, all rendering as bare
identifiers rather than being dropped — the open maps working, and this time the
argument is evidence rather than reasoning. One was a defect:
`COST_LIMIT_REACHED` files its message under `error`, not `reason`, so
`eventSentence` missed *"Daily cost limit reached ($6.0544 / $6)"* — the one line
saying why an agent stopped.

**A guess that can stop being a guess.** `settled()` reads `score !== null`,
written when no settled game had ever been seen. Measured across five agents and
37 games: both present 24, both absent 13, **one without the other zero times**.
Right for a reason now. And `finalScore` is signed — one live row is `WON` at
rank 1 with `isItm: false`, a payout of zero and a score of −177, which settles
that none of the four result fields implies another.

**The walk found two more that no test could.**
`TRADING_BALANCE_BELOW_THRESHOLD` rendered as `Balance 2.179006 · Floor 10` — a
warning about someone's money as two bare floats. Fixing it exposed that money
was formatted in three places and had already drifted: `paid $0` on one page
beside `−$0.25` on the next. One `usd()` in the domain now.

**The pattern, said once**: an older account is a different *kind* of evidence
from a bigger sample of the same one. Three days of history contained no settled
game, no competition, no cost limit and no populated record — so every
conclusion drawn from it was a conclusion about a young account, and four of
them were wrong.

**Next**: the two empty tools stay unmodelled, with a test asserting the
emptiness so a populated account fails the suite and answers the question. Two
P&L figures disagree — roster `avgPnl: -0.248` over 18 trades against
`realizedPnlUsd: 0` — and the product shows the roster's, captioned with its
source rather than reconciled. `last24hCostUsd` is unmapped and probably matters:
spend is a fifth way to be stopped and `/limits` does not mention it. All filed.

## 2026-07-29 (late) — walking the product, and what it found

**Did**: Archived `the-journal-can-never-show-anything` and
`you-cannot-open-your-own-agent`. 758 tests, up from 736. `agent-authoring` and
`app-access` each gained one modified requirement.

The task was to serve the product and use it as an operator would. Four defects,
none of which a test could have raised, and the first is the worst thing found
this week.

**The journal page could never show anything.** `readJournal` read
`payload['entries'] ?? payload['journal']`. `get_agent_journal` sends neither —
it answers `{ username, recentThoughts, recentActivity, recentGames }`. So the
lookup missed, `Array.isArray(undefined)` was false, and the method returned
`empty`. Every agent's journal has said *"has not recorded anything yet"* on
every account since the page shipped, while `/thinking` — one click away — listed
eighty-five decisions for the same agent.

`JournalResult` has three states specifically to keep *unreadable* apart from
*nothing recorded*. A fourth case defeated them: the call succeeded, the payload
parsed, and the mapper looked in the wrong place. **It reported the reassuring
one of the three.**

What the wrong key was hiding is the answer to the first question an operator
asks. Volatilis, whose journal read "has not recorded anything yet":

```
INSUFFICIENT_FUNDS   Insufficient balance. Required: $10, Available: $0.
                     Deposit USDC to your HyperLiquid perps account.
GRID_SKIPPED         Agent … is halted — new wagers are blocked.
```

**The test that covered it could not see it.** `tests/agent/journal.test.ts`
assigns `port.journalEntries` a value it invents and asserts the query returns
it — proving the query forwards a field. The mapper, the only place the defect
lived, was untested for the life of the page. It now runs against a recorded
payload, with the fixture itself asserted to be the observed shape so a future
"repair" of the fixture fails too.

**Rendering it live immediately found more than a ten-entry sample had**: two
outcomes and three event kinds, shown as bare identifiers rather than dropped.
That is the open map earning its keep — `OUTCOMES` and `EVENTS` are deliberately
not unions, and this is the first time it paid. `SKIPPED_INSUFFICIENT_FUNDS` was
**not** folded into `stoodDown()`: an agent that chose not to act and one that
could not are different answers to "why is it quiet", and only the first is a
decision.

**You could not open your own agent.** Every row on `/agents` offered six links
and none was the agent. `/agents/[id]` carries the binding, the brain, the money
summary and the rename form; the only live link to it was the cancel on
`/agents/[id]/archive`. You reached your agent's own page by starting to retire
it.

Both reachability checks were right by their own terms — the scan reads source,
`agent-edit.tsx` has the link three times, the walk arrives via `/edit`. Neither
can see that those links sit in branches that do not render, nor that the
surviving path opens a form the user did not come to submit. Two new guards, both
derived: *nothing is reachable only by passing through a mutation*, and *a list
offers the thing it lists*.

`/thinking` and `/limits` also named no agent — "What would stop this agent", on
an account with eleven — and both dead-ended, the second while reporting that two
loss ceilings are unset.

**Re-injecting is where the guards were actually earned.** Two of three mutations
passed at first: deleting the row's name-link left the suite green (the corridor
guard is satisfied by any path, and the sub-pages now link back), and the
narrower check written to catch *that* also passed, because `/agents/new` matches
`^/agents/[^/]+$`. A static sibling is not an entity. Neither was found by
reading.

**One gap is stated rather than guarded.** `AgentEditForm`'s editable branch had
no way back while both refusal branches did — so the file read as covered, and
the page a working account actually sees was a dead end. A source scan cannot
tell which branch renders.

**The pattern across all four**: every one was visible in thirty seconds of use
and invisible to 736 tests, four gates and a production audit. Two of them —
the journal mapper and the edit dead end — were *specifically* invisible because
the artefact under test agreed with itself. A fake returns what you assigned it;
a scan finds a link in a file it cannot execute.

**Next**: `get_agent_performance` and `get_agent_fund_allocation` remain observed
and unmodelled — and until performance is called, nothing in this product has
seen a settled result, so nothing should be written about scoring. The
strategies section has not been walked; the two new guards cover its reachability
and say nothing about naming or return paths, which is where the agents side
broke. Both filed.

## 2026-07-29 (evening) — what would stop an agent, including nothing

**Did**: Archived `how-close-an-agent-is-to-its-ceilings`. `agent-understanding`
3 → 5 requirements. 724 tests, up from 710.

**Reading the live payload first paid for itself twice**, and neither fact is in
the declared schema.

```
              configured   fill    remaining   ceiling
dailyTrades      true       21        13          34
exposure         true        0       250         250
drawdown        false        0         0           0
dailyLoss       false     0.07         0           0
```

**`fill` is not a fraction.** It is the amount consumed in the gauge's own unit —
21 + 13 = 34. A surface treating it as a proportion would draw that bar at
2100%. Mapped to `used` so the name cannot invite the mistake.

**An unconfigured gauge reports `remaining: 0`.** As a bare number that reads
*about to halt*; it means *no cap exists at all*. The two unconfigured gauges on
this account are **drawdown** and **daily loss** — the two governing how much can
be lost — so the naive rendering states the exact inverse of the truth on
precisely the limits where being wrong costs money.

So `remaining` and `ceiling` are `null` when nothing caps a gauge, never the
platform's zero, and the surface prints "no limit set" rather than a figure.
`stoppableLimits` names the unbounded ones explicitly: four calm rows read as an
agent operating inside its limits when the truth may be that it has none.

The platform's own warnings — over-subscribed, stop below a single trade's loss,
stop effectively unbounded, halted — are carried as stated. BattleGrid decides
those against state this product cannot see, and a local re-derivation would be
a second opinion that quietly diverges.

**Live, on the operator's account:**

```
At risk at once    0 of 250, 250 left
Trades in a day    21 of 34, 13 left
Loss in a day      0.07 used · no limit set
Loss in total      0 used · no limit set
```

`THE .0` is active, has traded twenty-one times today, and has **no ceiling on
either loss limit**. The product can now show that. It cannot set it — a ceiling
lives in `tradingConfig`, which the edit path owns, and a second write path to
the same object from a read surface would be the affordance problem this branch
spent the day removing.

**The live assertion is negative and that is the point**: a gauge the platform
reports as unconfigured must not arrive carrying a `remaining`. Four defects
re-injected, each caught — carrying the zero through, treating an unconfigured
gauge as binding, putting a ceiling on the wrong gauge, dropping usage on an
uncapped one.

**Next**: `get_agent_performance` and `get_agent_fund_allocation` are observed
and unmodelled; both answer what an agent has *done* rather than what it is still
allowed to do. Or the four remaining P2s. Nothing is blocked.

## 2026-07-29 (late) — the probe reaches twice as much of the platform

**Did**: Archived `observe-the-reads-that-need-an-id`. `battlegrid-connection`
+1 requirement. **21 → 49 of 83 read tools observed.**

**Why it mattered more than another surface.** Six defects were found on this
branch and every one came from calling the real platform — none from a test, a
gate, or a review. So the set of tools the probe can call *is* the set the
product can safely be built against, and it was 21 of 110. Fourteen of the
sixteen agent-internals tools had never been called by anything, purely because
they take an `agentId` the account plainly has.

The probe now harvests ids from responses it already holds and calls the reads
those satisfy, **repeating until it stops yielding**. That last part was not
polish: `list_entry_decisions` itself needs an `agentId`, so the `decisionId` it
returns cannot exist until a round that had one. One pass left six tools
unreachable for no reason but the order they were tried in.

The safety property did not move — `readOnlyHint` only, filtered before any
request is built. Zero non-reads called, and none attempted.

**My own id table was three-fifths wrong, and nothing said so.** I wrote it from
assumption: `list_entry_decisions` returns `entries`, not `decisions`;
`list_signal_logs` returns `entries`, not `logs`; the argument is `logId`, not
`signalLogId`. The lookups returned nothing, the tools stayed uncalled, and the
artifact went on reporting them as needing an argument the account had.

That is precisely the failure this probe exists to remove from the product,
reproduced inside the probe, by me, in a change whose entire subject is not
guessing. It is now a test that fails when a row stops resolving rather than a
row that quietly yields nothing.

**A guard that only holds after a live run is not a guard.** The safety check
asserted against the artifact, so deleting the classification filter and not
re-probing failed nothing — found by re-injecting exactly that. There is a
source-level assertion now: both passes filter on classification, and `attempt`
is the only thing issuing a `tools/call`.

**Third time today that a checkbox or a comment claimed more than the code did.**
Task 7 of the thinking change, the stale outage note in the edit change, and now
this. The pattern is mine and it is worth naming: the claim gets written while
the intention is fresh, and nothing re-reads it.

**Next**: 28 tools now have observed response shapes that did not before —
budget gauges, performance curves, entry decisions, signal logs, trade outcomes,
gate blocks. Anything built on them starts from what the server returned rather
than what it advertises. `get_agent_budget` looks like the most useful: it
carries `gauges` with `breached` / `configured` / `fill` / `remaining` per limit,
which is the "is this agent near its ceiling" question the product cannot answer.

## 2026-07-29 (evening) — the product can read an agent thinking

**Did**: Archived `an-agent-can-be-read-thinking`. New capability
`agent-understanding`, 3 requirements. 710 tests, up from 691.

**The understanding third was at zero.** 110 tools, 21 used, and none of the 28
carrying an agent's reasoning. The account held 340 thought-log entries and the
product could not show one.

```
thinking: decisions 20 of 84
  LDO Formed a thesis                   · cleared by 0  · 515 chars
  ENA Formed a thesis                   · short by 0.1  · 398 chars
  —   Stood down — not confident enough · short by 0.09 · 548 chars
```

That third line is what this was for: an agent that evaluated a setup, found
itself 0.09 under its own bar, wrote 548 characters explaining why, and did
nothing.

**Built from observation.** Five agent-internals reads were called live before
anything was typed — thought log, performance, budget, activity feed, fund
allocation. Every type in `thought.ts` is what the server returned. After three
defects this week from trusting declared shapes, that ordering is now the rule
rather than a preference.

**The platform corrected me twice, and the second one is the finding.**

Not every entry carries reasoning: `ERROR` entries have none, because the agent
failed before writing anything. My live assertion said all of them did and
failed against real data.

And the bar does not gate thinking. Measured across fifty entries:

```
SUBMITTED                cleared 10   short  0
SKIPPED_LOW_CONFIDENCE   cleared  0   short  3
AGENT_TRADE_THESIS       cleared 29   short  6
```

Six theses formed *below* their own threshold. So the bar governs whether a
thesis becomes a **submission**, not whether one forms — the agent reasons its
way to a view first and is gated afterwards. I had the arrow backwards and two
of my own doc comments asserted it. Both corrected; the `>=` boundary is now
marked as the convention it is rather than the measurement it never was.

**A checkbox was ticked before the work behind it was done.** Task 7 claimed the
guards had been re-injected. They had not. Caught on the way to archiving, which
is later than it should have been, and in a repository whose verifier calls that
out in other people's changes. Done properly afterwards: four defects, one guard
failing each — closing the outcome set, defaulting an absent threshold to zero,
collapsing `empty` into `unreadable`, and taking the percent where the float
belongs.

**Next**: `probe-skips-every-read-that-needs-an-id` is the highest-leverage item
left. The probe calls only tools with no required arguments — 21 of 110 — so
fourteen of the sixteen agent-internals tools have never been called by anything.
The five needed here were called by hand, so the knowledge went into the change
and not the artifact. Observation is the only thing on this branch that has ever
caught a defect; widening what can be observed is worth more than the next
surface.

**Filed**: `probe-skips-every-read-that-needs-an-id`.

 2026-07-29 (later) — an agent can be created, renamed, and have its limits changed

**Did**: Archived `the-edit-path-cannot-succeed-either` and
`renaming-an-agent-is-offered-and-cannot-work`. `agent-authoring` 13 → 15
requirements. 691 tests, up from 673.

**Three write paths now work that never had.** Create was proven earlier today.
These two close the rest:

```
create:  created
stored:  mode=OFF dailyLoss=10 leverage=1
propose: Renames "Grid-Commander probe (off) …" to "GC probe renamed …".
rename:  updated
propose: Replaces every trading limit this agent runs under.
limits:  updated
limited: maxDailyTrades=7 mode=OFF dailyLoss=10
archive: ARCHIVED
```

The `limited:` line is the one worth reading twice. `maxDailyTrades` changed and
`tradingMode` and `maxDailyLossUsd` did not — the all-or-nothing rule holding
against the real platform rather than against a fake.

**Defect: the read is wider than the write.** `get_intelligence_agent` returns a
`tradingConfig` of twenty-three keys; `update_intelligence_agent` accepts twenty
and declares `additionalProperties: false`. `applyEdit` was
`{ ...current.fields, ...changes }`, so all twenty-three went back and every edit
was rejected outright. `applyEdit` projects onto `TRADING_CONFIG_FIELDS` now,
reports what it dropped, and refuses an incomplete merge — the completeness check
the create path always had and the edit path never did.

**The fixture is why nobody saw it.** It modelled a four-field config. A
four-field config cannot exist, because create requires twenty. Tests built on it
proved a read-modify-write preserved untouched fields — true, and useless, since
none of the four were the three that broke it.

**Defect: renaming was offered, impossible, and silent about it.** Three causes,
and the third hid the other two. `AgentsPort.updateAgent` had no
`confirmationToken`, so the guard refused before a request was built. The action
awaited the result, discarded it, and redirected, so every refusal looked like
being ignored. And the rename box self-gated to `null` for an archived agent —
correct in rendering nothing dead, silent in a way that reads as forgetting.

**The token is minted by `DescribeEditQuery`, never by `UpdateAgentCommand`.**
That distinction is the change. A token the command grants itself records that
the product intended to proceed, which was never in doubt; the guard exists so a
person saw the consequence and agreed. Making the parameter **required** rather
than optional was the other half — the type checker then named all thirteen
callers at once instead of a live call finding them one at a time.

**The operator's suggestion was right and sharper than my framing.** They asked
that an archived agent say no changes can happen until it is reactivated. The
rule already existed in `UpdateAgentCommand`; what was missing was the screen
honouring it. Now it distinguishes the two reasons: platform-locked is permanent
and not the operator's doing, archived is theirs and one button away on the same
page.

**Four corrections this session, all mine.**

1. I predicted `apply_strategy_plan` would be the next dead path. It is not —
   sixty-four of its sixty-eight required paths live inside the server's own
   `approvedPlan`, handed back verbatim. The "161 unverified params" figure
   counted server-supplied fields as product risk. The real defect was in
   `update`, which that framing rated *lower*.
2. I diagnosed `INTERNAL_ERROR` on create as a degraded BattleGrid backend, and
   wrote it into a scheduled check-in. It was the probe reusing a fixed
   `displayName`; an archived agent still holds its name and BattleGrid answers
   the collision with an unhandled 500. Half an hour lost.
3. I said the rename form rendered unconditionally for archived agents. It has
   always self-gated. The defect was the silence, not a dead control.
4. I pushed once with a lint error, having read the summary line and not the
   message under it.

**And the fix broke the probe's own teardown.** The first successful rename
bumped the revision, and the `finally` archived at the value captured before it —
so optimistic concurrency correctly refused and the probe left a live agent on
the operator's account. Archived by hand within the minute. A teardown that
assumes nothing changed has no business running after a test whose whole point is
that something did.

**Next**: the agent-internals reads. The write side is closed — create, rename,
limits, archive, fork, compile, strategy archive all proven live — and
`get_user_thought_log` now carries real observed types, so that group can finally
be built against observation rather than inference.

**Filed**: `no-action-may-discard-a-write-result` (the rename's discarded result
is fixed and guarded; nothing checks the other actions),
`conformance-sweep-for-required-and-accepted-params`. **Closed**:
`update-cannot-carry-a-confirmation`, `trading-config-read-shape-is-not-write-shape`.

## 2026-07-29 — create_intelligence_agent succeeded, for the first time

**Did**: Archived `every-value-sent-is-one-the-platform-accepts` (standard,
15/15). `agent-authoring` 12 → 13 requirements. 673 tests, up from 655.

**The headline.** `create_intelligence_agent=succeeded` on the operator's real
account. That call had never once worked in the life of this product. Agent
created r1 ACTIVE, read back `mode=OFF dailyLoss=10 leverage=1`, archived to r2.
Account verified after: probe agent ARCHIVED, slot returned (2 of 3 used), the
operator's three agents untouched at their original revisions.

The money limits are the part that matters. `tradingMode: OFF` and a $10
daily-loss cap are what the product *said* it was creating, and what the platform
actually stored. The requirement archived two entries ago — an agent's spending
limits are stated before it exists — is now true against a live server rather
than against a fake.

**The knowledge was never missing.** The sharpest thing found today was not the
defect. It was that `docs/BATTLEGRID_MCP_REFERENCE.md` has carried
`enum(MANUAL|VOLATILITY_AUTO)` since **2026-07-27** — committed two days before a
live probe discovered we were sending `FIXED`. 110 tools, 589 parameters, full
types and enums, sitting in the repo. We had the fact and stored it in prose,
where no test can read it.

That reframes the class of defect. It is not "we do not know the platform". It is
"what we know is not in a form anything can check".

**Measured, and it is worse than the one defect.** The conformance check reads
`input_required` — top level only. Nested required params on the tools the
product calls, never verified: `create_intelligence_agent` 47,
`update_intelligence_agent` 39, `compile_strategy_plan` 25, `apply_strategy_plan`
50. **161 unverified.** Today's defect was one of the 47. The check that should
have caught it verified two fields and was blind to the rest.

`apply_strategy_plan` is the one to worry about: 50 unchecked required params,
classified destructive, still unproven live.

**What the guard can now do that no earlier guard could.** With the artifact
regenerated, `wire-values.test.ts` walks every value the product can put on the
wire against `input_constants` and catches **both** defects — including
`brain.kind`, which is a `const`. Source-level guards cannot see a const, and the
prose reference had flattened it to bare `string`. Only the machine-readable
record sees it. Re-injected to prove it: `'FIXED'` fails 3 tests, lowercase
`kind` fails 2.

**The outage, and what it taught.** BattleGrid's MCP backend died mid-session
(~09:50Z) and returned ~12:35Z. `GET /health` gave nginx's own `504 Gateway
Time-out` — nginx up, upstream dead. That explained the odd auth signature
exactly: unauthenticated requests were rejected at the edge in 0.9s and never
touched the backend, while *validating* a token required it, so any bearer
token — a working key or the literal `bg_live_notarealkey` — hung identically.
The game site was never affected, which is probably why it went unnoticed.
`/health` is the cheap probe: ~1s and unambiguous, versus 25s waiting for a
`tools/call` to time out.

**The verifier earned its place.** It caught that the proposal declared the
artifact's observed half unchanged when `shape()` had gone from depth 2 to 6.
Small, and the code was right — but the proposal was about to become the record
while saying something the diff disproved. Corrected rather than reverted.

**Also fixed while the probe was open**: `shape()` capped one level short of
every answer, so `get_user_thought_log` had recorded sixteen key names and zero
types. Six levels now, verified against a payload seeded with recognisable values
at every depth — nothing leaks; every leaf is a type name.

**Next**: the reference is the highest-value target. Make
`generate_mcp_reference.py` emit machine-readable JSON alongside the prose (it
truncates 37 enum lists with `…` and flattens 4 consts to bare `string`), then
sweep all 21 called tools for required-param coverage. None of it needs
BattleGrid. After that, `get_user_thought_log` — it now has real types, so the
agent-internals reads can be built against observation.

**Filed**: `two-read-tools-do-not-answer` — `get_market_context` refuses `{}` for
omitting an argument its schema does not mark required (a declared-vs-actual
divergence), and `get_open_orders` returns a 500 on a no-argument read. Both
answered on the previous probe.

## 2026-07-29 — create_intelligence_agent had never once succeeded

**Did**: Ran the agent create probe against the live account. It failed, on two
literals this product invented. Proposed and executed
`every-value-sent-is-one-the-platform-accepts` (standard). `agent-authoring`
12 → 13 requirements. 667 tests, up from 655.

**The finding.** The probe called `create_intelligence_agent` for the first time
in the life of this product, and BattleGrid rejected it:

```
brain.kind — Invalid discriminator value. Expected 'PRESET' | 'CUSTOM'
tradingConfig.positionSizePresets.sizingStrategy —
    Expected 'MANUAL' | 'VOLATILITY_AUTO', received 'FIXED'
```

Not a regression. The create path has never worked. Four production gates, 655
tests, a full surface map and an architecture conformance check all passed over
it, because every one of them checked whether a field was *sent* and none
checked whether its *value* would be accepted.

**Defect 1 is a translation nobody performed.** The domain's brain union
discriminates on `'preset' | 'custom'` — correctly; it is internal.
`brainToArgument` is the four-line function that renders it for the wire, and it
passed the internal spelling straight through to a schema that pins
`const: "PRESET"`. It had no test of any kind. Four lines, one job, zero tests,
and the job was not done.

**Defect 2 is more instructive, because it looked answered.**

```ts
sizingStrategy: d['sizingStrategy'] ?? 'FIXED'
```

That reads as a default being honoured. The catalog has no `sizingStrategy` key
at all, so the fallback fired every single time — and `FIXED` is not one of the
two values the enum permits. The `??` is what made a guess look like a lookup.
Five more values are chosen the same way (`trailingType` and three feature
switches); they survive only because they happen to be acceptable. `trailingType:
'ATR'` is in the enum by luck.

**Why nothing caught it.** `docs/battlegrid-mcp-surface.json` recorded
`input_required` and `input_optional` — **field names, top level only.** Not one
enum, not one const, in 110 tools. So `mcp-conformance.test.ts` could assert that
`createAgent` sends a `brain`, and had nothing to check the brain against. The
artifact was missing exactly the half that mattered, and the check built on it
inherited the blindness without anyone noticing it was blind.

**The fix, in three parts.** The probe now records `input_constants`: every enum
and const at any depth, as `dotted.path → [values]`, with union branches merging
onto one path so `brain.kind` yields both. The two literals are corrected, and
the values this product chooses because the platform declines to are named in
one place (`OURS`) with what each is and why — `MANUAL` because it is the mode
that reads the percentages we actually send, `ATR` because all five platform
presets use it, `false` for the three switches because the platform defaults
their master switch off. A new guard walks every wire value against the recorded
constants, generically: naming the two known-bad fields would guard the mistakes
already made.

**Guard discipline.** Both defects re-injected, three ways. Lowercase `kind` →
3 failures. `'FIXED'` written plainly → 3. `'FIXED'` put back behind the lookup
disguise → 4, including the source check that bans the pattern. The source check
itself failed on first run against its own comment, which quoted the pattern it
bans; it strips comments now.

**BattleGrid's auth went down mid-session, and the shape of it is worth
recording.** `POST /mcp` with no `Authorization` header returns 401 in 1.2s. The
same request carrying *any* bearer token — a working key or the literal
`bg_live_notarealkey` — hangs until the client gives up. `battlegrid.trade`
serves 200, `mcp.battlegrid.trade/` serves 404, the egress proxy reports no
relay failures. It is their token-validation path, and it is not about this key:
a key that cannot exist hangs identically to one that works. Earlier calls in
this same session succeeded, so it began mid-session.

Three tasks are blocked on it: regenerating the artifact, the artifact-based
guard (written, held out of the tree so the suite stays green and honest), and
re-running the live create probe to prove the fix end to end. **The fix is not
yet proven against the platform.** It is proven against the platform's declared
schema, which is what caught the defect in the first place — but this project
has learned twice now that declared is not observed.

**Next**: re-probe and run the live create the moment auth answers, then the 28
agent-internals read tools — thought logs, decision context, performance — the
"understanding" third of the product, still at zero.

**Filed**: `preset-configs-are-discarded` (the catalog ships all fourteen values
per preset; `mapPositionPresets` keeps three fields and drops them),
`brain-presets-are-hardcoded-and-short-one` (schema pins eleven, adapter lists
ten).

## 2026-07-29 — The create button could not say what it was creating

**Did**: Proposed, executed and archived `name-what-an-agent-may-spend`
(standard, 13/13). `agent-authoring` 11 → 12 requirements, purely additive. 655
tests, up from 635.

**The defect.** `app/(app)/agents/new/page.tsx` passed **`tradingConfig: null`**.
Not a shortcut around an optional field: BattleGrid's catalog declares defaults
for leverage, stop loss, trade count, slippage and a dozen other knobs — and
**none** for the six that answer *how much can this lose*. Omitting them did not
inherit something sensible. It left the money questions unanswered, and the
product could neither set nor state what it had just created.

Read from the live account, for scale: both existing agents run
`FULL_EXECUTION` at **5× leverage**, and one carries `maxDailyLossUsd: 0`.

**Every other surface here refuses to state what it does not know.** The roster
will not say "no agents" when the read failed. A declared scope is never
described as enforced. A threshold the platform did not send renders "not set".
Agent creation was the exception, on the one subject where being wrong costs
money.

**The split is the platform's, not ours.** `undefaultableFields` derives the
questions from `Catalog.defaults`, so if BattleGrid starts defaulting a field it
stops being asked and if it stops, it starts — nobody edits a list. It returns
eight: the six money questions plus `positionManagement` and
`positionSizePresets`, which are composite objects a flat default cannot
express. The command supplies those two; only the six reach the operator.

**All-or-nothing forced the shape.** `tradingConfig` is rejected when partial
and *resets whatever a partial send omits* (findings-agents F-6), so "collect
just the loss cap" was never available. `buildTradingConfig` produces all twenty
fields or refuses and names what is missing.

**Two decisions worth keeping.** `OFF` is offered first and selected by default
— it is the only `tradingMode` that makes the other five harmless, and it lets
someone read what an agent decides before any of it costs anything. And no money
field is pre-filled: a suggested loss cap would be this product choosing a number
on the operator's behalf, which is exactly what the absence of a platform default
says nobody should do. Empty is unanswered and refuses; a typed `0` is a real
answer and is kept.

**The boundary guard, again.** First draft had the route importing the domain to
assemble the config. The command already reads the catalog, so it assembles it —
and the route passes raw answers. Second time this session that rule caught a
page reaching past its layer, and both times the fix was better than the thing
it replaced.

**A fixture was modelling a platform that does not exist.** `defaultCatalog()`
defaulted three fields, so every other field read as unanswered and a passing
test started failing for the right reason in the wrong place. It now carries the
live catalog's fifteen real defaults — with the six money absences intact,
because that absence is the entire subject.

**Regex-on-source cost a third repair.** A blanket `tradingConfig: null` replace
hit `Agent` fixtures as well as create requests, and an earlier one inserted a
key inside a `bounds` object. Both repaired by hand. The lesson has now been
paid for three times in one session: match on a unique anchor, or use an editor.

Seven mutations injected, seven caught — including `tradingConfig: null`
restored, `OFF` swapped for `FULL_EXECUTION`, and a field dropped from
`TRADING_CONFIG_FIELDS` (which would silently reset it on every create).

**Not done, deliberately**: no agent was created. That would spawn something on
a live trading account, and the remaining slot is the operator's to spend.

## 2026-07-29 — The product can finally see a strategy

**Did**: Proposed, executed and archived `read-a-whole-strategy` (standard,
18/18). `strategy-authoring` 10 → 11 requirements, purely additive. 635 tests,
up from 612.

**The gap, restated.** `get_strategy` was one of the 74 unused tools. So a
roster row was everything the product knew, and a roster row carries
`sectionCount: 4` — a *number*. That is why the editor edited a tagline: not a
missing form, no data behind a bigger one.

What a strategy actually is, now visible: 4 sections, **82 signal rules** with
weights and per-signal params, a page of authored `marketReadText`, three
thresholds, and an open-position count. `/strategies/[id]` is the route that was
missing — agents have had a detail page since they were built; strategies had
four things you could *do* to one and nowhere to *look*.

**Rendering caught a bug I shipped, again — the fourth time this session.** I
sent `includeInactive: true` unconditionally, reasoning from the name that it
widens the read. It does not. The tool description says *"only to load an owned
PRIVATE strategy"* — I read that sentence, quoted it in a comment, and still
missed the word "only". The two modes are strictly **disjoint**, verified live
in all four cells:

| | SYSTEM | archived PRIVATE |
|---|---|---|
| default | found | NOT_FOUND |
| `includeInactive: true` | NOT_FOUND | found |

Every SYSTEM strategy was unreadable, and the page said *"Grid-Commander could
not reach BattleGrid to ask"* — on a request where BattleGrid answered clearly
and immediately. The same shape of wrongness the `FailureCause` work fixed, one
layer up.

**So `readStrategy` asks twice**, and only on a not-found. The common read stays
one round trip. That is not a runtime dual-path — it is one behaviour against a
platform that offers no single call.

**A refusal now carries the platform's own code.** BattleGrid's errors are JSON
— `{"code":"NOT_FOUND","message":…}` — inside the text block. `ToolRefusedError`
parses it once, so the adapter tells "not there" from "not allowed" by reading a
code rather than matching on prose. Every tool gets that, not just this one.

**The boundary guard earned its keep.** My first page imported `isEditable` and
friends straight from the domain; `app/` may not. The fix follows the pattern
already there for the roster — the use case decides the affordances and hands
down `can`. Two places computing the same permission is how a detail page and a
roster start disagreeing about whether something is editable.

**Verified live**: London renders with 82 signals, 82 carrying weight, 0
required, and "Make my own copy to edit"; the archived fork renders "· archived"
with "Restore". Four mutations injected, four caught — including the exact
`includeInactive` bug.

**Next**: editing. Eighty-two rules with weights, required flags and per-signal
params is a real surface, and it should be designed against the page that now
exists rather than against a schema.

## 2026-07-29 — A write reached the real platform

**Did**: Ran the write probe the operator authorised. `tests/live/write-probe.test.ts`
— guarded on `BATTLEGRID_API_KEY`, so `npm test` skips it and CI cannot reach
it. 612 tests (611 + 1 skipped by default).

**It works.** Through the product's own adapters, not raw HTTP:

```
source:  London (SYSTEM, r2, 0 bound)
forked:  London (fork) 8ecb1363… r1 scope=PRIVATE
compile: compiled
archive: changed
audit:   fork_strategy=succeeded compile_strategy_plan=succeeded archive_strategy=succeeded
```

**`archive_strategy` is the line that matters.** It could not have succeeded
this morning — it sent `{ strategyId }` alone and would have been refused for a
missing `expectedRevision`. Found by the surface map, fixed, and now proven
against the real platform in the same day.

**What the probe touched, and what it did not.** A fork of a SYSTEM strategy
with zero agents bound — an object that did not exist before the test. The
archive runs in a `finally`, because a fork left behind by a failed probe is
litter on someone's real trading account. Verified afterwards: the fork is
`ARCHIVED`, the twelve SYSTEM strategies are untouched, and the four
pre-existing private ones are untouched. No agent was touched. No wager tool
exists in any code path this ran.

**Four properties retired at once**: the `ENVELOPED` argument split (compile
accepted wrapped, fork and archive accepted flat), the response reads
(`payload['strategy'] ?? payload` on a real fork, a real `planToken`), the
confirmation gate on a destructive call, and the audit path — three mutating
calls, three records, all `succeeded`.

**What is still unproven, and stays filed**: `apply_strategy_plan` (compiling is
effect-free; applying reconfigures every bound agent, and there was nothing
disposable to apply to), all five agent mutations, revision-conflict detection,
and `REPAIR_REQUIRED`.

**A near-miss worth recording.** The strategy page appeared to list 7 strategies
when the account has 17. It was my own `head -c` truncation of the captured HTML,
not a defect — the product renders all 17, and the newly archived fork correctly
offers Restore instead of Edit and Archive. Third time this session an apparent
finding was an artefact of how I looked rather than what was there. Check the
instrument before filing the bug.

## 2026-07-29 — Mapped the MCP surface, and two writes could never have worked

**Did**: Proposed, executed and archived `map-the-mcp-surface` (lite, 10/10).
611 tests, up from 579. No spec change — a probe, an artifact, a regenerated map,
a conformance check, and the two defects it found.

**Why now.** The envelope defect proved that a reference generated from
`tools/list` inherits a blind spot: it records what to *send* and never what
comes *back*. And the product calls 20 of 110 tools, so ninety tools of
capability were unmapped against reality.

**The finding that pays for the whole exercise.** `archive_strategy` and
`restore_strategy` **could never have succeeded**. Both require
`expectedRevision`; archive also requires `confirm`. `setActive` sent
`{ strategyId }` alone. Nothing noticed because no write has ever reached the
real platform. Fixed: the command already held the `Strategy`, so its revision
was one field away — and passing it is right on its own terms, being the same
optimistic concurrency every agent mutation already carries.

**Declared and observed agreed exactly.** 21 read tools called live; across all
of them the `outputSchema` matched the response with zero keys
declared-but-absent and zero returned-but-undeclared. That is the result that
makes the other 89 checkable from their schemas without calling them — which
matters, because 27 of them change things. Every response carried both
encodings, byte-identical.

**A branch that cannot fire.** `setActive` detects `REPAIR_REQUIRED` by reading
`payload['status'] ?? payload['result']`. Neither tool declares either key. A
whole lifecycle outcome — its result case, its guidance copy, its surface — is
unreachable. Filed as `repair-required-cannot-be-detected` rather than guessed
at; where it actually surfaces is unknown, and replacing one wrong branch with
another is not a fix.

**An input schema can under-declare.** `get_market_context` declares no required
arguments and refuses an empty call. A client building arguments from the schema
alone — which is exactly what the assistant does — can construct a request the
tool rejects.

**The checker was wrong three times before it was right**, each time in the same
shape as the bug it was hunting:

1. File-level scan reported `confirm` present for `archive_strategy`, because
   `applyPlan` sends `confirm: true` two methods away.
2. Method-level scan reported `expectedRevision` present *after it was deleted*
   — the method's parameter type declares `expectedRevision: number`. Every
   required argument sharing a parameter name would have passed regardless of
   whether it was sent. Caught only by a surviving mutation.
3. `wraps nothing else` asserted two tools take a bare `request` envelope. Four
   do. An assertion making a claim about the platform it had not looked up.

Now scoped to the argument object at `this.call(…)`, where a type signature
cannot reach. Both real defects fail it; both mutations are caught.

**Kept out of the artifacts on purpose**: the key, and the account's contents.
The probe records key names and value *types*, never values — this repository is
public and that is the operator's live trading account.

**Next**: `writes-unproven-against-live` (P1) is unchanged as a live proof,
though every write shape is now verified against a declared schema that has
earned trust on 21 out of 21.

## 2026-07-29 — First contact with the real platform: every read had been empty

**Did**: The operator supplied a live `bg_live_` key. Proposed, executed and
archived `unwrap-what-battlegrid-answers` (standard, 15/15).
`battlegrid-connection` 14 → 16 requirements, purely additive. 579 tests, up
from 561.

**The product had never read anything.** The first page served against a real
account said *"This BattleGrid account has no agents yet."* The account has
three. `/strategies` said *"Nothing is listed here — not even BattleGrid's own
catalog"* while BattleGrid was returning Dunkirk, Leningrad, London, Tobruk,
Midway, El Alamein and Bastogne. `/audit` recorded both calls as **Succeeded**,
because they had succeeded.

A `tools/call` result is an MCP envelope — `{ content: [{ type: 'text', text:
'<json>' }], structuredContent: {…} }` — and the payload every mapper expects is
inside it. Both adapters passed the envelope to `asObject`, which saw an object,
returned it unchanged, and the mappers then looked for `agents` on a value whose
only keys were `content` and `structuredContent`. `undefined` is not an array,
so the roster was `empty`.

**This is the exact failure the roster's three-state design exists to prevent**,
and it happened anyway. `empty` and `unreadable` were kept apart, and the
constraint written down, precisely so nobody is told they own nothing when the
read failed. The branch was correct. The data never arrived, one layer below
where the design was looking.

**No test could have caught it.** Every fake in the suite returned the payload
already unwrapped — modelling a wire format that does not exist. The fakes and
the mappers agreed with each other and both disagreed with the platform. The
reference documentation was right; it describes the payload, not the wrapper.
The mappers were right too — `strategyId`, `strategyName`, `strategyRevision`,
`bindingState`, `revision`, `capabilities` all match the live payload field for
field. One seam was wrong, and it was the only seam nothing modelled.

**`asObject` is what made it silent.** Its whole behaviour was to return `{}`
for anything it did not recognise. That is the "unnecessary defensive fallback
that masks a required contract" the architecture review forbids, and here it
converted a completely broken integration into a confident, specific, false
statement about someone's account. It is gone. An envelope this cannot read now
throws, and surfaces as `unreadable` with cause `unreachable` — which is exactly
what it is: BattleGrid answered, but not with an answer.

**A second defect found on the way.** The same envelope carries `isError: true`
when a tool refuses, over a healthy transport — HTTP 200, well-formed JSON-RPC
`result`. Nothing read it. A refused write completed its audit entry as
*succeeded* and returned an object with no usable fields, making a failed write
indistinguishable in the record from a write that ran and changed nothing.

**Two fakes had to be corrected, not just the code.** `end-to-end.test.ts` and
`scope.test.ts` returned bare payloads from their fake `fetch`. Both now send
real envelopes. A fake that models the wrong wire format proves the wrong thing,
and these two had been proving it confidently for the whole project.

**A surviving mutation caught a false comment of mine.** Moving the audit
completion *before* the unwrap passed all 579 tests. I had written that the
ordering was what stopped a refusal being recorded as a success; it is not —
the catch block re-completes the entry as `failed` whatever was thrown. The
ordering is a readability preference, not a guarantee, and the comment now says
so. Second time this session a comment asserted a property the code did not rest
on.

**Verified against the live account, which is the only place this was visible.**
Three agents render with their real bindings — THE .0 on Midway r2, Volatilis,
archived Quadratorum on Bastogne — capacity shows one slot free, action sets are
correctly gated (the archived agent offers only Reactivate and Journal), and all
seven platform strategies list with their true bound-agent counts. Proof was
captured outside the repository on purpose: it is the operator's live account
data and the repository is public.

**Next**: the write path shares this seam and improves identically, but no
mutation was performed against the live account, so writes remain unproven end
to end.

## 2026-07-29 — The deploy doc described a deployment we are not doing

**Did**: Proposed, executed and archived `a-doc-for-the-path-we-ship` (lite,
7/7). No spec change — prose and one guard. 561 tests, up from 553.

**The gap.** `docs/DEPLOYING.md` opened with *"Register the redirect URI at
BattleGrid — do this first"*, listed `BATTLEGRID_CLIENT_ID` and
`BATTLEGRID_REDIRECT_URI` as **required**, and mentioned `BATTLEGRID_API_KEY`
**zero** times. Two changes after the personal path shipped — whose entire
purpose is that you do *not* register a client to talk to your own account — the
only document telling anyone how to run this still sent them to register one.

Someone following it would have performed the exact ceremony the code was
changed to remove, concluded the personal path did not exist, and been right to,
because nothing said otherwise. The code was correct and unreachable through its
own instructions.

**Prose drifts silently and in one direction.** A change lands, the doc is not
opened, and nothing fails. Every other claim this product makes is guarded by
something — the reachability walk, the serving gate, the mutation sweeps — and
the one artifact a new operator actually reads had nothing at all.

**Walked, not reviewed.** Dropped and recreated a database, ran
`node tools/migrate.mjs`, `npm ci && npm run build`, and the exact environment
block as written with both OAuth variables unset. It boots; `/` returns 307 to
`/agents`; the refused-key page names the key. The claims about scope parsing
(`split(/[\s,]+/)` — space *or* comma) and cookie behaviour
(`!== 'true'`, so a typo fails safe) were read out of `src/config.ts` rather
than recalled, and the `npm start` / `output: standalone` warning is now
documented instead of left to alarm someone.

**The guard had a passenger, and the mutation found it.** Nine assertions;
against the old document six failed and three passed. One of the three was
supposed to catch it: it matched the old table's `| BATTLEGRID_CLIENT_ID | yes |`
shape, but that row had a third column, so `yes` was never the last cell and the
anchor never matched. Deleted rather than repaired — the row is already rejected
by the assertion beside it, and a second one that cannot fail against the defect
it names costs a reader's attention and buys nothing. Eight now, six of which
fail on the old doc.

**The doc now says what has not been proven**, in its own section: the image has
never been built, and no valid `bg_live_` key has existed in any environment this
was built in — so every failure branch is proven and the success branch has
never run against the real platform. That belongs in the deployment document
more than anywhere else.

**Next**: nothing P1 remains that can be acted on in this repository. Both open
P1s need something this container does not have — `image-never-built` a Docker
daemon, `assistant-unverified-against-live-api` an Anthropic key. The operator
supplies a `bg_live_` key and follows the document.

## 2026-07-29 — The reassuring sentence was the one that was wrong

**Did**: Proposed, executed and archived `refused-is-not-unreachable`
(standard, 16/16). `agent-authoring` 11 → 11 requirements — one MODIFIED, purely
additive at the text level, every other requirement byte-identical. 553 tests,
up from 532.

**The bug.** A 401 rendered *"This does not mean your agents are gone —
Grid-Commander could not reach BattleGrid to ask."* It did reach BattleGrid.
BattleGrid answered, and the answer was no. The sentence was written for a
network failure and shown for every `unreadable`.

**The wrong half was the reassuring half**, which is what made it worth fixing
rather than filing forever. It says the problem is transient and on somebody
else's side, so someone with a mistyped key waits for an outage that is not
happening — and it is the *more* likely of the two paragraphs to be believed,
because it is the one offering comfort.

**Not a reword.** "Could not get an answer from BattleGrid" would be true in
both cases and worse in both. The sentence exists to stop a user concluding
their agents were deleted, and it earns that by naming a cause obviously
external and obviously not deletion. A vaguer cause is a weaker reassurance, and
it is the only thing on screen saying their work still exists. So the shape
changed instead: `unreadable` carries a `FailureCause`, set once where the error
is still in hand.

**Both adapters had their own identical `message(err)`.** Adding a second
identical *classification* beside it is how the same failure ends up described
one way on `/agents` and another on `/strategies`. One `unreadable.ts` now owns
both, and the duplicated helpers are gone — a test asserts neither adapter
writes a `cause:` literal of its own.

**Rendering found the defect I introduced, immediately after fixing theirs.**
Splitting the sentence broke the one after it: *"Nothing can be created or
changed **until it can**"* had "could not reach BattleGrid" as its antecedent,
and the moment that clause started varying the pronoun referred to nothing. Not
visible in the diff, obvious on the page. Fifth time this session that reading
the rendered output caught what an assertion did not.

**A surviving mutation was right about the code and wrong about the risk.**
Deleting `callTool`'s `err instanceof ConnectionRevokedError ? err : …` guard
changed nothing, because `toDomainError` returns a non-conflict `Error`
unchanged — revocations were being preserved by accident, not by the guard. The
hazard is still real: a revocation reshaped into `RevisionConflictError` tells a
user their state moved on when their credential died, which is this same bug in
a different costume. So rather than delete the guard or leave it untested, the
invariant is pinned where it can actually break — the remedy sentences. Reword
one to contain "conflict" and four tests fail.

**A failing test is not always a failing product.** The end-to-end adapter test
reported `unreachable` for a 401 and looked like a real gap in the wiring. The
fixture had declared a tool named `list_agents`; the adapter calls
`list_intelligence_agents`, so the guard refused before any HTTP call happened.
Second time today the harness was wrong and the code was right — suspect the
test before the code when the code has a clear reading.

**Also**: rendered the `unreachable` branch too, by pointing `BASE` at a dead
port locally and reverting. Both branches read correctly. Eight duplicate PR
check-in triggers deleted; one left, re-armed.

**Next**: `image-never-built` (P1) still needs a Docker daemon this container
does not have. `assistant-unverified-against-live-api` (P1) needs a key. Both
are the operator's step. Nothing else P1 is open.

## 2026-07-29 — The remedy personal mode named did not exist

**Did**: Proposed, executed, verified and archived `a-remedy-that-exists`
(standard, 17/17). `battlegrid-connection` 13 → 14 requirements, the twelve
untouched ones byte-identical and the thirteenth a one-line scenario edit. 532
tests, up from 511. Committed and pushed `a-personal-key` (32 files) first; PR
#5 body brought current from eleven commits to seventeen.

**The bug.** Personal mode shipped last change with a failure path that told the
operator to reconnect. There is nothing to reconnect: `/connect` is not in the
navigation and the OAuth client is unset by design. A correct diagnosis with a
remedy from a different deployment — which reads as "the product is broken",
not as "this advice was written for someone else".

**Diagnosis and remedy are different facts, and only one of them should be
constant.** W-C says the diagnosis is one message for every cause, so nobody has
to tell an expired token from a forged cookie. That was read as covering the
whole sentence. It covers half: *what went wrong* is the same everywhere, *what
to do about it* depends entirely on how the deployment got its authority. The
split is now a `Remedy` type with two cases, and the composition root picks one
on the line beside `heldScopes`.

**Five of six throw sites never needed the choice.** `ConnectionRevokedError` is
constructed in six places; four in `resolve-authority.query.ts` and one in
`connect.commands.ts` are behind a session or a callback and structurally cannot
run in personal mode. Only the adapter's 401/403 can. So one site takes the
value and the other five pass `'reconnect'` explicitly — which is not ceremony,
it is each site saying which deployment it belongs to. The constructor takes it
as **required**: a default is precisely how a call site inherits the wrong
deployment's advice.

**Looking for where the remedy was produced found a second face of it.**
`/connect` still rendered in personal mode, offering "Continue to BattleGrid"
over a `client_id` that is empty by design. The page the broken advice sent
people to was itself a dead end. It now says there is nothing to connect, and
names the same remedy from the same source rather than holding a copy.

**Rendering found something again — the fourth time this session.** Serving
personal mode with a bad key and reading the *whole* page, not the sentence
under test, showed the corrected remedy sitting directly above "Grid-Commander
could not reach BattleGrid to ask." It did reach BattleGrid; BattleGrid refused.
That sentence was written for a network failure and is shown for every
`unreadable`, so the reassuring half of the screen contradicts the accurate
half. Pre-existing and identical on the delegated path — filed as
`refused-is-not-unreachable` (P2) rather than widened into this change, because
fixing it means `unreadable` carrying *which* failure, not just what.

**A mutation that does not reproduce the defect is not a surviving mutation.**
Eleven injected. The first attempt at the reachability one appeared to survive;
it had mutated the `filter`, which tests the *full* path where `app/page.tsx`
does have a separator, rather than the `replace`, which tests the path relative
to `app/` where it does not. Re-injected correctly, it failed immediately. The
comment I had written next to the fix was wrong in the same way, and was
corrected — a guard whose explanation is wrong will be "simplified" back into
the bug by the next reader.

**The guard bug was real, and only a link to `/` could find it.**
`servableRoutes()` required a separator before `page.tsx`, so the root route was
absent from the servable list. The same bug had been fixed once already in
`routeOf`, in the same file, and survived in the helper written first — invisible
because nothing had ever linked to `/`. The new page's "Back to your agents" was
the first, and it was reported dead on the first run.

**Verification found half a claim.** The proposal said the change would *prove*
`NotConnected` is unreachable in personal mode rather than assume it. The test
proved `OwnerOnlyUser` never returns `not-connected` — true, and not the whole
claim: nothing would have failed if a future page resolved its own session. Now
asserted structurally across all thirteen pages that render it, and mutated to
confirm it fails.

**Next**: `image-never-built` (P1) still needs a Docker daemon — no daemon in
this container, so it stays the operator's step. `refused-is-not-unreachable`
(P2) is the next thing worth doing here.

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
