# Grid-Commander — Session Handoff

**Date**: 2026-08-16 (five legs — the advisory, the survey, the pause, the
gate, the records)

**State**: green — **2576 vitest / 205 files**, 274 Python harness, typecheck
and lint clean, `validate --all` at **0 errors / 13 warnings** (the same 13
design-ticket warnings, unchanged all day). **13 capabilities, 202 archived
changes, 24 backlog items open** (232 done), **0 active changes**, 28 surfaces,
27 design tickets. **No p2 and no p1.** BattleGrid is **v19.1.0**.
`test:db` skipped throughout: no schema changed.

**The fifth leg closed four records rather than building anything.**
`the-record-says-what-was-actually-checked` (lite) settled #193, #242, #252 and
#293 — one defect in four costumes, a claim that outran its proof. DT-0014's
expired acceptance is annotated in place *and* noted; the live-region
definition is settled (`aria-live`, `role="status"` **or** `role="alert"` —
19 counted only the first) and now lives in the UI review checklist rather than
in three prose records; `tools-write-lf`'s two predicates are extracted and
mutation-proved (each `→ /./` gives 1 failed / 4 passed, which is exactly the
survival the item predicted); and #293 needed **no code at all** — its fix
landed in `0c10bc4` on 2026-08-15 and only the canonical item was left open.
Deferred and filed as **#320**: the design-contract rule that a restyle
ticket's acceptance describes treatment, not content.

**Two declared outputs were being read by nothing, and one of them was making
the product lie.** `update_intelligence_agent` returns a `feasibilityAdvisory`
beside the agent — the only place on the platform that answers *"given today's
volatility, which of my armed coins can this strategy build a stop for, and
which dial is stopping the rest"* — and the adapter dropped it on the line that
returned the agent (#291). It now renders as opportunity language on
`/agents/[id]`, carried across the post-write redirect on a signed, agent-keyed,
two-minute cookie, because every write here redirects and the edit surface holds
no client state.

**Then the same question asked at scale found a live defect.** #301's survey
leaf-diffed v19.1.0's outputs against v18.2.0: 27 schemas carry readable
changes, 57 leaves added, 18 removed. All 18 removals are the known
`regimeAutoDerive` deletion and **none has a reader**. Of the 57 additions,
`list_radar_deployments.summary.{platformPaused,radarPaused}` was unread while
`/agents/[id]` rendered *"On duty: scanning …"* — on an account three sessions
had recorded as radar-paused with `lastFireAt` frozen since 2026-08-13. Filed
p2 and built the same day (#311): **standing is a claim about configuration, not
activity**, so the pause is stated beside it and no row claims to be scanning
under one.

**The item's own headline numbers measured the wrong thing.** `+66/+60/+39` are
raw JSON nodes — `type`, `required`, `description` included. Readable property
paths give roughly a third of that: `preview_strategy_report` is **+66 nodes and
+19 readable fields**. Both metrics are now printed by
`tools/diff_output_schemas.py`, which exists because #198's recorded lesson was
that nothing compared the two records — and nothing still did, which is why v19
repeated it while every input-facing check stayed green. **Run it after every
re-probe.**

**A leaf-diff names fields, not their types.** #311 was filed calling
`platformPaused` a flag; it is a *count* of deployed coins, and `radarPaused` is
the only boolean. `resolvesNow` carries no per-deployment pause at all, so the
item's "which pause wins the sentence" was the wrong question — the pause is
fleet-level and qualifies the rows from above. Both were caught by reading the
declared shape before designing against the item's prose, and the corrections
are on the issue.

**Two environment traps cost real time, and both looked like the change under
test.** `npm run lint` from the repository root returned **63,337 errors across
1,208 files**, every one under `.claude/worktrees/` — nested worktrees are
second full checkouts and were not ignored. Fixed (`170f31c`); the gate is now
exit 0 in 20.6s. The other is **not** fixed and is not fixable in the repo: the
primary checkout has **324 tracked files sitting CRLF** from
`core.autocrlf=true` despite `.gitattributes` declaring `eol=lf`, which broke
`npm test` with a `SyntaxError` on a file `git status` called unmodified.
**If a gate fails in the root checkout and passes in a worktree, suspect the
checkout.** Repair is `git add --renormalize .` there — and any hand-rolled
sweep **must exclude binaries**: one that trusted `git check-attr eol` stripped
CR-LF pairs out of 20 PNGs and corrupted them.

**Bookkeeping defect, recorded rather than buried.** `fix/lint-ignores-nested-worktrees`
was branched off the paused-radar branch instead of `main`, so **PR #315 merged
34 files and both changes** under a description covering only the eslint
one-liner. Nothing merged unreviewed — both changes were separately proposed,
archived and fully gated first — but #315's body understates it, so it carries a
correcting comment, #314 is closed as empty, and #311 was closed by hand because
#315's body had no closing keyword for it.

**Superseded header from 2026-08-15 (keyed — the v19.1.0 re-probe and the
platform's prose) follows.**

**Date**: 2026-08-15 (keyed — the v19.1.0 re-probe and the platform's prose)

**State**: green — **2498 vitest / 200 files**, typecheck and lint clean,
`validate --all` at **0 errors / 13 warnings** (the same 13 design-ticket
warnings). **13 capabilities, 198 archived changes, 24 backlog items open**
(222 done), **0 active changes**, 27 surfaces, 27 design tickets.
**BattleGrid is v19.1.0** — re-probed 2026-08-15 (#287) and all four records
are level with it. `test:db` deliberately skipped: no schema changed.

**BattleGrid was two majors ahead of the record, and nothing cheap could see
it.** v19.1.0 kept **114 tools, none added or removed, every description
identical, every annotation identical, the read/write/destructive split
identical** — while 5 input and 34 output schemas moved underneath. This is
the third deployment in a row where the count proved nothing and the first
where the descriptions and annotations proved nothing either.

**The refreshed record caught a live defect before the platform did.**
`preview_strategy_report` dropped `regimeAutoDerive`/`regimeTimeframe` from an
input that keeps `additionalProperties: false`, so **every strategy preview
the product composes was being refused whole** on `main`. Same defect class as
#285, on the sibling read path, found by a guard this time rather than by a
refusal (`the-preview-matches-the-live-contract`, lite).

**Declared and observed now disagree in both directions on one field pair.**
`regimeAutoDerive` was deleted from all fifteen output schemas that declared
it *and* is absent from a live `get_strategy`; `regimeTimeframe` is **still
returned** though nothing declares it. The mapper's `=== true` was turning
that silence into a confident `false` and the detail page stated it as fact —
now `boolean | null`. **Any `=== true` on a v19 read deserves the same
suspicion.**

**The platform's prose is in the repository for the first time** (#294,
`the-prose-record-carries-bodies`, standard). `tools/capture_mcp_dump.py`
fetches `prompts/get` and `resources/read`; the reference carries a Server
instructions section plus every body (+552 lines); a live gate digests each
prose surface against the running server with the account greeting normalised
out. The "record a refusal as a **named failure**, never as absence" rule
earned itself on the first run: all five prompts refused `-32602`, which is
how we learned **`prompts/get` demands an `arguments` key even when every
argument in it is optional**.

**What is verified and what is not.** Live: the full probe suite (23 files /
55 tests), the prose gate (23/23), and #293 proven at `decisions 20 of 157`.
**The run was read-only**, so nine write-gated probes have never seen v19 —
every write path is conformant against the refreshed record and unobserved
against the running server, which is the weaker assurance given the paragraph
above. Filed as **#306**; it needs a keyed env *and* a named go-ahead.

**Next session**: **#289** — it has now been the board's stated Next for four
consecutive sessions without moving, which is a triage signal rather than a
plan. If a fifth passes, re-price it. Cheapest real work on the lane is
**#301**, a fully offline survey of v19's 34 moved output schemas against a
record that is finally current.

**Superseded header from 2026-08-15 (repo hygiene — branch reconciliation)
follows.**

**Date**: 2026-08-15 (repo hygiene — branch reconciliation)

**State**: **13 capabilities, 195 archived changes, 20 backlog items open, 0
active changes, 26 surfaces, 27 design tickets**, `validate --all` at **0
errors / 13 warnings** (the same 13 as the previous header — all design-ticket
warnings). **No product code changed this session and no tests, typecheck,
lint or build were run**, so the build status above the diff is inherited from
the previous header rather than re-verified. BattleGrid v18.2.0 at the time; **re-probed to v19.1.0 on 2026-08-15**.

**The repo went from 52 local + 60 remote branches to 2 and 2.** `main` is
untouched at `8821b5a`. 65 branch names (109 refs) were deleted, and none on a
guess: every ref cleared one of three independent proofs first — ancestry,
`git merge-tree --write-tree` yielding a tree byte-identical to `main`, or "PR
merged and tip contained in the merged head" (53 passed on the third, 12 on the
first, 3 on the second). **68 annotated `archive/*` tags** were created and
pushed to origin *before* any deletion, and a recovery drill restored
`claude/verify-issues-edbc3f` from its tag, reproducing PR #199's exact head and
all 30 commits. Any pruned branch returns with:

```
git branch <name> archive/<name>
```

**Two measurement lessons that will recur.** `git branch --merged` is worthless
here — everything squash-merges, so a landed branch is never an ancestor and the
command reported only **9 of 52**. "Ahead by N" is equally misleading:
`claude/app-breakdown-status-osed7j` read **37 ahead** while merging it changed
nothing, because all 37 were merge commits pulling `main` *in*. Topology
measures neither content nor value; the merge-tree test does.

**One branch was kept, and it is the session's real finding.** Draft PR #82
(`claude/agent-creation-data-strategies-fw6av8`) was the **only** branch in the
repo carrying content not in `main`: 3 **archived** changes — the archiver ran,
so their requirements were declared merged into the source of truth on that
branch only — **7 requirements absent from `openspec/specs/`** across
`platform-mapping` and `battlegrid-connection`, and 7 branch-only backlog items.
Filed as `a-completed-change-set-is-stranded-on-a-draft-pr` (**p2**, issue
**#289**), now the only p2 in the lane and what `board` computes as next. **Do
not blind-merge that branch**: `main` is 87 commits ahead and the
prose/vocabulary half appears partially re-landed under other requirement names,
while the request-budget half is absent from `src/` and `tests/` outright. The
absence finding rests on exact title match and says so.

**Also note**: PR #2's head SHA is already garbage-collected on GitHub, so its
PR page can no longer show that history —
`archive/claude/harness-openspec-merge-smkspq` is now the only handle on it.
Two orphaned directories (`secondary-treatment-variant-19160e`,
`verify-issues-edbc3f`) remain under `.claude/worktrees/`, locked by a live
process; git no longer tracks them and they can be deleted once it exits.

**This header skips three legs** — #284, #286 and #288 landed after the previous
header was written and are not summarized here; their detail is in
`openspec/JOURNAL.md`. Next session: **issue #289**.

**Superseded header from 2026-08-15 (five legs) follows.**

**Date**: 2026-08-15 (five legs in one session)

**State**: green — **2443 vitest / 193 files + 274 harness**, typecheck, lint
and build clean, `validate --all` at 0 errors / **13 deliberate warnings** —
one *below* where the week started, because both agent-roster warnings were
genuinely retired rather than repainted. **18 backlog items open** (217 done,
4 wontfix), **0 active changes**, **193 archived**, 25 surfaces, 27 design
tickets all implemented, `system.json` at v3, **the product's MCP surface at
26 tools**. BattleGrid v18.2.0 throughout.

**One session ran the whole pipeline five times** — five PRs, each proposed,
gated, verified, archived, and merged before the next began (#271, #273,
#275, #276, #277). The first was a records fix with a permanent guard:
fourteen of twenty-four surface manifests claimed "No client JS" while their
own `source_digest` listed `perform-button.tsx`, and `openspec.py` now fires
`design_surface_denies_client_js` on the claim-plus-declaration pair —
observed failing on exactly the fourteen before any correction. The second
and fourth built the loss shape: `/agents/[id]/limits` answers **"how did it
get here"** (realized P&L since the budget baseline plus the per-settlement
curve, `get_agent_performance`'s first consumer, the product's second chart),
and `read_loss_shape` gives a model the same answer with the span stated in
the contract itself. The third re-surveyed `agent-roster` (four rounds
stale; the drift was real feature growth) and gave the create form its first
manifest. The fifth ran the design round the re-survey exposed: DT-0011
revised — *revised, not duplicated, because `design_state_not_covered` is
computed per ticket* — with two real treatments (holding-position takes
weight; quoted platform identifiers wear mono) and six deliberate no-ops.

**The lane was triaged whole before any of it** — all 21 then-open items
read in full, no drifted statuses found — and the tripwires were swept three
times across the day, all cold every time. **#94 is the one that will fire**:
the record was measured from the db read-only (2.40 days deep at the last
read, first_run 2026-08-12T19:46:14Z), both halves hold from
**~2026-08-19T19:46Z (~Aug 20 02:46 local)**, and the environment half lives
in the **user registry** — `setx` does not reach an already-running process
tree, so check `[Environment]::GetEnvironmentVariable('DATABASE_URL','User')`
before declaring it cold. **The board is quiet on purpose**: everything left
is a watch, an upstream block, or an operator decision. Next session:
tripwires first; from Aug 20 ~03:00 local the analysis layer (forward
returns per signal state, sample sizes beside every figure) is the main work.

**Superseded header from 2026-08-13 follows.**

**Date**: 2026-08-13 (third session)

**State**: green — **2328 vitest + 90 db**, typecheck, lint and build clean,
`openspec validate --all` at 0 errors. 21 backlog items open, 191 closed, **0
active changes**, 26 design tickets all implemented, `system.json` at **v2**.

**This session re-verified the backlog instead of trusting it, and that was the
finding.** The operator's read was that "a lot of these issues might be wrong".
Partly right, and wrong about which part: **no open item was wholly false** —
every core defect survived checking — but **15 false sentences across 15 items
were, without exception, quantifiers**: "the only", "every", "nothing else",
"and nothing more". Three items contradicted themselves inside their own file.
The defects were real; the counts around them had never been re-derived.

The practical consequence is a ratio worth remembering before the next planning
pass: **of nine items examined closely, five needed no code at all.** #200 closed
(the dropped `slotUsage` has no observable consequence — the only surface
refetches every request), #204 narrowed to the upstream report it always was (the
product's behaviour is self-healing, and the item was wrong in *both*
directions), #104/#147/#107 confirmed and sharpened without closing. The cost was
in reading them properly, not in fixing them.

**Shipped**: the stoppage summary reads around a refusal (#100's product impact),
the rendering harness can see a key collision (#194), a remedy is a target not a
sentence (#182), every perform submit says it is working (#153), and a full
design round — system v2 plus DT-0022–DT-0026 (#183).

**Superseded header from 2026-08-12 follows.**

**Date**: 2026-08-12 (second session)
**State**: green — 2207 vitest + 85 db + 243 harness, and **the suite runs clean on Windows for the first time** (#171: path separators, CRLF, and `npx`-as-`npx.cmd`; the last one turned out to be esbuild refusing to parse a CRLF `.mjs` at all). **BattleGrid is v18.2.0** — re-probed 2026-08-12, a full major version ahead of the record, found already at patch .2 so 18.0 and 18.1 were never seen. Nothing a count could see moved: 114 tools, none added or removed, **no input schema changed on any tool**, classification split identical, vocabulary values byte-identical. One description changed and it was semantic — `list_gate_blocks` may now report rows from *after* the model was called, which this product asserts the opposite of in two places (**#185**, p2). That same tool returns `INTERNAL_ERROR` for every agent, deterministically (#100 refreshed).

**Three write paths that never worked were found and two were fixed.** A refused rebind escaped as a framework error page (live-confirmed `CONFLICT`); `RebindConfirm` sent four of the five fields its action reads, so **every** rebind submit threw; and `AgentForm` had no strategy control at all, so **every agent creation** threw before reaching the platform (#177). The last of those needed a chooser, not a patch — an agent binds to a strategy the operator picks, so nothing is preselected. The spec now carries the missing half of the rule that would have caught them: a control must reach its operation *and* a value an operation requires must have a control that supplies it, with `a-form-sends-what-its-action-reads.test.ts` behind it.

**The refusal doctrine got its edges.** A write's outcome reaches the person who asked (thrown refusals included, and actions that could not attempt at all); a carried reason survives whatever branch renders next, through one shared `CarriedProblem`; and a *lost authority* is told apart from a refused operation, rendering the loss instead of the ceremony with no control to press. Two tidier designs were rejected on evidence and the reasons are in the proposals: re-throwing recreates the crash class (there is still no error boundary), and redirecting to `/connect` strands a personal deployment on "there is nothing to connect".

**The design lane closed its tail and learned its own loop.** 24 surfaces, DT-0001–DT-0021 implemented. A design round *always* stales the manifests it designed against — structurally, since implementation edits the source the survey recorded — so the re-pin is now the round's last task, written into design-contract §8, the ui-surveyor skill, the design-director checklist and CLAUDE.md, along with why it is a convention and not a check.

**A read-only sweep against v18 closed the session** (#190): `get_agent_performance` **answers now** — a 41-point P&L curve on one agent, 25 on another — and `src/domain/agent/performance.ts` is built on the opposite, arguing at length that the tool "has never once answered". Filed as **#189** (p2): a decision to make, not a bug, since the roster aggregate and the performance curve measure different things. `get_open_orders` recovered; `get_market_context({})` still refuses the call its schema permits, five majors running.

**Read the journal's Watch out entries before writing a guard.** Three checks were written this session that could not fail on the defect they were written for, each caught by mutation-testing before being trusted; all three failed versions are recorded in their files rather than quietly replaced.


The first 2026-08-12 session is in `openspec/JOURNAL.md` (PR #154 as
`1052adb`, twelve gated rounds); the entries above it are this second one. The
2026-08-11 state, for lineage: green (2121 vitest + db + harness suites; `freshness`/`live`/`serving` gates skip without a key or opt-in; further vitest are key-gated live probes). No active changes. 25 open backlog items — the three newest (#145–#147) were the session's parting concerns, and **#145 closed the same day it was answered: the recorder now runs on the operator's Windows machine** — hourly Scheduled Task, unattended fire proven (`LastTaskResult : 0`), 20 deployments at 84 signals per capture. **The record starts 2026-08-11**; the 2026-08-07 → 2026-08-11 gap is permanent and documented, and **#94's gate moves from zero to accumulating** — it needs days of depth before analysis says anything. The setup surfaced #152 — `tsx` was not a dependency, so `npx tsx` prompted for a download inside unattended runs — **closed the same evening** by `tsx-is-a-dependency` (lite, archived): tsx pinned in `devDependencies`, all six gates green. PRs #8–#150 merged except **#82**, another session's branch-reconciliation record, still open as its draft — the 2026-08-11 evening merge round landed #148 (dead agent fields retired), #149 (first radar deployments through the deploy surface), #150 (trade-level policy readable, closing the last P1) and #151 (this day's session records), each reviewed and gated locally before merging. **The surface record is v17.2.0**, re-probed 2026-08-11 — v17 redesigned `positionManagement` (R-multiple break-even, giveback trailing; four fields out, two in) under an unmoved tool count, and the strategy vocabulary's values are now a recorded, gate-compared artifact. **Grid-Commander is an MCP server** — `docs/MCP_SERVER.md`; any model the operator runs can read the product, and none can write through it. The report-table grammar is mapped end to end in `docs/REPORT_TABLE_GRAMMAR.md`. **Phase 1 (strategy-maker) is complete**; **Phase 2 reads both halves of the record** — what an agent did with the money (`/agents/[id]/trades`) and why it did or didn't trade (`/agents/[id]/pipeline`) — and now asks the question forward: **`/agents/[id]/qualification`** screens coins against an agent's gates before it acts, and **`/agents/[id]`** now leads with what has actually been stopping it. v14 had moved the tool count for the first time ever (110 → 114) and v15 moved the trade-level policy from the agent onto the strategy — which the platform declares and still does not apply (retested against v16); since #150 the strategy detail page reads those values and says they cannot be edited, which closed the item as a product concern and left the inertness where it belongs, upstream. **The signal recorder ships** (13th capability, 2026-08-07): `bin/grid-commander-record.ts` captures what every signal says, forward — start its cron on day one, because the platform serves current readings only and a gap can never be backfilled. **A closed trade tells its story** (2026-08-08): `/agents/[id]/trades/[logId]` draws the platform's frozen chart with the levels *as placed* and lists every move position management made — the trail where a trailed stop is finally visible acting on real money.

---

## What This Project Is

Grid-Commander is a **multi-tenant web workbench** for building, tuning, and understanding BattleGrid trading agents over BattleGrid's MCP server (`https://mcp.battlegrid.trade/mcp`). It is a TypeScript / Next.js / PostgreSQL application using Clean Architecture — the domain never imports the MCP client; BattleGrid sits behind a port.

The idea brief is at `_IDEA/Grid-Commander_Idea_Brief.md`. The MVP feature spec is at `_PM/Grid-Commander-MVP_Feature_Specification.md`.

---

## Current State of `main`

**Three PRs are open and none is this session's** — parallel sessions run on
this repo, which is why a `Next` written into `JOURNAL.md` can be stale before
its PR lands. Read `git show origin/main:openspec/JOURNAL.md`, never the local
copy, before trusting one. It also means **the item↔issue mirror cannot be
audited from `main` alone**: five issues are open with no item here (#299,
#304, #305, #317, #318) because their items live on those unmerged branches.

| Metric | Value |
|---|---|
| Capabilities (archived) | **13** |
| Changes (archived) | **202** |
| Vitest tests | **2576 / 205 files** (+ key-gated live); the db suite runs only against a disposable database — it refuses the live record db, and that refusal is correct |
| Harness tests (Python) | 274 |
| Active changes | none |
| Open backlog items | **24**, **all p3 — no p1, no p2.** *Not* 1:1 with the 27 open issues — see the PR row; two of the gaps (#283, #294) are genuine drift on `main` and are recorded on #309 |
| Design | 28 surfaces (15 designed, 7 needs-redesign, 6 functional); DT-0001–DT-0027 all implemented; `system.json` v3 |
| Open PRs | **#319**, **#313** and **#307**, all another session's |
| Open GitHub issues | mirrored 1:1 with the backlog (the tracking rule); **no P1s open** |
| BattleGrid | **v19.1.0** (re-probed 2026-08-15, #287); all three records level with live, and the reference now carries the platform's prose too (#294) |

### Read this before anything else

**BattleGrid deploys often, and the tool count barely moves.** Three
deployments were observed in one session on 2026-08-05 — v3.0.0 → v5.0.0 →
v5.1.0 — and all three reported exactly **110 tools** while enums, required
arguments and semantics changed underneath. **v14 then moved it to 114**, the
first change in six major versions. So a count that has not moved proves
nothing, and one that has says only that *something* changed — neither is a
freshness check. **v19.1.0 is the current record** (2026-08-15, #287), and the
last two deployments are the best examples this project has of why the count is
not the check. At **v18.2.0** a whole major version arrived between two probes a
day apart and **nothing structural moved at all** — 114 tools, no **input**
schema changed, the split identical, the vocabulary byte-identical; what moved
was one tool's *meaning* (`list_gate_blocks`; see #185). At **v19.1.0** the
count, every description, every annotation and the split were identical *again*
— while 5 input and 34 output schemas moved underneath, one of which
(`preview_strategy_report` dropping the regime pair from a closed input) would
have refused every strategy preview the product composes.

**That paragraph was scoped to inputs and read as general, and the scoping cost
something.** Outputs grew by **188 schema leaves across 11 tools** at v18 —
including a whole `protection` block the platform now publishes per position.
Nothing saw it because `docs/battlegrid-mcp-capabilities.json`, the artifact
holding output schemas, was *itself* a major version behind: two of the three
records were compared to each other and the third was not (#198). "Nothing
structural moved" was a true claim about the half that was being checked. v17.2.0 before it (2026-08-11) had moved seventeen schemas —
`positionManagement` redesigned (break-even on an R-multiple, trailing as a
single giveback percentage, 15 → 13 keys), which had broken the create path
until the domain followed. The vocabulary's *values* are now recorded too
(`docs/battlegrid-vocabulary.json`) and compared by the live gate, because a
values-only deployment never touches a schema.

`./scripts/ci.sh` now runs a **`freshness`** gate. With `BATTLEGRID_API_KEY`
set it compares `docs/battlegrid-mcp-surface.json`'s recorded server version
against the live one and **fails** on a mismatch; without a key it prints a
named skip. If it fails, re-probe before doing anything else:

```bash
BATTLEGRID_API_KEY=bg_live_… python3 tools/probe_mcp_surface.py
```

**Three platform behaviours found on 2026-08-06, each of which will bite
again.**

- **`fork_strategy` answers `INTERNAL_ERROR` when a strategy of the fork's name
  already exists.** Not the quota — that refuses cleanly with
  `VALIDATION_ERROR: Strategy limit reached` and publishes
  `quota: {used, limit, remaining}`. Isolated by forking three sources with and
  without a name collision. Any repeated automation degrades, because each run
  leaves behind the name that breaks the next one; live probes must pick a
  source whose `<name> (fork)` is free. See `forking-a-name-that-exists-is-a-500`.
- **`last24hCostUsd` disagrees between `list_intelligence_agents` (0.09022839)
  and `get_intelligence_agent` (0)** for the same agent at the same moment,
  stable across repeated samples, with every other key identical. Read spend
  from the **list**. See `the-cost-of-an-agent-reads-differently-from-two-tools`.
- **A no-op UPDATE is refused** — `Strategy update contains no effective
  changes` — which is how the compiler proves it read the submitted list at all.
  Any probe that resubmits a strategy's own state must expect this rather than a
  plan.

**A credential in the environment is not consent to mutate.** Live probes
that can write require `BATTLEGRID_LIVE_WRITES=1` as well as a key, and
`tests/architecture/live-writes.test.ts` fails any ungated probe that names a
mutating tool **or** constructs a `*Command`. The condition sweep has its own
opt-in, `BATTLEGRID_CONDITION_SWEEP=1`, because it is slow enough to starve
its neighbours.

---

## Thirteen Capabilities

| Capability | What it covers |
|---|---|
| `market-grid` | The Market Grid arena, watched — sessions, schedules, entered state, the money split, and honest status copy (reads only; a CANCELLED session is promised nothing) |
| `agent-deployment` | Deploy/undeploy an agent's radar presence (guarded writes) |
| `spec-validation` | Automated spec layer validation in CI |
| `harness-integrity` | The `openspec.py` tooling itself (243 tests) |
| `battlegrid-connection` | OAuth + DCR + PKCE account connect/disconnect; audit; credential encryption |
| `agent-authoring` | Roster, create, rename, rebind, archive, reactivate, budget gauges |
| `agent-understanding` | Agent journal (thought log), budget limits + spend, account-level capacity, **the trading record**, **each trade's story — frozen chart + the audit trail of every stop move**, **the decision pipeline**, **one evaluation's full scorecard and what it cost**, what has been stopping it, open positions, and the prospective **qualification screen** |
| `strategy-authoring` | Fork (nameable), compile, review, apply; archive, restore; score a re-weighting before saving it; **the condition layer — composed, tried live, and saved through the full ceremony**; the section library and column editor |
| `app-access` | Multi-tenant session, route protection, OAuth callback, build gate |
| `mcp-control` | Grid-Commander exposed as an MCP server — 26 tools (25 reads + one proposal recorder), no writes to BattleGrid, any client |
| `agent-comparison` | The public field — other people's agents, the leaderboard, where this account stands, one competitor's whole public record, and any one evaluation's full scorecard |
| `platform-mapping` | The recorded model of BattleGrid's MCP surface, and the guarantee that it announces its own age |
| `signal-recording` | The forward record of what the signals said — capture (CLI, cron-owned schedule), the raw answer kept whole, coverage with gaps stated as gaps, history per coin and per signal, readable by the web and by a model |

---

## What the App Can Do (as of `main`)

Against a real connected BattleGrid account a user can:

- **Connect** their account (OAuth/DCR/PKCE, no raw credential ever touches the browser)
- **Agents**: view roster, create, rename, update trading limits, edit position management (a preset with the platform's own values or fourteen custom fields, drift between label and values said plainly), rebind to a strategy, archive, reactivate
- **Agent understanding**: read the agent's thought log (reasoning, confidence, decision outcomes), view how close it is to each configured limit, see which limits have no cap set vs which are at risk, and see whether it is acting at all — each radar deployment's market, timeframe and standing, or a plain statement that it is configured but scanning nothing
- **Agent deployment**: deploy an agent onto a market that already carries a deployment (the replacement is named before agreement; timeframes come from the platform's runtime declaration) and undeploy it (the confirmation names what stops). A market's *first* deployment is **creatable since v14** (`expectedRevision: null`) and **the deploy surface offers it since #149** (2026-08-11, live-confirmed against ENA): the describe branches on whether the coin is occupied, and a first deployment binds a null revision through the same ceremony
- **Strategies**: fork a system strategy, edit its tagline and compose which report sections it includes, compile it (BattleGrid-side dry run showing blast radius), review it, apply it; archive and restore; browse the signal library (`/strategies/signals`) — all 82 signals a rule can reference, each with the platform's own authoring card (what it detects, when it fires, examples, parameters with bounds and defaults); browse the metric index (`/strategies/metrics`) — 75 metrics across ten families with per-transform formulas — and check any composed column against the platform's contract, where a refusal renders as the platform's own lesson (offending path, received value, legal domain); **retune any signal rule the strategy carries** (allocation, Required, declared params) through the full describe→confirm→perform ceremony, the token digest-bound to the exact values at the revision read (live-proven 2026-08-01: allocation 0→1 on a zero-bound fork, r1→r2 read back); **preview what an agent reads** (`/strategies/[id]/preview`) — the report rendered live over a bounded coin selection with token estimate, budget gauges, and which of the 82 signals the composition can feed, all without saving anything
- **Arena** (`/arena`): watch every Market Grid session — schedule, coin pool, player count, and whether this account has entered (read from `check_market_grid_submission` alone; the player-grid tool 500s for "not played" and is never called). Playing stakes a real entry fee and is deliberately not offered yet
- **Trading record** (`/agents/[id]/trades`): every trade an agent closed — net P&L, both fees, slippage each side, leverage, the conviction it opened on, why and by whom it closed, how long it was held — with a summary *derived from those trades* and labelled as such, because BattleGrid's own performance figures read zero for accounts with real losses
- **Decision pipeline** (`/agents/[id]/pipeline`): why an agent did or didn't trade, at each of the three places a candidate can end — stopped before evaluation (the platform's reason code *and* its numbers: `INSUFFICIENT_EQUITY` with `{equityUsd: 2.18, thresholdUsd: 10}`), evaluated and skipped (aggregate score against the threshold **in force at the time**, dominant bias, whether signals disagreed), or decided, carrying the agent's own reasoning paragraph whole **and the per-signal checklist behind it** — each signal named, with the platform's verdict (`CONFIRM` / `WARN` / `REJECT`, three states kept as three) and its written interpretation, plus what the agent would have staked and the exchange order ids it placed. Each stage is independently empty-or-unreadable, so one stage failing hides neither of the other two. Framed by **the funnel** (how much it evaluated against how much it acted on), and each evaluation opens to **its full scorecard** (`/agents/[id]/pipeline/[logId]`): every signal consulted with the platform's sentence and raw readings, the score attribution, the whole chain — and **what the decision cost to think** (model, price, duration), which BattleGrid nulls on public reads and this product shows for agents you own. Each evaluation also carries a **what-if**: change any fired signal's weighting and see what the candidate would have scored and whether it would cross the gate — seeded from the real weightings, so the unchanged form reproduces the evaluation's own score, and always labelled as not having happened
- **The field** (`/explorer`): the population this account competes against — its totals (37 agents, 31% win rate, **−$162.07 net**: the field as a whole loses money), the ranked agent resumes with the platform's own subtitle and objective, a per-model-vendor breakdown of who is actually profiting, and where this account stands from both tools (rank 7 by profit / 97th percentile, and its own agents' places in the field). Three platform behaviours it is built around: the returned list can be shorter than the field it reports and no limit widens it (**intermittently** — 5 of 37 four runs running, then 37 of 37 an hour later), so both counts are always stated; an absent win rate is shown as not measured rather than 0%; and every rate is printed beside its trade count, because sorting by win rate promotes the smallest sample
- **A competitor's record** (`/explorer/[agentId]`, opened from any field row): what one public agent looks at versus what it acts on — the funnel from evaluations through decisions to executions (`Market Predator`: 245 → 102 → 73 entered → 51 executed, fill rate 76%, 23W/28L, +$50.06), its closed trades with the platform's own win verdict, its evaluations against the threshold in force, and what it holds now. Two counters the platform names alike are kept apart (`skipCount` = SKIP decisions, `skippedCount` = SKIPPED terminal status), and open-position *rows* are carried but not interpreted — no agent in the field has ever held one, so the shape is unobserved and not guessed (`open-position-rows-are-unobserved`)
- **One evaluation's scorecard** (`/explorer/[agentId]/evaluations/[logId]`): every signal a competitor consulted on one candidate — **72 of them**, across seventeen modules, the ~60 that did *not* fire included, each with its score, bias, primary/required flags, raw indicator values and the platform's own sentence ("RSI(14) at 38.1 — not oversold (threshold 30)"). Plus how the aggregate was attributed across the ones that fired, and the chain from gate → attempt → decision → execution → outcome, with stages the platform did not record omitted rather than shown empty. A listed evaluation that publishes no detail says so, distinctly from one that could not be read
- **Drive it from any model** (`docs/MCP_SERVER.md`): Grid-Commander runs as an MCP server over stdio, so Claude Desktop, Claude Code, or any MCP-speaking client — with whatever model the operator chooses — can ask it the questions the web surfaces answer. Twenty-five tools, all but one a read: the product's derived figures and its `unreadable`-vs-`empty` distinctions cross the boundary intact, and a failed read is never an MCP error, because a model told a tool failed will often say "you have no agents". **No writes**, enforced by a guard rather than a convention — the confirmation ceremony assumes a human reads the consequence, and a model is not one
- **Audit log**: every write made on the user's behalf, with actor, tool, and outcome

Added in the final three rounds (2026-08-06 → 08-07):

- **What keeps stopping it** (`/agents/[id]` now leads with this): the platform's gate blocks folded into standing reasons with the platform's own field names and units — `AGENT_APPROVAL_EXPIRED` 97×, `INSUFFICIENT_EQUITY` with `{equityUsd, thresholdUsd}` — so the first thing an operator reads is why nothing has been happening
- **What it holds** (on the agent page): open positions with entry/mark/P&L/ROE as the platform prices them, the exposure totals, what could not be placed, and drift since the decision (`SinceTheDecision`) — a snapshot that states when it was priced
- **Qualification** (`/agents/[id]/qualification`): the only prospective read — would this agent take these coins right now, and which gate stops it; coins from the request, its own deployments, or the platform's ranked list, with the source always stated
- **Conditions, end to end** (`/strategies/[id]/conditions` → `/save`): compose a condition in the platform's own grammar, have BattleGrid resolve it against live market state, then save it through describe→confirm→perform — the whole list is what is agreed to, dangling references are named first, and the write is live-proven (Tobruk fork, r1→r2→r3, 2026-08-06)
- **The section library** (`/strategies/sections`): every section template with its declared columns, and a column editor that validates a composed column against the platform's contract — including the v5 `bars` and `ordering` controls, read from the discovered schema
- **The ranked players** (`/explorer`): the leaderboard rows beside this account's standing, its own row marked by the platform's `userId` and nothing else
- **The brain's human name and the spend**: `GLM-5.2` instead of the flattened `CUSTOM`; the 24-hour spend on `/limits`, read from the list (the copy that answers), with no gauge because no read publishes the ceiling
- **A nameable fork**: the fork form takes an optional name, and a refused fork renders the platform's words instead of crashing — the operator's account has 22 strategies named `Dunkirk (fork)`, which is also the platform's duplicate-name 500 trigger

There is **no assistant**. It was removed in `3d54fab` (2026-07-29, merged via PR #5): the product is MCP-control only, and the application's single outbound host is `mcp.battlegrid.trade`. Earlier versions of this file described a read-only assistant — that description outlived the code.

**Proven live**: an agent was created, renamed, had its limits updated, archived, and reactivated (reactivate proven 2026-07-31 on a throwaway: ARCHIVED→ACTIVE→ARCHIVED through the guarded path). A strategy was forked, compiled, archived, restored, and — 2026-08-01 — APPLIED: the full fork→compile→apply pipeline ran live (the first apply found and fixed the sixth dead write path: toApplyPlan omitted expectedRevision/conditions/conditionVerdicts, and the conformance pass-through exemption that hid it is deleted). Every write the product offers is now live-proven. The agent's thought log and budget gauges were read. A radar deployment was replaced-in-place through the deploy flow (HYPE r1→r2, describe→confirm→perform). All against a real BattleGrid account. Key-gated live probes live in `tests/live/` (`BATTLEGRID_API_KEY=… npx vitest run tests/live/`).

---

## What Was Fixed on the Way Here (Key Findings)

These were bugs that existed in the application that sessions discovered and fixed through live probing. Worth knowing for anyone continuing:

1. **MCP envelope bug** — `tools/call` wraps every BattleGrid response. Both adapters were passing the envelope through instead of unwrapping it. The product showed "no agents" and "nothing listed" on accounts with live data.
2. **`apply_strategy_plan` refused every request** — `refuseLocally` compared a BattleGrid account ID against the local user ID (which is `'owner'` or a random token, never a BattleGrid ID). Applying a plan was structurally impossible since the feature was written.
3. **Budget gauges** — `remaining: 0` on an unconfigured gauge means "no cap", not "at the limit". `fill` is an amount consumed, not a fraction. Displaying them naively misstates the truth exactly where being wrong costs money.
4. **Agent create** — `brain.kind` was `'preset'` where the schema pins `const: "PRESET"`; `sizingStrategy` used a catalog key that doesn't exist so the fallback fired every time.
5. **Agent update** — the read returns 23 `tradingConfig` keys; the write accepts 20 with `additionalProperties: false`. Sending all 23 back fails every time.
6. **`apply_strategy_plan` could never succeed (again)** — `toApplyPlan` omitted three fields the live schema requires; the conformance guard's pass-through exemption for `request.plan` is exactly where it hid. Found by the first live apply (2026-08-01), fixed, and the exemption deleted.
7. **The preview surface refused every strategy holding a custom table** — the platform returns a saved custom section whole (title, timeframe, columns) but `StrategySection` carried only kind and key, and `preview_strategy_report` rejects a custom section given by key alone while accepting a platform section that way. Found hours after shipping, by building a real table on a real strategy (2026-08-02).

8. **The pipeline page threw away its best data on the day it shipped** — `list_entry_decisions` returns 35 fields per row and `mapEntryDecision` kept 11. Dropped among them was `signalChecklist`: eight per-signal verdicts with written interpretations, already on the wire. Found hours later by reading a raw payload instead of a type (2026-08-02 → fixed in `the-decision-shows-its-work`). The near-miss is instructive too — the obvious fix was to add a `get_entry_decision` detail fetch, and that tool returns the same 35 keys the list row already sends.

9. **Our own agents were less legible than strangers'** — `list_signal_logs` returns 23 keys per row and `get_signal_log` returns 31; the product read the 23 and never called the detail. So `/explorer` explained a competitor's evaluation (72 consulted signals, attribution, the full chain) while `/agents/[id]/pipeline` showed a verdict for the ones that fired. Found by diffing the two key sets after the public surface shipped (2026-08-03 → fixed in `your-own-agent-is-as-legible`, which also surfaced `ownerView`: what each decision cost to think).

**The pattern in all nine**: none was findable by reading code or schemas.
Each needed a real call to the real platform — and the eighth needed
looking at what came *back* from a call the product was already making.
That is why every capability here ships with a key-gated probe in
`tests/live/`, and why a new adapter should print the raw payload's key
count next to the mapper's. **Two of the nine were the same mistake twice**
— 35-vs-11 on entry decisions, 23-vs-31 on signal logs — so when a list
tool and a detail tool exist for the same entity, diff their key sets
before assuming the list row is enough.

---

## What Is NOT Done / Known Hard Limits

| Item | Type | Notes |
|---|---|---|
| — | | The last entry here, `image-never-built`, resolved 2026-08-10: built, gated and served from the Dockerfile unchanged (355MB; #89 has the sandbox recipe) |

Resolved since this table was first written: `rebind-is-not-bound-to-the-revision-it-read` (closed 2026-07-31 — the confirmation binds agent+destination+revision, and the perform re-reads the destination), `confirmation-is-not-bound-to-values` (closed 2026-07-31 — every value-carrying flow binds a digest into the token's target; re-triage table in the item), `strategy-section-editor` (built and archived 2026-07-30, PR #7 — section checklist on the edit page), `assistant-unverified-against-live-api` (closed by the assistant's removal in `3d54fab`).

**Hard limits** (not bugs — these are constraints imposed by BattleGrid's API):

- Agent edit form only exposes rename and trading limits — the read and write schemas for `tradingConfig` differ (3 fields come back on read, are rejected on write with `additionalProperties: false`)
- Position-management preset is a label alongside 14 independent values, not a shorthand — the edit surface therefore offers the fourteen fields and says when the label and values disagree (shipped 2026-07-31)
- ~~A market's **first** radar deployment cannot be created over MCP~~ — **this limit lifted at v14, and the product followed at #149** (2026-08-11). `upsert_radar_deployment` documents `expectedRevision: null` as the first-deploy signal (proven live 2026-08-08, four created deployments), and the deploy surface now carries both first deployments and replacements through the same describe→confirm→perform ceremony
- Playing a Market Grid session stakes a real entry fee (10), so the submit tools stay unoffered until the full confirmation ceremony covers them; the arena is watch-only by decision
- **Custom report tables are created by definition, not by key** — the platform mints `custom:<uuid>`; inventing one is refused. Modifying means restating the table *with* the minted key. Full grammar in `docs/REPORT_TABLE_GRAMMAR.md`
- An archived strategy is listed by `list_strategies` but its detail answers `NOT_FOUND`

---

## P1 Backlog Items

**None open.** The last P1, `v15-trade-level-policy-is-declared-but-inert`,
closed 2026-08-11 when #150 made the policy readable: the strategy detail
page renders the platform's stop bounds and R:R floor and says plainly that
the compiler does not yet process changes to them. The *upstream* inertness
is BattleGrid's to fix — re-test it at each major version (still
`"Strategy update contains no effective changes"` at v16), and the
analytical half lives in #85.

(`the-surface-map-is-two-majors-stale` — the second P1 this table carried —
**closed 2026-08-11** by `the-count-held-and-the-fields-moved` (#92): the probe
now records the vocabulary's *values* in `docs/battlegrid-vocabulary.json` and
the live gate compares them.)

(`a-stop-inside-the-noise-looks-like-a-tight-stop` — the p1 this table carried
for four days — **closed 2026-08-10** by `a-number-alone-says-nothing`. Two of
its six rows turned out to be shipped already, one moved onto the strategy at
v15, and one asked for a read whose premise was wrong. What remains is carried
by GitHub #84 and #85.)

(`agent-create-composes-fields-v14-refuses` — v14 dropped two `tradingConfig`
fields the write paths still composed, breaking agent create wholesale — was
filed and closed the same session by `the-agent-write-follows-v14`.)

(`ci-startup-failure` — the old framing of the CI issue — was closed 2026-07-31 as superseded by `ci-creates-no-runs`.)

---

## Start Here — Where The Next Session Picks Up

**After 2026-08-13 the sharpest pick is one thread, not a list.** The secondary
pending treatment: `/pending/[id]`'s **Decline** mutates, has no undo, and still
gives no sign it is working. It wears `BUTTON_SECONDARY` and `PerformButton`
wears primary, so sweeping it in would promote a deliberately secondary control
to the page's main weight. It needs a design ticket, and that same round should
settle `may-a-submit-disable-itself-while-it-is-in-flight` — DT-0022 defined what
`disabled` looks like and **deliberately refused to authorise entering it**,
because that removes an affordance and confirmation tokens are single-use. Both
items are filed; neither has a GitHub issue yet.

Then: **#94** once the recorder has depth (hourly since 2026-08-11), and **#216**
— the build's type check silently skips every route type Next generates, because
`tsconfig` excludes `.next`, which is where they are written. Six pages fail that
check and nobody has decided whether they are defects.

*Stale, kept for the record*: the 2026-08-12 note pointed at #153 (closed
2026-08-13), #146 (measured — the churn fell 27x to 3.75/hour, still running, and
one of its three candidate causes is falsified) and #157.

Run `/board` first; it prints live counts. Then **run `./scripts/ci.sh` with a
key** — if `freshness` is red, BattleGrid has deployed and the map needs
re-probing before any other work is trustworthy. That is fast: the freshness
gate reads one file, and the thirty live probes no longer ride along inside the
`vitest` gate. They are their own gate now, opt-in on **`CI_LIVE=1`**, serial,
about nine minutes. Until 2026-08-10 this instruction fired all thirty of them
in parallel at the real account — see the journal entry for that day.

### Everything proposed is built. Most of the backlog waits on other people.

All 161 changes are archived, including `the-model-can-propose-and-only-a-human-agrees`
(2026-08-06): a model can record an intent through the MCP server, and only a
human — at `/pending/<id>`, through the ordinary describe→confirm→perform
ceremony, against the account as it is *then* — can perform it.
`tests/architecture/proposals-are-inert.test.ts` holds that as a property.

**The three parting concerns filed at the 2026-08-11 close** are the sharpest
thing to pick up:

| | | |
|---|---|---|
| **#145** | Is the signal-recorder cron running? A gap can never be backfilled | **Closed 2026-08-11** — it had never run; the operator stood it up same-day on their Windows machine (hourly Scheduled Task, unattended fire proven). Record starts 2026-08-11, the four-day gap is permanent, #94 is accumulating. The Windows recipe lives in the item |
| **#146** | Undertow's `OPEN_POSITION_CONFLICT` churn tripled — ~90 blocked evaluations an hour | Observe before modelling; the item has the numbers |
| **#147** | `conditionEvaluation`'s deciding branch has never been seen populated | Observable once a required condition exists — `a-draft-can-insist` (#88, shipped) makes one composable |

(Of the four issues opened 2026-08-10, three closed within a day — #84, #86,
#87 — and **#85** remains, blocked upstream with the rest of the v15
trade-level-policy story.)

The 25 open backlog items split cleanly:

- **Waiting on the operator**: `prove-token-lifetimes` and
  `oauth-path-may-be-dead-weight` (a human browser consent),
  `preset-custom-in-the-preset-branch-is-unestablished`
  (one create that takes an agent slot on an account with no readable cap),
  `approvals-have-no-write-side` (putting a real agent into
  `APPROVAL_REQUIRED` changes how a live account trades).
- **Waiting on BattleGrid**: `forking-a-name-that-exists-is-a-500` (report it —
  a duplicate name should refuse, not 500), `battlegrid-is-returning-internal-errors`
  (the standing outage record),
  `market-grid-payloads-that-only-fill-once-someone-plays` (nobody on the
  platform has ever entered a session this listing can see),
  `two-read-tools-do-not-answer` (`get_market_context`'s schema understates its
  precondition, third observation across two major versions),
  `v15-trade-level-policy-is-declared-but-inert` (the one P1).
- **Waiting on evidence**: `performance-and-allocation-are-unmodelled`
  (`get_agent_fund_allocation` all zeros on a budgeted, trading agent),
  `a-fork-cannot-say-which-revision-it-came-from`,
  `open-position-conflict-churn-tripled` (#146),
  `the-deciding-branch-awaits-a-required-condition` (#147).
- **Genuinely buildable, none urgent**: `recorded-signals-are-not-yet-evidence`
  (#94 — the record accumulates since 2026-08-11; wait for days of depth),
  the open-orders slice of
  `trading-telemetry-is-unread` (one discovery read on account 2 first),
  `radar-says-why-it-is-blocked` (#135, v17's refusal
  telemetry), `the-button-primitive-has-no-tokens` (a `/surface` + `/design`
  pass), `the-payload-carries-more-than-is-read`'s remaining fields,
  `v5-surface-additions-unconsumed`. (`the-deploy-surface-cannot-create-first-deployments`
  closed with #149's merge; the dead-fields slice of the payload item went
  with #148.)

### Two things that will cost a session if rediscovered

**`FakeAgentsPort` records what a write bound its confirmation to and does not
check it.** `enforce()` is the guard and it lives in the adapter. So a test that
calls `update.execute`, sees `updated`, and concludes the binding works has
proven nothing — drive the store's own `consume` against the target the write
composed, the way `edit-binding.test.ts` does. Two drafts of
`two-edits-in-a-row.test.ts` passed vacuously this way.

**`docker` in these environments pulls from the mirror, not from Docker Hub.**
The Hub's blob CDN (`production.cloudfront.docker.com`) is policy-403'd and
stays that way; `mirror.gcr.io` is allowed. The working recipe, proven
2026-08-10 (#89): pull `mirror.gcr.io/library/node:22-alpine`, tag it as
`node:22-alpine`, then build with `--network=host` and the proxy passed as
explicit `--build-arg`s — this docker CLI does not auto-forward proxy env into
BuildKit, and *direct* npmjs traffic from inside a container is transparently
TLS-intercepted (npm dies on `SELF_SIGNED_CERT_IN_CHAIN` behind an opaque
"Exit handler never called!"). Through the CONNECT proxy, certificates are real
and verification stays on.

### The lesson that keeps recurring, now eight times — and it left the test suite

**2026-08-13 added two, and the second one matters most because it is not a
test.**

**Seventh: three false findings in one sweep, from reading `logs` where the
payload says `entries`.** A live probe reported "0 rows", "empty pages" and
"field size 0" for tools that were answering normally. Caught only because
`total: 143` sat beside `rows: 0` in the same output. Exactly the shape below —
matching how a payload is *spelled* rather than what it *carries*.

**Eighth: a design round restyled what the manifest named, not what the page
contained.** DT-0016/0017/0018 gave three confirmation rows a mobile treatment
and silently skipped a fourth. The backlog item blamed scope. It was not scope:
`perform-deploy` was a **component** in the surface manifest and the deploy
chooser row was a *sentence inside another component's description*, so no ticket
could name it and no design round could see it. `openspec.py validate` refuses a
component whose id appears in no source file — that check would have caught it a
month earlier, and the fix was to give the row a name in the code.

That is the first time this lesson has appeared outside a test guard. **Any
surface where two units do different jobs and only one is modelled will drift the
same way, invisibly from the design side**, and it will not announce itself.

Corollary the same day: **when a guard breaks because of a refactor, suspect the
guard's measure before its threshold.** `controls.test.ts` counts how widely
`BUTTON_PRIMARY` is worn as an anti-vacuity floor. Moving fourteen wearers behind
one component dropped the count from 20 to 13 and the file count to zero.
Lowering the numbers was the easy read and would have permanently weakened a
check written to catch a scanner that stopped matching. The scanner was taught to
count the component instead, and the fix was verified by mutation.

### The original six



**A check that matches how something is *spelled* rather than what it
*reaches* is the defect shape this codebase produces.** The read-only guard
matched a tool-name prefix; the live-writes guard matched tool names in test
source and missed a file that mutated through `ForkStrategyCommand`; a
rendering assertion searched text for a URL the harness never emitted;
`readOnlyHint: true` was served for every tool because every tool used to be a
read; the live-writes guard's *replacement* assumed one gate per file and
broke on the first probe that honestly needed two; and **the sixth was a guard
written against this very lesson** — `no-population-constants.test.ts` shipped
with a regex whose mandatory leading `[A-Za-z_$]` consumed the first letter of
its own alternation, so it matched nothing, ever, and passed green against a
constant planted in a rendered component.

Corollary, learned the same day: **when a rule and an honest new case
disagree, suspect the rule.** Every one of those was fixed by deriving from
reachability — the surface record's own classification, the composition root's
wiring, what a block actually calls — never by adding an exemption.

**And the distinction the sixth adds, which the first five did not:** a corpus
check proves the sweep read files. It proves *nothing* about whether the
pattern can match. Fifteen of the sixteen guards making negative assertions
already assert their corpus is non-empty, and that protection is real — but the
corpus here was 231 files and entirely healthy while the pattern was dead. The
only thing that proves a matcher works is feeding it a violation, which
`identifiers.test.ts` has done all along: *a guard nobody has seen fail is a
guard nobody knows works.* Audit filed as GitHub **#87**.

---

### Older context

**Phase 2 of the assistant roadmap — reporting and expected value — has
shipped both halves of the record.** Both started with a discovery read,
the way every capability this month began:

1. ~~`trading-telemetry-is-unread`~~ — **the outcomes slice shipped
   2026-08-03** (`/agents/[id]/trades`). The known risk proved real:
   `get_agent_performance` answers zeros on an agent that lost $9.64, so
   the record is derived from `list_trade_outcomes` and labelled as
   derived. What remains of the item is separate surfaces: open orders,
   order status, trade charts, position audit history.
2. ~~`entry-decisions-have-a-read-side`~~ — **the decision pipeline shipped
   2026-08-03** (`/agents/[id]/pipeline`). Three stages, read
   independently: gate blocks, signal evaluations, entry decisions. Live:
   "Flow State" scored ENA at 0.397 against a 0.55 threshold → SKIPPED.

3. ~~The decision's evidence~~ — **shipped 2026-08-03**
   (`the-decision-shows-its-work`). The pipeline page renders each
   decision's per-signal checklist. Found by reading the raw payload: the
   list row carries 35 fields and the mapper kept 11.

4. ~~`public-explorer-is-unmodelled`~~ — **the field shipped 2026-08-03**
   (`the-field-is-visible`, a tenth capability). Both entry points, and the
   denominator every other number in the product was missing.

5. ~~`public-agent-detail-is-unread`~~ — **the competitor page shipped
   2026-08-03** (`a-competitor-can-be-opened`). Four of the seven reads;
   every field row opens. The declaration's contradiction was settled by
   calling it, not reading it.

6. ~~`a-competitors-scorecard-is-unread`~~ — **the scorecard shipped
   2026-08-03** (`the-scorecard-is-legible`). 72 consulted signals per
   evaluation, the ~60 dismissed ones included, with attribution and the
   full gate→outcome chain.

7. ~~`our-own-agents-show-less-than-strangers`~~ — **closed 2026-08-03**
   (`your-own-agent-is-as-legible`). It was the mapper gap: 23 keys read of
   31 available. Now at parity *and past it* — an owned evaluation shows
   what it cost to think, which no public read carries.

8. ~~`the-what-if-calculator-is-unused`~~ — **shipped 2026-08-03**
   (`the-what-if-is-answerable`). The correctness check came back clean
   five for five, so the what-if lives on each evaluation, seeded from what
   really fired.

9. ~~`an-assistant-over-the-use-cases`~~ — **shipped 2026-08-03** as an MCP
   server (`grid-commander-is-an-mcp-server`), which is the form the
   operator chose and the one that needs no model of our own.

**Recommended next move:**

- **`the-assistant-cannot-be-trusted-with-a-write` (P2)** — the MCP server
  reads and cannot write, because the confirmation ceremony assumes a human
  reads the consequence and a model in that seat is not one. The item lays
  out the three ways that seat could be provided and rules one of them out.
  Deciding between "the model acts" and "the model drafts" is the
  operator's call and shapes the design.

Then, in rough order of value:

- What remains of `trading-telemetry-is-unread` (open orders, order status,
  trade charts, position audit history) — the last unread slice of an
  agent's own record.
- `market-grid-is-an-unmodelled-module` — the arena is watch-only, and
  `get_public_agent_game_history` (left open twice now) belongs with it.
- **`an-assistant-over-the-use-cases` (P2)** — the operator's original
  vision. Worth revisiting now: there are ~40 use-cases in `composition.ts`
  and the surfaces beneath them are far richer than when the item was
  filed. Still gated on the two decisions recorded in it (whose Anthropic
  key pays, and whether to prototype as an MCP server first).
- `open-position-rows-are-unobserved` — one call away whenever any agent in
  the field is holding something; the item has the recipe.

**Blocked on the operator, not on us**: `approvals-have-no-write-side` (the
accept/cancel writes). The read half exists and the tool contracts are
mapped, but `list_pending_approvals` has never returned a row — no agent on
this account, active or archived, has ever been `APPROVAL_REQUIRED` (9 are
`OFF`, 6 `FULL_EXECUTION`). Observing one means putting a real agent into
that mode, which changes how a live trading account behaves. The item says
exactly what is needed. Until then the mode selector warns that
Grid-Commander cannot answer what such an agent proposes.

**The vision item**, when you want it: `an-assistant-over-the-use-cases`
(P2) — conversational control over the ~30 use-cases in `composition.ts`.
Two decisions gate it, both recorded in the item: whose Anthropic key pays
for conversations, and whether to prototype by exposing Grid-Commander as
an MCP server first (no second outbound host, no chat UI).

**Operator-side, not mine to close:**

- `prove-token-lifetimes` — needs a human browser session.
- **The API key**: the operator confirmed on 2026-08-03 that key handling is
  theirs and the current key stays in use. Not a standing recommendation
  any more — do not re-raise it.

**Platform weather worth knowing**: 2026-08-01 brought three BattleGrid
outages, the last roughly ten hours with authenticated calls returning zero
bytes while the edge answered 401. Every surface renders that honestly as
unreadable-with-reason, and the live probes say so in their headers — a
`tools/call failed with 504` in a probe run is the platform, not a
regression.

---

## The Documentation Map

| Read this | For |
|---|---|
| `docs/FIRST_SESSION.md` | **The operator's first session** — boot, connect with a personal key, the reading tour, first writes |
| `README.md` | The product's front door — what it does, how to run it, the doc map |
| `docs/PIPELINE.md` | SKILLMOREL — the development pipeline itself (moved from the root README 2026-08-07) |
| `docs/MCP_SERVER.md` | Pointing a model at the product: setup, the tool list, and why it cannot write |
| `CLAUDE.md` | Project rules, pipeline commands, the three load-bearing domain facts |
| `HANDOFF.md` (this file) | Session-start state and what to do next |
| `openspec/JOURNAL.md` | What happened, newest first — the narrative record |
| `openspec/specs/<capability>/spec.md` | What the system does today (source of truth, archiver-written) |
| `docs/BATTLEGRID_MCP_REFERENCE.md` | The full 110-tool surface, regenerable via `tools/generate_mcp_reference.py` |
| `docs/BATTLEGRID_SURFACE_MAP.md` | Orientation over that surface |
| `docs/REPORT_TABLE_GRAMMAR.md` | **How report tables are authored** — column grammar, the two laws (unit commensurability, timeframe inertia), the create-by-definition/modify-by-key loop. Every claim live-established 2026-08-02 |
| `docs/BATTLEGRID_PRODUCT_MODEL.md` | The operator's description of what BattleGrid *is* |
| `docs/CI_WITHOUT_BILLING.md` | Why CI is local, and the option chosen |
| `docs/checklists/*_REVIEW_CHECKLIST.md` | Engineering standards every change is held to |
| `openspec/backlog/*.md` | Everything deferred, each with why and the first step when taken |

---

## Architecture Quick Reference

```
app/                     Next.js App Router pages and API routes
src/
  domain/                Pure domain types; no imports from outside domain/
  application/use-cases/ One file per command/query; imports ports only
  ports/                 Interfaces: BattleGridPort, AgentsPort, StrategiesPort, etc.
  infrastructure/        Drizzle repos, BattleGrid MCP adapters, crypto
  presentation/          Shared UI helpers, require-connection guard
src/composition.ts       Single composition root — the only place that wires infrastructure to ports
openspec/                Spec layer (behavior contract, journal, backlog, changes)
docs/checklists/              Review checklists (engineering standards)
tests/                   Vitest (unit + architecture) + Vitest DB (real PostgreSQL) + Python unittest (harness)
scripts/check.sh         All local gates in one script (replaces CI while Actions is blocked)
```

**Three facts that shape every decision** (from `CLAUDE.md`):
1. `mcp:read` is write-capable — 11 tools mutate on read scope alone, 6 flagged destructive
2. The tool list goes stale after a BattleGrid deployment — rediscover at runtime, never hard-code
3. This product holds credentials that configure other people's agents — read-only by default, explicit step-up, audit every write

---

## Running the Project

```bash
# Prerequisites: Node 20+, PostgreSQL 16
npm install
cp .env.example .env  # fill in DATABASE_URL and encryption secrets

# Database
npx drizzle-kit generate
npx drizzle-kit migrate

# The whole CI, locally (the verification story — see docs/CI_WITHOUT_BILLING.md)
DATABASE_URL=… ./scripts/ci.sh          # add CI_SERVING=1 for the serving probe

# Just the python harness + spec validation
./scripts/check.sh

# Dev server
npm run dev

# Build
npm run build && npm run start
```

PostgreSQL stops on its own in ephemeral containers — restart with: `pg_ctlcluster 16 main start`

To probe BattleGrid live after connecting an account: `./scripts/check-serving.sh` runs the served-application verification.

**Use `next dev`, not `next dev --turbopack`.** Turbopack (Next 15.1) cannot
resolve this repo's `.js`→`.ts` specifiers through the `@/` alias and offers
no `extensionAlias` equivalent to teach it; webpack is the supported path
for dev and build alike. Proven and recorded in `next.config.ts`.

### The live probes

Thirty key-gated probe files in `tests/live/` — each proves one capability
against the real platform and skips silently without a key. The table below
names the load-bearing ones; `all-controllers-probe` walks **every** read
controller against one account and asserts the row count, so a silently
skipped controller fails:

```bash
BATTLEGRID_API_KEY=bg_live_… npm run test:live   # serial on purpose — the platform rate-limits
```

| Probe | Proves |
|---|---|
| `write-probe` | agent create / rename / limits / archive / reactivate |
| `trading-record-probe` | real closed trades and the derived summary |
| `pipeline-probe` | the three decision stages, a real score-vs-threshold skip, and the per-signal evidence behind it |
| `field-probe` | the field, the per-vendor breakdown, and this account's rank in it |
| `competitor-probe` | opening the top agent in the field — funnel, trades, evaluations, holdings |
| `evaluation-probe` | a real scorecard: 72 signals consulted, the dismissed ones included |
| `own-evaluation-probe` | the same depth on an agent we own, plus what the thinking cost |
| `simulate-probe` | that the what-if calculator still reproduces the pipeline's own score |
| `mcp-server-probe` | the MCP server spawned as a subprocess and driven by a real client |
| `radar-probe` | deploy replacement (r1→r2) through describe→confirm→perform |
| `restore-probe` | archive → roster check → restore |
| `apply-probe` | fork → compile → **apply** (the widest blast radius write) |
| `retune-probe` | the scorecard write, digest-bound, on a zero-bound fork |
| `signal-vocabulary-probe` | the 82-signal library and one authoring card |
| `column-grammar-probe` | the metric index, a metric card, and a teaching refusal |
| `preview-probe` | the agent's-eye report with cost and budget gauges |
| `custom-table-probe` | **create and modify a custom table** end to end |
| `oauth-metadata` | the connect path's discovery documents |
| `all-controllers-probe` | every read controller, one account, 28 asserted rows |
| `condition-probe` / `condition-write-probe` | the condition layer: resolution, and the save walked fork→apply→remove→restore |
| `qualification-probe` | the prospective screen: gates, verdicts, and the coin-source fallback |
| `stoppages-probe` | gate blocks folded into standing reasons with the platform's own units |
| `exposure-probe` | open positions, totals, and the unplaced remainder |
| `proposal-probe` | a model's recorded intent performed only by a human |
| `surface-freshness` | the recorded surface version against the live server |

Several use the operator-authorized **slot shuffle**: the account sits at
its 25-active-strategy cap, so a probe parks an unbound PRIVATE strategy,
works on a throwaway fork, then archives the fork and restores what it
parked. Every one of them restores the account in a `finally`.

---

## Pipeline Commands

```
/board     — Everything at a glance (run this first every session)
/propose   — Start a new change
/verify    — Check if an implementation matches its change spec
/archive   — Merge a verified change into openspec/specs/ and archive
/handoff   — Close out a session and write the journal entry
/backlog   — View, file, or triage backlog items
```

The pipeline spec is in `.claude/` — skills, tools, references, commands.

---

## Design System

`openspec/design/system.json` is the token source. `tailwind.theme.json` and `app/tokens.css` are generated from it by `tools/generate-theme.mjs` — since DT-0003 that includes the `size` group (`size.control.min`, the 44px tap-target floor, worn as `min-h-control` and asserted end-to-end in `tests/architecture/controls.test.ts`). **Ten tickets (DT-0001–DT-0010) are implemented** across 13 surfaces (10 `designed`): the semantic roles — `consequence` (what an action reaches), `notice` (advisory, never failure), `quiet` (absence stated), `danger` (a bounced write, behind a semibold "Refused:" prefix) — now dress every load-bearing sentence product-wide, no box or rail wears an untokened border (the 2026-08-12 sweeps), and `ghost`/`danger` button variants stay deliberately undefined by recorded decision until a surface renders them. The remaining record-keeping (eleven ceremony manifests, first tickets for `agent-roster`/`audit-log`/`strategy-catalog`) is #157. The design layer is clean.
