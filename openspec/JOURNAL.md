# Journal

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
