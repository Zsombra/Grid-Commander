# Journal

## 2026-08-14 (probe) — the platform honours the key, measured at full capacity

**Did**: merged **PR #246** (squash, `9a2cb7d`) — #239 closed. Then ran the
#238 probe with operator authorisation: archived **Vanguard** (chosen by the
operator — idle, 0 trades) to free the slot, created "Probe 238 Dedupe"
(`tradingMode: OFF`) carrying `idempotencyKey: gc-probe-238-key-alpha`,
repeated the call byte-identically. **The same agent came back** — same id,
same `createdAt` to the millisecond, revision 1, no error — with slots at
3/3, so the dedupe outranks the capacity check. Cleaned up: probe agent
archived, Vanguard reactivated (revision 10, config intact). Closed **#238**;
annotated `create_intelligence_agent` in `docs/BATTLEGRID_MCP_REFERENCE.md`.

**State**: main carries the whole dedupe round. Account restored: Vanguard,
Undertow, Breakwater active, 3/3 slots, no probe litter. 30 open items, no p1.

**Next**: nothing urgent from this thread. The board's top open items are the
p2s: the error boundary (#236), the fork 500, and #245 (the create action's
three silent arms — now the only gap left on that route).

**Watch out**:

- **Both dedupe layers are now measured, and they answer different presses.**
  The platform's key dedupe replays the original result — but only for a
  request that reaches it. The local ledger refuses the repeat before any
  request is built, and that is the layer that catches a double press when
  BattleGrid is down or slow. Neither subsumes the other; records citing one
  should not imply the other is redundant.
- **The platform deduped at full capacity** — the key check runs before the
  slot check. A future probe that sees a capacity refusal on a keyed retry is
  therefore looking at a *platform change*, not at expected behaviour.
- **The raw create schema wants what the app assembles**: the `brain` union
  and the full twelve-value `positionManagement`, even when disabled. The
  first probe call bounced on exactly the completeness rules the specs
  record; the app's own assembly path is what makes this invisible in
  production.
- The name-collision-without-key half of #238 stays unmeasured, deliberately
  — needs two free slots and changes nothing this product does.

## 2026-08-14 (dedupe) — the key does both halves of its job, and the falsehood is out of every record

**Did**: implemented **#239** as `a-duplicate-create-returns-the-original`
(proposed, executed, verified, **PR #246**): the unique index on
`(user_id, idempotency_key)` is now partial (`WHERE outcome != 'failed'`), so
only a `succeeded`/undecided attempt dedupes — operator decision — and a
failed create retries from the same form; Postgres `23505` converts to a typed
`DuplicateIdempotencyKeyError` (race path = sequential path); the key rides
inside `create_intelligence_agent`'s own `arguments`; the refusal reaches the
operator via `?problem=` with `CarriedProblem` on **every** branch of
`/agents/new`. Then ran checklist-generator UPDATE (operator-approved):
**UI checklist v2.0.0** — item 4 restated as the outcome, #233's dead sections
replaced by "Deliberately Absent" with a regenerate-first rule. Archived
`a-duplicate-submit-cannot-duplicate-a-write` (delta into `app-access`,
principle 14 settled). Closed **#228, #229, #233**; opened **#245** (the
create action's three silent arms, found while proposing, deliberately
unbundled). Verifier ran on the #239 change: passed, two warnings, both fixed
same-hour (the action seam walked; different-key db test).

**State**: PR #246 open, three commits. 2364 vitest / 185 files, typecheck,
lint, build, drizzle clean; `validate --all` 0 errors. One active change left
(`a-duplicate-create-returns-the-original`, 15/15, awaiting CI). 31 open items,
no p1 once #239's item closes with its change.

**Next**: **merge PR #246** — everything on it is proven. The db suite could
not wait for CI (Actions are billing-blocked, manual dispatch only — the
2026-08-01 decision; this session rediscovered it the hard way), so the local
policy gate ran instead: disposable postgres:16 in Docker, migrations applied
twice, **96/96 `test:db` green** including all new idempotency tests. Both
changes are archived; #239's item is closed. After the merge, #238 (does the
platform honour the key it now receives) is the natural next probe. Two
side-fixes from the db run rode along: `validate.yml` now points `test:db` at
`gridcommander_test`, because the suite's own disposability guard (2026-08-13)
refuses the name CI had been using — a latent first-dispatch failure; and
Docker Desktop on this machine was crash-looping on corrupt AF_UNIX socket
files under `%LOCALAPPDATA%` (`Docker\run`, `docker-secrets-engine`) — remedy
was renaming the parent dirs aside; the `.stale.*` leftovers there are inert
and deletable after a reboot.

**Watch out**:

- **The falsified clause lived in two records, and the annotation pointed at
  only one.** Task 1.1 flagged the checklist's "the platform honours an
  idempotency key"; the active change's own delta carried the same clause in
  its MAY-list, and archiving would have written into `openspec/specs/` the
  sentence the checklist edit removed. Caught only because the delta was
  reread at archive time. When a sentence is falsified, grep for its
  *siblings* — the same claim spelled differently in every record that quotes
  it — before amending any one of them.
- **"Honoured" and "offered" are different claims and the wording now keeps
  them apart.** The key reaching the platform's declared field is measured
  (wire test asserts `arguments`, not the request envelope); the platform
  honouring it is #238 and stays unclaimed everywhere.
- **The dedupe semantics live in the index, not in code**: at most one
  non-failed row per (user, key). No pre-read — the collision IS the race
  loser's path. If a future migration touches
  `audit_entries_user_idempotency_idx`, the WHERE clause is load-bearing;
  a plain unique index re-burns failed keys and re-breaks the retry.
- **db tests that have never run are still a claim, not evidence.** tasks.md
  carries the annotation: do not archive the #239 change on an unrun db suite.

**Did**: squash-merged PR #235 as `dfa15af` — closed #227, #231, #232. The
review that preceded it is the previous entry; nothing was found after it.
Annotated the active change's tasks 1.1 and 3.3 with the one post-merge
discovery: the proposed checklist wording's clause *"the platform honours an
idempotency key"* is falsified by #239, and task 3.3 as written checks the
key's plumbing, not where the key lands, so it would not catch that.

**State**: main = `dfa15af`, gates green as verified pre-merge (typecheck,
lint, 2352 tests / 183 files, build, drizzle, `validate --all` 0/14). One
active change, 0/14, blocked on the operator at task 1 by design. 33 open
backlog items, #239 the only p1.

**Next**: **#239 before the active change's task 1** — not as a preference but
as a dependency: running checklist-generator first writes a measured falsehood
into a binding standard, and no gate catches it (see the 3.3 annotation).
`/propose` #239 as standard; the one operator decision inside it is whether a
*failed* attempt's key dedupes, or only a `succeeded` one (recommended: only
succeeded, so a failed create can be retried from the same form). Then #229
task 1 together with #233, one generator pass.

**Watch out**: the review pattern that keeps paying — every guard in this repo
that scans text encodes a *spelling*, and the mutation that matters is the
synonym that changes nothing semantically (`confirmationToken,` for
`confirmationToken:` is how the eleventh spender hid). When adding a scan,
mutate the idiom, not only the behaviour. And when citing a guard as evidence
in a record, first check what the guard actually reads — 3.3 cited a test as
guarding a claim the test never looks at.

## 2026-08-14 (review) — PR #235 reviewed, three defects amended, two findings refuted

**Did**: reviewed PR #235 against the merged tree, found three defects, fixed
them on the branch, and filed five findings as **#239–#243**. Re-surveyed
`agent-edit`, which the fix staled. Two commits on top of the eleven.

The three, each one a guard or a record claiming a completeness it did not have:

- **`spending()` forwarded `err.message`.** `ConfirmationRequiredError` composes
  that as `"<tool>" is destructive and needs confirmation: <consequence>`, so
  the fix whose whole purpose was to deliver four carefully-written sentences
  delivered each behind a preamble that contradicts it — the reader *did*
  confirm — and in front of a raw MCP tool name. Nothing in the repo read
  `.consequence`, though it is public for exactly this. `errors.ts` records the
  same class being fixed once already on `DiscoveryUnavailableError`.
- **`/agents/[id]/edit` was the eleventh confirmation spender**, unprotected.
  It passes its token by ES6 shorthand; the scan matched the literal
  `confirmationToken:`. So the route that edits loss caps spent a confirmation
  with nothing catching its refusal, while the guard written to find exactly
  that ran green, and four records asserted a closed set of "nine, and the
  tenth".
- **`write-results.test.ts` latched.** It set the wrapper flag on the opening
  line and never checked *that* line for the execute, so a compact one-line
  `spending()` lost its own site and handed its binding to the next call down
  the file. Probed: the old loop reported `beta`, the fixed one reports `alpha`.

**State**: PR #235 reviewed and amended on its branch, gates green, merged
immediately after this entry. `spending()` now has the first test that
*executes* it. One active change, `a-duplicate-submit-cannot-duplicate-a-write`,
0/14, still blocked on the operator at task 1. 2352 vitest across 183 files;
typecheck, lint, build, drizzle clean. `validate --all` 0 errors / 14 warnings —
back to baseline after the re-survey.

**Next**: #239 (p1) is the biggest thing open — the idempotency key never
reaches BattleGrid and a duplicate create is a raw Postgres error. Then #229
task 1 together with #233, unchanged.

**Watch out**:

- **Green is not evidence; a mutation is.** All three defects sat under passing
  tests, and two of the three *were* the tests. Every fix here was mutation-
  checked: revert it and its guard fails. The PR mutation-tested the rule it
  widened and not the *idiom* the rule matched, which is the gap the shorthand
  slipped through. **Mutate the spelling, not only the behaviour.**

- **A slack anti-vacuity floor cannot tell a shrinking product from a shrinking
  scan.** The floor asked for 8, the scan found 10, and the eleventh was
  invisible — so the guard against vacuity was itself satisfied vacuously. Now
  pinned at the true count, which still permits growth but forces any loss of
  reach into an edit. #241 files the general case: a floor that counts a
  *different pattern* than its rule can never fail with it.

- **Two of the review's own findings did not survive checking, and I nearly
  filed both.** The rule editor does not drop `edit=1`/`p_*` — both arms build
  the identical query. And "eleven submits carry a confirmation, not fourteen"
  conflated *files* with *submits*: five more live in components whose actions
  sit on those pages, so fourteen was right. Measuring before filing is the
  same discipline yesterday's entry asked for, applied to a reviewer instead of
  an implementer.

- **A constraint asserted by hand drifts silently.** Two surfaces
  (`pending-proposal`, `agent-edit`) both said "no client JS" while rendering
  `PerformButton`. A surface constraint is the design agent's veto; a false one
  either blocks legitimate work or teaches that constraints are unreliable.
  "No client JS" is mechanically derivable from `source_files` — #243.

- **Re-pin against what is committed.** The surveyor skill is explicit and it
  matters: re-pinning a digest over uncommitted edits makes the manifest's
  commit claim false *while removing the warning*, which is strictly worse than
  the warning. Committed first, surveyed second.

## 2026-08-14 (handoff) — a design round, two p1 fixes, and three false sentences caught

**Did**: eleven commits on `claude/secondary-treatment-variant-19160e`, all
pushed, **PR #235 open and unreviewed**. Shipped DT-0027 (the secondary weight's
pending treatment), `system.json` v3, an idempotency key on `/agents/new`, and
`spending()` on the confirmation-spending actions. Closed **#227, #231,
#232**. Opened **#227-#238**. Proposed
`a-duplicate-submit-cannot-duplicate-a-write` for #229.

**State**: one active change, 0/14 tasks, **blocked on the operator** — task 1
runs checklist-generator, which halts for human approval. 2346 vitest across 182
files; typecheck, lint, build, drizzle all clean. `validate --all` 0 errors / 14
warnings, the same baseline this session started from.

**Next**: **review and merge PR #235.** Then #229 task 1 *together with* #233 —
they are the same file, and the generator rewrites all of it.

**Watch out**:

- **Three sentences in binding records turned out to be false, and two were
  mine.** "A disabled control is unreachable to a screen reader" (conflates *not
  focusable* with *unreachable*; corrected in four places). "Two presses of Fork
  make two strategies" — filed p1, refuted by a live probe the same day.
  "Submit controls disable while in flight" — the checklist's, false since #153.
  **Measure before filing a severity**, and check the checklists before calling
  anything undecided.

- **The absence of a client-side guard is not the presence of a defect.** #231
  reasoned from "no token, no key, therefore nothing stops it" and never asked
  whether the *server* had a guard. Fork is deduped by BattleGrid — measured,
  named and auto-named, both `INTERNAL_ERROR` on the second call.

- **Two architecture scanners went blind and one reported a *cleaner* tree.**
  Wrapping calls in `spending()` moved `app.X.execute(` off the line beginning
  `await app.`, so `write-results.test.ts` lost nine sites — including a real
  dropped result whose ledger row then failed as "no longer found". Deleting
  that row was the available wrong answer. **A guard that breaks on a refactor:
  suspect its measure, not its threshold** — twice this session, and the repo
  had already recorded the lesson once.

- **`redirect()` works by throwing.** A `try` around a block that also redirects
  catches `NEXT_REDIRECT` and swallows the navigation. That is why the fix is a
  wrapper taking the redirect as a separate argument: the narrow shape becomes
  unwidenable instead of being retyped nine times.

- **`design_surface_incomplete_sources` has never matched anything.** `IMPORT_RE`
  only matches relative specifiers; this codebase has 23 of those against 337
  `@/` aliases. Three separate blind spots followed — `perform-button.tsx` in no
  manifest while fifteen surfaces render it, `agent-form.tsx` likewise, and
  `/agents/new` never surveyed at all. #230, and it is the highest-leverage
  tooling fix on the board.

- **The shell ate a backslash three times**, including inside the bullet
  documenting it. Spell escapes in words; read back what a shell wrote, in
  bytes. `0x08` renders as an empty pair of backticks and looks like a typo.

- **`agent-roster` had been deliberately left stale for four rounds and filed
  zero times** (#237). The decision was right every time; the filing was
  missing, which is the failure the "no unfiled deferral" rule names.

## 2026-08-14 (late) — the refusal reaches the person, and two guards that broke correctly

**Did**: opened PR #235 for the DT-0027 round, then closed **#232** — every
confirmation refusal now reaches the operator instead of a framework crash page.
Filed **#236**. Re-surveyed the nine manifests this staled.

**State**: 2346 vitest across 182 files, typecheck, lint, build clean.
`validate --all` 0 errors. Nine commits on the branch; PR #235 is open and this
work is pushed to it.

**Next**: **#229** — the checklist contradiction. Its facts have now stopped
moving: fork is deduped by the platform (measured), create carries a key, and
the guard's refusal is legible, so "the guard answers" is finally true and the
amendment can be an honest sentence rather than an aspiration.

**Watch out**:

- **`redirect()` works by throwing, so a `try` around one swallows the
  navigation.** This is why the fix is `spending(run, onRefused)` rather than
  nine hand-written try/catches: passing the redirect as a separate argument
  makes the narrow shape — call inside, redirect outside — unwidenable. Nine
  copies would be nine chances to add a line inside the `try`, and the failure
  would look like a page that silently does nothing.

- **My refactor blinded an architecture scanner, and the scanner said so by
  reporting a *cleaner* tree.** `write-results.test.ts` matches
  `await app.X.execute(` at line start; wrapping the call moved it inside an
  arrow function, so nine sites vanished from the scan — including one genuinely
  dropped result, whose ledger row then failed as "no longer found". **Deleting
  that row was the available wrong answer.** The result is still dropped; only
  the measure stopped reaching it. Taught the scanner to read the binding off
  the wrapper. Same lesson as `controls.test.ts` and `<PerformButton>`: a
  refactor that removed nothing must not be able to weaken a check.

- **A guard failing after a refactor is not a guard to relax.** Both breakages
  were correct detections of a real change, and neither threshold moved — one
  scanner learned a shape, one regex followed a spelling it already asserted.
  Both re-verified by mutation afterwards, because a widened matcher silences a
  rule as completely as a dead one.

- **Only nine of the twelve confirmation-carrying files actually spend one.**
  `agent-edit.tsx` and `plan-review.tsx` render the token into a form whose
  action lives on a page; `conditions/save` already had its own catch. Counting
  files that *mention* `confirmationToken` would have produced three phantom
  fixes — the guard scans for `.execute(` alongside it for that reason.

- **#232 is closed and the app still has no error boundary.** Those are
  different things and folding them together would have made a fixed defect look
  unfixed and an unscoped one look done. Filed as #236, with the check that
  should come first: whether `error.tsx` even catches a throw from a server
  action, which is not the case it is documented for.

## 2026-08-14 (late) — the probe that refuted my own p1, and the key that was already plumbed

**Did**: investigated #229 properly, corrected a false accessibility claim I had
published in four places, filed #231-#234, then **probed BattleGrid live** and
refuted the central claim of #231 — which I had filed as p1 an hour earlier.
Wired the `idempotencyKey` into `/agents/new` with a guard.

**State**: 2342 vitest across 181 files, typecheck, lint, build all clean.
`validate --all` 0 errors. Six commits on the branch, not pushed.

**Next**: #232 — a spent confirmation renders a framework crash page to someone
whose action succeeded. It is the biggest thing found this session and nothing
argues against fixing it.

**Watch out**:

- **I filed a p1 by reasoning from an absence, and measurement refuted it.**
  #231 said two presses of Fork make two strategies, reasoning from "no
  confirmation token, no idempotency key, therefore nothing stops it". Four live
  `fork_strategy` calls say otherwise: the second identical call returns
  `INTERNAL_ERROR`, both with an explicit name and with the name omitted — and
  the no-name case is the default, since the field is optional. **The guard was
  on the platform, where nobody had looked.** Absence of a client-side guard is
  not presence of a defect.

- **The correction cut the work roughly in half, and it was the cheap check.**
  Fork needs no client change at all; its second-press defect is #232 wearing a
  different hat. Only create needed anything. One probe removed a whole branch
  of planned work.

- **`agentSlots` read 3/3, so create could not be probed** — a create would be
  refused for capacity and prove nothing, and freeing a slot means archiving a
  real agent. So #231's remaining half is honestly *unknown*, and is written
  that way. The platform may dedupe create by name exactly as it dedupes fork.

- **The a11y claim in #228/#229 was false and I repeated it before checking.**
  "A disabled control is unreachable to a screen reader" conflates *not
  focusable* with *unreachable*: `disabled` leaves the tab order, not the
  accessibility tree. The accurate argument is narrower and rests on this
  codebase — `perform-button.tsx` has no live region, so the progressive label
  is announced only because the pressed control holds focus. There are 19
  `role="status"`/`role="alert"` regions in the product and none on the pending
  state. Corrected in both items and both issues.

- **Two agents overstated findings in the same sweep; both were checkable in a
  minute.** "grep aria-live returns 0" — there are 19 live regions, just none on
  the pending state. "The UI tells users the connection is read-only" — the
  sentence is wager-scoped and its operative claim is true. Filed both at the
  size they actually are. Agent findings are leads, not conclusions.

- **A key minted inside the server action would dedupe nothing**, and would
  typecheck, pass review, and look exactly like protection. It is a new key per
  press. Minted per *render* and carried as a hidden input, a resubmit sends the
  key it was rendered with. The guard mutation-tests precisely that swap,
  because it is the one an unaware refactor would make.

- **A quarter of the UI checklist governs zustand, shadcn and `cn()`** — none of
  which exist here — and its Tailwind item 3 mandates a spelling
  `controls.test.ts` rejects. #229 is not an isolated false line in a true
  document; it is one line in a partly-generated one. #233.

## 2026-08-14 — the secondary weight gets its treatment, and a question turns out to be a contradiction

**Did**: opened #227 and #228 (both were `github: none`), designed and
implemented **DT-0027** — the secondary weight's pending treatment — closing
#227. `system.json` to v3. Widened the perform guard to both weights and
retired its recorded exemption. Filed **#229** and **#230**. Re-surveyed the
seventeen manifests the round staled.

Three commits on `claude/secondary-treatment-variant-19160e`: `7cc042b` the
implementation, `bf3aed5` the re-survey (its own commit, because a manifest may
only be re-pinned against committed source — design-contract §8), `a191606` the
closure. Not pushed; no PR opened.

**State**: 0 active changes, 24 backlog open, 27/27 design tickets implemented,
`validate --all` 0 errors / 14 warnings. 2338 vitest across 180 files,
typecheck, lint, build, drizzle all clean. `agent-roster` is still the one
stale surface, deliberately, for the third round running.

**Next**: `/propose` for **#229**. It is the only p2 here that blocks nothing
and decides something, and both options are one line of code.

**Watch out**:

- **A question filed as "nobody has decided" had been decided, in writing, the
  other way.** #228 enumerated three arguments for whether a submit may disable
  itself and concluded it was open. `docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md`
  §State & Interaction 4 says *"Submit controls disable while in flight"* —
  binding, and `design-contract.md` §2 ranks it above any design ticket. It is
  not template boilerplate: the generator's template says the weaker
  *"Buttons prevent duplicate submits during async operations"*, an outcome
  single-use confirmation tokens already achieve. Someone narrowed it to a
  mechanism for this project. **Check the checklists before calling something
  undecided** — they are binding and nothing in the backlog cross-references
  them.

- **The first draft of DT-0027 asserted design had settled that, and it was
  wrong to.** It would have shipped a test locking in the status quo, hardening
  a checklist violation. Caught before implementation by reading the checklist
  the executor skill points at. The ticket now takes no position and the
  treatment reads correctly either way, so #229 costs nothing to decide later.
  A design ticket cannot win an argument against a checklist; it can only
  notice it is having one.

- **`track: lite` is how the contradiction survived.** The round that decided
  the non-disabling ran lite — proposer → executor — and lite runs neither the
  verifier nor the auditor, the two roles that read the UI checklist. Each edit
  was small, so the track was sized to the edits rather than to the fact that a
  UI-wide interaction rule was being set. **Size the track by what the change
  decides, not by how many lines it touches.**

- **`design_surface_incomplete_sources` has never matched anything.**
  `IMPORT_RE` matches only relative specifiers; this codebase has 23 relative
  imports and 337 `@/` alias ones, so `local_ui_imports` returns the empty set
  for essentially every surface and the guard is satisfied vacuously on the
  first run. Consequence: `perform-button.tsx` was in **no** manifest's
  `source_files` while fifteen surfaces render it, so changing it staled
  nothing. This round caught it only because it also touched `control.ts`,
  which is listed. Listed on all fifteen now; the vacuous check is #230. Same
  shape as #192 one layer up — the digest is sound, but only over files
  somebody remembered to list.

- **A design ticket can be wrong about the tokens it cites, and DT-0022 was.**
  `indicator_size: type.size.sm` (14px) shipped as stock `size-4` (16px), and
  `indicator_duration: motion.duration.normal` cannot be spent at all —
  Tailwind's `duration-*` sets *transition*-duration, and `animate-spin` is a
  1s stock animation. DT-0027 records both deviations rather than restating the
  claims. **A token reference in a ticket is a claim that the utility exists;
  this theme emits no spacing or fontSize scale.**

- **The obvious way to add a `weight` prop breaks `controls.test.ts`.** Its
  `WEARS_BUTTON` requires a button's className to read literally
  `className={BUTTON_X}` or a template interpolating exactly `${BUTTON_PRIMARY}`
  / `${BUTTON_SECONDARY}`. A hoisted variable, a ternary, or a lookup map all
  fail — the file that spends the treatment becomes an offender against the
  scan that catches buttons styled by hand. Two spelled-out `<button>` branches
  sharing one indicator and one label expression is the shape that passes.

- **A sibling component would have split two scanners.**
  `every-perform-says-it-is-working` matches `<PerformButton` by substring and
  `controls.test.ts` by a word boundary (backslash then b), so a
  `PerformButtonSecondary` would count toward one floor and vanish from the
  other. The prop avoids it, and keeps `aria-busy`
  in exactly one file — which is now an acceptance criterion.

- **The shell ate a backslash again, in the bullet above this one.** Writing
  that word boundary as the escape itself, through a heredoc'd Python string,
  delivered a literal backspace byte to the file — the identical incident the
  previous handoff recorded, reproduced while documenting it. Spelling it in
  words is not a stylistic choice; it is the only form that survives. **Read
  back what a shell wrote, in bytes**: the file carried one 0x08 and rendered
  as an empty pair of backticks, which reads as a typo rather than as a failure.
  Exit code 0 both times.

- **The widened guard was verified by mutation, and so was the new test.** A
  bare secondary submit inside a `<form action>` is caught; GET-form previews
  and the thirteen cancel *anchors* nested inside action forms are not. Both
  exemptions are read off the elements, so neither can rot into an allowlist.
  Two mutations on the component (wrong indicator colour, secondary branch made
  unreachable) each failed the tests that name them.

## 2026-08-13 (handoff) — the backlog re-verified, five items closed, and a lesson that left the test suite

**Did**: eleven PRs merged (#215, #217-#225). Closed #91, #153, #182, #183,
#194, #200; opened #216. Shipped: the stoppage summary reads around a refusal,
the harness can see a key collision, a remedy is a target not a sentence, every
perform submit says it is working, and a full design round — system.json v2 plus
DT-0022-DT-0026. Rewrote HANDOFF.md, which was 14 merged PRs stale. Filed
`a-secondary-perform-cannot-say-it-is-working` and
`may-a-submit-disable-itself-while-it-is-in-flight`, both `github: none`.

**State**: 0 active changes, 21 backlog open, 26/26 design tickets implemented,
`validate --all` 0 errors / 14 warnings. 2328 vitest + 90 db, typecheck, lint,
build all clean. Two warnings are deliberate and explained in DT-0022; one
(`agent-roster` stale) predates this session and was left rather than re-pinned
against source nobody read.

**Next**: `/design` a secondary variant of the pending treatment. It unblocks
`a-secondary-perform-cannot-say-it-is-working` and should settle
`may-a-submit-disable-itself-while-it-is-in-flight` in the same round.

**Watch out**:

- **The backlog's defects were real; its counts were not.** 15 false sentences
  across 15 items, every one a quantifier — "the only", "every", "nothing else".
  Three items contradicted themselves inside their own file. Re-derive a number
  before building on it; the premise is usually sound.
- **Five of nine items examined needed no code.** #200 closed as real-but-inert,
  #204 was wrong about the product in *both* directions. Read the item against
  the code before scheduling the work.
- **The shell layer eats backslashes and backticks.** Four incidents: a comment
  lost `PerformButton` to command substitution; a word-boundary escape (backslash
  then b) in a shell-passed Python string arrived as a literal backspace byte, so
  an anchor silently failed to match; a commit message lost two words; and **this
  very bullet lost its backslash the first time it was written**, which is why
  the escape is spelled out in words here. Exit
  code 0 is identical for "replaced nothing". Use the Edit tool for source, and
  read back anything written through a shell.
- **A guard that breaks on a refactor: suspect its measure, not its threshold.**
  `controls.test.ts` fell from 20 to 13 because fourteen wearers moved behind one
  component. Lowering the floor would have permanently weakened it; the scanner
  was taught to count `<PerformButton>` and the fix verified by mutation.
- **A design round can only ticket what the manifest models as a unit.** The
  deploy chooser row was skipped by three tickets because it was prose inside
  another component's description. `validate` refuses a component id that appears
  in no source file — that is the check, and the fix is to name the thing in code.
- **`useFormStatus` is unreachable from any server render.** `renderToStaticMarkup`
  reports `pending=false`, so swapping the walker for a real renderer would have
  cost 36 files and still never reached the state. Mock the hook; it is the only
  route short of a browser. Pinned by a test that fails if React ever changes.

## 2026-08-13 (late) — #183 closed, and the row that could not be ticketed gets a name

**Did**: surveyed the deploy chooser row, wrote and implemented DT-0026, closed
**#183**. Filed the secondary-pending gap that #153 left behind.

**The chooser row could not be ticketed because it had no name.** Not a scoping
failure — a modelling one. `perform-deploy` was a component in the manifest and
got DT-0016; the chooser row existed only as a sentence inside
`button-secondary`'s description, so no ticket could name it and no round could
see it. Adding it to the manifest failed `validate` immediately with
`design_component_not_found`, which was the tool saying the same thing: a
component id that appears in no source file is a ticket aimed at nothing.

So the page now carries the id in a comment. That is the actual fix — the row is
addressable, and the check that refused it is the one that would have caught the
omission a month ago.

**I corrected my own over-reach from the previous re-survey.** I had added
`disabled` to `button-primary`'s states on seventeen surfaces, on the surveyor's
rule that a state which exists but is unhandled should be listed. But nothing in
the product *enters* `disabled` — so declaring it per-surface is the same fiction
DT-0003 refused for the ghost and danger variants. Removed. `system.json`
declares the primitive state and DT-0022 styles it; that is where it belongs.

**One warning pair is left standing deliberately.** `loading` is genuinely
reachable on surfaces whose tickets predate it, so `validate` reports DT-0003 and
DT-0004 as not covering it. A ticket carries one surface and this is a shared
primitive, so the honest options were two advisory warnings or under-reporting a
state those buttons really reach. Recorded the reasoning in DT-0022 rather than
silencing either.

**Filed**: `a-secondary-perform-cannot-say-it-is-working` (p3). `/pending/[id]`'s
Decline mutates, has no undo, and still gives no sign it is working — it wears
the secondary weight and `PerformButton` wears primary. It needs a secondary
variant of the pending treatment. Filed as its own item because it was living
only in a closed item's body and a test comment, which is not a place work gets
found.

**Gates**: typecheck, lint, 2328 tests / 179 files, build.

## 2026-08-13 (late) — #153 closed, and a guard taught rather than lowered

**Did**: rolled `PerformButton` across every perform submit. **#153 closed.**

Fourteen submits, thirteen files, each with its own progressive label — a
generic "Working…" would be one wording for fourteen consequences, and the label
is what a screen reader announces.

**The guard matters more than the sweep.**
`tests/architecture/every-perform-says-it-is-working.test.ts` fails if a submit
inside a `<form action>` is a bare button. This item existed because eleven
manifests recorded the same omission in the same words, which is what happens
when a convention lives only in prose.

**One submit is deliberately uncovered, and it is a gap rather than a rule.**
`/pending/[id]`'s "Decline — this closes the proposal permanently" mutates and
still says nothing. It wears `BUTTON_SECONDARY`; `PerformButton` wears primary,
and promoting a deliberately secondary control to the page's main weight is a
visual decision this lane does not make. It needs a secondary variant of the
pending treatment, which needs a ticket. The guard's regex is scoped to
`BUTTON_PRIMARY` and says so in its own comment, rather than being drawn
narrowly enough to look like the rule was always this shape.

**An architecture guard broke, and lowering it would have been the easy wrong
answer.** `controls.test.ts` counts how widely `BUTTON_PRIMARY` is worn, as an
anti-vacuity floor: 20 buttons, 8 files. The sweep moved fourteen wearers behind
one component, so the count fell to 13 and the file count to **zero**.

The numbers were not relaxed. The scanner now counts `<PerformButton>` as a
wearer — because it is one, spending the constant in its own file — and the
"widely worn" check measures the component instead of the constant. Verified by
mutation: stripping `BUTTON_PRIMARY` out of `perform-button.tsx` still fails it.
A refactor that removed nothing would otherwise have permanently weakened a
check written to catch a scanner that stopped matching.

**Two escaping mishaps, same family, both caught by reading rather than by
trusting an exit code.** A word-boundary escape (backslash then b) in a shell-passed Python string arrived as a
backspace character, so an anchor silently failed to match; earlier the same
layer command-substituted a backtick out of a comment. The fix both times was to
stop routing source edits through the shell — the Edit tool has no such layer.
Worth remembering: exit code 0 from a script that "found nothing to replace" is
indistinguishable from success.

**Gates**: typecheck, lint, 2328 tests / 179 files, build.

**Owed**: the re-survey, again — this staled the manifests. Running it next
against committed source.

## 2026-08-13 (late) — the round implemented: four tickets, and the rollout cost showed up on schedule

**Did**: implemented DT-0022, DT-0023, DT-0024, DT-0025.

**#153's silence is broken, on one surface, deliberately.** `PerformButton` is
the product's second client component and earns it the way `SectionNav` does:
`useFormStatus` is the only way a form can know it is submitting, and the fact is
genuinely client-side. Wired on DT-0022's declared surface only — the other
eleven each need their own progressive label, which is per-surface work and
#153's, not a mechanical sweep.

**The trigger was refused, on purpose.** The button does not disable itself while
pending. DT-0022 defined the look and declined to say when a control enters it,
because entering `disabled` removes an affordance and confirmation tokens are
single-use with `consume` as the single atomic spender — what a second press does
today is a decided behaviour. A test asserts no `disabled` prop appears, and says
in its own comment that a change breaking it needs a spec change rather than a
fix.

**The predicted rollout cost arrived immediately.** Adding the client component
turned `pages-name-their-entity.test.ts` red — a file that never mentions forms,
failing with a React internals message. Per-file mocks would have been N places
to forget, so the mock is registered once in `tests/setup/form-status.ts` via
`setupFiles`. That is the same argument `control.ts` makes for one constant over
seven copies.

**Two of my own mistakes, both caught by running things rather than reasoning.**
A `python3 -c` inside double quotes let bash command-substitute a backtick, so
`vitest.config.ts` shipped a comment reading "// is a client component" — found
by reading the file back rather than trusting the exit code. And the first
`classNames` walker never called components, so it reported zero classes for a
page whose whole body is one; it failed loudly instead of passing empty, which is
the only reason it was cheap.

**One assertion was fragile and got replaced rather than tuned.** `rendered()`
joins every text node with a space, so `{'Deploy '}{name}` arrives as
'Deploy  Vanguard' and any assertion spanning an interpolation boundary counts
spaces rather than testing the feature. Asserting on the single token
'Deploying' is the robust signal.

**Two mutations, two kills**: no label swap kills the pending test; no leading
edge kills the DT-0023 test.

**Gates**: typecheck, lint, 2325 tests / 178 files, build, validate 0 errors.

**Owed, and it is this round's last task rather than the next round's
surprise**: the re-survey. These edits stale the manifests they were written
against — 30 warnings where there were 14 — which is design-contract §8 working.
Running it next, against committed source rather than the working tree.

## 2026-08-13 (late) — the harness decision, which turned out to be "change nothing"

**Did**: settled how the rendering harness should meet a client component. It
should not. #153's first blocker is gone; its second is unchanged.

**The question was framed wrong, and measuring it inverted the answer.** #153 was
priced for teaching the walker to render — `react-dom/server` or a testing
library — across 36 test files, because `useFormStatus()` needs a client
component and the walker throws on one:

    THREW: Cannot read properties of null (reading 'useHostTransitionStatus')

Two probes settled it. First, mocking the hook at its module boundary — the move
this suite already makes for `@/presentation/session.js` — lets the existing
walker call the component and reach **both** states, idle and pending. Second,
and this is the one that matters:

    renderToStaticMarkup(<form><Probe /></form>)
    -> '<form><span>pending=false</span></form>'

**A real server render reports `pending=false`.** `useFormStatus` is a client
runtime state; it becomes true after hydration, when a submission is in flight.
So the migration would have cost 36 files and still rendered exactly one of the
two states — never the one worth asserting.

That turns mocking from a shortcut into the only route. Short of driving a
browser, there is no other way to reach a pending form.

**Pinned rather than argued.** The SSR fact is a test, taking the real hook past
this file's own mock with `importActual`, so if React ever lets a server render
report a pending form it fails and says the mock has stopped being necessary.
That is the shape this repository keeps reaching for: a guard that fails when
its premise stops being true, rather than a comment that quietly goes stale.

**Caught myself writing the exact defect this session keeps finding.** The first
version of that test rendered a component returning the literal string
`pending=false is what SSR reports` and asserted the string was present. It
would have passed forever without calling React at all. Rewritten to read
`actual.useFormStatus().pending`.

**Two mutations, two kills**: `setPending` a no-op kills the pending assertion;
`resetPending` a no-op kills the idle-again assertion, which is the one that
stops module state leaking into a neighbouring file.

**What still blocks #153**: only the treatment. `system.json` declares the
button's states as names — `[default, hover, active, focused, disabled,
loading]` — and says nothing about what they look like. Implementing them means
choosing a look the design agent owns. So the ordering is #183's design round,
then the implementation, which is no longer the hard part: the double exists,
both states are assertable, and the twelve surfaces share one server-action
shape.

**Gates**: typecheck, lint, 2318 tests / 177 files.

## 2026-08-13 (late) — a remedy is a target, and the blocker was already solved

**Did**: shipped `a-remedy-is-a-target-not-a-sentence`. Closed #182.

`AuthorityLost` stated the remedy in prose and offered nothing to click, while
`NotConnected` — the same question one step earlier — renders an anchor, because
DT-0006 ruled a remedy is a target rather than a sentence. The newer surface was
the weaker one, reached at the worse moment.

**The component was not missing a link; it argued against one, and the argument
was correct.** Linking to `/connect` is right on a delegated deployment and
lands a personal one on "there is nothing to connect" — which is what
*A Remedy Named Must Exist In That Deployment* forbids. With no way to tell the
deployments apart, refusing to link was the only honest option it had.

**What unblocked it was an existing decision nobody had wired through.**
`composition.ts` already fixes the remedy once, under the comment *"Fixed here so
that no failure path has to work it out"* — and then hands it only to the MCP
adapter. Exposing it on `App` was the whole change. The expression **moved**
rather than being copied, so "which deployment is this" still has one answer;
copying it would have recreated the defect the original comment was written to
prevent.

Rejected two alternatives on the same principle: carrying it on
`ConnectionRevokedError` (which discards the `Remedy` it is built with) or on the
URL beside `authority=`. Both put a deployment-scoped fact somewhere per-failure.

**The fake hid the branch, and nearly hid it from me.** The first run after
wiring the component showed 9/9 green — because `actingWith` supplied no
`remedy`, so `remedy === 'reconnect'` was false and the link never rendered.
Vacuously green in exactly the way this repository keeps catching. The fake now
carries it, defaulting to `reconnect`, and the personal branch is selectable.

**Two mutations, six kills.** Link unconditionally → the three "offers no
control" tests fail. Never link → the three "offers the remedy" tests fail.
Asserted on `links` rather than `text` throughout, because a label without an
href reads identically.

**Corrected in passing**: #182 quoted the delegated remedy as *"Connect your
account again"*, which is a test fixture. The sentence a user reads is
*"Reconnect to continue."* The item's argument was unaffected.

**Gates**: typecheck, lint, 2314 tests / 176 files, build. Archived: 1
requirement modified.

**Still owed on this surface**: `AuthorityLost` has never been designed and its
danger treatment is byte-identical to `CarriedProblem`'s, which says something
different (#183). This change reused `BUTTON_SECONDARY` and introduced no new
treatment, so it does not prejudge that round.

**And four manifests are now stale, which is the documented consequence of a UI
change and not a surprise**: `agent-deploy-confirm`, `agent-rebind-confirm`,
`agent-undeploy-confirm` and `strategy-rule-editor` all pin
`authority-lost.tsx`. The flow in `CLAUDE.md` is `executor -> /surface ->
/design`, so the survey is owed before #183's round designs against them.
Deliberately not run here: #183 must survey this surface anyway, and surveying
twice for one change is the churn [[a-design-round-stales-the-manifests-it-designed-against]]
already describes. Flagged rather than left silent — `validate` reports them,
and whoever opens #183 should start with the survey.

## 2026-08-13 (late) — two items settled without code, because neither needed any

**#200 closed.** `createAgent` does drop `slotUsage`, and nothing is worse for
it. The only surface rendering a slot count is `CreateAffordance`, fed by
`app/(app)/agents/page.tsx:14` which calls `listAgents` in the page body on a
dynamic route, and create redirects to `/agents/{id}`, which renders no slot
count at all. There is no moment at which anyone sees a count one short.

Capturing the field would add a value nothing reads, to close a p3 with no
symptom — in a repository that has an open item about payloads carrying more
than anything reads. The item's other reason (a create is when you most want to
know your remaining slots) is a **feature** with a delta spec, not this defect,
and nobody has asked for it.

Its claim to be "the only agent write that carries a second key" was also wrong:
`update_intelligence_agent` declares `feasibilityAdvisory` in the v18.2.0
contract, and `updateAgent` drops that too. The wire walk saw `{agent}` from
update and the claim was checked against the observation rather than the
declared contract — #198's lesson, again.

**#204 narrowed to what it actually is: an upstream report.** The platform half
stands — every invalid refresh token gets 500 `server_error`, never
`400 invalid_grant`, against RFC 6749 §5.2.

The product half was wrong **in both directions**, which is unusual enough to
record. The sole caller of `refresh()` catches everything and throws
`ConnectionRevokedError('reconnect')`, so the mapping the item calls wrong is
not in force. And `ConnectionRevokedError` deletes nothing —
`current-user.query.ts:67` turns it into `notConnected()`, the stored connection
row is untouched, and the next request retries the refresh. **The behaviour is
self-healing.** So neither "the user waits for a recovery that cannot come" nor
the feared alternative "tears down a healthy connection" happens.

What is left is cosmetic: during an outage a user is told to reconnect when
waiting would have done. That is a wording problem on the authority surface —
#182 — and belongs there, not in a second mapping here.

**Worth noting about the session's arithmetic**: three of the five items I
picked as "cheapest to build" needed no build at all. The cost was in reading
them properly, not in fixing them. That is a better outcome than three small
changes, and it is only visible because the re-verification happened first.

**Next**: the pending-state cluster — #153 (no surface gives any sign it is
working between click and redirect, across eleven forms), #182 (the authority
page names a remedy and offers no target), #183 (two confirmation row shapes and
an undesigned page).

## 2026-08-13 (late) — the harness can see a key collision, and #194's conclusion was wrong

**Did**: shipped `the-harness-can-see-a-key-collision`. Closed #194, narrowed
#167 to its second finding.

**The item's premise held and its conclusion did not.** #194 was right that no
test here could observe a React key collision, and right that a collision only
*takes effect* during reconciliation. From that it inferred the fix needed a
real DOM, and its first step contemplated a renderer migration across 35
consumer files. That is why it sat at p3.

The inference confused the *effect* with the *key*. A React element is
`{$$typeof, type, key, ref, props}` — the key is a property of the object
`expand` already visited; it destructured `type` and `props` off it and never
read `key`. React reconciles siblings within one array, which is exactly where
`expand` already iterated. The whole fix is a `Set` in that loop.

**The proof is the mutation.** Reverting the real fix on the conditions-save
page — `key={i}` back to `key={key}`, the change that shipped in
`what-the-page-shows-is-what-happens` with nothing able to hold it — now fails:

    AssertionError: expected [ '(an entry with no key)' ] to deeply equal []

That is the test #194 says could not be written. It exists.

**Four mutations, four kills.** Collector never records → 4 harness tests fail.
Null keys folded under one pseudo-key → exactly the false-positive guard fails.
Component drops the gap → the two page tests fail. Plus the keying revert above.

**Design decisions worth keeping.** `duplicateKeys` is *reported, never
asserted globally* — a blanket assertion across 35 files is a different change
with a much larger blast radius and should be argued separately. Key-less
siblings are skipped rather than folded together: most elements are not in
arrays and carry no key, so folding `null` would report a collision on nearly
every page, and a loud wrong answer is worse than the quiet blind spot it
replaced. `expand`'s four positional collectors became one object, because a
fifth threaded through eight recursive calls is how the sixth gets skipped in
one branch and silently under-reports.

**`tsc` caught what 2,305 tests did not.** Spreading the nullable
`strategies.detail` widened every property to optional; vitest does not
typecheck, so the suite was green while the file did not compile. Worth
remembering next time the suite is offered as evidence.

**Still uncovered, and now recorded in `render.ts` rather than in the backlog**:
what reconciliation *does* — that two collided rows become one, and which
survives. Collisions are visible; their outcome is not.

**Gates**: typecheck, lint, 2305 tests / 176 files, build.

**Next**: #200 (create returns a slot count nothing reads) and #204 (refresh
rejection), then the pending-state cluster #153 + #182 + #183.

## 2026-08-13 (late) — five questions measured, one answered, and none closed

**Did**: recorded today's live measurements into the five backlog items whose
open questions they bear on, and archived
`the-stoppage-summary-reads-around-a-refusal` (merged as #215).

**I said this batch would close about a fifth of the board. It closed nothing,
and that was the right outcome.** Reading the five items properly showed each
asks for an *observation* that still has not happened: #104's three payload
shapes need a session with players, #147's `verdict`/`decidedBy` need a
condition that requires something, #107 needs an open position to compare
against. A measurement that confirms a premise is not a measurement that
answers the question. Four got sharper; one got a real answer.

**#205 — half the question is now definitively answered.** An exhaustive walk of
every output schema across all 114 tools, matching wager / signer / consent /
daily-cap field names, returns exactly two tools:
`get_account_state.mcpWagerEnabled` and `stats.totalWagered`, and
`get_agents_hub.summary.dailyLimit`. That last one sits beside
`messagesUsedToday` and `avgCostPerMessageUsd` — it is the **message** quota.
So **the daily wager cap (10/day, $500) is not readable over MCP at all**, and
`totalWagered` is lifetime rather than per-day so it cannot stand in. A limit
the platform enforces is invisible to its own API. `mcpWagerEnabled` is the only
signer-consent candidate that exists anywhere on the surface, which is stronger
than the item's "neither is obviously the switch" — and still unproven. Also
corrected: the product *does* model the account toggle
(`read-wager-authority.query.ts:24`), so "we do not model" was half stale.

**#146 — the headline reversed, and then my own reading of it was wrong twice.**

Measured: 102 blocks/hour across 874 rows on 2026-08-12. `total` 5,496 with row
126 at `09:11:05` means **exactly 125 blocks are newer than that** — arithmetic
on total and row position, not a rate extrapolation.

I first read that as "the churn stopped, because the account holds no open
position and the code is `OPEN_POSITION_CONFLICT`". The audit pass caught that
this was inference wearing the clothes of measurement. Then the series in #100
(`5437 → 5483`) showed blocks still accruing, so I measured it directly instead
of arguing about it:

    13:30 UTC   total 5496
    13:46 UTC   total 5497

**One block in sixteen minutes — 3.75/hour, now.** Within 4% of the ~3.6/hour the
125-in-35-hours arithmetic gives, from a completely independent method. The churn
did not stop; it fell about 27x and is still running.

That also **falsifies one of the item's own three candidate causes**: a halted,
archived or undeployed agent writes no blocks at all, so "the agent stopped
evaluating" is out. What it cannot settle is which reason is stopping it now —
the new rows land at the head, and the head is exactly what `list_gate_blocks`
refuses. Second time on this item that the answer sits behind #100.

**The audit stage earned its cost.** Five recording agents, five auditors. The
auditors corrected the churn item ("do not decay" → "the rate has fallen", a
settled-fact claim the item's own judgement section held open) and the market-grid
item twice — a cancellation *cause* asserted from a cancellation *count*, and
`playersNeeded` below `minimumPlayers` glossed as "reached the five-player
minimum" when it means at least one player, not five. Both errors were the same
species this session keeps finding: inference stated as measurement.

**Archived**: `the-stoppage-summary-reads-around-a-refusal` — 2 requirements
added, 1 modified, merged into `openspec/specs/agent-understanding/spec.md`.

**Next**: the render-harness cluster. #194 says no test here can observe a React
key collision because the harness never reconciles — true of the harness, but the
conclusion that it *needs* reconciliation is wrong. `expand()` walks the element
objects and React elements carry `.key` directly; collecting keys per sibling
group in the array branch (`render.ts:71`) observes the collision without a
renderer, at the same bar the file's own doc comment sets for `links`. That makes
#194 + #167 much cheaper than filed.

## 2026-08-13 (evening) — the backlog re-verified, and three of my own claims overturned

**Why**: the operator's read was that "a lot of these issues might be wrong or
not true". Partly right, and wrong about which ones. **No open item is wholly
false.** Every core defect survived checking. What had rotted was the decoration:
15 false sentences and 15 stale ones across 15 items, and every false one is a
**quantifier** — "the only", "every", "nothing else", "and nothing more". The
defects were real; the counts around them were never re-derived.

Three items contradict themselves inside their own file. #116 says "nothing but
the six is left" on line 27 and "`get_order_status`, which nothing calls" on line
68 — and it descopes it explicitly on line 69, which is why that falsification
was **overturned** rather than applied.

**Corrections that stuck.** #202 had four wrong sentences of eleven and now has
none: `haltedAt` is read (`read-budget.query.ts:53`), the product already draws a
chart (`TradeChartSvg`, `trade-story.tsx:98`), and `/limits` renders the stop and
the drawdown. Its case narrows to `realizedPnlUsd` and `pnlCurveUsd` rather than
closing. #116 was left exactly as written.

**Three of my own claims were wrong, all the same defect — measuring something
adjacent to the claim.**

1. The delta spec I wrote said "every agent on the operator's account" reported
   `unreadable`. It was **3 of 15**. A grep filter had hidden the readable rows.
   The measured split is stronger than the overstatement: all three **active**
   agents dark, three archived ones served whole — because the refusals track the
   newest rows, so an agent still writing history is the one that goes blind.
2. #201's "uncheckable" verdict came from guessing `includeArchived: true`. The
   product passes `statuses: ['ACTIVE','ARCHIVED']` (`agent-adapter.ts`). Reading
   the adapter instead of guessing turned 3 agents into 15.
3. Then I wrote that nine probe agents had accumulated and "eight creates have
   happened since, none reused it". **False.** The epoch stamps in the names
   decode to **2026-07-29** — a week before the reuse fixture existed and two
   weeks before the item was filed. And the eight are byte-identical to the eight
   `probes-have-littered-the-second-account` recorded and closed on 2026-08-06.
   `get_account_state` answers `username: "Fibonacci"` — **the second account**.
   There is no seventeen. There are nine on one account, eight of them already
   filed and closed, and the rate of recurrence is **one**, by a hand walk no
   fixture can reach.

**Shipped**: `the-stoppage-summary-reads-around-a-refusal`. `readGateBlocks`
keeps one call as the happy path and pages in 25-row windows only when the
platform refuses, bounded at eight. The result carries `refused`, and the summary
carries `windowEndsAt` — computed by comparison, not by taking the head of the
array, because the fold already learned that lesson once.

**Live, against the account that was dark this morning:**

```
Vanguard:     unreadable                     (every window refuses — correct)
Undertow:     75 read of 5494 — 5 windows refused, window ends 2026-08-12T09:01
Breakwater:   100 read of 634 — 3 windows refused, window ends 2026-08-12T04:46
THE .0:       100 read of 297  (served whole)
Volatilis:    100 read of 970  (served whole)
Quadratorum:   27 read of 27   (served whole)
```

`served whole` is the load-bearing half: the fallback stays off when the platform
answers, so it retires itself when #100 is fixed. And Undertow's window ends
**over a day ago** — which is exactly why R2 requires the end to be stated. "75x
OPEN_POSITION_CONFLICT" without it reads as current on a surface that answers
*what is stopping this agent now*.

**Four mutations, four kills.** Swallow the refusal → 2 adapter tests fail. Page
unconditionally → "costs exactly one call" fails. Drop the gap paragraph → 2
rendering tests fail. Present the count as a total → 1 fails. Worth recording
that mutation 1 did *not* fail the rendering tests: those inject `refused`
directly, so an adapter defect is not theirs to catch. Layering, not a gap.

**Filed**: `the-build-never-checks-nexts-generated-route-types` (p2, no issue
yet). `tsconfig` excludes `.next`, which is where `next build` writes the route
types it then type-checks — so the check is generated on every build and run on
none. Six pages fail it. Found only because a `next start` server was running and
building into a distDir outside `.next` exposed it. Whether the six are real
defects is unknown, and that is the point: the gate never asked.

**Gates**: typecheck, lint, 2295 tests / 175 files, 90 db tests, build, live
stoppages probe. All green.

**Next**: open the issue for the build-gate item; decide whether `mcpWagerEnabled`
is the Profile signer toggle (#205's open question).

## 2026-08-13 (Tier 0) — a read-only sweep, three false findings caught, and one claim overturned

**Did**: Swept the blocked backlog against the live platform. Read-only —
`BATTLEGRID_LIVE_WRITES` unset, no mutating tool named anywhere in the probes.

**#207 closed.** All three failing probes pass, unchanged code, same account:
`own-evaluation-probe` (Vanguard, 5 evaluations; AVAX 84 consulted, 20 fired,
cost reported), `simulate-probe`, `evaluation-probe` (Market Predator, 10 listed).
Transient. **Both hypotheses the item carried are falsified** — the account has
evaluations in quantity (`total` 143 / 27 / 80) and the public field is populated
(38 entries). Closed on "the suite is green and the cause is unknown" rather than
on an invented third hypothesis.

**#100 overturned in part.** Its central claim — *"the boundary is clean: every
row above it fails, every row below it reads"* — is **false**. Row 287 fails on
its own, three reads out of three, 190 rows below the head, with rows 286 and 288
serving normally either side. That also explains the `limit: 50` behaviour: a
page fails if it *contains* a poisoned row. The head is real and contiguous
(12 of 12 sampled in rows 1–56 fail) and **it grew** — row 56 was `09:29:04` and
readable yesterday; that row is now ~102 and inside the failing set. The upstream
report changes from "a recent window is unreachable" to "specific rows are
unreadable, densely at the head and scattered below".

**#146 is observable, and measured.** Rows 151–250, a 2h01m window: **100
blocks, all `OPEN_POSITION_CONFLICT` at `gateStage: TOKEN`, 86 of them HYPE.**
~50/hr against the ~90/hr recorded. One reason code and one gate stage across the
whole window is itself the finding.

**State**: on `chore/tier-zero-observations`, not pushed. No code changed — three
backlog items updated, one closed. 0 active changes, 0 validation errors.

**Next**: push and PR the observations. #146 now has data and could be modelled;
#100 is reportable upstream in much sharper terms.

**Watch out**:

- **Three of this sweep's first findings were my own parsing errors.** The
  payload key is **`entries`** — not `logs`, not `blocks`, not `agents`. Reading
  the wrong key produced "zero rows", "empty pages" and "the field is empty", and
  every one of them would have been filed upstream as a platform fact. Print the
  payload's keys before concluding anything about what a tool returned.
- **`get_signal_log` requires `agentId` *and* `logId`.** Passing `logId` alone
  returns an argument-validation error that reads like a platform fault. Check
  `required` in `docs/battlegrid-mcp-capabilities.json` first.
- **A probe that reads a live rate-limited account must stay serial.**
  `vitest.live.config.ts` pins `fileParallelism: false` because a concurrent
  sweep once produced nine phantom failures that a serial re-run collapsed to
  two. The same applies to any agent fan-out over this platform.
- **A "blocked" item is often only blocked on someone looking.** Of the eleven in
  Tier 0, this sweep moved three in an afternoon and none of them needed a write.


## 2026-08-13 (harness and radar) — two guards fixed, and a scope changed on contact with the payload

**Did**: Three changes archived after the OAuth round.

**`the-tools-write-lf-everywhere`** (#209). `openspec.py` pinned `encoding` and
not `newline`, so both of the day's archives wrote CRLF specs — 799 and 449
carriage returns, the first committed that way. The sweep found **six more**
writers with the same defect, three of which pinned no `encoding` either (#186's
bug, still sitting in four other files). `tests/architecture/tools-write-lf.test.ts`
holds it, **derived from the source rather than from output**: git normalises on
commit, so a check reading committed artifacts passes everywhere and proves
nothing. Proven end to end — archiving that change wrote its own merged spec
with LF, and every archive since has stayed LF.

**`a-live-grant-is-not-disposable-data`** (#208). `test:db` truncated a database
holding a live delegated connection **twice in one session**, stranding two
grants at BattleGrid with their only tokens destroyed. Re-priced p3 → p2 on that
evidence: the item had recommended "a sentence, not a mechanism", and the
sentence existed and did not stop the second occurrence. `global-setup.ts` now
refuses the run outright. Both orphaned grants were withdrawn by the operator.

**`the-radar-says-what-is-stopping-it`** (#135). The item asks for *blocked*
telemetry; observing the payload said **do not build it** — `blockedReason` is
null on all twenty rows across two major versions and no blocked deployment has
ever existed. What the observation found instead: `resolvesNow` carries **22
fields and the adapter read 2**. Fifteen of twenty deployments were not
qualifying, each with the platform's own token, and every one rendered as
ordinary. One was sitting out an invisible cooldown. Built the observed half;
carried `section` as the platform's **string** rather than a modelled union, so
`BLOCKED` will render as an unrecognised state the day it first appears without
anyone having modelled it. Live: **20 of 20 deployments now say something they
did not before**.

**State**: PRs #210, #211, #212 merged; **#213 open**. Gates: `typecheck`,
`lint`, **2281** vitest (174 files), **255** Python harness, `build`, drizzle
clean, **90** db tests. 0 active changes, 25 open backlog items, 0 validation
errors.

**Next**: merge #213. Then **#207** is the only item this session opened and left
open — one read of `list_signal_logs` settles it.

**Watch out**:

- **`path.write_text(text, encoding="utf-8")` translates newlines on Windows.**
  Pinning `encoding` and not `newline` looks careful and is not. Fixing it broke
  all five Python tools first, because the replacement's escape survived one
  decoding layer and not two — 255 harness tests went to 151 errors. Edit the
  exact bytes rather than scripting a replacement through a shell.
- **`tests/architecture/boundaries.test.ts` refuses `Date.now()` in a
  component**, and it is right: measure the age in the read against the injected
  clock and let the surface word it. Threading a `Clock` into
  `ReadDeploymentsQuery` was most of the radar change's diff.
- **A schema is not an observation.** `blockedReason` has been declared for two
  major versions and populated never. Carrying the platform's string instead of
  modelling a union is how an unseen state arrives honestly.
- **The archiver's LF fix held** on its first archive after landing — checked
  rather than assumed, because that is how it was found in the first place.


## 2026-08-13 (records) — two guards that compared the wrong thing

**Did**: Built and archived `the-two-records-describe-one-server` (#198).
`docs/battlegrid-mcp-capabilities.json` sat at v17.2.0 while the surface record
said v18.2.0 — a major version apart, hiding **188 output-schema leaves across
11 tools**, including a whole `protection` block the platform now publishes per
position.

**Two guards should have caught it and both read the wrong field.**
`tests/architecture/surface-freshness.test.ts` already compared the surface
record to the *vocabulary* record, with the reasoning written out — and
hard-coded that pair, so a third record was never covered.
`refresh_declared` refused only on differing tool *sets*, and v18 added no
tools: the count held at 114, none added, none removed, and it derived a v18
artifact's declared fields from a v17.2.0 dump while both files agreed perfectly
about which tools existed. A guard written against *"a count that has not moved
proves nothing"* concluded currency from a matching set of names.

Now: a **derived** sweep over every `docs/*.json` that declares a server, reading
either `server` or `serverInfo`; `refresh_declared` compares versions before
deriving; and the spec's tool-identity rule widened from "the number of tools
agreeing with the live server" to any tool-identity comparison against anything.
`CLAUDE.md` and `HANDOFF.md` now say what *"nothing a count could see moved"* was
scoped to — **inputs** — and that outputs grew unseen.

**The verifier earned its place.** It caught that the new sweep's own failure
path had no permanent test — proven only by a mutation run by hand and reverted,
which is the same defect one layer up, in the fix for it. `records()` now takes a
directory and four tests drive the refusal against synthetic fixtures, including
**identical tool sets at different versions**.

Also filed **#209**: the archiver writes CRLF specs on Windows
(`openspec.py:1685`, `newline=` absent), against this repository's own
`.gitattributes`. Both of today's archives did it; the first was committed that
way.

**State**: commits `1536477` + this one, on `claude/handout-board-command-f3dc98`,
**not pushed**. Gates: typecheck, lint, **2264** vitest (172 files), **255**
Python harness, build, drizzle clean, **85** db tests. 0 active changes, 27 open
backlog items, 0 validation errors.

**Next**: push and open the PR for the day's work — five commits before this one.

**Watch out**:

- **`path.write_text(text, encoding='utf-8')` translates newlines on Windows.**
  Pinning `encoding` and not `newline` is the trap, and it looks careful. #209.
- **A guard that compares *names* is not comparing *generations*.** The tool set
  agreeing proves nothing, exactly as the tool count proves nothing — the same
  lesson the repo already had, scoped one case too narrowly.
- **`battlegrid-mcp-capabilities.json` has no `probed_at`.** It is a faithful MCP
  handshake dump, so it can say which server answered but not when. Left that
  way on purpose: its value is being unedited.
- **The `protection` / `breakEvenGeometry` block is declared and unobserved** —
  `liveOverlay` is null unless a position is open. #198's own instruction stands:
  do not model it from the declaration. One read while a position is open settles
  four fields that are currently four guesses.


## 2026-08-13 (the walk) — the delegated path completes, and the gate catches what nobody predicted

**Did**: Built and archived `the-connection-asks-who-it-is` (full track, 22
tasks, gate **PASS**). BattleGrid is plain OAuth 2.1 and sends no `sub`;
`tokenRequest` required one, so **no delegated connection had ever completed**
(#203). Identity now comes from an authenticated read made with the newly granted
authority. `TokenGrant.subject` removed rather than made optional. A connection
that cannot be named is refused, stores nothing, and **releases the grant it was
just given** — with a distinct outcome, and honestly hedged copy, when the
release also fails. `AccountPort.subjectFor` reports its cause instead of
flattening to null; `OwnerOnlyUser` collapses it at its own call site, so
personal mode is unchanged.

**The walk found a second defect and it was ours.** The first two live
authorizations refused with `?error=unidentified` — and the identity read had
never reached BattleGrid. Zero audit rows, and `callTool` audits *before* it
attempts. `callTool` measures authority against the caller's **stored
connection**; this read runs before one exists, so the lookup answered "no
authority at all" and the guard refused a call whose grant held exactly the scope
it wanted. Fixed with `ToolCallRequest.grantedScopes`, contained by
`tests/architecture/granted-scopes.test.ts`.

Then it worked: consent → exchange → identity read → session → `/agents` served.
`users.battlegrid_subject` = `0eccbf37-…`, the same account the personal key
resolves to; connection active, scopes `["mcp:read"]`, tokens encrypted.

Also filed **#206** (refresh reuses the stored subject and never re-asks) and
**#207** (three live probes can no longer find an evaluation — proven *not* caused
by this change, by reachability). Corrected the `config.ts` registration comment
against a committed file that had contradicted it all along.

**State**: commit `6545c2f`, 38 files, on `claude/handout-board-command-f3dc98`,
**not pushed**. All six quality gates green: typecheck, lint, **2257** vitest,
build, drizzle schema check, **85** db tests. 0 active changes, 29 open backlog
items, 0 validation errors. **A delegated connection is standing** in
`grid_commander_test` (subject `0eccbf37-…`), left deliberately at the operator's
request, with rotated tokens written back. An **earlier** connection was
truncated mid-session by `npm run test:db` during the re-audit (#208) — that
grant it created was live at BattleGrid and could not be revoked from here, its
tokens having gone with the row — **withdrawn by the operator 2026-08-13**,
along with a second one from the same cause.

**Next**: push and open the PR. **#91 is decided — keep** (2026-08-13):
Grid-Commander is a third-party multi-tenant client and the delegated path is
that capability; the case for deleting rested on it being code that could never
succeed, and the walk removed that case. **#206 is answered — the assumption holds**: a
delegated grant was refreshed and the account re-read with the refreshed token;
same subject, refresh token rotated, scopes preserved, and the refreshed grant
carries no identity field either — an independent re-confirmation that a token
response carries authority and not identity, on refresh as well as on exchange.

**Watch out**:

- **Truncating locally does not revoke upstream.** The walk's connection was
  truncated by `npm run test:db` during the re-audit — the tokens existed only as
  ciphertext in that row, so `DisconnectCommand` had nothing to work with. It
  happened twice; both grants were **withdrawn by the operator 2026-08-13**, and
  the registered public client was `b4cf1fcf-…`. **Closed by
  `a-live-grant-is-not-disposable-data`** (#208): the suite now refuses to run
  against a database holding an active connection, aborting before it touches a
  table. The guard prevents a third; it could not recover the two.
- **Never run `npm run build` while `npm run dev` is up.** They share `.next`,
  and the production build overwrites the dev server's chunk map — which then
  fails with `Cannot find module './5873.js'` on the first route it had not yet
  compiled. It cost a consent click. Silent until first use, which is the same
  shape as the scope-guard bug. `rm -rf .next` and restart; pre-warm a route with
  `curl` before spending a human's click on it.
- **`. ./.env` in Git Bash corrupts a value that starts with `/`.** MSYS path
  conversion rewrote a base64 `TOKEN_ENCRYPTION_KEY` into `C:/Program Files/…`
  — 44 chars became 64, 32 bytes became 45, and the file was correct the whole
  time. Use `node --env-file=.env` / `npx tsx --env-file=.env`.
- **`.env` in the worktree is real and gitignored.** Delegated mode, pointed at
  `grid_commander_test`. It holds no BattleGrid key by design — adding one flips
  the app to personal mode and makes `/connect` unreachable.
- **The operator's `bg_live_` key was pasted into a session transcript.** Rotate
  it. `mcp:read` is write-capable: 11 tools mutate on it, 6 destructively.
- **A guard that reads a *stored* fact cannot serve a call that creates it.**
  That is PG-005 in one line, and nothing offline could see it — 2257 tests fake
  the port, and both live probes wire `DeclaredScopes`, whose scopes come from
  configuration. It took a real delegated grant.
- **Python's `io.open(p,'w')` writes CRLF on Windows.** Four files drifted that
  way and the gate caught it; `.gitattributes` says why it matters (#171). Pass
  `newline='
'`.
- **`one-destination.test.ts` counted matches, not files.** Quoting a BattleGrid
  URL in a comment failed it. Fixed by deduplicating per file — the guard was
  reacting to spelling, not reach.


## 2026-08-13 (CI) — twelve gates green, and the one that could never have caught #203

**Did**: Ran `scripts/ci.sh` twice. First the default set against
`grid_commander_test` — `assertDisposable` (#195) refuses the live database, and
`.env` still points at it, so the substitution matters. Then the full set with
`CI_LIVE=1 CI_SERVING=1`: **twelve gates, all ok, nothing skipped**, including
~9 minutes of serial live probes and the built app booted and probed.

`BATTLEGRID_LIVE_WRITES` was deliberately left unset, so the write halves
skipped. The suite's own header is the reason: *"a credential is not consent to
mutate."*

**The finding is `oauth-live`**, which passes with #203 open. It is correctly
scoped — it re-fetches the discovery document against the recording and never
claimed to exercise a grant. Exactly one file in the suite mentions
`grant_type`, and it runs offline. So *a token being exchanged is covered
nowhere*, which is where `sub` lives. Recorded on #203.

**State**: 29 commits, PR #199 `MERGEABLE / CLEAN`, +7307 −589 / 143 files.
Local CI green at `4d1fdd7`. Live account unchanged — balance `38.633532`,
slots 3/3.

**Next**: merge PR #199. Then **#91**, the only P2 whose blocker is a decision.

**Watch out**:

- **`.env` still aims `DATABASE_URL` at `grid_commander`, the live database.**
  CI was pointed at `grid_commander_test` by hand. `assertDisposable` would
  refuse rather than truncate, but the default is still aimed at the wrong one.
- **A green gate list can imply coverage it does not have.** `oauth-live` in a
  green column reads as "the OAuth path is exercised live"; it is the *metadata*
  that is exercised live. The boundary cannot be automated away — a code needs a
  human at a consent screen — but it can be written where someone meets it.
- `config.ts:95` argues registration is the ceremony being avoided, while
  `docs/battlegrid-oauth-metadata.json` has recorded `registration_endpoint`
  and a secretless `"none"` auth method the whole time — re-verified by
  `oauth-live` on every run. The premise was contradicted by a committed file
  checked by the same CI.

## 2026-08-13 (the live walk) — six questions asked of the platform, and half the answers contradicted the items asking

**Did**: Closed four by walking live BattleGrid v18.2.0, with the operator
freeing an agent slot and consenting twice in a browser.

- **#103** — every agent tool returns `{agent}`; `create` alone adds
  `slotUsage`. Dropped `?? payload` from five sites in `agent-adapter.ts`.
  2239 tests passed *unchanged*, which is the finding: nothing ever covered
  that branch.
- **#106** — the platform refuses `{kind: PRESET, preset: CUSTOM}` in words.
  It also **falsified this item's own narrowing**: `brainPreset` carries the
  real preset name (`PATTON`), so `brainPreset: "CUSTOM"` is unambiguous, and
  the consequence recorded against #110 is retracted.
- **#189** — the dead premise was real, and *the correction was already in the
  repo*: `performance.ts:5` said the tool "has never once answered";
  `ports/agents.ts:142` said "the tool is not broken" and had worked out why on
  2026-08-06. Kept the roster as the record source, corrected the reasoning.
- **#93** — 3600s lifetime; refresh rotates both tokens; **no incremental
  step-up**, the user re-approves everything. All tokens revoked and verified
  dead (401).

Sharpened, not closed: **#100** (retitled — the tool is not broken, it serves
old rows and 500s on the newest), **#102** (re-confirmed, plus a lost-response
hazard), **#91** (falsified). Filed #200–#205, all mirrored.

**State**: 27 commits, PR #199 open, 0 uncommitted. `validate --all` 0 errors /
11 warnings; `check.sh` all passed; 2239 vitest. **Live account restored
exactly** — Vanguard archived and reactivated (rev 6→8), same slot ids and
conviction on BTC/ETH/SOL/XRP/AVAX; balance 38.633532 unchanged; slots 3/3;
strategy quota back to 5/25 after archiving the test fork.

**Next**: `/handoff` is done — land PR #199. Then **#91 is the only P2 whose
blocker is a decision rather than a wait**, and #203 changed its options.

**Watch out**:

- **The OAuth path has never completed a single connection.** BattleGrid sends
  no `sub` and `mcp-adapter.ts:430` requires one. It is plain OAuth 2.1, not
  OIDC — `openid-configuration` is 404. Audited and archived does not mean run
  (#203).
- **Never retry a `fork_strategy` blind.** It takes no `idempotencyKey` — only
  `create_intelligence_agent` and `rebind_intelligence_agent` do. A lost
  response that already committed makes the retry return `INTERNAL_ERROR`,
  which reads as a platform fault and is actually "that name is taken" (#102).
- **`list_gate_blocks` has a read-around**: `page: N, limit: 1` reaches any
  older row and the data is intact. Only the recent window is unreachable, and
  the boundary is per-agent, not a global cutoff (#100).
- **Two comments in one codebase disagreed and the emphatic one was wrong**
  (#189). A carefully argued comment is not evidence; it is a claim with a
  date on it.
- `rebind_intelligence_agent` **rewrites `contextSources`** to the destination
  strategy's — eight fields changed in the walk. The product's confirm copy
  already says so, and is now the only verified description of it.
- `mcp:wager` is **not sufficient to move money** — a Profile-level signer
  toggle gates it, plus 10 wagers/day and $500 (#205).

## 2026-08-13 (late night) — the reference regenerates, and two records stop lying by omission

**Did**: **#186** — `generate_mcp_reference.py` could not run on Windows at all
(unpinned `encoding`), and read a directory of raw dumps nothing produced. Added
`tools/capture_mcp_dump.py`, importing `rpc` from the probe rather than
re-implementing the protocol. The reference is v18.2.0.

**#198** — regenerating revealed the capabilities record was also a major
version stale: 188 output-schema leaves across 11 tools unrecorded, including
`gateStage` declaring `EVALUATION`, which independently confirmed #185.

**#196** — `repo_path()` helper; twelve sites reported Windows backslashes into
repo-relative paths. **#194** — the render harness header now states what it can
see (`text`, `headings`, `links`, `values`) and what it cannot (anything needing
reconciliation, anything CSS decides, anything the client does), with a stated
bar for adding a collector. Re-pinned the six manifests the round staled.

**State**: all archived/committed. Board warnings 34 → 11. **Zero stale, zero
never-verified** — all 24 manifests describe committed code, first time true.

**Next**: (superseded by the entry above.)

**Watch out**:

- **A count that has not moved proves nothing.** v18.2.0 changed one tool's
  *meaning* with 114 tools unchanged, no schema added or removed. Probe the
  version, never the shape.
- Four of the six manifests re-pinned were staled by *this session's own*
  changes. That is design-contract §8 working, not carelessness — a design
  round edits the files its manifests describe, so the re-pin is that round's
  last task.
- `#194` is **half done and stays open**: `values` closed the form-state hole,
  key collisions still need a real DOM, and *A Listing Shows Every Entry It Was
  Given* is knowingly uncovered.

## 2026-08-13 (night) — the round trip, and the harness learns to see form state

**Did**: `the-round-trip-keeps-what-the-person-needs` — #170, #169 and #162,
built and archived. Three surfaces losing something between the person and the
platform: a reason, a value's validity, typed input. Also re-surveyed the last
eight design manifests, closing #197.

**The find is about the suite, not the product.** The first test written for
#162 **passed against a form re-rendered from stored values** — the exact
defect it was meant to catch. `rendered()` collects text, and a `defaultValue`
is a prop. The "first visit prefills" case was worse: it passed only because the
name appears in the page heading.

The resolver now collects `values`, for the reason it already collected `href`
— its own comment: *"an assertion on text for a URL the harness never emits
passes while proving nothing."* One field over, same sentence. That closes half
of #194; key collisions still need reconciliation, which no prop fixes.

**Two structural things the issues did not anticipate.** #169 needed `edit=1`
as an explicit "show the composer" signal, because `a` being absent was the only
one — so carrying values back skipped the form and re-ran the describe that had
just refused. And #170's two vocabulary reads had to stay separate: folding them
lost TypeScript's narrowing as well as the reason.

**#197 done**: all eleven re-surveyed, 24 of 24 digested. Five carried an
**incomplete `source_files`** — `agent-roster` described neither `FleetSpend`
nor its file, so the design layer could not see that component at all. That is
the drift no freshness mechanism catches: a file the manifest omits cannot make
it stale, digest or not.

**State**: 0 active changes, **27 open items ↔ 27 open issues**.

**Next**: #186 (the MCP capture script), #194's remaining half, or the three
stale surfaces via a design round.

**Watch out**: two tests this session passed while proving nothing, both caught
only by deliberately breaking the code under them. That check — revert the fix,
confirm the test fails — is the cheapest guard against a green suite that means
nothing, and neither test would have been questioned without it.

## 2026-08-13 (late) — the pin stops being a proxy, and #192 closes by disappearing

**Did**: `a-manifest-pins-to-what-it-described` (#192), built and archived.
Freshness is a per-file content digest now; the commit-based path is gone.

**The question the item posed is answered by deleting it.** "What should a
re-pin name, given squash-merge destroys the hash" stops mattering when nothing
names a hash. A digest survives squash, rebase, amend, and a clone with no
history at all — and it answers the actual question, which was always about
content rather than time. `harness-integrity` already held the principle one
layer over: *an exit code alone MUST NOT be accepted as evidence*. A commit hash
was the same kind of proxy.

**The migration was the interesting part.** Thirteen manifests took their digest
from `git show <commit>:<path>` — what they actually described, not today's
files. **Three came out stale**, including `strategy-conditions-save`, which I
re-pinned this morning and #111 changed again this afternoon. Task 3.3 existed
so that would not be absorbed silently, and it earned its place.

**Eleven could not be migrated at all** and now say `never verified` — not
fresh, not stale. Before today they said *fresh*, confidently, on no evidence.
Filed as **#197**: eleven real `ui-surveyor` passes, and the count must not
quietly become a fresh one.

**Corrected mid-build**: the first version stored one hash over the file set,
and its warning then said "8 source file(s) differ" when one did. A combined
digest cannot be decomposed. Per-file now, so it names the file that moved.

**Also filed**: **#196** — six harness tests fail on Windows over
backslash-vs-forward-slash in diagnostic messages. Established pre-existing by
stashing this change and reproducing them identically, which is the only honest
way to claim it.

**State**: 0 active changes, **31 open items ↔ 31 open issues**, cross-checked
in both directions and clean.

**Next**: #197's eleven re-surveys — independent, parallelisable, `connect` and
`agent-roster` first. Then #170, #169, #162, #186, #194.

**Watch out**: I spent six attempts fighting shell→Python→file escaping before
switching to the editor and to `bytes([13, 10])`. Byte-level patching of source
through nested quoting is a losing game; after the second failure the answer was
already "use the editor".

## 2026-08-13 (evening) — the app runs locally, #111 lands, and I destroyed the record

**Did**: Stood the app up locally against real data, built and archived
`the-prose-that-names-a-condition-says-so` (#111), and closed a hazard I walked
into. 13 commits. 171 files / 2232 tests. **Six of six gates**, including
`test:db` — blocked all session, and it finally ran.

**I truncated a live signal record.** `npm run test:db` truncates eight tables
and `databaseUrl()` refused only a *missing* `DATABASE_URL` — any present one
passed, which is exactly what `.env` sets. I pointed it at `grid_commander` and
lost GOLD 24 captures / JPY 24 / AVAX 25 across two days. **All 85 tests
passed. Nothing warned.** That record is the one store this product documents
as unrecoverable, and the `/recorder/trim` ceremony exists to stop a *person*
deleting it by accident. A test command did it with no ceremony.

Fixed by `assertDisposable` (#195): the suite now needs a database *named*
disposable, or an exact `DB_TESTS_MAY_TRUNCATE=yes`. Opt-in, so a typo refuses
and silence refuses. Eight tests pin it, including that `latest` and `contest`
are not consent. **The guard was written after the loss — nothing predicted it.**
"Refuses when unset" had read as "refuses when wrong".

**#111 was not what it said.** Neither of its candidates: the structured answer
was already on the wire and thrown away. The adapter caught `ToolRefusedError`,
called `messageOf()`, and returned the whole JSON as a string. Now the refusal
keeps its code and context, and the save page names the marker the prose uses.
`refusal` made **required** on the rejected arm named all four fixtures and the
page branch that did not exist — the save page was falling through to
`proposal`.

**Local setup**: the `BATTLEGRID_CLIENT_ID` placeholder is not a secret — an
OAuth client id is a public identifier — so the app boots with no credential at
all. That is what made the last three findings visible: #100 rendering its
unreadable branch live, #182's remedy-without-a-target on a personal
deployment, and both arms of the trim receipt.

**State**: 0 active changes, **30 open items ↔ 30 open issues**, reconciled.

**Next**: #192's second half — eleven surfaces still cannot be checked at all.
Then #170, #169, #162, #186, #194.

**Watch out**: **I created a fourth instance of the mirror drift I spent the
morning cataloguing.** #195 was `done` on the item with the issue left open —
found only because I ran the cross-check by hand again. That is four in one day
(#163, #173, #182, #195), three found by hand. Five findings this session share
one shape: a check that reads as passing after it stopped meaning anything.
Only one destroyed something, and I am the one who ran it.

## 2026-08-13 (tier 1 lands) — three changes archived, and the freshness check has been blind for months

**Did**: Built and archived three changes off the morning's verification:
`the-receipt-states-what-remains` (#168), `what-the-page-shows-is-what-happens`
(#165/#167) and `a-block-does-not-mean-it-was-never-evaluated` (#185). Five
commits, 2213 tests green, specs merged.

**The find, and it is not any of the three.** Re-pinning the manifests this
round staled, I checked whether the pins resolve. **Twelve of twenty-four point
at commits that do not exist in this repository.** The staleness check cannot
compare against a hash it cannot resolve, so it says nothing — those surfaces
have been structurally unable to go stale, silently, for as long as their pin
has been dangling. Squash-merge is the cause: the branch commits a manifest
pins to are discarded when the PR is squashed onto main. #192 was filed this
morning about *four manifests pinning to the parent commit*; that is the same
root cause seen through a keyhole.

**A test that could not fail, caught by trying to break it.** Covering "A
Listing Shows Every Entry It Was Given" I wrote a test, it passed — then passed
identically against the old broken keying. `tests/rendering/support/render.ts`
walks the element tree and never reconciles, and a key collision only exists
during reconciliation. **No test in this project can observe that class of
defect.** Removed the test, kept the fix (it is correct in a browser), filed
**#194**. The requirement stays and is knowingly uncovered.

**Making the field required was the decision that paid.** `sourceRevision` on
`ForkStrategyRequest` is required rather than optional, so the compiler named
all six call sites. And #185 was *eight* sites, not the four the issue named or
the five found at proposal — the third re-grep caught a user-visible
`<h2>Stopped before evaluation</h2>`.

**State**: 0 active changes, 34 open items ↔ 34 open issues. Gates green except
`test:db`, blocked on database credentials all session and reported blocked
every time, never passed.

**Next**: #192 needs rewriting around the twelve dangling pins — the convention
question is now "what does a pin mean under squash-merge at all", not "which
commit should it name". Tier 1's remaining work is #167's two scoped-out
findings.

**Watch out**: three findings this session are the same shape — a check that
reads as passing after it stopped meaning anything. DT-0014's acceptance
(#193), the render harness (#194), and the dangling pins. The pattern is worth
a name: **none of them fails loudly, and all three were found by hand.**

## 2026-08-13 (the issues meet the code) — nine were stale, and all nine in the same direction

**Did**: Verified all 32 open issues rather than reading them — every repo claim
against the file and line it cites, every platform claim re-probed read-only at
**v18.2.0**. No writes. Then acted on the result: **2 closed, 7 rewritten, 1
filed, 1 reopened.**

**The find**: nine issues were wrong, and **every one of them was wrong in the
same direction** — describing a world that was true when filed. Not one had
become *more* true. The two closable ones were fixed by
`the-outcome-reaches-the-person`, which names **#163 and #165 in its own Problem
statement** and closed only #164 behind it.

**What the sweep actually caught**, beyond the bookkeeping:

- **#114 / #116 both claimed `get_open_orders` was unused.** It has been called
  since #128 — `positions-adapter.ts:16`, `readRestingOrders`,
  `read-exposure.query.ts:212`. #114 re-measured the *platform* five times and
  never once re-ran `grep get_open_orders src/`. A claim about our own code aged
  out because it looked like the settled half of the item.
- **#165's residual was stated wrong.** *"Staleness rides on the
  confirmationToken alone"* — fork has **no confirmation token**, deliberately
  (DL-105). Underneath it is something sharper: `fork/page.tsx:18` and `:150`
  both promise the fork is taken at the revision on screen, while the action
  re-reads the roster and sends `sourceRevision: listing.strategy.revision` —
  current at submit, not rendered. The comment and the code disagree.
- **#135 said `grep resolvesNow src/` is empty.** It is not —
  `radar-adapter.ts:161`. The conclusion survives only because `section` is the
  one field *not* read.
- **#85 pointed at "the open p1"** that closed on 2026-08-11, and listed as an
  unblock step a strategy-side risk surface that shipped the same day
  (`strategy-detail.tsx:99`).
- **#182 was closed as COMPLETED and never fixed.** `AuthorityLost` still has no
  `href` and no `BUTTON`. `94bd854` said *"Files #182 and #183"* — #183 stayed
  open, this one did not. Reopened.

**Also filed**: **#192** — the four currently-stale manifests pin to `e7c56ce`,
the **direct parent** of `94bd854`, the commit that staled them. That commit is
"the re-pin belongs at the end of a design round". **Squash-merge defeats the
convention it established**: however many commits a branch uses to separate the
re-pin from the code, `main` receives one, and the re-pin inside it necessarily
names that commit's parent. Fourth guard-with-a-hole of the same shape.

**State**: 32 open items ↔ 32 open issues, reconciled by cross-checking every
pair's status against its mirror's state — 0 errors from `validate --all`.

**Next**: #189 is still the decision worth making. #192's second half — what a
re-pin means under squash-merge — is the one that stops this recurring.

**Watch out**: **the mirror drifts in both directions and nothing checks it.**
Three pairs disagreed: two items `done` with issues open, one item `open` with
its issue closed. `validate` enforces that an open item *has* a `github:` value;
it never compares the two states. Every one of these was created at archive
time by a human closing some-but-not-all of the issues a change named. The
cross-check that found them is four lines of shell — it belongs in `validate`.

Second: **an issue's title is load-bearing.** #100 read *"BattleGrid is
flapping"* through nine major versions during which it stopped flapping; it is
the item a session reaches for when a probe fails, and that title invites
reading any single failure as more of the same. Bodies were being maintained
carefully while titles were left as filed — #114's own text says the title is
"left as filed" as though that were the disciplined choice.

## 2026-08-12 (the question items meet v18) — a read-only sweep, and a design premise that died

**Did**: The read-only sweep across the question items, against **v18.2.0**.
No writes; the two items that need one (`#106` PRESET/CUSTOM, the fork-name
500) were left alone and said so.

**The find**: `get_agent_performance` **answers now**, with real figures —
Undertow −0.84 realized over a **41-point** curve, Breakwater +0.30 over 25,
Vanguard empty because it has settled nothing (v18 says an empty curve *means*
that). `src/domain/agent/performance.ts` is built on the opposite: "returned
nothing on any of the nine agents … has never once answered", which is why the
product reads everything from the roster instead. That premise is dead, the UI
carries it too (`record.tsx:88`), and there is a per-agent P&L sparkline going
unused. Filed **#189** (p2) — a decision to make, not a bug: use it and say
which number means what, or keep the roster and correct the record.

**Also settled**: `get_open_orders` answers again (that half of #114 closed by
the platform), while `get_market_context({})` still refuses the call its own
schema permits — **five majors running**, precondition still prose-only. #107
split in two: performance answers, allocation still reads zero but is
*untestable today* because there are no open positions, so zero against zero is
agreement rather than contradiction. #110: all six unread fields still arrive,
`provider` still null across three majors, and the `last24hCostUsd`
list-vs-detail split reproduces (fifth measurement, first at v18) — so
"read spend from the list" is still the right rule.

**State**: 0 active changes, 30 open items ↔ 30 open issues. Gates green.

**Next**: #189 is the decision worth making. The allocation half of #107 needs
an open position before it can be read at all.

**Watch out**: HANDOFF's archived-change count was written as 166 and is 160
— I estimated it instead of counting, in the one table whose entire purpose is
to be verified rather than remembered. Two independent counts agree on 160
(`find … -type d` and `find … -name proposal.md`). Check the numbers you put in
that table against the tooling, every time; the previous session's 161 looks
unverified too.

Also: the probe's *observed shapes* record types, not values — a field
showing `'int'` says nothing about whether it is always zero. Three of today's
findings needed a real call to see the difference between "the shape is right"
and "the number is real". The surface record is a contract check, not evidence.

## 2026-08-12 (the record catches up) — BattleGrid is v18.2.0, and the count did not move

**Did**: The operator suggested using the live connectors. The first thing
asked was the cheapest and it paid immediately: the freshness gate says
**BattleGrid is v18.2.0** and our record said 17.2.0 — *a whole major version
between two probes a day apart*, and v18 was already at patch .2, so 18.0 and
18.1 were never seen at all. Re-probed the surface and the vocabulary.

**What moved is the point.** 114 tools → 114. None added, none removed. **No
input schema changed on any tool.** Read/write/destructive split identical.
Vocabulary values byte-identical across the major version. Exactly one thing
changed: `list_gate_blocks`'s *description*, and semantically —
v17 "pre-signal … candidates that never reached signal evaluation" became v18
"each evaluation that ended without a trade decision. **EVALUATION-stage rows
ended after the model was called**". The sharpest evidence yet for the
doctrine in CLAUDE.md, now written there.

**Two findings filed.** **#185** (p2): a gate block may now describe something
that happened *after* the agent reasoned, and the product asserts the opposite
as fact in two places — `ports/agents.ts:419` ("A candidate stopped before it
was ever evaluated") and the pipeline page's three-stage framing, which stops
partitioning if EVALUATION rows land in the first bucket. **#186** (p3): the
MCP reference is stuck at v17.2.0 because `generate_mcp_reference.py` needs a
raw JSON-RPC dump that nothing in the repo produces — deliberately *not* fixed
by editing its header, which would make it claim a version its body does not
describe.

**#100 refreshed**: `list_gate_blocks` returns `INTERNAL_ERROR` for every
agent — the probe's single failure of 69 calls, plus three by hand across two
agents and three page sizes. Deterministic, not flapping, and on the one tool
v18 rewrote. `/agents/[id]` and the pipeline page render their unreadable
branch against live right now — honestly, thanks to this morning's work.

**State**: 0 active changes, 36 open items ↔ 36 open issues. Gates green
including the live freshness gate: 169 files / 2207 tests.

**Next**: the read-only sweep across the remaining question items, which is
what the freshness probe was the first step of.

**Watch out**: the vocabulary record has its own probe
(`tools/probe_vocabulary.py`) and its own version stamp, and an *offline*
guard compares the two records' versions — so re-probing the surface alone
turns the suite red until the vocabulary is re-probed too. Both, or neither.

## 2026-08-12 (the re-pin lands) — #179 closed, and the re-survey finds three things it was not looking for

**Did**: `#179` both halves. Nine manifests re-pinned at `e7c56ce` by two
parallel surveys, and the structural fix written into design-contract §8 (the
loop shows `/surface` twice now, with which pass is which), the ui-surveyor
skill, the design-director's completion checklist, and CLAUDE.md. Including
**why it is a convention and not a check**: a manifest pins to a commit hash,
the hash of the commit being written does not exist yet, so the re-pin is
necessarily a second commit and any freshness guard would fail on the
intermediate state the process requires.

**The re-survey paid for itself three times.** It caught that DT-0019/0020/
0021's acceptance said the reassurance renders *inside* the danger block when
it renders after it — the criterion was wrong, not the code, and outside is
the better answer, so the tickets were corrected rather than the code bent.
It found `AuthorityLost` and three action rows with no design coverage
(**#183**), and the remedy-without-a-target gap (**#182**). And chasing one of
its notes exposed a hole in the guard I had called product-wide: it matched
`{problem ? (` and missed `{problem ? <p …>` on one line, so two more
hand-rolled banners had been sitting in plain sight. Widened, and it
immediately caught both.

**State**: 0 active changes, 33 open items ↔ 33 open issues, no p1s. Gates
green: 169 files / 2207 tests. Zero stale surfaces.

**Next**: a live read-only probe round is arguably overdue — the surface
record is v17.2.0 from 2026-08-11 and roughly a dozen backlog questions are
explicitly waiting on live evidence. Then #183's design pass.

**Watch out**: **Third guard-with-a-hole in one session.** The pattern is
identical every time — a rule written against the shape of the one example in
front of it (`agentId` rendered anywhere / two-or-more banners / `{problem ? (`
with a paren). Widen the rule, then mutation-test it, before believing any new
guard. All three failed versions are recorded in the files rather than quietly
replaced.

## 2026-08-12 (authority is not a refusal) — #175, and the obvious fix stays rejected

**Did**: `a-lost-authority-is-not-a-refusal` (standard, archived; 166 archived
changes). Four perform-catches folded every throw into `{kind:'refused'}`,
including `ConnectionRevokedError` — so "your BattleGrid connection is no
longer valid" appeared under a **"Refused:"** prefix above a live confirmation
form, inviting a retry that could never work. The adapter had gone out of its
way to preserve that error through the call (`mcp-adapter.ts:285`, *"must not
be reshaped into something that looks retryable"*); the catches reshaped it.

Now `outcomeOf` in `failure-outcome.ts` makes the judgement once for all four:
the confirmation guard still throws (a broken request, not a platform answer),
a revoked connection becomes **`authority-lost`**, everything else stays
`refused`. The four ceremony pages render the loss *instead of* the ceremony —
the sentence verbatim, and no form.

**Two designs rejected on evidence, both recorded in the proposal.**
Re-throwing is the obvious fix and would have recreated #164's crash: there is
still no error boundary. Redirecting to `/connect` is the tidy fix and would
have stranded personal deployments, where that page renders *"There is nothing
to connect"* — true about the deployment, and no answer to "my write just
failed". Keeping the error's own sentence works on both, because
`ConnectionRevokedError` is constructed with its deployment's remedy.

**State**: 0 active changes, 31 open items ↔ 31 open issues, no p1s. Gates
green: 169 files / 2203 tests.

**Next**: #179 (the design round always stales its own manifests — the fix is
to move the re-pin to the end of a round), then #162.

**Watch out**: vitest does not typecheck, so a test can pass green while
`tsc` rejects it — two invented APIs here (`'repair-credential'` for a remedy
that is `'repair-the-key'`, and a two-arg `RevisionConflictError` that takes
three) passed six tests before typecheck caught them. Run typecheck before
believing a new test file.

## 2026-08-12 (the entry point opens) — creating an agent can be done at all

**Did**: `creating-an-agent-chooses-a-strategy` (standard, archived; 165
archived changes) — #177, the p1 the previous round's new guard found.
`create` reads `strategyId`; `AgentForm` never asked for it, so **every
submission of the new-agent form has always thrown `FormError` before the use
case**. The value was never obtainable from what the form was given: `Catalog`
carries models, presets, bounds and defaults, and has never carried
strategies. So the page now reads the strategy list beside the catalog and the
form asks the question — **with nothing preselected**, because a strategy is
not a setting on an agent but its whole reasoning, and a default would bind
funds to a policy nobody read. No strategies, or an unreadable list, renders
no form at all: the treatment the page already gave an unreadable catalog, for
the reason its own comment states.

The spec gained the converse of a requirement it already had: "A Field Offered
Reaches The Operation It Configures" forbade a control the operation never
reads; it now also forbids a value the operation requires that no control
supplies. Both halves had failed unseen, and for the same reason — the tests
exercise use cases directly, so no test walked a form.

The `KNOWN_UNSENDABLE` ledger row is deleted, which the guard's own stale-row
assertion demanded once the field was sent.

**State**: 0 active changes, 30 open items ↔ 30 open issues, **no p1s**.
Gates green: 167 files / 2188 tests.

**Next**: #175 (a revoked connection renders as a refusal — read its trap
first), then #162 (typed values lost on refusal paths). **#179** is the one to
do first if the board's noise bothers you: eight surfaces went stale again the
moment the ceremony round committed, which is structural — a design round
always invalidates the manifests it designed against, so the re-pin belongs at
the *end* of a round. #173 was closed for this and reopened within the hour.

**Watch out**: A page tree holds `AgentForm` as an *uninvoked* element, so its
controls do not exist until the component is called — structural assertions
have to call the component, and only text assertions work against the page.
Cost a confused test run before it was obvious. The no-default rule is
mutation-verified: preselecting the first strategy fails "chooses nothing on
the operator's behalf".

## 2026-08-12 (the ceremony round) — the sweep lands, and finds two write paths that never worked

**Did**: `the-ceremony-pages-join-the-sweep` (standard, archived; 164 archived
changes). DT-0016–DT-0021: consequence role on deploy, undeploy and
`rebind-confirm` (the "this is not a merge" block, the product's largest blast
radius, was wearing the anonymous border DT-0004 retired); danger role on the
three strategy ceremonies' failure sentences; the archive page's mobile stack
on all three action rows. #173's twelve manifests re-surveyed at `6562791` by
two parallel agents.

**The round found more than it was sent for.** The refusal banner had already
drifted into four spellings and two roles: `/pending` had lost the "Refused:"
prefix, and `/agents/[id]` rendered a refusal in the **consequence** role — on
a branch nothing has minted since the rename form moved to `/edit`
(`6959707`). Five hand-rolled copies now render `CarriedProblem`; the dead
branch was removed rather than restyled, and typecheck named the eight test
call sites still passing its `searchParams`.

**Then a p1.** A survey noticed `RebindConfirm` renders four hidden inputs
while `performRebind` reads five: `requiredText(formData, 'agentId')` threw
`FormError` on **every rebind submit**, before the use case, as a framework
error page. Fixed here. The new guard
`a-form-sends-what-its-action-reads.test.ts` then found a **second**: `create`
requires `strategyId` and `AgentForm` has no strategy control at all — filed
as **#177** (p1, needs a chooser, so a proposal) and carried in the guard's
ledger.

**State**: 0 active changes, 30 open items ↔ 30 open issues. Gates green:
166 files / 2183 tests.

**Next**: `/propose` on #177 — the product's entry point cannot be walked.
Then #175 (revocation framing) and #162.

**Watch out**: **The first version of that guard passed with the bug in it** —
it asked whether the field name appears anywhere in the UI, and `agentId` is a
hidden input on four other pages. Second time this session a guard has been
written that could not fail on its own defect; both times the fix was to ask
the narrower question (which form is bound to *this* action) and
mutation-verify. Also: a JSX element is not a regular language — scanning
forward with `[^>]*` for a prop missed `AgentEditForm`, whose earlier prop
holds `Record<string, string | number>`; anchor backwards from the prop to the
nearest element open instead. The concurrent surveys warned that four surfaces
go stale again the moment this commits, and they are right — the delta is
known and small.

## 2026-08-12 (the suite reads itself) — Windows goes green, and a recommendation was checked before it was followed

**Did**: Merged PR #174 (`3fde77e`). Then **abandoned my own top
recommendation before writing a line of it.** The plan was to align four
command catches so `ConnectionRevokedError` stops being flattened into a
refusal — the adapter preserves it deliberately (`mcp-adapter.ts:285`,
"must not be reshaped into something that looks retryable"). The check
that stopped it: **there is no error boundary in the product** — no
`app/error.tsx`, no `global-error.tsx`, nothing in `app/` or
`src/presentation/` catches it — so re-throwing would have escaped the
server action into Next's default error page, the exact crash class #164
had just closed. Filed as **#175** with the trap written down, priority
corrected to p3 (the message already carries diagnosis *and* remedy; what
is wrong is the "Refused:" framing and the live retry). Then #171:
**165 files / 2177 tests green on Windows**, first ever on this machine.
`slashed()` and `readText()` shared out of `failure-is-explained.test.ts`
into `tests/support/source-tree.ts`; the three `npx` spawns now run the
local entry point with `process.execPath` (no shell, no `.cmd`,
CVE-2024-27980). The `mutate-guard` failure was not what it looked like:
**esbuild cannot parse a CRLF `.mjs`**, proven with a byte-identical LF
copy. `.gitattributes` pins checkouts to LF — blobs were already LF, so
nothing committed changed.

**State**: 0 active changes, 28 open items ↔ 28 open issues. All four gates
green, and **vitest is now a trustworthy signal on this host** — no more
stash-and-diff.

**Next**: `/design` the #166 ceremony round, which also clears #173's twelve
stale manifests in the same pass.

**Watch out**: The green suite was mutation-checked, not assumed — planting
an MCP SDK import in `src/domain/errors.ts` still fails both `boundaries`
assertions, so the guards bite. Do not "fix" #175 by re-throwing; the item
says why at length. And `git commit -m` with backticks in the message runs
command substitution under bash and silently eats the backticked words —
one commit here needed amending from a file.

## 2026-08-12 (the refusal family) — a refused rebind stops crashing, and a carried reason survives every branch

**Did**: `the-outcome-reaches-the-person` (standard, verified, archived; 162
archived changes) — #164/#163/#165 in one change, since they were one defect
in three shapes. **#164's premise was confirmed live first**: the operator
supplied a key, and a stale-revision `rebind_intelligence_agent` on an
archived probe agent came back `CONFLICT` as a *thrown* error, before any
archived-state check, nothing changed on the account. So
`RebindAgentResult` gained a `refused` arm and the port call a catch — which
re-throws `ConfirmationRequiredError`, because the product's own guard
refusal means "this is not what was agreed to", not "BattleGrid said no",
and `end-to-end` pins it as a rejection. The three lifecycle actions
(strategy archive/restore/fork) now bounce a failed pre-perform re-read back
to their ceremony page saying nothing was attempted and why, instead of
landing on `/strategies` in silence. **The review then found the change had
done to itself what it set out to fix**: one branch per page carried the
reason and the others dropped it — five branches across three pages, with a
guard asserting "two or more" that passed anyway. `CarriedProblem` extracted
(the `WhyNotLoaded` shape, one paragraph along), every render branch on all
six pages carries it, and the guard now counts `<main` branches and requires
equality. Both new guards mutation-verified. New: `carried-problem.tsx`,
`tests/rendering/carried-refusals.test.ts`,
`tests/rendering/lifecycle-actions.test.ts` (a first for this repo —
invokes server actions and reads `redirect()`'s thrown digest).

**State**: main + this branch. 0 active changes, 27 open items ↔ 27 open
issues. Gates: typecheck, lint, build green; vitest 2146 passed, 19 failed —
byte-identical to the clean-HEAD Windows baseline (#171).

**Next**: `/design` the #166 ceremony round, which also re-surveys the twelve
manifests this change made stale (#173). Then #162 (typed values lost on
refusal) is the last of the survey's harvest worth doing soon.

**Watch out**: `failure-is-explained` scans *whole files*, actions included,
so an action branch that interpolates a failure reason reads as a render
branch that forgot its sentence. The fix is the category rule (a branch that
redirects and renders no JSX), not an exemption — the exemption list has a
cap of 8 for a reason, and three entries blew it. Deploy's catch
(`deploy-agent.command.ts:158`) still swallows `ConnectionRevokedError` into
a refusal banner rather than routing to reconnect; rebind now re-throws only
the confirmation error, so the two are not quite aligned — noted in the
review, not filed, because the right answer is a decision about all four
performs at once.

## 2026-08-12 (the tail cleared) — #157 done: twelve manifests, DT-0011–0015 designed and implemented, eleven findings filed

**Did**: Worked #157 whole. Twelve surface manifests: the eleven ceremony
pages (agent edit/deploy/rebind/reactivate/undeploy, strategy
archive/restore/fork/conditions-save/rules, recorder trim) surveyed new, and
`strategy-editor` refreshed — honestly to `needs-redesign`, since the compose
form had grown a sections checklist under DT-0001/0002's design. Five
tickets written and implemented same-day: **DT-0011/0012/0013** gave the
three orphan list surfaces their first decisions — the new ruling is
**unreadable wears danger, advisory wears notice, empty stays prose** —
**DT-0014** landed the decided roles on recorder-trim, **DT-0015** caught
the strategy editor up (checkboxes via a new shared `CHECKBOX` constant in
control.ts, guarded by controls.test). DT-0008's raw-color warning was a
false positive (`#155` in prose parses as hex); reworded. The surveys' gap
harvest filed as **#162–#171**: typed values discarded on refusal paths,
refused branches dropping carried `?problem=` (the dropped-redirect class's
third shape), **a refused rebind perform crashes (p2, spec tension)**,
lifecycle actions swallowing failed re-reads, the ceremony pages' pre-sweep
drift (#166, the next `/design` round), conditions-save key collisions, the
forgeable trim receipt, rule-editor param trust, the editor's reason-less
strategy-unreadable, and the suite's 19 Windows-checkout failures (#171).
#153's evidence now enumerates all twelve perform forms. #157 closed.

**State**: 0 active changes, 30 open items ↔ 30 open issues. Design lane: 25
surfaces (15 designed, 10 functional awaiting #166's tickets), DT-0001–0015
all implemented. Gates on the head: typecheck, lint, build green; vitest
2109 passed with 19 failures **identical to a clean HEAD baseline on this
Windows host** (#171 — the container CI is the gate of record).

**Next**: `/design` per #166 surface (mechanical against DT-0004/0014
precedent), or `/propose` on #164 (the rebind crash — smallest spec-tension
item). The operator's decisions (#146, #153) still wait.

**Watch out**: On a Windows checkout, do not trust a red vitest run — diff
the failing set against a stashed-HEAD run first; 19 failures are
environmental (#171). The raw-colour validator reads any `#nnn` in a
ticket's design block as a hex literal — write issue numbers unhashed there.
Three survey agents died mid-flight on a session limit and were resumed via
SendMessage with their partial files intact; if manifests ever look
half-written, check `git status` before re-surveying.

## 2026-08-12 (session close) — PR #154 merged; the tail filed; two new items

**Did**: The operator authorized the recommendation: final full local CI
on the exact head, PR #154 marked ready and squash-merged as `1052adb`
(twelve changes, 118 files, +4,373/−279). Watch stood down. Close-out
filed the deferred work: **#157** `the-design-lane-has-a-tail` (eleven
ceremony manifests + first tickets for the three functional list
surfaces — split out of #108, which closed: its substance, the button
primitive's tokens and treatments, is done) and **#158**
`handoff-predates-the-backlog-session` (HANDOFF.md lags today's twelve
changes).
**State**: main at `1052adb` + this bookkeeping. 22 open items ↔ 22 open
issues. 0 active changes, 0 validation errors. Board: 161 archived
changes, 13 capabilities.
**Next**: a fresh session — either the #157 tail (routine), the #158
reconciliation (short), or the operator's decisions (#153, #146, #91/#93).
#94 ripens in about a week.
**Watch out**: Undertow's equity ($30.14) is under its $33.33 sizing
floor — benched on new coins until funded or resized (the operator's
knob, #146). The container's PostgreSQL stops when idle; `service
postgresql start` before `test:db`/`serving` gates.

## 2026-08-12 (the backlog worked) — live probes refresh eight items, and #108's prescription is executed whole

**Did**: The operator asked for the issue tickets to be worked. A read-only
probe round against live BattleGrid (v17.2.0) refreshed the question items:
**#107** — `get_agent_fund_allocation` answered all-zero for Undertow AND
Breakwater in the same minute `list_user_active_positions` reported ~$11
margined on each, the fourth measurement and the first on two agents at
once; **#114** — `get_market_context({})` refused identically on a third
major, and v17's *description prose* now states the precondition its JSON
Schema still doesn't express; **#135** — no BLOCKED radar deployment yet
(all 20 `blockedReason: null`), but the fleet summary grew a `blocked`
count and a top-level `blockedAgents: []` nobody had recorded; **#146** —
Undertow's gate-block total hit 5,014 (~120/h, was ~90/h), plus one
`EXCHANGE_MIN_NOTIONAL_UNREACHABLE` showing equity ($30.14) under the
sizing floor ($33.33): the agent is benched by arithmetic on new coins;
**#104** — still zero players on all 50 sessions; **#103/#106** — agent
slots now read 3/3 used (and the slot cap became *readable*, correcting
#106's premise). Four `backlog_change_archived` warnings cleared (#91,
#107, #110, #114 — archived `change:` links cleared with explanations);
#85's stale `blocked_by` cleared with the upstream inertness now watched
in the item itself. Then **#108 was executed exactly as prescribed**:
`/surface` on `/agents/[id]/archive` → `agent-archive-confirm` manifest
(7 components; survey found the missing pending-feedback state, filed as
**#153**); `/design` wrote **DT-0003** (tokens: `size.control.min` 44px,
generator emits it, `min-h-control` replaces raw `min-h-11`) and
**DT-0004** (restyle: consequence/danger/notice roles for the three
message blocks, "Refused:" prefix, secondary hover, active states, mobile
stacking); both implemented, controls test asserts the token chain
end-to-end. Gates: typecheck, lint, 2126 vitest, build, drizzle clean.

**State**: 22 open items, all touched ones current as of today. Design
lane: 5 surfaces (2 designed), 4 tickets (4 implemented). #108 narrowed
to its last gap — `/connect`, `/explorer`, `/pending`, the pipeline
simulator and remaining confirmations have no manifests/tickets.

**Next**: `/surface` another confirmation page or `/connect`, then
`/design` — the remaining #108 gap is now routine. Or `/propose` on #153
(pending feedback needs a client-boundary decision). #94 still waits on
recorder depth.

**Same session, round two — the metric workbench reads the declared
grammar** (change of the same name, standard track, verified and archived
same day; 149 → 150 archived changes). The metric page's `REL_TIMEFRAMES`
— the last platform vocabulary spelled into source, and a fixed-list
classifier the enumerated-control requirement forbids — is deleted. The
page reads its form through the shared `columnFromQuery` (timeframes travel
tagged; a bare `tf=anchor` from an old URL degrades to the stated problem,
never a misfile), offers timeframe/bars/ordering/side declared-or-withheld
plus the chained input, and `ReadMetricQuery` carries `columnControls` on
the metric outcome. `Declared`/`timeframeOptions` extracted to
`src/presentation/components/declared.tsx`, both column surfaces import it.
The requirement's reach is now stated in the spec as every column-composing
surface, with two new scenarios. Closed #115 (`v5-surface-additions-
unconsumed`) — its residual was exactly this; the rest were records.
Gates: typecheck, lint, 2130 vitest, build.

**Round three — the probe tells its failures apart**
(`a-refusal-and-an-outage-stop-reading-alike`, lite, archived; 151
archived changes). #114's Fix #3: `probe_mcp_surface.py` records
`call_failed_code` beside `call_failed` — the structured code on a
refusal, null on prose/transport — mirroring the adapter's `codeOf`.
Additive key, nothing consumes `call_failed` outside the probe; takes
effect on the next probe run. #114 stays open for upstream's schema only.

**Round four — returned with an explanation** (`returned-with-an-
explanation`, lite, archived; 152 archived changes). Found while opening
the #108 thread toward `/connect`: the OAuth callback has always sent its
bad news to `/connect` (`?declined=<error>`, `?error=incomplete|untrusted`)
and the page read none of it — the spec scenario "The user declines"
promises an explanation with the retry, and only the retry existed. The
delegated branch now renders a decline in the notice role (role="status" —
the user chose; nothing failed) and a failed callback in danger
(role="alert"), unknown error values verbatim, every message stating
nothing was stored. Six rendering tests. Gates: typecheck, lint, 2136
vitest, build.

**Round six — a bounced agree says why** (`a-bounced-agree-says-why`,
lite with a delta, archived; 154 archived changes). The same defect class
as round four, one surface later: the proposal pages minted three
redirects nobody rendered. A refused agree bounced to
`/pending/<id>?problem=` and the page read no searchParams; the
change-was-made-but-proposal-already-closed message — whose own comment
says "the operator would not know the account moved" — went to
`/pending?problem=` and was dropped; `?note=already-resolved` likewise.
Both pages now read and render them (problem in danger/role=alert with
the archive page's "Refused:" prefix, threaded through the Shell so it
survives on every branch; note in notice/role=status). The mcp-control
agree requirement gained the two scenarios the redirects half-implemented.
Three new rendering tests; `openProposal` wired into the rendering
harness. Full local CI green (scripts/ci.sh with DATABASE_URL +
CI_SERVING — the operator pointed out this is the CI; Actions are
billing-blocked by decision).

**Round twelve — the refusals dress alike** (`the-refusals-dress-alike`,
lite, archived; 159 archived changes; #156 filed and closed same-day).
Twelve `?problem=` banners still wore the neutral border DT-0004 retired
— agent deploy/rebind/reactivate/undeploy, strategy
archive/restore/fork/conditions-save/rules ×2, recorder trim, and
agent-edit.tsx. All wear danger now; the eleven page banners carry the
"Refused:" prefix, agent-edit does not (its prop mixes in the product's
own catalog advisory). Grep gate: no neutral problem banner anywhere.
Full local CI green.

**Round eleven — the pipeline simulator** (#108 gap 2, sixth surface
pass). Manifests for both pipeline routes (15 components); DT-0010
implemented — the disagreement sentence wears notice on the
own-evaluation page, identical to DT-0009 on the competitor's, one ruling
on both evaluation details. The stages page needed no ticket. Full local
CI green at c1ad290. Design lane: 13 surfaces, 10 designed, 10/10
tickets. Gap 2 is down to the remaining confirmations and the three
early list surfaces.

**Round ten — the explorer subpages, and the sweep's residual**
(#108 gap 2, fifth surface pass; 158 archived changes). Manifests for
`/explorer/[agentId]` and its evaluation detail (12 components); DT-0009
implemented — the signals-disagreed sentence wears notice (the one fact
that says the aggregate is a compromise, previously weighted like the
timestamp). The pass caught 4 bare `border-l` rails the `rounded border`
sweep could not see — fixed as `the-rails-join-too` (lite, archived); a
grep gate now finds no bare directional border anywhere. One CI wobble:
PostgreSQL stopped between the migrate and serving gates — restarted,
full re-run green at working tree of 579e0aa. Design lane: 11 surfaces,
8 designed, 9/9 tickets implemented.

**Round nine — the borders join the palette**
(`the-borders-join-the-palette`, lite, archived; 157 archived changes;
closes #155 same-day). The mechanical sweep DT-0008's precedent unblocked:
every bare `rounded border` — Tailwind's untokened default grey — became
`rounded-gc-2 border border-border-default`. Real count **86 across 37
files**; the item's 67 undercounted by matching one quoting style.
Pre-verified: no color companions, no comment hits, no variants clipped.
Full local CI green.

**Round eight — `/explorer` through the design lane, and a product-wide
finding** (#108 gap 2, fourth surface pass). The dropped-redirect sweep
came back clean — connect and pending were the only two instances. The
survey found 67 boxes across 20+ files wearing bare `rounded border`
(Tailwind's default grey, untokened — the input defect control.ts
documents, surviving product-wide on cards); filed as **#155** with
DT-0008 as the precedent treatment its mechanical sweep will execute.
DT-0008 implemented: field cards wear border.default at radius.2, the
this-is-not-the-whole-field sentence wears notice. Full local CI green at
fe1443e. Design lane: 9 surfaces, 6 designed, 8/8 tickets implemented.

**Round seven — `/pending` through the design lane** (#108 gap 2, third
surface pass). Manifests for both routes (`pending-queue`,
`pending-proposal`); DT-0007 implemented — consequence/notice/quiet roles
for the proposal page's three load-bearing sentences, zero copy changes.
The queue needed no ticket: its banners landed pre-roled by round six.
Full local CI green at b1e2153. Design lane: 8 surfaces, 5 designed, 7/7
tickets implemented.

**Round five — `/connect` through the design lane** (#108 gap 2, second
surface). New manifest `connect.json` (7 components; the declined/failure
banners recorded with their roles as constraints), then DT-0005 — the
not-view-only warning wears **consequence** (it is the sentence being
agreed to), the Not requested block wears **quiet** (absence stated, not
implied), zero copy changes, consent test untouched — and DT-0006 — the
shared not-connected component's connect link wears `BUTTON_SECONDARY`
(the way in as a target, DT-0001's strategy-not-found precedent), landed
once in `require-connection.tsx` and inherited by every authenticated
page. Both implemented; both manifests refreshed at the implementing
commit. Design lane now: 6 surfaces, 3 designed, 6/6 tickets implemented.
Gates re-run green (2136 vitest, build).

**Watch out**: `min-h-11` must not come back — the controls test forbids
it by name. The WEARS_BUTTON scan now accepts the composed template form
(`${BUTTON_PRIMARY} w-full tablet:w-auto`), mirroring labels. Undertow's
equity is under the smallest position's floor; that is the operator's
knob (#146 note), not the product's.

## 2026-08-11 (the merge round) — four PRs reviewed, gated and landed; zero P1s remain

**Did**: The operator authorized review→CI→merge on the open PRs, in
order. **#151** (session records: HANDOFF reconciliation, #145 closed,
tsx pinned) merged first — its gates had run green on its head all
session. **#149** (first deployments through the deploy surface) needed
one real fix found by the typecheck gate: `DescribeUndeployResult`
aliased the deploy result, so the `expectedRevision: number | null`
widening leaked into undeploy — whose describe always binds an existing
revision and whose perform requires a number — and the undeploy page's
hidden field failed tsc. Undeploy now declares its own non-null type;
vitest alone had not caught it (it does not typecheck). **#148** (dead
agent fields retired) carried its completed change unarchived — archived
on the branch before merging, so main never held an active change; its
HANDOFF edits were superseded by main's fresher reconciliation and
resolved in main's favor. **#150** (trade-level policy readable) arrived
pre-archived and clean, and closed the last open P1. Every merge ran the
full local gate set on the merged state first (typecheck, lint, 2123
vitest, build, schema-drift, 85 db — this repo's CI is local by design).
JOURNAL conflicts were resolved by keeping both sessions' entries, all
three rounds.

**State**: `main` holds 149 archived changes, 13 capabilities, 21 open
backlog items, **no open P1s**, and one open PR — #82, the
reconciliation record, deliberately left for the operator to read.
Suites green at every merge point.

**Next**: #94 when the record (accumulating hourly since this evening)
holds days of depth. The recording host should `git pull` + `npm install`
at its convenience — tsx now resolves locally and the deploy surface
gained first deployments.

**Watch out**: A type alias between two describe results is how #149's
defect happened — when two ceremonies share a shape, the moment one
diverges the alias must split, and only tsc notices. And three parallel
sessions all prepending JOURNAL entries guarantees merge conflicts; the
union resolution (keep both, markers stripped) was right every time.
## 2026-08-11 — v15-trade-level-policy: read, display, refuse to edit

**Did**: Proposed, implemented, verified, and archived
`v15-trade-level-policy` (standard track, PR #150). Added
`TradeLevelPolicy` to the domain, mapped the three fields
(`maxStopLossPct`, `minStopLossAtrMultiple`, `minRiskRewardRatio`) from
`get_strategy`, rendered them on the strategy detail page between "When it
acts" and conditions, and stated the inert compiler condition — no editing
control offered. Two mapper tests (happy path + null-when-omitted), local
CI green (typecheck, lint, 2123 vitest, drizzle-check, build). Code review
caught three test files with inline `StrategyDetail` literals missing the
new required field; fixed and pushed. Backlog item #95 closed, delta specs
merged into the main `strategy-authoring` spec.

**State**: Change archived at `2026-08-11-v15-trade-level-policy`. PR #150
open as draft. 24 open backlog items (was 25).

**Next**: Merge PR #150. The p1 queue is now empty. Next product session:
`/board`, then the p2/p3 tail — #145 (is the recorder cron running) still
gates `/propose` on #94.

**Watch out**: The verifier noted T7 (presentation rendering test for the
policy section) was satisfied by the mapper tests rather than a dedicated
component rendering test. The section is straightforward JSX reusing the
`Threshold` helper, so this is not a gap, but a future change to the
policy section should add one. The compiler inertness is upstream — when
BattleGrid ships a working compiler for these fields, the inert-state
notice and the `TradeLevelPolicy | null` nullability can be revisited.
## 2026-08-11 — retire dead agent fields (arenaChallengeEnabled, overlayText)

**Did**: Picked up backlog item `two-agent-owned-fields-no-tool-can-write`
(#113) — both fields were dropped from BattleGrid between v9 and v11 but
still modelled as constants. Proposed as `dead-agent-fields-retired`
(lite, skip_specs). Removed from: `Agent` type, `AGENT_OWNED` tuple,
mapper (`RawAgent` + mapping lines), create port param, adapter create
signature + payload, create command DTO, describe-edit consequence branch,
and `propose_agent_change` tool description. Fixed five test files. All
quality gates green (typecheck, lint, 2121 tests, build, openspec
validate). #113 closed, backlog item marked done. PR #148.

**State**: Change `dead-agent-fields-retired` complete, awaiting merge of
PR #148. 24 open backlog items (was 25). All suites green.

**Next**: Same as previous session — operator answers #145 to unlock #94.
For a product session: `/board`, then the p3 tail.
## 2026-08-11 — first deployments through the product's own ceremony, live-confirmed and archived

**Did**: Implemented, verified, live-confirmed, and archived
`the-deploy-surface-can-create-first-deployments` (PR #149, closing #109).
The deploy ceremony now carries first deployments (`expectedRevision: null`)
alongside replacements: `DescribeDeployQuery` branches on whether the coin
is occupied, `nullableInteger` round-trips null through the HTML hidden field,
the live probe gained a slot-shuffle test (undeploy a coin, first-deploy it
back with null revision, verify it lands). 2123 vitest tests green; the
concurrency architecture guard caught `??` on the hidden field and the fix
was a ternary. Live-confirmed against ENA on the real platform.

**State**: No active changes. 24 open backlog items (closed #109). PR #149
ready for review. Board health: 0 errors, 11 warnings (the 4
archived-change warnings are pre-existing from earlier sessions; the
`assistant` capability warnings are expected — no spec yet).

**Next**: P1 `v15-trade-level-policy-is-declared-but-inert` — `/propose` it.

**Watch out**: The slot-shuffle live probe needs at least one enabled
single-slot deployment on the account; if the radar layout changes it skips
rather than fails. `nullableInteger` uses `=== null ? '' :` not `??` —
the concurrency guard (`concurrency.test.ts`) forbids `??` with non-null
fallbacks on identifiers to prevent fabricated values. The 4
archived-change backlog warnings (`oauth-path-may-be-dead-weight`,
`performance-and-allocation-are-unmodelled`, `the-payload-carries-more-than-is-read`,
`two-read-tools-do-not-answer`) are intentionally open — each documents an
ongoing question that outlived its linked change.
## 2026-08-11 (the record begins) — a host exists, and the gap stopped growing at four days

**Did**: The operator chose their Windows machine and, walked through it
live, stood the recorder up the same day the gap was measured. **The
record's first persisted capture is 2026-08-11** — run `6c6a6fc0`,
platform 17.2.0, all 20 radar deployments at 1h, 84 signals each — into
PostgreSQL 18 on that machine, with an hourly Scheduled Task
(`GridCommanderRecorder`, :17 past, `-WakeToRun -StartWhenAvailable`)
registered and Ready. The Windows recipe (execution policy, `record.ps1`,
`Register-ScheduledTask`, the PostgreSQL-18-path and password-typo traps)
is filed in `confirm-the-recorder-is-running`, **closed the same evening
when the unattended fire was proven** — `Start-ScheduledTask` through the
service machinery, `LastTaskResult : 0`, a result the wrapper only
produces when the recorder recorded. The walk exposed a
real repo gap: `npx tsx` prompts to download tsx **inside the unattended
run** because tsx is not a dependency — filed as
`tsx-is-not-a-dependency` (#152), worked around on the host with
`npx --yes`.

**State**: The four-day gap (2026-08-07 → 2026-08-11) is permanent and
documented; everything after it is being captured hourly, machine-sleep
holes excepted. #94's gate moves from "answered at zero" to "accumulating
since 2026-08-11".

**Next**: #94 waits for the record to hold enough to say anything —
days, not hours.

**Addendum, same evening**: the tsx fix did not wait —
`tsx-is-a-dependency` (lite) proposed, executed and archived in one
pass, closing #152. `tsx@4.23.12` pinned in `devDependencies`; all six
quality gates green (typecheck, lint, 2121 vitest, build, schema-drift,
85 db); the Windows recipe's `--yes` note now marked unnecessary. This
makes the 146th archived change and leaves 24 open backlog items.

**Watch out**: The recorder host is a personal Windows machine — hours
it spends powered off are honestly-labelled permanent gaps, and
`/recorder` will show them. Do not mistake them for a dead scheduler:
`Get-ScheduledTaskInfo -TaskName GridCommanderRecorder` distinguishes
the two (`LastTaskResult : 0` = alive).

## 2026-08-11 (the recorder question answered) — it has never run, and the gap is already four days

**Did**: #145 answered with the operator, live. The operator confirmed no
persistent deployment exists — Grid-Commander has only ever run in
ephemeral sessions — so the recorder cron was never installed anywhere,
the durable record holds zero captures, and **the gap starts at the
2026-08-07 ship date and widens daily** until a host exists. The pipeline
itself was proven with the operator's key in this session: freshness gate
green (platform still 17.2.0), then one real capture run — exit 0, all 20
radar deployments at 1h, 84 signals each — into this container's
throwaway database, discarded with it. Filed the answer in
`confirm-the-recorder-is-running` (with the one-time host setup: four env
vars, the base64-32 encryption key requirement the recorder enforces,
migrate, hand-run to exit 0, then the cron line) and noted #94's gate as
answered-at-zero in `recorded-signals-are-not-yet-evidence`. HANDOFF
updated to match.

**State**: #145's item stays open — the check is answered but the fix
(a host running the cron) is the operator's choice, not made yet. #94
stays ruled out at zero captures.

**Next**: The operator picks a host; the item has the whole recipe. Every
day before that is permanently unrecorded — this is now the only thing on
the board where waiting has a daily cost.

**Watch out**: The recorder wants `TOKEN_ENCRYPTION_KEY` as 32 bytes
**base64** — `openssl rand -hex 32` is refused with "must be 32 bytes,
base64-encoded". And PostgreSQL in these containers still dies quietly;
`pg_ctlcluster 16 main start` before blaming the code.

## 2026-08-11 (the handoff catches up) — every number in HANDOFF.md re-verified against reality

**Did**: Audited HANDOFF.md for internal inconsistencies and re-verified
every countable claim: 2121 vitest green, 85 db (table said 81), 243
harness, 145 archived changes (table said 138, prose said 132), 25 open
backlog items mirrored 1:1 by 25 open GitHub issues (table said 29, the
stale "Start Here" split said 31), 30 live probe files (prose said 26),
one P1 not two (`the-surface-map-is-two-majors-stale` closed as #92).
Refreshed the "Start Here" section around the three parting concerns
(#145–#147) and the current 25-item split; recorded that PR #144 merged
and parallel sessions opened #148–#150 (unmerged) the same day; de-numbered
ci.sh's stale "62 database tests" skip message. The middle sections had
simply not been updated when the summary paragraph was, at the 08-11 close.

**State**: No code changed — docs and one script message only. All suites
re-run green in this container (vitest, db after migrate, harness).
Validation still 0 errors / 11 warnings, all pre-existing.

**Next**: Unchanged from the close below — the operator answers #145.
Three of the 11 validation warnings ask open backlog items linked to
archived changes to say what is left; a tracker pass could tidy them.

**Watch out**: Three open PRs (#148, #149, #150) each build or touch an
open backlog item (`the-payload-carries-more-than-is-read`,
`the-deploy-surface-cannot-create-first-deployments`, the v15 P1's
read side) — merging them will re-stale the split in HANDOFF.md; close
the items or update the split when they land.

## 2026-08-11 — session close: v17.2.0 followed same-day, eight closes, three builds, three parting concerns filed

**Did**: Thirteen PRs merged (#132–#144, the last pending the operator's
final merge). The freshness gate caught BattleGrid v17.2.0 and everything
followed same-day: surface artifacts regenerated, `positionManagement`
re-learned (`the-count-held-and-the-fields-moved`, closing #92 with the
vocabulary artifact + value gate), the regime-ref question answered and
the research doc corrected (#90), retention measured and #99 closed,
v17's two read surfaces taken filed→observed→built (#133
`an-evaluation-explains-its-conditions`, #134
`management-status-in-the-platforms-words`), the condition composer's
`required` control shipped (#88 `a-draft-can-insist`), #98 closed as
overtaken with lifetime evidence, #105 declined on its own analysis.
Filed at close: **#145** (is the recorder cron running — gates #94),
**#146** (OPEN_POSITION_CONFLICT churn tripled), **#147** (the deciding
branch awaits a required condition). #107 gained the approval-expired
candidate line. HANDOFF.md state updated.

**State**: No active changes. 25 open items. All suites green (2121
vitest, db, harness, full ci.sh); live freshness green at 17.2.0
including the new vocabulary gate. PR #144 open as the session-close PR.

**Next**: The operator answers **#145** (five-minute deployment check);
its answer unlocks `/propose` on #94, the largest open build. For a
product session without that answer: `/board`, then the p3 tail.

**Watch out**: BattleGrid deploys fast and quiet — v17 arrived at patch
.2, so two deployments passed unseen between probes; run the live
freshness suite early in any session. `mcp:read` remains write-capable;
scratch live probes belong in `tests/live/` via `vitest.live.config.ts`,
run once, deleted. The platform's PostgreSQL container here dies
periodically — `pg_ctlcluster 16 main start` and re-run. `verdict`/
`decidedBy` in `conditionEvaluation` are rendered verbatim but have never
been seen non-null (#147) — do not model meaning onto them. The
`AGENT_APPROVAL_EXPIRED` semantics are deliberately unexplained in the
product; the question lives in #107's draft report now.

## 2026-08-11 (the gameType widening) — declined on its own advice, re-verified

**`market-grid-standings-need-a-gametype-not-a-second-mapper` closed as
wontfix (#105)**, by the item's own 2026-08-06 analysis, re-verified live
at v17.2.0 today: `COIN_GRID` still answers zero rows, `ALL` and
`MARKET_GRID` are still byte-the-same list, and the sibling that had to
ship first (`/explorer` rendering the rows) is done. A declared enum
value whose two live values return the same bytes, with no surface asking
the question, stays unbuilt on purpose. Reopens if the arena grows a
standings panel or `COIN_GRID` gains players. Colour from the re-read:
the operator's all-time profit rank drifted 7 → 205 since 2026-08-03 —
the platform is filling with players.

## 2026-08-11 (a draft can insist) — the flag that unlocks the deciding branch

**`a-draft-can-insist` archived**, closing #88. The condition composer
gained its missing control: "Holding is" — optional (BattleGrid's default,
empty-valued, first) or required (`must-hold`). The parse takes required
only from the explicit value; absent, empty or unoffered words compose as
optional, the `verdictOf` asymmetry applied — a wrong "optional"
understates, a wrong "required" silently hardens. The retarget path stays
carrying the source's flag whole, and the seeded note now names the
holding control among what a seed overrides, so no offered control is
silently ignored.

What raised a p3 to worth-doing-today: #133's morning observation showed a
`required: false` condition never produces a deciding verdict — this
control is what makes the condition system's deciding branch, which the
evaluation page now renders, reachable at all from this product. Spec:
"A Drafted Condition Can Be Tried Without Being Saved" modified. 2121
offline tests and full CI green.

## 2026-08-11 (the commonest block) — gone with the agents that carried it

**`approval-expired-on-a-full-execution-agent` closed (#98)**, overtaken
rather than answered. The funded fleet was probed across its lifetime:
Undertow 3,809 blocks, Breakwater 346, Vanguard 0 — and **zero
`AGENT_APPROVAL_EXPIRED`** in any sampled page (600 rows across Undertow's
six pages, creation to now). Everything is `OPEN_POSITION_CONFLICT` but
one min-notional and 22 daily-limit rows. The never-funded trio that
generated 134 blocks a week is archived; the p2 harm left the account
with them.

The semantics stay where the item's own rule put them: the 2026-08-06
two-account evidence contradicts every clean reading, there is no live
subject left to probe, and the meaning belongs to BattleGrid's operators —
a candidate line for the #107 upstream report, not a guess. The surface's
code-count-window rendering was already correct under every reading.

In passing: Undertow's `OPEN_POSITION_CONFLICT` runs ~90/hour now
(`gateStage: TOKEN`, before the model call — not a spend line). Same
pattern as #96's lever note, three times the volume.

Also this cycle: `oauth-path-may-be-dead-weight` (#91) was picked up and
put back — on reading, its settle condition ("does weeks of real use ever
touch /connect") and its three untested segments all need the operator;
nothing in this environment can advance it. It stays open, correctly.

## 2026-08-11 (the engine speaks) — one line, verbatim, and nothing claimed for silence

**`management-status-in-the-platforms-words` archived**, closing #134 the
same day it was filed, observed and built. Each open position now carries
"Management engine: break-even ACTIVE · trailing ACTIVE — BattleGrid's
own words", under the note that management moves the stop after the
decision. The observation's one-value-deep limit did the design: verbatim
strings end to end, an unseen word renders as itself (tested with an
invented `GIVEBACK_ARMED`), absence renders no line — the platform saying
nothing is not an idle engine. What a state *means*, and the
disabled-management case, stay deliberately unbuilt until the platform
shows them. Spec +1 requirement; 2119 offline tests and full CI green.

## 2026-08-11 (the management status) — observed one value deep, and the p2's precondition is the operator's to answer

**#134's first step done.** `list_user_active_positions` live: 8 open
positions across two agents, and every row carries v17's two new fields as
plain strings — `breakEvenStatus: "ACTIVE"`, `trailingStatus: "ACTIVE"`,
all eight identical. Real and populated, but one value deep: the rest of
the vocabulary and the disabled-management case are unobserved, and both
are recorded as the limits on the item. The honest build (verbatim words
beside the resting legs, unknown values rendering as themselves, no enum
from a single member) is now de-risked and queued.

Also noted while picking work: the p2 `recorded-signals-are-not-yet-evidence`
(#94) gates itself on "do not start until the record holds enough
captures" — and the record lives on the operator's deployment, not in this
session's ephemeral database. Whether the recorder cron has been running
since 2026-08-07 and how many captures it holds is the operator's fact;
the item stays queued behind that answer. Scratch probe run once and
deleted. No code changed.

## 2026-08-11 (the conditions speak) — the evidence layer rendered, nothing recomputed

**`an-evaluation-explains-its-conditions` archived**, closing #133 the same
day it was filed and observed. The evaluation detail page now carries "What
the strategy's conditions said": per condition the platform's verdict with
its clause evidence — the observed value beside the threshold, verbatim
("rate ≥ 0.0004 — observed 0.0013 — TRUE"), known ops as symbols, unknown
ops as themselves — plus the tally, the strategy revision the conditions
came from, and the platform's `provisional` word where it says it.

The honesty rules did the design work. Nothing is recomputed: every
comparison shown is the platform's own, and the clause values stay verbatim
decimal strings whose units belong to their columns. No block renders no
section — publishing nothing is a real state, never "all passed". The
public path lands on null by construction (the public tool never declares
the block), so the shared mapper needed no owner flag. And the
never-observed deciding branch (`verdict`/`decidedBy`) closes honestly
rather than staying open as work: carried verbatim, rendered the day a
required condition first decides — nothing left to build, only a fact to
notice.

Spec: `agent-understanding` +1 requirement. 2115 offline tests and full
local CI green (PostgreSQL died once mid-run, its habit; restarted, green).

## 2026-08-11 (the condition evidence) — observed, populated, and one gap named

**#133's first step done** — the observation the item demanded before any
modelling. `conditionEvaluation` read live on Undertow across all three
terminal statuses on the board (OPEN, SKIPPED, PASS): three of three
populated, identically shaped, so the axis is real — not a v15-style
declared-but-inert one. The payload nests under a single `log` key
(32 keys at v17.2.0).

The shape is the good kind of evidence: each clause carries the *observed
value beside the threshold* (`operand: "0.0013"` — the live funding rate —
against `literal: "0.0004"`), clause-level TRUE/FALSE making the OR
visible, and `strategyRevision` tying the verdicts to the revision that
defined them. The recorded gap: `verdict`/`decidedBy` were null on every
read, because Cannae's one condition is `required: false` — the deciding
branch has never been observed and must be seen on a required condition
before those fields are modelled as meaningful. Item stays open for the
build; scratch probe run once and deleted. No code changed.

## 2026-08-11 (the regime ref) — null meant "not yours to derive", and nothing is dead weight

**`four-signals-depend-on-a-timeframe-columns-cannot-reach` answered and
closed (#90)**, by the item's own settle plan, reads only. The question was
which of three readings explained `rel: regime` resolving to `null` on
every anchor while four signals declare a `REGIME` dependency. The answer
is **(3) with (1)'s mechanism beside it**:

- `CLOSE @ rel:regime` **compiles** (output header `close_reg`) and a
  preview with `regimeTimeframe: 4h` against a 1h anchor **rendered a real
  price** — with the `distinctTimeframes` budget counting 2, and 1 under
  auto-derive. `resolvedByAnchor: null` encodes *not a function of the
  anchor*: the regime relation resolves from the strategy's own regime
  settings, which a bare vocabulary read cannot know.
- Regime *metrics* are "timeframe-inert (a bundle read)" — the platform's
  own refusal words, matching the v17 artifact's `timeframeMode:
  "timeless"`. Their `REGIME` dependency names the bundle, not the ref.
  Two teaching refusals recorded (`REPORT_COLUMN_CONSTRUCTION_FAILED`,
  `REPORT_COLUMN_SECTION_TIMEFRAME_UNSUPPORTED`).
- The dead-weight reading (2) is dead itself, on both ends.

The research doc's §3.5 claim — "rel: regime is inert. Use an absolute
timeframe." — is **overturned in place**, and §3.6's unverified paragraph
settled, both together as the item instructed. The probe was a scratch
file in `tests/live/`, run once, deleted. No product code changed.

## 2026-08-11 (the count held and the fields moved) — v17.2.0, and the vocabulary becomes values

**`the-count-held-and-the-fields-moved` archived**, closing #92. The live
freshness gate caught a deployment this morning: recorded v16.0.0, live
**v17.2.0** — and v17 arrived already at patch .2, so two deployments came
and went unseen. The tool count held at 114 with zero names added or
removed while **seventeen tools changed schemas underneath** — the exact
pattern the domain notes warn about, now demonstrated on the version the
notes were written against.

The centre of it: **`positionManagement` redesigned**. Out:
`breakEvenTriggerTpProgressPct`, `trailingType` (`ATR|FIXED`),
`trailingAtrMultiple`, `trailingFixedPct`. In: `breakEvenTriggerR`
(0.5–2) and `trailingGivebackPct` (25–55). The block is 15 → 13 keys,
identically on both agent writes, all three agent reads, and the catalog
(three defaults renamed; the time-decay stale threshold default quietly
moved 50 → 25). Until the domain followed, every create this product
composed was un-sendable — a lingering removed field rejects the whole
payload. `trading-config.ts` re-learned the block (OURS lost its
`trailingType`, the assembled set and `POSITION_MANAGEMENT_FIELDS` moved
to twelve, fallback literals mirror the live defaults); the mapper needed
nothing — its prefix-strip and verbatim preset configs were built for
exactly this. 2102 offline tests and the full ci.sh run green, freshness
gate included, db tests included.

**#92 landed the same day its premise was demonstrated**:
`tools/probe_vocabulary.py` records `list_strategy_vocabulary` verbatim
into `docs/battlegrid-vocabulary.json` — the carve-out from shape-only,
platform-owned and account-independent, carrying server version and probe
time. The facts that lived nowhere are committed: `strategyConditions: 16`
as a number (4× tighter than the schema's `maxItems: 64`), 6-of-13
enabled timeframes, all 16 transform ids with `efficiency` and `maxShare`.
The live suite now compares budgets, timeframes and transform ids per
category (a values-only deployment fails a named gate); the offline check
fails if the artifact collapses back into shapes, loses its server, or
diverges in version from the surface record.

**Filed rather than built** (#133–#135): `get_signal_log`'s new
`conditionEvaluation` evidence block, the positions reads' per-position
`breakEvenStatus`/`trailingStatus`, radar's `blockedReason`/`BLOCKED`
state (+ `override_agent_protection`'s `observedLiveStopLoss`). Strategy
declarations did not move, so #95's inert trade-level policy stands as
filed.

## 2026-08-11 (the evaluations record) — measured from both ends, and the platform keeps it

**`agent-evaluations-are-not-recorded` closed by measurement**, closing #99
as unneeded per its own rule. The item's first step was a question, not a
build: does `list_signal_logs` show a retention horizon? Two scratch probes
(created in `tests/live/`, run once through the live config, deleted) read
each agent's newest and oldest evaluation by `limit: 1` paging from both
ends:

- **Undertow (live): 113 evaluations, the oldest stamped seven minutes
  after the agent was created** on 2026-08-08. Its whole lifetime is
  reachable.
- **THE .0 (archived): 79 evaluations reaching sixteen days back** to
  2026-07-26 — still served three days after archival. Archival does not
  purge the record.

No horizon visible, so nothing gets built. The close records what the read
does *not* prove — the reachable record is only sixteen days old, and one
read cannot rule out a count cap — as two sentinels in the item, two
`limit: 1` reads each: THE .0's oldest evaluation is pinned by archival and
can only move if the platform trims (age), and Undertow's total plateauing
while its oldest advances would show a cap (count). Either reopens #99.
No code changed.

## 2026-08-11 (the fleet spend line) — the ruling's number, rendered where the fleet is

**`the-fleet-spend-line` archived**, closing #129. `/agents` now says what the
fleet spent on model calls — the hub's own `totalCost24hUsd` beside its
active-agent count, labelled as BattleGrid's figure. The number the
accept-as-tuition-or-cut-volume ruling runs on (#96) is on a surface instead
of behind a hand-made platform call: **$1.34/24h across 3 active agents** at
the fixture's mirror of the live read.

The two-sources discipline held the scope: the total renders because only the
hub publishes it; the per-agent figure keeps its home on each agent's limits
page; no rival sum, no on-screen roster-vs-hub comparison — the cross-check
stays diagnostic lore in the items that record it. The message meter (0/100)
and `hubStatus` are declined with reasons rather than bolted on.

Independence in both directions, tested both ways: an unreadable hub costs one
line and the roster stands; an unreadable roster does not silence the one
number the ruling needs. A missing figure renders as "not a spend of zero" —
the distinction the whole spend saga turned on, now in copy.

BattleGrid's MCP connection dropped again mid-change (the flapping continues);
nothing here needed it — the shapes were recorded in #129 before it went.

## 2026-08-11 (the spend meter) — recovered, cross-checked, and #96 closes without a line of code

**`the-spend-meter-reads-zero-while-agents-run` resolved by measurement.** The
first act of the newly-connected BattleGrid MCP session was re-reading the
meter #96 declared dead, and the finding inverted twice in ten minutes:

1. `get_agents_hub` — a tool the 2026-08-09 sweep never saw — carries
   `cost24hUsd` per agent and `summary.totalCost24hUsd`, all live and
   plausible.
2. The roster's `last24hCostUsd`, the copy the product renders, **recovered
   too** — and agrees with the hub to the cent (0.84517886 vs 0.85 on
   Undertow, same instant). The pinned-zero window was a temporary platform
   metering outage in the #100 flapping family. The detail read stays
   orphaned at 0 — the 2026-08-06 divergence, unchanged through two majors.

So the product's spend section works again as built, with no change: it
sources the roster row, which was the right call when it was made and is
again. The surface behaved correctly throughout; its input lied for a window.

**The number the operator was waiting on**: fleet spend is **$1.34/24h**,
down from $3.39 after the fleet re-organisation (THE .0 and Volatilis
archived; Breakwater/Undertow/Vanguard on GLM-5.2, $45 budgets, strategies
Salamis/Cannae/Trafalgar). Against ~$1.41 realized trading loss, model spend
runs ~1:1 with trading P&L now, not 4:1 — the accept-as-tuition versus
cut-volume ruling finally has its input.

**Filed rather than built**: `the-hub-answers-the-fleet-in-one-call` (#129) —
the hub's fleet spend total, the conversational-message meter (0/100, an
account ceiling nothing reads), and the server-decided `hubStatus`
precedence. The two-sources discipline is written into the item: the hub's
total is a fact only it publishes; the per-agent figure stays where it lives.

The caution outlives the close and is written into both items: this meter has
one recorded lying window, so a sudden exact zero on a working fleet is
"unmeasurable right now", never "spend stopped" — and roster-vs-hub is the
cheap cross-check.

## 2026-08-11 (the protection that actually rests) — software's stop vs the exchange's

**`the-protection-that-actually-rests` archived.** Each open position on
`/agents/[id]` now shows the reduce-only orders actually resting at the venue —
type, trigger, size, venue order id — or the sentence the section exists for:
**"No protective order rests at the venue for HYPE — as of this read, the stop
above exists only in BattleGrid's software."** `effectiveStopLoss` is
software's intention; a resting order is one the exchange honours on its own,
including while BattleGrid spends an evening flapping the way it spent this
one.

Built the same night its observation landed. `get_open_orders` had been blocked
on observation since 2026-08-01; tonight it answered six uniform rows, and a
follow-up `get_order_status` call taught the sharpest fact in the design: the
leg observed OPEN at 19:20Z was CANCELLED by 19:45Z — position management had
replaced it. Rows churn in minutes, so the surface words itself as a snapshot
("as of this read"), the same honesty the priced-at stamp already carries.

The join is by coin over reduce-only rows, in the query — the row carries no
positionId and no agentId, so the coin is the only honest key. The venue read
is the exposure query's fourth independent read: losing it costs the resting
column, never the holding. Rows without a readable orderId or symbol are
dropped, never fabricated — a leg rendered under an invented id would send an
operator to the venue for an order that does not exist.

Deliberately not built: reconciling the venue trigger with the platform's
effective stop into one figure (two systems' words, no published common
scale), and `get_order_status` (observed, recorded on #116, no consumer yet).
The market-context reads stay on the narrowed item.

One pre-existing test was corrected rather than obeyed: the target-drift test
asserted the whole page contains no word "protect" — a page-wide proxy for a
sentence-level claim. The naked-position warning legitimately says
"protective order"; the assertion now pins the drift wording itself.

PostgreSQL died a fourth time mid-CI. `pg_ctlcluster 16 main start`, re-run,
green: 2,092 vitest, 85 db.

## 2026-08-10 (the record can be forgotten) — and the nine-day observation landed

**`the-record-can-be-forgotten-with-ceremony` archived**, closing #112. The
recorder's whole promise is that a gap can never be filled in later, which
makes a trim the one act in this product whose loss is permanent by the
product's own argument. It now exists, and only with ceremony: `/recorder/trim`
describes exactly what becomes unknowable — runs, captures, failed attempts,
readings, coins, the span — mints a confirmation bound to the boundary **and
the described extent**, and the perform spends it once. Two runs described and
one would go extra → `mismatched`, nothing deleted.

The boundary is the run, not the row: coverage derives gaps from runs, and rows
deleted under a surviving run would leave the record claiming attempts whose
findings are invisible — a recorder lying about itself.

Declined on the record: raw-only trimming (needs a tombstone column and a
three-state `rawAnswer`; build when growth hurts) and per-coin purge (no
surface asks; a coin's record is exactly what a purge re-widens). The describe
stays off the MCP tool table — the first destructive act against our own store
is precisely what a model must never reach.

### The order-row shape, after nine days

BattleGrid came back mid-change (oauth-live went from loud-skip to ok), and the
third probe attempt of the day landed the observation #116 has waited for since
2026-08-01: **`get_open_orders` answered rows** — six, uniform, 13 keys:
decimal-string prices, `price` vs `triggerPrice`, `reduceOnly: true` on all
six (every resting order is a protective leg), epoch-ms timestamps, 0x-hex
`clientOrderId`, and **no positionId/agentId on the row** — attribution goes
through the position or `get_decision_order_attribution`. Recorded on #116
before any modelling, per the item's own rule. The open-orders slice is now
buildable; `get_order_status` needs one call with a now-known orderId.

The same window showed the flapping is per-tool: `get_account_state` answered
(3/3 slots, wager true — the arena sentence's live truth confirmed) while
`list_intelligence_agents` and `list_user_active_positions` refused. The
slots-agreement check stays half-observed in #121's thread.

PostgreSQL died twice more mid-suite (the container quirk; restart and re-run).

## 2026-08-10 (the arena's second sentence) — whether the credential could even stake

**`whether-the-credential-could-stake` archived**, closing the buildable half of
#121. The arena said *"Watching only — entering a session stakes real money and
is not offered here yet"* — true, and silent about whether the account could
take that path at all. It now names **both gates**: BattleGrid's own
`mcpWagerEnabled` setting, read live and failing independently, and the wager
scope this product never requests (D-3, guarded). One sentence per gate,
because naming only the product's refusal invites "flip something here and
play", and naming only the account's setting implies this credential could act
on it.

`hasAccount: false` renders as its own fact — a missing account is not wagering
switched off — and an unreadable account state costs two sentences, never the
sessions beside them.

### The half that was already built

#121 claims `/agents` "gives no warning before a create fails." **Wrong** —
`ListAgentsQuery` derives `CreationAvailability` from the roster's own
`slotUsage` and `CreateAffordance` renders at-capacity before the form, rank
and remedy included, pinned by `tests/agent/capacity.test.ts`. Read before
building; the issue gets corrected instead of the product getting a second
copy of a warning it already has.

### BattleGrid spent the evening down

The issue's suggested first step — do `list_intelligence_agents.slotUsage` and
`get_account_state.agentSlots` agree? — was attempted live and both reads
answered **502** (the #100 flapping pattern). The one-off probe was written,
run twice, and deleted; the question stays in #121's thread for the next live
window. The same outage put `oauth-live` into its loud-skip state during CI —
the gate saying "unverified" rather than pretending, exactly as built.

Also from this stretch: PostgreSQL died again mid-CI (the standing container
quirk; `pg_ctlcluster 16 main start` and re-run — green), and `/agents`
rendering the warning was confirmed from code, not memory.

## 2026-08-10 (the image) — built on the first attempt that could reach a registry

**`image-never-built` (p1, #89) is closed.** The Dockerfile built and ran
**unchanged** — zero edits to it, the entrypoint, or `.dockerignore`. The 2026-08-05
diagnosis was exact: the blocker was registry egress, nothing else.

What the environment needed, none of it repository configuration:

1. **The base image from `mirror.gcr.io`** — Docker Hub's CDN
   (`production.cloudfront.docker.com`) is still policy-403'd; the GCR mirror is
   allowed. `docker pull mirror.gcr.io/library/node:22-alpine`, tag as
   `node:22-alpine`, and the Dockerfile's `FROM` resolves locally.
2. **`--network=host`** — the sandbox proxy lives on `127.0.0.1:36745`, which
   inside a bridge-network build container is the container itself.
3. **Explicit proxy build-args** — this docker CLI does **not** auto-forward
   proxy env into BuildKit (measured: the RUN env carried my NO_PROXY override
   and no HTTPS_PROXY at all). Passed as the predefined args, npm goes through
   the CONNECT tunnel, where TLS is end-to-end and verifies against real
   certificates. Also measured on the way: the sandbox transparently intercepts
   *direct* npmjs traffic, which is why in-container npm saw
   `SELF_SIGNED_CERT_IN_CHAIN` 45 times while the host — with
   `NODE_EXTRA_CA_CERTS` — never does. TLS verification was never disabled.

Every open question from #89, answered by the image itself:

- Alpine/musl runs the standalone server — ready in 374ms.
- The `COPY --from=builder` paths resolve as written.
- `commander` reads everything chowned to it; `whoami` in the container answers
  `commander`.
- 355MB.

And the gate, in the real image: serve against an unmigrated database **refuses
with exit 1** and the documented message; `migrate` prints `migrations applied`;
serve then boots, `/` 307s to `/connect`, and `/agents` `/strategies` `/audit`
`/connect` `/pending` all answer 200 — the same answers the hand-assembled
layout gave five days ago, now from the artifact that ships.

One wrong turn recorded: three build failures read as npm's opaque
`Exit handler never called!` before the debug log named the certificate chain.
The lesson is the project's standing one — the first legible error is rarely the
cause; the cause was three layers down, and each layer was measured rather than
guessed (`npm ping` through the tunnel, then `env` dumped from inside a RUN).

## 2026-08-10 (the guards, closed out) — the last blind matchers, and the contract that let them count

Two changes archived, finishing what `a-guard-nobody-has-seen-fail` started.

**`a-guard-must-also-pass-when-nothing-is-wrong`** (lite) — the guard-proof
requirement said only what must make a guard *fail*, so a rule failing
unconditionally satisfied it. Both requirements gained their missing direction:
a guard SHALL pass on a clean product with the matcher unaltered, and the
mutation check SHALL NOT run in any gate. No code changed; the evidence is 283/283
architecture tests on the clean tree and a grep proving no gate reaches
`mutate-guard`. The gap was the superseded parallel proposal's catch (#123,
closed).

**`two-reachability-matchers-are-still-blind`** (standard, skip_specs) — the
scoping gap from the previous change, repaired. Reading before repairing found
it worse than filed: the form-tag spelling appeared **five times** in
`reachability.test.ts` (L143, L535, L650, L943, L976), the bound-to-action and
GET predicates four times each — beside a comment claiming the sibling checks
share a definition "so the two cannot drift apart". Five copies that happened
to still agree.

All six call sites now run seven named matchers declared once, proven in both
directions, including the `href=".."` shape that once sent a decline to the
roster and a name-boundary case so one wired form cannot vouch for every action
sharing its prefix:

```
form open-tag scan dead   SURVIVED → KILLED     navigates permissive      KILLED
action extractor dead     SURVIVED → KILLED     boundToAction both ways   KILLED
form-block scan dead      KILLED                submitsTo dead            KILLED
href extractor dead       KILLED
```

**#87 is closed.** Sixteen guards: fifteen now mutation-proven, one —
`confirmation-is-human.test.ts` — carrying a single narrow residual accepted on
the record as `the-confirmation-is-human-narrowing-residual` (wontfix, with the
reason: closing it would need the enumerate-the-spellings shape all six recorded
misses share, and a wrong guard there would be trusted).

`./scripts/ci.sh` green at 9d4c2de: 2,043 vitest, 81 db, 243 harness, build.

## 2026-08-10 (the guards) — ten of sixteen were passing with their rules dead

**`a-guard-nobody-has-seen-fail` archived.** Seven architecture guards repaired,
each proven by re-running the mutation that had survived, and the method that
found them committed as `tools/mutate-guard.mjs`.

### The one that mattered

`boundaries.test.ts` reported **13 passed (13)** with this returning nothing:

```ts
const imports = (file) =>
  [...readFileSync(file,'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]!);
```

Five rules go quiet on that line — P6, `src/mcp` reaches no port, the domain
imports nothing outward, use cases depend on ports, W-D. That is Clean
Architecture as this project defines it, and the file total never moved because
the other eight rules kept passing for their own reasons.

#87 had filed this as "11 of 12 matchers killable, item 3". The truer statement
is that they were never twelve independent matchers.

### Two ways a guard goes quiet, and only one feels like a bug

**Blind** — the matcher finds nothing, every `toEqual([])` passes.

**Permissive** — the matcher finds everything, which silences rules shaped as
*nothing is missing*. `sends()` returning `true` left thirteen MCP conformance
checks green while asserting nothing. `controls.test.ts` was silenceable both
ways at once.

### A corpus floor is necessary and nowhere near sufficient

Every one of these files counted what it scanned, and every one was blind
anyway, because the floor was built on a different regex from the rule it
vouches for. `failure-is-explained` counts wrappers with a third pattern while
both extractors go dark.

### And the reference implementation guarded its own copy

`identifiers.test.ts` — the file this repo points at as the example — had
`check()` re-declaring both regexes verbatim. Break only the live copies and it
stayed green: the proof demonstrated that a transcription worked while the rule
was dead. Two copies of a rule, inside the mechanism built to catch two copies
of a rule.

### The method had no home

Both audits ran from a script in a session transcript. The only thing that had
ever proven these guards work was not in the repository — the same defect, one
level up. `tools/mutate-guard.mjs` restores in a `finally` and on SIGINT, keeps
its backup outside the repo where `git add` cannot reach it, and refuses a find
string the file does not contain rather than reporting on a mutation that never
happened.

### Close-out

```
boundaries imports()            SURVIVED → KILLED
identifiers live scans          SURVIVED → KILLED
controls scan                   SURVIVED → KILLED
failure-is-explained extractors SURVIVED → KILLED
mcp-conformance sends()         SURVIVED → KILLED
one-destination vendor list     SURVIVED → KILLED
proposals-are-inert × 2         SURVIVED → KILLED
control (no-population)         KILLED   → KILLED
```

### Two of my own assertions were wrong, and the proofs caught them

Which is the argument for writing proofs against real behaviour rather than
against what you assume it does:

- `composition.ts` does not import `@/ports/agents.js`, and
  `src/domain/agent/catalog.ts` imports nothing at all.
- `isVendorClient('openai/gpt-5')` returns **true**. Not a defect — the
  predicate only ever sees keys of `dependencies`, and an unscoped npm name
  cannot contain a slash. The bound got recorded rather than the claim widened.

### What is left, and it is a scoping gap of mine

Measuring `reachability.test.ts` at close-out — a file this change never scoped,
because #87 calls it the best-defended in the directory — found **two rules
still blind**: the `<form>` tag scan and the server-action extractor both
SURVIVED. Filed as `two-reachability-matchers-are-still-blind` (p2, #87) rather
than folded in: 996 lines and 17 rules is its own change.

`confirmation-is-human.test.ts` keeps its one narrow residual, deliberately. It
is the file whose approach worked — it asserts both patterns against real source
— and that is the pattern the other seven now copy.

**#87 stays open.** Seven of nine repaired is not nine.

### Two sessions proposed this change half an hour apart

`2d2ddac` was already on the branch when the push went up: the same change id,
the same findings, proposal-only, written 33 minutes before mine. A parallel run
of the same task.

It was superseded rather than discarded — merged, not force-pushed over, and its
proposal kept at
`openspec/changes/archive/2026-08-10-a-guard-nobody-has-seen-fail/superseded-proposal.md`.

Being second is not the same as being wrong, and it was right about two things
mine was not. Its spec split the ground into three requirements, and two of its
scenarios are sharper than what landed: that a guard must still **pass** when
the product is clean and the rule is intact, and that the mutation check stays
**out** of the ordinary suite. The first is a real gap — as merged, the
requirement only says what must make a guard fail, so a rule that fails
unconditionally satisfies it. Filed as #123.

It also repeats #87's count of eleven matchers in `boundaries.test.ts`. Measured,
five *tests* consume `imports()`; the file reports 13/13 because the other eight
rules are independent. Same finding, wrong number — which is the whole argument
for measuring rather than citing.

## 2026-08-10 (the exposure row) — every live agent's cap is above the money behind it

**`a-cap-above-the-money-cannot-bind` archived**, closing the last unbuilt row of
the p1 `a-stop-inside-the-noise-looks-like-a-tight-stop`. `get_account_state` is
read for the first time in the product's life, and the exposure cap now renders
against the balance funding it.

### The live run found more than the item described

The item named `THE .0`: a $250 cap against a $43.67 balance. True. But:

```
Breakwater: cap $45  vs balance $43.60 (1.03×)  ← cannot bind
Undertow:   cap $45  vs balance $43.60 (1.03×)  ← cannot bind
Vanguard:   cap $45  vs balance $43.60 (1.03×)  ← cannot bind
THE .0:     cap $250 vs balance $43.60 (5.73×)  ← cannot bind
Volatilis:  cap $250 vs balance $43.60 (5.73×)  ← cannot bind
```

A **$45** cap on a **$43.60** balance looks carefully chosen. It is over by
$1.40, so it cannot bind either — and nobody would find that by reading the
number, which is the entire argument for the panel. **All five live agents have
a non-binding exposure cap**; only the throwaway probes at $10 are genuinely
capped.

The balance moves between reads within one probe run — $43.597857, $43.594913,
$43.588892 — because the account trades while it is read. Carried as sent, not
rounded to a tidier figure that would imply more stability than exists.

### The port split turned on a contract, not on tidiness

`AccountPort` says *one question, so one port* and answers identity. The
decisive fact is sharper than that: `subjectFor` **swallows every failure into
`null`**, deliberately, because a deployment that cannot establish its own
account id must still work. A balance read has the opposite contract — its whole
value is telling *unreadable* from *empty*.

One interface cannot honestly carry both, and merging them would mean every
future reader has to remember which methods lie about failure. So
`AccountStatePort` sits beside it, with that reason written into the port.

### What the spec forbids, and why each is guarded

- **No apportionment.** `get_agent_fund_allocation` claims to divide the balance
  per agent and answered `committedUsd: 0` for an agent holding $17.45 of margin
  at the same moment (#107). An architecture test now asserts the product
  reaches that tool nowhere, with a vacuity guard checking the tool still exists
  on the surface — otherwise the rule would be asserting the absence of
  something that was never there.
- **No comparison against an unbounded cap.** `removesTheLimit()` already names
  those; a multiple against a limit that does not exist would read as though the
  agent were capped when the point is that it is not.
- **The balance is the account's.** One balance funds every agent, so a
  per-agent reading would overstate it by the number of agents sharing it. Said
  on the surface, not just in the type.
- **`hasAccount: false` is not a balance of zero**, and an unreadable balance
  costs only the comparison — the panel's other three sections still answer.

**Deferred and filed**: `agentSlots` (live: `{limit 3, used 3, remaining 0}` —
the account is at its cap and `/agents` gives no warning) and `mcpWagerEnabled`
come free with the read and are deliberately unrendered. Slots belong beside the
roster, the wager flag beside the arena; putting them on a limits page because
the read carried them is how a surface becomes a payload dump. GitHub **#121**.

**Gates**: `./scripts/ci.sh` green — **1,998 vitest**, 81 db, 243 python
harness. The live probe was run through `vitest.live.config.ts`, never the
parallel default, which is the rule the previous change landed hours earlier.

## 2026-08-10 (ci.sh) — thirty probes stop being silent passengers, and one gate nearly deleted itself

**`a-probe-that-vanishes-is-not-a-probe` archived.** `platform-mapping` already
carried the rule — *a check that disappears from the summary when it cannot run
is indistinguishable from one that ran and passed* — written for the freshness
gate. Thirty other live probe files disappeared exactly that way, and one of
them did worse than vanish.

`vitest.config.ts` included `tests/**` and excluded only node_modules and
`tests/db/**`, so `gate "vitest"` reached all thirty. **Keyless** they
`describe.skip` silently inside a gate reporting `ok`. **With a key they all ran
in parallel** against the real trading account — the sweep
`vitest.live.config.ts` pins `fileParallelism: false` to prevent, after the
2026-08-07 concurrent run produced nine phantom failures a serial re-run
collapsed to two. And `HANDOFF.md`'s "Start Here" told the next session to run
`ci.sh` with a key.

**The keyless half was known.** The freshness gate's own comment names it —
*"one of nineteen live files that `describe.skip` without a credential, so
inside the `vitest` gate above it vanishes silently"*. The keyed half was not
considered, and the count had grown from nineteen to thirty.

### The change nearly deleted the check it was written to protect

Excluding `tests/live/**` makes `npx vitest run tests/live/surface-freshness.test.ts`
select **nothing** — the gate passes having run zero tests. Tasks 1.1 and 1.2
were bound to one commit for that reason, and the guard now asserts the live
config is named on every single-file live gate. A fix that silently removes the
thing it protects is the worst available outcome here, and it was one line away.

### Shipped

- `tests/live/**` out of the default config. Still compiled — `tsc --showConfig`
  resolves all thirty, so a probe that stops parsing still fails `typecheck`.
- A named **`live`** gate, opt-in on `CI_LIVE=1`, through `npm run test:live`
  so the serial pinning applies. Opt-in for the reason `serving` is: nine
  minutes against a rate-limited platform, and a gate that makes the fast path
  expensive is one people route around.
- **`oauth-live` runs by default** (#117). It needs no credential and nothing
  had ever run it, while `oauth-conformance.test.ts` trusts the recording it
  verifies. Reachability is probed first, so an unanswered network is
  *unchecked* rather than red — tested against a 404 and a dead host.

### Every assertion asks a tool, not a config file

`tests/architecture/live-probes-are-named.test.ts` uses `vitest list --filesOnly`
for selection and `tsc --showConfig` for compilation — both the real resolvers,
0.4s for the latter. A check that read the `exclude` array as text would pass on
a config whose glob had stopped matching, which is the defect it exists to
guard against.

**Proven by mutation, and two of the first four did not fail.** Both were
checked rather than assumed: an exclusion widened to `tests/**` exits vitest
with `No test files found, exiting with code 1` — the gate fails loudly even
though the guard cannot report on itself — and removing one `skip "live"` arm
left the other, since the live gate has two.

**And the guard's own first draft carried the #87 bug**: reading a
line-continued shell gate with `[^\n]*(?:\\\n[^\n]*)*`, where the greedy
class eats the backslash so the alternation never matches and only the first
line is seen. Second time in one session that shape appeared *while writing a
check against it*. That is the argument for mutation-testing every guard, made
twice in a day.

**Gates**: `./scripts/ci.sh` green three ways — keyless, with a key
(`freshness ok`, no sweep), and with `CI_LIVE=1` and a key reporting **every
gate ok** including the full serial live suite. First time the script has run
every gate it has. 1,986 vitest, 81 db, 243 python harness.

**Also**: `HANDOFF.md`'s "Start Here" corrected — it was what aimed the next
session at the trap.

## 2026-08-10 (live-proven) — freshness green, and THE .0 shows the whole thesis in one reading

**The operator supplied a key and the branch is now live-verified.** Everything
below is a read; `BATTLEGRID_LIVE_WRITES` was deliberately not set, and the ten
write probes skipped correctly.

**Freshness is green**: `recorded battlegrid 16.0.0 · live battlegrid 16.0.0`.
The surface record describes the server running right now, which was the one
thing on this branch nothing could verify.

**The full live suite, serially**: `npm run test:live` → **20 files passed, 10
skipped, 30 tests, 550s.** Plus `oauth-metadata` keyless earlier: the recorded
discovery document still matches what the platform publishes.

### `THE .0` is the agent the p1 was filed about, and the panel reads it exactly

```
THE .0: 7 compared, 5 undefaulted
    maxDailyTrades 34 vs 10 (3.4×)
    maxLeverage      5 vs  1 (5×)
THE .0: 31 closed
    26× STOP_LOSS    5W/21L  median move −0.359%
     5× TAKE_PROFIT  5W/0L   median move  2.786%
```

Three things in one screen that no surface said before:

- **84% of closes are stop-outs** (26 of 31) — the population study's 74%, worse
  on this agent.
- **The target sits 7.8× further away than the stop actually travels.** Median
  stop move −0.359% against a median take-profit move of 2.786%. That is the
  placed-versus-realised geometry problem stated per-agent, without a candle,
  a borrowed constant, or an extra platform call.
- **Five of the twenty-six stop-outs were wins.** Trailed stops closing in
  profit — the `HYPE` case, on a different agent, in a different week. Had the
  panel derived the result from the close reason it would report **26 losses
  where there are 21**. The rule written for that is not defensive; it fires on
  a fifth of this agent's stop-outs.

Another agent carries `maxDailyTrades 100 vs 10 (10×)`.

### A trap found by reading before running

`./scripts/ci.sh:57` runs `npx vitest run` under `vitest.config.ts`, which
includes `tests/**/*.test.ts` and excludes only `node_modules` and `tests/db/**`
— so **`tests/live/**` is in the ordinary suite**. Without a key the probes
skip, which is why it has never shown. With a key they all run *in parallel*,
which is the sweep `vitest.live.config.ts` pins `fileParallelism: false` to
prevent, and which cost a diagnosis round on 2026-08-07 with nine phantom
failures.

The 2026-08-07 follow-up landed correctly — the pinning lives in a config rather
than in operator memory. The gap is that it pins the *config*, and `ci.sh`
reaches the same files through a different one, while `HANDOFF.md` tells the
next session to run `ci.sh` with a key. Filed as **GitHub #118**; the probes
here were run through `vitest.live.config.ts` deliberately, so the sweep did not
happen to the account.

**Also filed**: **#117** — `tests/live/oauth-metadata.test.ts` needs no
credential and `ci.sh` never runs it, while `oauth-conformance.test.ts` trusts
the recording it verifies. It passes today.

**Proven, not assumed**: `freshness` genuinely needs a key. An unauthenticated
`initialize` answers `Missing or invalid Authorization header`, so the MCP
handshake is auth-gated and the server version is unreadable without one.

**PR #83 is out of draft**, 11 commits, 61 files, mergeable clean, and its
description rewritten to cover the whole branch in four independently
reviewable parts rather than the third it described while a draft.

## 2026-08-10 (a-number-alone-says-nothing) — the p1 shrank on contact, and the panel found its own evidence

**The highest-value open item on the trading side is closed**, and half of it
turned out to be built already. `a-stop-inside-the-noise-looks-like-a-tight-stop`
asked for six rows. Reading the code before writing spec found that two were
shipped — `Ceilings` has rendered "no limit set" and "Nothing will stop this
agent on …" since `zero-does-not-mean-nothing`, and the exposure gauge already
sets the cap against what is at risk. Proposing them would have been
re-specifying shipped behaviour.

**The ground had moved under a third.** The item was filed 2026-08-06 at v11.
At **v15** BattleGrid took `maxStopLossPct`, `minStopLossPct` →
`minStopLossAtrMultiple` and `minRiskRewardRatio` off the agent and onto the
strategy — so an *agent* risk panel cannot show a field the agent no longer
has — and the platform ignores all three where they now live
(`v15-trade-level-policy-is-declared-but-inert`, retested against v16 and still
refused). Deferred twice over, filed as **GitHub #85**.

**A fourth row asks for something that does not exist.** Exposure against
account balance: `AccountPort` answers identity only, and equity appears solely
inside gate-block details. Deriving one from open positions would be inventing a
figure on the one surface whose purpose is to be trusted instead of the raw
setting. Filed as **GitHub #84**.

**What shipped instead is stronger than what was asked for.** The item's own
warning — *do not compute a noise floor from 100 bars and present it as
authoritative* — points at the answer: the agent's own record needs no borrowed
constant. `list_trade_outcomes` already carries `closeReason`, `direction`,
`entryFillPrice` and `exitFillPrice`, and from those four comes **the median
realised move at each kind of ending**, which is the population study's central
statistic computed per agent with no candle history and no extra call. Three
requirements, all from reads the product already makes.

**And the headline survived anyway.** The v15 fields still come back on the
agent read, so `maxStopLossPct: 1` renders against BattleGrid's declared default
of 5 — `0.2×`, the item's exact finding against the platform's own number. Shown
apart from the settings an operator can change, with where they are now set
named, derived from `TRADING_CONFIG_FIELDS` so a field the platform moves back
needs no edit here.

### Three things worth not rediscovering

**A close reason is not an outcome.** `HYPE` closed at **+$0.0731** with
`closeReason: STOP_LOSS` because trailing had walked the stop into profit. The
ending comes from `closeReason` and the result from `netPnl`, never one from the
other — otherwise a protected winner is reported as a loss on the screen built
to explain losses. Held by a test.

**The guard written for this change passed vacuously on first write.** Its
transcription check used `[A-Za-z_$][\w$]*` before the alternation, so the
mandatory first character consumed the `N` of `NOISE_FLOOR_PCT` and the pattern
could never match its own first letter however far the greedy quantifier
backtracked. Found by planting a constant and watching the test stay green. That
is the sixth instance of this repository's recurring defect — *a check that
matches how something is spelled* — produced while writing a guard against it.
**Plant the violation before trusting the guard.**

**`/verify` found three scenarios its own session had written and not built.**
The undefaulted money fields were named without their values, so
`maxConcurrentExposureUsd: 250` was the one setting on the panel an operator
could not read. The small-sample branch withheld a median without showing the
trades it was withheld from. And the median position life rendered two sections
from the switches the spec said it sits *beside* — with a rendering test that
asserted the switches and never the life, so it passed against a scenario it did
not check. All three fixed, each with a test that fails without its fix.

**The guard is now the precedent it should have followed.** `identifiers.test.ts`
has carried a `the rule catches PG-301 as it was actually written` block since
it was written — *a guard nobody has seen fail is a guard nobody knows works*.
The new one now carries the same, feeding its matcher four violations including
the two planted by hand, plus two negative cases so it cannot start firing on
every threshold in the codebase. It also gained the corpus assertion fifteen of
the sixteen negative-assertion guards already had and it alone lacked. Filed as
**GitHub #87**, because the distinction generalises: a corpus check proves the
sweep read files, and proves nothing about whether the pattern can match.

**Gates**: typecheck, lint, spec validation clean; **1,968 vitest**, **81 db
against real PostgreSQL**, **235 python harness**, drizzle-check, migrate and
build — `./scripts/ci.sh` green. `freshness` and `serving` skipped with named
reasons; both need credentials this environment has not got, so the surface
record's age is unverified this session.

**Also filed**: **GitHub #86** — five stale claims across `CLAUDE.md`,
`HANDOFF.md` and `README.md`. Two would send a reader down a dead end: the
110-tool figure (114 since v14, the first version ever to move the count), and
the hard-limits entry saying a market's first radar deployment cannot be created
over MCP, which v14 lifted and 2026-08-08 proved live.

## 2026-08-10 (v16 landed) — dead write path #12, caught before a live refusal

**BattleGrid deployed v16.0.0** — found by the 05:06Z check-in, because the
snapshot prints the server line and the cadence rule said to retest the
policy only when it moves. It moved.

**PR #80 merged to `main` first** (squash, `5b4fcfe`, 32 commits) with all
six gates verified on the branch head rather than quoted from an earlier
run. Two of them needed work to run at all rather than silently skip:
PostgreSQL was down again after a container restart, and pytest was not
installed, so the "235 harness" figure in the PR body was unverifiable until
it was. Both then matched exactly. The designated branch was reset to
`origin/main` afterwards so this work starts clean rather than stacking on
merged history.

**The v16 diff is one field, and it is fatal.** 114 tools, none added or
removed, three schemas changed — all three condition-carrying writes
(`compile_strategy_plan`, `apply_strategy_plan`,
`preview_strategy_report`) made **`conditions[].required`** a required path.

`serialiseCondition` emitted `conditionKey`, `name`, `definition`,
`verdict` — four of the five keys v16 accepts. **Every strategy write
carrying a condition would have been refused whole.** That is the twelfth
dead write path in this codebase's history and **the second caught by the
guards before a live refusal**, on the same run that refreshed the record:
`payload-conformance` reported `conditions[].required is required and
missing` three times the moment the v16 record landed.

**The read had been returning it all along.** Our own `FUNDING_STRETCHED`
carries `"required": false` on the live account. The field was never
modelled, so the domain type had four fields where the platform had five —
the write only broke when v16 made the omission fatal. A read this product
had been discarding turned into a write it could not make.

Changes: `required: boolean` joins `StrategyCondition`; the mapper reads it
(absent → `false`, the platform's default and the only safe guess — `true`
would silently harden a strategy); `serialiseCondition` emits it. The two
retarget paths carry it from the source alongside the definition. The form
has no control for it yet and composes `false`, filed as
`the-condition-form-cannot-set-required` (p3).

Two fixture families had to follow, and both were genuinely stale rather
than merely inconvenient: the Berlin recordings in `strategy-fakes.ts` claim
to be *the platform's own bytes* and no longer were, and two round-trip
tests asserted byte-identity against payloads missing a key the platform
sends.

**The v15 policy p1 survived the whole version bump** — retested against
v16, still `"Strategy update contains no effective changes"` on all three
strategies. A major version came and went without fixing it, which is worth
knowing: this is not a half-shipped feature.

**Gates**: typecheck, lint, spec validation clean; **1,902 vitest**, **81 db
against real PostgreSQL**, **235 python harness** — all green, all run after
the change.

## 2026-08-10 (check-in 03:40Z) — a quiet cycle, and the long book builds

**One close**: TRUMP long, `STOP_LOSS`, **−$0.1612 on a −0.85% move in 33
minutes** — full stop distance, the standard loser shape, this time on the
long side. Realized: **25 closed, 7W/18L, −$1.0280**, win rate 28%,
realised RR **1.20** (break-even 45%; placed 3.34 needs 23%). Still one
take-profit in twenty-five.

**The book is now seven positions and five are longs** (WIF, HYPE, FARTCOIN,
MELANIA, SKHX) against two shorts (LDO +$0.093, BRENTOIL +$0.046), book
total **+$0.1592**. The directional flip has held for ~90 minutes; FARTCOIN
re-entered *long* eleven minutes after its short closed.

**The long/short split so far** — thin data, but worth pinning before the
long book resolves: **LONG 6 closed, 1W, −$0.1885 · SHORT 19 closed, 6W,
−$0.8396.** Nineteen shorts carry most of the realized loss. Five of the
seven open positions are longs, so this cycle-or-two doubles the long
sample; capture rates and adverse-move sizes on longs are the thing to
extract from it.

Server still v15.0.0; policy retest skipped. **Meter** dead.

## 2026-08-10 (check-in 02:10Z) — FARTCOIN did not convert, and the trail's capture rate is the number

**FARTCOIN closed `STOP_LOSS` at +$0.2179** — a +1.59% favourable move over
403 minutes. It was **+$0.5090** at the last check-in, so it gave back
**57% of its peak** and never reached its target. The second-largest win
this fleet has recorded, and it still left more on the table than it kept.

**That completes a three-point picture of what the trail actually captures**,
using peaks I observed directly in earlier snapshots:

| | peak seen | closed | captured |
|---|---|---|---|
| MOODENG | — (ran to target) | +$0.3649 | **100%** (TAKE_PROFIT) |
| FARTCOIN | +$0.5090 | +$0.2179 | **43%** |
| HYPE | +$0.1400 | +$0.0040 | **3%** |

The only trade that kept everything is the only one that reached its target.
Every trail-managed exit surrendered between half and nearly all of the
move. That is the placed-vs-realised gap expressed per trade rather than in
aggregate, and it is the cleanest statement of the problem so far.

**The fleet is recovering, and quickly.** Three closes this cycle — SKHX
**+$0.1085 in 8 minutes** (+1.01%), FARTCOIN +$0.2179, and BRENTOIL
**−$0.0062 on a +0.00% move**, a pure fee loss on a flat tape.

| | 23:20Z | 00:45Z | **02:10Z** |
|---|---|---|---|
| closed | 19 | 21 | **24** |
| net | −$1.3241 | −$1.1870 | **−$0.8669** |
| win rate | 16% | 24% | **29%** |
| realised RR | 1.33 | 1.05 | **1.24** |

**$0.46 recovered in under three hours**, and unlike last cycle the win rate
and the RR moved up together — FARTCOIN was large enough to lift the average
win rather than dilute it. Win rate 29% is now comfortably above the 23%
needed at the placed RR of 3.34, and still well below the 45% needed at
1.24.

**Still one take-profit in twenty-four trades.**

**The book flipped direction.** Six open and **four are longs** (HYPE,
FARTCOIN, TRUMP, MELANIA) against two shorts (LDO, BRENTOIL). This fleet has
been overwhelmingly short all day; five entries inside twenty minutes at
~02:02 reversed that. Worth watching whether the long book behaves
differently — every finding above is drawn from a short-dominated sample.

Server still v15.0.0; policy retest skipped. **Meter** dead.

## 2026-08-10 (check-in 00:45Z) — BNB breaks the run, and win rate rose while RR fell

**BNB, the fifth and last of the prediction book, closed green** —
**+$0.0495 on a +0.51% *favourable* move after 391 minutes**, against a
0.40% stop. It was not stopped out inside the noise; it survived six and a
half hours and was trailed out in profit.

**Final score on the pre-registered prediction: 3 confirm, 1 marginal, 1
that does not fit.** Not five for five, and the last one has to be said
plainly rather than folded into the tally by computing `|move| − stop` on a
move that went the right way. That arithmetic is only meaningful for adverse
moves; applied to BNB it manufactures a "+0.11pp" that means nothing. The
noise-band effect is real and well evidenced on three or four trades — it is
not universal.

A second SKHX trade also closed green, **+$0.0876 in 22 minutes** on a
+0.91% move.

**And those two wins produced the most interesting number of the night.**

| | before | now |
|---|---|---|
| closed | 19 | **21** |
| record | 3W/16L | **5W/16L** |
| win rate | 16% | **24%** |
| realised RR | 1.33 | **1.05** |
| break-even needed | 43% | **49%** |

**Win rate went up eight points and the fleet got further from break-even.**
Both new wins were small trail-outs (+$0.088, +$0.049), so they raise the
count of winners while dragging the average win down. Win rate is a
seductive metric here and a misleading one: what the trail produces is a
scratch machine — more trades finishing green, each too small to pay for a
loss. Net is −$1.1870, better than −$1.3241 an hour ago, but the *structure*
got worse.

Note where that leaves the two thresholds: actual win rate **24%** is now
*above* the **23%** needed at the placed RR of 3.34, and far below the
**49%** needed at the realised 1.05. The entire deficit is the gap between
placed and realised — which is exactly the geometry finding from last cycle,
now visible from the other direction.

**Book +$0.6900** across four. **FARTCOIN is +$0.5090** after 5.5 hours —
larger than MOODENG's realised take-profit and still open. A new SKHX short
opened 00:38 is already +$0.1760.

Server still v15.0.0; policy retest skipped per cadence. **Meter** dead.

## 2026-08-10 (check-in 23:20Z) — the prediction settles, and the geometry is self-defeating

**Four of the five prediction-book positions have closed. All four
`STOP_LOSS`. Zero take-profits.**

| coin | stop placed | killing move | **excess over own stop** | held |
|---|---|---|---|---|
| WIF | 0.63% | 0.64% | **+0.01pp** | 103m |
| TRUMP | 0.51% | 0.53% | **+0.02pp** | 276m |
| SKHX | 0.38% | 0.44% | **+0.06pp** | 301m |
| ENA | 0.82% | 0.89% | **+0.07pp** | 224m |

**Every one died within 0.07 percentage points of its own stop; mean excess
0.04pp.** On the pre-registered rule: **3 confirm, 1 marginal, 0
disconfirm.** On the refined move-minus-own-stop metric: 4 of 4. Both
agree, which is the only reason I am willing to call it settled — the
refined metric was chosen after seeing data and cannot carry a verdict
alone.

Price is not moving against these positions. It is oscillating, touching the
stop, and reverting. The trades are being ended by the market's breathing.

**But the obvious fix does not work, and this is the real finding.** Widen
the stops past the noise — call it 1.0% — and the geometry collapses,
because *the tight stop is what produces the RR in the first place*:

| coin | TP placed | stop 0.38% → RR 3.09 | stop 1.0% → RR |
|---|---|---|---|
| SKHX | 1.16% | 3.09 | **1.16** |
| BNB | 1.65% | 4.13 | **1.65** |
| TRUMP | 2.09% | 4.08 | **2.09** |

**The 3.34 placed RR is manufactured by placing the stop inside the noise.**
You cannot keep both the RR and a survivable stop at these TP distances.
The only coherent resolutions are to widen stop *and* target together —
which means longer holds, larger moves, fewer completions — or to be far
more selective and trade less. Tuning the trail alone, which is what I have
been recommending all day, addresses the *exit* of winners but not this:
these four never got far enough for the trail to matter.

MOODENG is the existence proof that the wider version works — TP 3.39%,
reached, +$0.3649.

**Realized: 19 closed, 3W/16L, −$1.3241**, win rate 16%, realised RR 1.33.

**The surviving book is +$0.5435** — and **FARTCOIN alone is +$0.4245**, the
largest unrealised this fleet has held, larger than MOODENG's realised
take-profit. BNB +$0.089 is the last of the prediction five.

Server still v15.0.0, so the policy retest was skipped this cycle per the
new cadence. **Meter** dead.

## 2026-08-09 (check-in 21:55Z) — a better statistic than the one I chose

**ENA closed `STOP_LOSS`, −$0.1246, on a −0.89% move after 224 minutes**,
against a stop placed at 0.82%. By the test I wrote down — "did the adverse
move exceed the 0.82% median?" — this scores as *not* confirming, because
0.89 > 0.82. Reported that way to keep the rule honest: **1 clean confirm, 1
marginal, 0 disconfirming, 3 open.**

**But the pair points at a sharper statistic than the one I picked.** Both
closes died a hair past their *own* stop, not past some fleet median:

| | stop placed | killing move | excess |
|---|---|---|---|
| WIF | 0.63% | 0.64% | **0.01pp** |
| ENA | 0.82% | 0.89% | **0.07pp** |

Comparing each trade's move to a fleet-wide median was the wrong
denominator — it mixes coins with different volatility. **Move-minus-own-stop
is the right one**, and on it both trades say the same thing: price reached
the stop, tripped it, and went essentially nowhere further. That is what a
stop inside the noise band looks like, and it is a cleaner claim than the
one I set out to test. Recorded as a refinement, not as a confirmation —
n=2, and the metric was chosen after seeing the data, which is exactly the
sin the pre-registered version was meant to avoid. The three open positions
still settle it on the original rule.

**Realized: 17 closed, 3W/14L, −$1.1527**, win rate 18%, realised RR **1.29**
against 3.34 placed, break-even now 44%. Loser adverse moves: median 0.82%,
**9 of 14 at or under it**.

**The surviving book is green**: +$0.1467 across four — FARTCOIN +$0.080,
TRUMP (long) +$0.053, BNB +$0.008, SKHX +$0.006.

**Meter** dead. **v15 policy p1** retested a tenth time, unchanged — ten
identical results across eleven hours, and no BattleGrid deploy in between.
Worth dropping to once every few cycles unless the server version moves.

## 2026-08-09 (check-in 20:35Z) — first result on the prediction: one confirming instance

**WIF closed `STOP_LOSS`, −$0.1134, on a −0.64% move after 103 minutes.**
Its stop was placed at 0.63%. The move that killed it was **0.64%** — one
basis point past the stop, and comfortably inside the 0.82% median adverse
move of the prior losers. That is the noise-band pattern exactly: the trade
was not beaten by a real move, it was closed by the first wobble past a stop
sitting inside the noise.

**Tally on the prediction: 1 confirming, 0 disconfirming, 4 still open.**
One instance is not a result, and I am not going to treat it as one. The
four survivors (SKHX, ENA, BNB, TRUMP) are now 2.5–3 hours old and
approaching the 206-minute median hold, so the next cycle or two should
carry most of the weight.

**Realized: 16 closed, 3W/13L, −$1.0281**, win rate down to 19%. **Realised
RR unchanged at 1.30** against 3.34 placed — WIF was a loss at close to its
full stop distance, which is the numerator-preserving, denominator-growing
half of the asymmetry that produced the gap in the first place.

**Book −$0.0141** across five (FARTCOIN +$0.065, BNB +$0.019, SKHX −$0.014,
TRUMP −$0.031, ENA −$0.054), down from +$0.1218 an hour ago.

**Meter** dead. **v15 policy p1** retested a ninth time, unchanged.

## 2026-08-09 (check-in 19:15Z) — the prediction is not settled, and I set the wrong horizon

**Zero of the five have closed.** All are still open at 75–95 minutes, and
the book is **+$0.1218 green**, with a sixth (FARTCOIN) added at 19:06.

**The prediction stands unsettled, and what evidence there is leans against
it.** I predicted most of that book would stop out on moves carrying no
information. Stops at 0.38% and 0.40% have now survived an hour and a half
without being touched. That is not a refutation yet — but it is not the
early confirmation I expected either, and it deserves to be said in that
direction rather than left implied.

**The methodological error is mine and worth recording.** I wrote "next
cycle settles it." It could not have. The closed population's hold times are

    26 46 57 86 129 135 139 206 206 210 287 317 329 636 754   (minutes)
    median 206 · mean 238 · only 4 of 15 closed inside 95 minutes

so a 60-minute window was never going to resolve a five-position book —
about three quarters of trades here live longer than one check-in. A
prediction whose horizon is shorter than the process it describes cannot
settle; it just gets re-reported as "pending" until it accidentally
resolves. **The right horizon is three to four cycles**, and the watch has
been re-armed on that basis.

**Realized unchanged**: 15 closed, 3W/12L, −$0.9147, realised RR **1.30**
against 3.34 placed, win rate 20%, break-even 43% at the realised RR.
Nothing has closed since 16:53 — a four-hour gap, the longest of the day.

**Meter** dead. **v15 policy p1** retested an eighth time, unchanged.

## 2026-08-09 (check-in 18:10Z) — Breakwater was waiting, not blocked, and the new book is stopped inside the noise

**Correction: "Breakwater's gate is too tight" was premature.** I flagged
its ~12-hour silence twice as something to report as an over-tight gate. It
then took **three positions in twenty minutes** (SKHX, ENA, BNB) — its first
fills since ~04:00. It was waiting for a tape it liked. A quiet agent and a
blocked agent look identical until the tape turns; five blocks in a day was
never evidence of the second.

**The book refilled from flat to five in 26 minutes** — Undertow took WIF
(short) and TRUMP (**long**, its first long in hours), Breakwater the other
three. Vanguard is still flat, 0 trades all-time.

**Placed RR on the new book is 3.61**, higher than the 3.34 fleet average:

| agent | coin | stop | TP | RR |
|---|---|---|---|---|
| Breakwater | SKHX | **0.38%** | 1.16% | 3.09 |
| Breakwater | BNB | **0.40%** | 1.65% | 4.13 |
| Undertow | TRUMP | **0.51%** | 2.09% | 4.08 |
| Undertow | WIF | **0.63%** | 2.89% | 4.61 |
| Breakwater | ENA | **0.82%** | 1.75% | 2.14 |

**A falsifiable prediction, recorded before the outcome.** The twelve losers
so far have a median adverse move of **0.82%**. Four of these five stops sit
*below* that median — SKHX and BNB at under half of it. If the noise-band
diagnosis is right, most of this book stops out on moves that carry no
information. If instead several run to their targets, the diagnosis is
wrong and the trail is not the binding constraint. Next cycle settles it.

**Realized unchanged** — no closes since 16:53. 15 closed, 3W/12L,
−$0.9147, realised RR **1.30** against 3.34 placed.

**Breakwater's new blocks are six ENA `OPEN_POSITION_CONFLICT` in twelve
minutes** — it holds ENA and keeps re-evaluating it. The same waste pattern
that produced Undertow's 450, now starting on the second agent.

**Meter** dead. **v15 policy p1** retested a seventh time, unchanged.

## 2026-08-09 (check-in 17:00Z) — the first take-profit, and the number that names the problem

**MOODENG closed `TAKE_PROFIT`, +$0.3649, +3.39%, 329 minutes.** The first
take-profit in this fleet's history, on the fifteenth trade. It filled at
exactly the level the geometry read recorded this morning — MOODENG's TP was
placed 3.39% from entry and the move was 3.39%. The exit path is proven
end-to-end: placed, rested, filled, reported.

It is also **the largest single result either way** — bigger than the worst
loss (−$0.1763) by more than double.

**The one number that names the whole problem:**

| | |
|---|---|
| RR the agent **places** | **3.34** |
| RR the fleet **realises** | **1.30** |
| break-even win rate at placed RR | 23% |
| break-even win rate at realised RR | **43%** |
| actual win rate | **20%** |

At the RR it designs, the fleet needs 23% and is doing 20% — within touching
distance. At the RR it actually gets, it needs 43% and has no chance. **The
gap between 3.34 and 1.30 is the trail**, and it is the entire deficit.

The mechanism is visible in the three wins: MOODENG ran to its target for
+$0.3649, while HYPE was trailed out at **+$0.0040** and MELANIA at +$0.0731
— both `STOP_LOSS`, both truncated far short of their targets. Losses take
their full stop distance; winners get cut at whatever the ratchet has
reached. That asymmetry, applied to a system whose *design* asymmetry is
3.34:1, is what turns it into 1.30:1.

**Realized: 15 closed, 3W/12L, −$0.9147**, improved from −$1.1064 — one
take-profit recovered more than the AIXBT loss that followed it. Fees are
**$0.2383, 26% of the gross loss** (gross −$0.6764).

AIXBT closed −$0.1731 on a −1.60% move, now the largest adverse move; the
loser distribution is min 0.10% / median 0.82% / max 1.60%.

**Book is flat** — zero open positions for the first time today. Undertow
has logged no new blocks since 15:48, which is consistent rather than
concerning: nearly all 450 were `OPEN_POSITION_CONFLICT`, and a flat book
has nothing to conflict with.

**Breakwater idle ~12 hours.** **Meter** dead. **v15 policy p1** retested a
sixth time, unchanged.

## 2026-08-09 (check-in 15:55Z) — the trail can hold breakeven, and a number I got wrong

**HYPE closed green — the second win ever, and the first that proves the
trail works at all.** +$0.0040 after 636 minutes, exit +0.17% above entry.
The ratcheted stop (last seen at +0.20% vs entry) caught it above water.
That is the mechanism doing exactly its job.

It also shows how little the job is worth as tuned: HYPE peaked at
**+$0.140** at 12:35Z and closed at **+$0.004** — the trail captured **3% of
the peak**. So the picture is not "the trail is broken"; it is "the trail is
so slow that it converts a good position into a scratch." Three of four
positions have now round-tripped their gain; HYPE is the one where the
ratchet got above entry in time to prevent a loss.

**Correction to last cycle.** I wrote that the largest adverse move across
the eleven closes was 0.82%. That was the maximum over the six rows I had
printed, not over all eleven. Across all thirteen closes now:

- adverse moves on losers: **min 0.10%, median 0.78%, max 1.50%**
- **10 of 11 losers closed on a sub-1% move**

The conclusion holds and is arguably sharper on the real distribution, but
the number I quoted was wrong.

**Also worth naming**: MOODENG's 07:18 close was **−$0.0043 net on a +0.10%
favourable move** — the price went the right way and fees took it negative.
At this notional, fees decide scratch trades.

**FARTCOIN closed −$0.1165 in 26 minutes** on a −0.82% move — the fast end
of the same failure.

**Realized: 13 closed, 2W/11L, −$1.1064.** Book **+$0.2507** on two
positions, and MOODENG is at **+$0.2631** — the largest unrealised this
fleet has held, 5.5 hours in. Whether it converts or round-trips is the next
real datapoint.

**Breakwater idle ~10.8 hours**, still five blocks all day. **Meter** dead.
**v15 policy p1** retested a fifth time, unchanged.

## 2026-08-09 (check-in 14:50Z) — the round trip is the pattern, not the incident

TRUMP closed and repeated AIXBT's shape exactly. Two clean observations of
the same failure now, tracked across my own hourly snapshots:

| | peak observed | closed | swing | held |
|---|---|---|---|---|
| AIXBT | **+$0.1206** (12:35Z) | −$0.0931 | −$0.214 | 2h19m |
| TRUMP | **+$0.077** (09:27Z) | −$0.1058 | −$0.183 | **12h34m** |

TRUMP's decay is on the record hour by hour: +$0.077 → +$0.062 → +$0.038 →
−$0.031 → closed −$0.1058. It was **the longest hold in this fleet's
history at 754 minutes**, and it still lost. That kills a reading I might
otherwise have defended — that the time-decay fix simply needs more time to
show. Letting trades breathe does not by itself produce wins; without a
trail that locks, it produces long slow bleeds.

The price moves themselves are tiny — TRUMP closed on a **−0.53%** adverse
move, AIXBT **−0.78%**. Across all eleven closes the largest adverse move is
0.82%. These trades are not being beaten by the market; they are being
closed inside its noise.

**Realized: 11 closed, 1W/10L, −$0.9939** — a dollar down on a $43.56
account. Book **+$0.0169** (HYPE +$0.064, MOODENG +$0.022, AIXBT −$0.025,
new FARTCOIN short −$0.044).

**Breakwater idle 9.8 hours** — since 05:04Z, five blocks all day, no
position. Two agents' worth of radar deployments producing nothing.

**Meter** dead (blocks 369 → 405, still exactly 0). **v15 policy p1**
retested a fourth time, unchanged.

The trail re-tune remains the recommended change and remains unmade — it is
live money and the operator has not ruled.

## 2026-08-09 (check-in 13:45Z) — the headline question answered: they gave it back

The open question was whether the four positions would convert to
take-profit, trail out green, or give it all back. **AIXBT gave it back**,
and it is the cleanest evidence yet for what the trail actually does.

| | |
|---|---|
| opened | 11:01:31, SHORT, entry 0.018476 |
| at 12:35Z snapshot | mark 0.018256 = **−1.19% favourable**, uPnL **+$0.1206** |
| closed 13:21:21 | exit 0.018620 = **+0.78% adverse**, net **−$0.0931** |
| held | 2h20m |
| stop at exit | 0.018620 — **+0.78% from entry, never reached breakeven** |

A 1.19% gain became a 0.78% loss. The trail did move — the stop started
~1.7% out and reached 0.78% — but it never crossed to breakeven despite the
position being more than a full percent in profit. `get_trade_chart` for
this trade answers `UNAVAILABLE`, so the peak excursion is only known from
my own 12:35Z snapshot; the true peak may have been higher, which makes the
finding worse, not better.

**This is the cost of the time-decay fix, and it should be stated plainly.**
Disabling time decay slowed the trail. That cut loss *size* about 4× and let
trades breathe for hours instead of minutes — both real gains. It also
slowed the stop's march enough that it no longer keeps up with a favourable
move, so gains are not locked. Same knob, opposite signs. The fix was right;
the tuning now sits at the other extreme.

**The whole book gave back with it**: +$0.3805 → **+$0.0969**. HYPE
+$0.140 → +$0.077, MOODENG +$0.082 → +$0.052, TRUMP +$0.038 → **−$0.031**.
Realized now **10 closed, 1W/9L, −$0.8881**, still every close `STOP_LOSS`.

**Meter**: still exactly 0 while Undertow's blocks went **317 → 369** (52
more in ~68 min, newest 13:42:09). Dead confirmed a third time; no longer
worth re-reading every cycle.

**v15 policy p1**: retested, unchanged on all three strategies.

**Breakwater has now been idle 8.6 hours** — since 05:04Z, no blocks, no
position, nothing at risk. Not stuck; finding nothing. At this duration it
is worth treating as a gate that may be too tight rather than a quiet tape.

## 2026-08-09 (the take-profit diagnostic) — the exit path is fine, and my hypothesis was wrong

**Question**: nine closed trades, nine `STOP_LOSS`, zero take-profits. I
proposed that TP orders were never placed — a dead exit path, the defect
class this repo keeps finding. **That was wrong, and the evidence is
unambiguous.**

`get_open_orders` shows a `Take Profit Market` order resting on the
exchange for every open position, `reduceOnly: true`, `status: OPEN`,
alongside its `Stop Market`. `get_position_audit_history` shows the
placement order on every position: **TP_PLACED, then SL_PLACED, then
ENTRY_FILLED**, all within ~4 seconds. The plumbing is correct.

**The real finding is geometry.** Placed at entry:

| coin | stop | TP | RR |
|---|---|---|---|
| HYPE | 0.51% | 1.88% | 3.73 |
| MOODENG | 0.87% | 3.39% | 3.88 |
| TRUMP | 1.23% | 3.69% | 3.00 |
| AIXBT | 1.69% | 4.62% | 2.73 |

**Mean placed RR is 3.34** — more than double the platform floor of 1.5. A
correction to what I wrote an hour ago: I said the fleet was "pinned to RR
1.5" and therefore needed a 40% win rate to break even. 1.5 is the *floor*;
the agents choose ~3.3. Break-even is **1/(1+3.34) ≈ 23%**, not 40%. The
v15 p1 still blocks setting the floor, but it was never holding RR down to
1.5.

**Why no TP has ever filled**: the stop converges on price and the TP does
not move. `SL_REPLACED` events march the stop in relentlessly — TRUMP from
−1.23% to −0.42% over 13 replacements, HYPE from −0.51% all the way to
**+0.20%**, i.e. past entry. Meanwhile the TP sits 1.9–4.6% out. Price has
to travel four to nine times the remaining stop distance without one
retrace. The trail is the exit mechanism; the TP is nearly decorative.

**This also confirms the time-decay fix from 07:15Z**, which had only n=2 of
closed evidence before. The replacement *rate* collapses across the fix:

- TRUMP: **11 replacements in 3.3h before**, 2 in 4.4h after
- HYPE: **4 in 46 min before**, 2 in 5h after

Both have now survived 7–11 hours and are green, which is precisely the
intended behaviour and could not be read off the two closes alone.

**And `STOP_LOSS` does not mean "loss".** HYPE's stop now sits at +0.20% vs
entry — if it triggers it books a profit. MELANIA already proved this:
closed **+$0.0731 with `closeReason: STOP_LOSS`**. The close-reason
taxonomy describes which order filled, not whether money was made, and
"9 of 9 stop-losses" reads far worse than it is.

## 2026-08-09 (check-in 12:35Z) — the meter is broken, and the book is green

**The spend meter is broken, not resetting.** That was the open question an
hour ago and it now has an answer. In ~75 minutes Undertow's gate blocks
went **278 → 317** with the newest stamped 12:34:09, and `last24hCostUsd`
stayed at **exactly 0 on all three agents**. A rolling 24h window that had
genuinely reset would have been climbing again within minutes of the first
evaluation. Backlog p2 updated with the before/after table. Why it broke is
not answerable from the read surface — `get_intelligence_agent` is the only
tool that carries the field at all.

**The book keeps improving and nothing has closed.** Four positions, all
green, **+$0.3805 uPnL** (was +$0.233 an hour ago):

| coin | dir | uPnL | open for |
|---|---|---|---|
| HYPE | SHORT | +$0.140 | 7.4h |
| AIXBT | SHORT | +$0.121 | 1.6h |
| MOODENG | LONG | +$0.082 | 2.1h |
| TRUMP | SHORT | +$0.038 | 10.5h |

Realized is unchanged at **1W/8L, −$0.795, nine of nine closes STOP_LOSS**.
No take-profit has ever filled here. TRUMP at 10.5 hours and HYPE at 7.4
would have been the "trades hang open unresolved" reversal signal for the
time-decay fix — but both are green with trailing stops, which is the fix
working rather than failing. The signal to watch is whether they convert.

**v15 policy p1 retested again — unchanged.** Same "no effective changes"
on all three strategies with the correctly-shaped envelope.

**Breakwater has been idle since 05:04Z** — five blocks total, none new, no
open position, nothing at risk. It is not stuck; it is finding no setups.

## 2026-08-09 (check-in 11:2xZ) — the p1 hardens, and the spend meter dies

**The v15 policy regression is confirmed on a properly-shaped payload.**
Every earlier retest sent the three fields as a patch; `compile_strategy_plan`
actually takes a whole `request` envelope, so shape was a live confound in
all of them. The new retest reads each strategy, projects the read onto the
write shape (`signalRules` → `rules`, `revision` → `expectedRevision`) and
changes only the policy. Two schema refusals on the way proved the envelope
was reaching the validator (`request` required, then `coinSelection.limit`
required). With it correct, all three strategies still answer **"Strategy
update contains no effective changes"** for RR 1.5 → 2.5/2.0/1.6, ATR floor
1 → 1.5/1.3/1.0, ceiling 5% → 4/3/2.5. The fields are **parsed and
discarded, not rejected** — the stronger form of the finding. p1 stands,
evidence upgraded. `scratchpad/v15_policy_retest.py`, compile only.

**`last24hCostUsd` went to zero on all three agents** — it read 2.37 / 0.81
/ 0.21 an hour earlier. Zero is not plausible: two positions were entered
at 10:30:08 and 11:01:31, and Undertow's block log holds 278 entries with
the newest at 11:19:10. `get_agent_explorer` does not carry the field at
all, so there is no cross-check and **fleet spend is now unmeasurable, not
low**. Filed `the-spend-meter-reads-zero-while-agents-run` (p2). This
blocks the accept-vs-cut decision the operator was asked to make — there is
no number to rule on.

**Fleet**: 4 open, all green — AIXBT +$0.048, MOODENG +$0.033, HYPE +$0.090,
TRUMP +$0.062 = **+$0.233 uPnL, the best book yet**. Realized still
1W/8L, −$0.795 net on $0.143 of fees, and **all nine closes are STOP_LOSS
— zero take-profits in the fleet's entire history.** The two post-fix
closes remain the two smallest losses ever recorded here (−$0.004,
−$0.046).

**Min-notional is genuinely clear**: the three `EXCHANGE_MIN_NOTIONAL_UNREACHABLE`
blocks on Breakwater all predate the exposure fix (2026-08-08 15:xx,
`equityUsd 35 / minEquity 41.67`). None since.

**Undertow's 278 blocks are almost all `OPEN_POSITION_CONFLICT`** — it
re-evaluates coins it already holds, ~31 blocked evaluations an hour. That
is the cheapest spend lever available and it changes no strategy behaviour,
but it cannot be justified while the meter is dead.

## 2026-08-09 (the keyed sweep at v15) — 23 of 29 live files green, and the six that were not run

**Did**: ran the full keyed live suite against the v15 server —
`npm run test:live`, serial by config. **21 files passed, 8 skipped, 0
failed; 46 tests, 630s.** Then ran two of the eight skips on their own,
because their gates are about *pacing and authority*, not danger:

- `condition-probe` (`BATTLEGRID_CONDITION_SWEEP=1`) — read-only, and only
  gated because run concurrently it starved its neighbours. **16 of 17
  strategies carry conditions · 69 total · 34 decide direction · 35 named
  blocks · nothing unrecognised.** The condition grammar did not drift at
  v15.
- `oauth-metadata` (`BATTLEGRID_OAUTH_LIVE=1`) — a credential-free public
  GET. The recorded discovery document still describes the platform.

**23 of 29 files are now proven at v15.** The remaining six all sit behind
`BATTLEGRID_LIVE_WRITES=1` (write, apply, radar, restore, retune,
custom-table) and were **not** run: they mutate the live account, which is
currently trading real money with open positions, and `radar-probe` in
particular writes deployments on a radar that is full at 20/20 with the
live fleet's own. That gate exists precisely so writes do not ride along on
a read sweep; leaving it closed is the gate working, not a gap.

**Two things the sweep read back that are worth keeping**: the surface
record still matches the live server (`surface-freshness` green, so v15 is
fully recorded), and `trading-record-probe` printed the live book —
**Breakwater 0W/2L, net −$0.1469 after $0.0229 fees, STOP_LOSS ×2**, the
post-time-decay-fix pair. Both closes near scratch; still zero
take-profits in the fleet's whole history.

**Cost of a rebuilt container, for the next session**: PostgreSQL was down
and the shell had no env. `pg_ctlcluster 16 main start` brought it back
with the `gridcommander` database and all nine tables intact; the URL is
`postgres://gc:gc@localhost:5432/gridcommander`. Nothing in the repo says
that, which is why it is here.

## 2026-08-09 (the whole surface, called) — 25 of 25 MCP tools answer at v15

**Did**: after the v15 mapper run, exercised **every tool this product
exposes** against the live account — new probe
`tests/live/mcp-full-surface-probe.test.ts`. It spawns
`bin/grid-commander-mcp.ts` as a subprocess, drives it as a real client,
discovers the ids each tool needs from earlier answers, and asserts both
that the registry is 25 and that **no registered tool goes uncalled**.

**Result: 25 tools · 23 answered · 2 empty · 0 skipped · 0 failed.** The
two empties are facts, not gaps — `read_signal_history` and
`read_record_coverage` are empty because the recorder cron has never run.
v15 broke nothing the product reads.

**Two flaws in my own probe, found and fixed before it was committed:**

- It took the *first* uuid in the trading record as a log id, which is the
  trade's own id — so `read_trade_story` and `read_evaluation` answered
  `not-found` / `none` and the sweep called that a pass. It proved their
  refusal path and nothing else. Now keyed on `"signalLogId"`, and both
  return real payloads (a story with its chart, an ENA scorecard).
- Its empty-detector matched prose, so `{"kind":"recorded"}` — a
  *successful* proposal write — was classified empty because "recorded"
  contains "record". Now matched on the payload's own `kind`.

Both are the same mistake this codebase keeps cataloguing: **a check that
matches how something is spelled rather than what it reaches.** Written
down here because the probe is the thing that would have hidden it.

**Also**: `BOUND_KEYS` in `agent-mapper.ts` still maps
`minimumStopLossPct` / `maximumStopLossPct` / `minimumRiskRewardRatio` onto
agent field names. The registry still publishes those bounds at v15, but
the fields moved to the strategy, so they are inert rather than wrong —
commented as such rather than deleted, because a strategy-side validator
will want them the day the platform honours the policy.

## 2026-08-09 (v15 landed in the repo) — the record catches up, and the guards prevent dead write path #11

**Did**: re-probed at **v15.0.0** (70 reads, 0 failed), regenerated the
reference and capabilities dump, and taught the product the new shape —
archived as `the-trade-level-policy-moves-to-the-strategy` (131st change).

**The guards earned their keep again.** The moment the v15 record landed,
`payload-conformance` reported six violations on
`apply_strategy_plan` — the three trade-level policy fields are
**`required` on the plan**, and `toApplyPlan` did not project them. That is
the eleventh dead write path in this codebase's history, and the first one
**caught before a live refusal** rather than after. Same shape as the
`conditions` omission of 2026-07-31, found the same way.

Changes: the three fields join `PLAN_FIELDS_FROM_POST_STATE`; they leave
`TRADING_CONFIG_FIELDS` (18 → 15); `READ_ONLY_CONFIG_FIELDS` grows to eight;
five guard expectations follow the record. Three tests used
`maxStopLossPct` as their worked example and now use fields that survived
(`maxSlippageBps`, `maxDailyTrades`) — a test whose subject the platform
deleted proves nothing about the platform.

**State**: 131 archived changes, 26 open backlog items. 1,902 vitest + 235
harness + typecheck + lint green; keyed `surface-freshness` green against
the live v15 server.

## 2026-08-09 (v15 reviewed) — the RR floor moved onto the strategy, and the compiler ignores it

**Did**: operator asked for a full review of the v15 update. Fresh dump,
key-level diff against v14, live write tests. **114 tools, none added,
none removed** — v15 is one coherent change on 16 tools.

**The change**: trade-level policy moved **off the agent, onto the
strategy**. `tradingConfig` 18 → 15 keys (`maxStopLossPct`,
`minStopLossPct`, `minRiskRewardRatio` all rejected now); the strategy
gained `maxStopLossPct`, `minRiskRewardRatio` and — better than what it
replaces — **`minStopLossAtrMultiple`**, a volatility-adaptive stop floor
instead of a percentage. `compile_strategy_plan` gained a whole
`diff.tradeLevelPolicy` axis; `feasibilityAdvisory` now reports
`minStopLossAtrMultiple` plus per-coin `requestedMinAtrMultiple` with
FEASIBLE / STRUCTURAL_ONLY / ATR_UNAVAILABLE verdicts.

**The problem: it is declared but inert.** Sending real value changes
(RR 1.5 → 2.5, floor 1 → 1.5× ATR, ceiling 5 → 4%) on an UPDATE compiles
without complaint and changes nothing — `changedAxes: ['IDENTITY']` from
the paired tagline edit alone, `diff.tradeLevelPolicy: null`, read-back
unchanged at defaults. Sent alone, the same fields are refused as *"no
effective changes"*. Reproduced twice on all three strategies. Filed
**`v15-trade-level-policy-is-declared-but-inert` (p1)**.

**What that costs us right now**: Undertow was built with RR 2.0 and
Breakwater with 1.5, chosen per family — **v15 discarded both**, and the
whole fleet is pinned to platform defaults (RR 1.5, 1× ATR floor, 5%
ceiling) with **no write path in either place**. Asymmetry is the entire
thesis of these strategies; it is currently un-settable.

**Also**: three taglines were edited to name the intended floors while
testing, then reverted the same hour — the tagline reaches the agent's
prompt, so it must not advertise policy the platform is not enforcing.
Strategies sit at r3, content identical to r1.

## 2026-08-09 (the stop diagnosis) — time-decay was killing the trades, and v15 landed mid-fix

**Did**: seven closed trades, **seven STOP_LOSS closes, zero take-profits**,
1W/6L −$0.745. Pulled `get_position_audit_history` on three losses and the
cause is unambiguous — **every one was closed by a stop that time-decay had
dragged toward price; the structurally-placed stop was never reached**:

| trade | placed stop | decayed to | exit | original hit? |
|---|---|---|---|---|
| WIF short | 0.14391 | 0.14360 | 0.14362 | **no** |
| AIXBT short | 0.018312 | 0.018187 | 0.018211 | **no** |
| TRUMP long | 1.47812 | 1.48290 | 1.48270 | **no** |

Time-decay tightens on a *timer* regardless of price action, so a thesis
that needed two hours got a stop walked into the noise band and tagged for
a near-full unit. The ATR trail is innocent — it only moves on favourable
travel, and it is what locked MELANIA's win. **`timeDecayEnabled` → false
on Undertow and Breakwater**; trailing and break-even kept. Reversal
criterion: if trades now sit dead for hours without resolving, decay comes
back with a much longer grace rather than at 45–60 minutes.

**BattleGrid shipped v15.0.0 mid-fix** — caught because the write was
refused with `unrecognized_keys`. `tradingConfig` went **18 → 15**:
`maxStopLossPct`, `minStopLossPct` and `minRiskRewardRatio` are gone from
create and update alike — stop bounds and the risk:reward floor are now
platform-owned, not agent-owned. Tool count still 114. The fix landed on
the v15 shape. **The record is stale again** (says v14): re-probe and
re-run the conformance guards next session — and note `TRADING_CONFIG_FIELDS`
will need the same treatment as the v14 round, minus three more names.

## 2026-08-09 (volume-profile PoC) — a real candle archive, and a negative result worth having

**Did**: operator asked for a proof of concept on volume profiles / TPO, and
for a check that `get_coin_candles` is really the only history source. Both
answered; one of my earlier claims was wrong.

**The surface has a historical candle archive, and I had missed it.** I
reported the 100-bar live window as the ceiling. It is not:
`get_trade_chart` and `get_public_agent_trade_chart` return **frozen OHLCV
windows** (`result.chart.candles` — my first probe read `result.candles`,
got nothing, and I wrongly reported zero). Harvested from 14 public agents
× 30 logs: **4,867 unique 5m candles across 26 coins, 2026-04-05 →
2026-08-09**, including TradFi (TSLA, GOOGL, ORCL, BABA, COIN). Free,
read-only, idempotent by (coin, openTime). A third source exists too:
`get_regime_history` (206 points, 1h). **No tick or L2 data anywhere, so
true TPO is not reconstructable** — time-at-price needs intra-bar
sequencing the API does not carry. Volume profile from OHLCV is an
approximation (volume spread across each bar's range); TPO is not
buildable at all.

**Coverage caveat**: the harvest plateaued at 50 windows after agent 7 —
later agents added nothing. The archive is concentrated in a few
high-volume agents, and it is *opportunistic*: islands around trades, not
a continuous series.

**The PoC result is negative, and that is the point of running it.**
Walk-forward over 13 windows / 7 coins (build a profile on 144×5m, measure
the next 144):

| test | result | reading |
|---|---|---|
| prior VA contains next window's closes | **28%** | prior value does **not** persist (70% in-sample by construction) |
| VA-edge excursions held | **15 of 230 (7%)** | edges break far more than they hold |
| POC revisited | 62% | **vs 54% for a random level in the same range — +8 points** |

So the reversion reading of volume profile fails on this data, and the
POC-magnet effect is within noise of a random level once controlled. **No
profile-derived level earns a place in a live gate on this evidence.**

**My own methodology, stated honestly**: the first pass counted *bars*
beyond an edge rather than crossings, inflating breaks ~6×; the rerun
counts excursions with a cooldown, and even then sustained moves still
inflate the break count. The clean measure is the 28% containment figure,
which needs no counting convention. Thirteen windows is a small sample,
mostly memecoins, at a 12h block that is not a real session boundary —
a fair retest would use UTC-daily profiles on majors.

**What is worth keeping regardless**: the archive itself. 4,867 candles of
real OHLCV is raw material for measuring our own coins' volatility,
grading signal claims, and any future analysis — the recorder's
(`signal_capture_runs` → `signal_captures` → `signal_readings`) shape
extends naturally with a `candles` table keyed (coin, interval, openTime)
and profiles as a derived, recomputable view.

## 2026-08-09 (learning-rate round) — the trade counter goes to the ceiling

**Did**: operator's call — treat this phase as paid learning, not
capital preservation, and stop letting the daily trade counter throttle
sample collection. `maxDailyTrades` **3/4 → 100 on all three agents**
(the platform's registry ceiling, discovered by probing: 500 and 200 both
refused with *"maxDailyTrades (N) must be <= 100"*, 100 accepted).

**What did not change, and why that matters**: the loss caps are the real
backstop and they stay — Undertow/Vanguard $1.50 daily, $6 cumulative;
Breakwater $1.25 / $5. So "unlimited trades" is bounded by *money* rather
than by *count*, which is the correct shape: at ~$0.17 per losing unit,
roughly 8–9 consecutive losses trip a daily halt and the agent stops
itself for the UTC day. The conviction floors (0.55), RR floors, stops
and the $45 exposure allowance are untouched, so quality per trade is
unchanged — only the quantity ceiling moved.

**The practical throttle is now exposure, not count**: at ~$13.5 notional
per order against a $45 allowance, ~3 positions can be open at once. The
counter only binds after positions close, so the realistic effect is
faster turnover, not 100 simultaneous trades.

**Watch**: model spend (was ~$0.09/agent/day at 3 trades; more evaluations
means more), and whether the winner-vs-loser asymmetry from day one
persists at higher volume — that is the metric the extra sample is being
bought to answer.

## 2026-08-09 (early) — day one closes: three resolutions, every one by the book

**Did**: watched the first fleet trades to resolution (reads only). All
three of Undertow's day-one entries closed, every close performed by the
exchange-held stop — no exits improvised, no positions babysat:

| trade | held | net | how it ended |
|---|---|---|---|
| AIXBT short | 58m | **−$0.176** | stop at entry+1.5%, one designed risk unit |
| TRUMP long | 3.4h | **−$0.167** | stop (tightened 1.4781→1.4822 first), one unit |
| MELANIA short | 5.3h | **+$0.073** | **the trail locked profit**: stop walked 0.07708 → 0.07663 → 0.07627 → below entry, hit at 0.07567 |

Day-one realized: **1W/2L, net −$0.27** (−0.55% of the account), $0.053
total fees. Fill rate 3/3; zero exchange failures; both loss caps never
threatened; the daily trade cap held at three and blocked ten further
attempts pre-evaluation. The MELANIA close is the first time this
account's own money shows the trail doing what the WIF chart showed on
`THE .0` — a stop acting as a profit lock, not just a loss fence.

**The number to watch, stated before more data arrives**: the realized
winner (+$0.073) was smaller than either loss (−$0.17) — the trail locked
MELANIA at ~0.4R instead of letting it approach the 3R target. n=3 proves
nothing, but if the fade book keeps cutting winners under 1R while losses
run a full unit, the time-decay/break-even pairing on Undertow is too
tight and the first retune is loosening it — not the gate, not the floor.

**Also**: the UTC day rolled and Undertow re-entered AIXBT short (trade 4,
+$0.09 and trailing at last read) — same coin it lost on, taken again on
fresh signals, which is what a memoryless per-candidate design should do.

## 2026-08-08 (seventh round) — the first fill: every fix proven on one trade

**Did**: at 20:01Z, 25 minutes after the conviction floor moved to 0.55,
**Undertow entered its first trade** — MELANIA SHORT, conviction 0.55,
order `512908894227`, **EXECUTED** (fill rate so far: 1 for 1, zero
FAILED). Everything the day's fixes were for is proven on this one row:

- **Sizing**: notional **$13.51** — the predicted 45 × 10% × 3 to the
  cent, comfortably above the $10 exchange minimum that killed 29 of
  THE .0's 67 entries. Zero `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` since the
  exposure fix.
- **Risk-reward**: entry 0.07615, stop 0.07707868 (+1.22%), TP 0.07336396
  — planned RR exactly 3.0, above the ≥2 floor. Risk-to-stop ≈ $0.17
  (0.3% of the account).
- **Conviction calibration**: a 0.55 setup — precisely the class the old
  0.6 floor was rejecting all afternoon.
- **Management live**: `effectiveStopLoss` already reads 0.07703 vs the
  decided 0.07707868 — tightened in the short's favor within the hour.
- **On-thesis**: the reasoning is textbook Cannae — falling CVD,
  new-shorts OI regime, price below VWAP, at resistance-zone proximity.
  The same sweep SKIPPED a 0.45 HYPE long — floor discipline intact.

**State**: 1 open position (uPnL −$0.01 at check time), 24 evaluations /
1 entry / 0 failures fleet-wide. Vanguard still correctly silent in
ranging majors; Breakwater 2 evaluations, no qualifying setup yet.

## 2026-08-08 (sixth round) — the sizing base is the exposure allowance, not the wallet

**Did**: the scheduled fleet check found `EXCHANGE_MIN_NOTIONAL_UNREACHABLE`
back — 3× on Undertow (MELANIA, MOODENG, AIXBT: the coins that had just
qualified), 3× on Breakwater (SKHX). The detail finally made the formula
legible: `{equityUsd: 40, minEquityUsd: 41.666667, smallPct: 8,
maxLeverage: 3}` — **`equityUsd` is the agent's
`maxConcurrentExposureUsd`, not the wallet balance**, and the effective
leverage on these coins is 3 regardless of the configured 4. So the
platform's floor is `10 / (smallPct × 3)` of *exposure allowance*, and my
$40/$35 allowances sat $2–7 under it. THE .0's historic `equityUsd:
246.67` against its 250 exposure cap says the same thing in hindsight.

Fixed fleet-wide the same hour: `maxConcurrentExposureUsd` 45 and sizes
10/12/15% on all three agents (floor now $33.33 — clears with margin;
small orders ≈ $13.5 notional). Also observed and left alone: Undertow
re-evaluated FARTCOIN four times in three hours (SKIP SHORT at conviction
0.45–0.48 each time) — the conviction floor holding against a marginal
setup at a few cents of model spend; a lever exists (gate bump or
slot-level minConviction) if the churn persists for days.

**Watch out**: `maxLeverage` in the platform's sizing formula read 3 on
memes and TradFi synthetics with the agent configured at 4 — per-coin
effective leverage caps exist and the sizing floor should be computed at
3, not at the configured maximum.

**Evening tuning (same day)**: after 21 evaluations / 21 skips fleet-wide
with convictions ceilinged at 0.58, the conviction floor moved 0.6 → 0.55
on Undertow and Breakwater only (Vanguard keeps 0.6; RR floors, caps and
stops unchanged). Evidence considered: `get_agent_conviction_calibration`
on THE .0 answers INSUFFICIENT_DATA everywhere (min 20 outcomes per band;
it has 31 total, 8 of 27 crypto in the HIGH band — so GLM-5.2 *can* exceed
the bar, but not often), and the live stream showed 0.55–0.58 setups dying
just under the old floor while spend accrued. Revisit with the calibration
tool once 20+ outcomes exist per band; revert to 0.6 if 0.55 admits churn
that loses.

## 2026-08-08 (fifth round) — the incumbent retires, the fleet diversifies to three

**Did**: operator-directed platform operations on the Fibonacci account —
diversify to the account's capacity, retire `THE .0`, free its tickers.
All writes raw-MCP against the v14 schemas, every one logged and read back.

- **Retired**: `THE .0` archived (flat at the time, r4→r5) — its Midway
  binding dies with it (Midway is SYSTEM, platform-owned, not deletable).
  The three unbound private forks (`Midway/El Alamein/Stalingrad (fork)`)
  archived too. Strategy quota 5→2 used before the new builds; agent
  slots 3→2 used. The rank caps agents at **3** — that is "as many as the
  platform allows" at Recruit III.
- **Three strategies created whole** (compile→apply CREATE, all viable):
  **Salamis** (`228ed794…`) — short-term reversal / liquidity provision
  (Jegadeesh 1990, Lehmann 1990; Nagel 2012): band+structure extremes,
  `trend_adx_ranging` **required**, `ADX_now ≤ 20` condition — the regime
  mirror of Trafalgar. **Alesia** (`ad2df55a…`) — the operator's SQZ-03
  thesis (rising OI vs stalling price, CVD absorption) given tiered
  weights its account-2 original never had; bench. **Lepanto**
  (`6675a59e…`) — strict funding fade (±0.06% threshold, flips tier-3,
  gate 0.65), the ZSCORE-01 spirit under the platform's grammar; bench
  A/B sibling for Cannae.
- **Third agent**: **Breakwater** (`f4e7db03…`, Salamis, GLM-5.2,
  CONSERVATIVE/REALIST/MEASURED) — reversion chassis: leverage 3, RR
  floor 1.5 (family-appropriate), stops 0.5–2.5%, daily loss $1.25,
  drawdown $5, 4 trades/day, time-decay ON (grace 45m). Created OFF →
  deployed → flipped FULL_EXECUTION.
- **Radar re-pointed** (9 upserts, all deployed): Breakwater takes BNB,
  ENA, LDO, SP500, BRENTOIL @1h; Undertow grows to seven coins
  (+FARTCOIN, MOODENG, MELANIA, AIXBT @1h). Vanguard keeps BTC/ETH/SOL.
  `xyz_skhx` (a Hyperliquid TradFi synthetic, `xyz:SKHX`) joined
  Breakwater after the coin catalog identified it — radar now reads 16
  scanning / 0 idle / 3 agents active. The four free slots (cap 20)
  did not stay empty for long: the operator pushed back ("maybe the new
  update changed something"), and the tool's own v14 description answered —
  *"pass null only for a first deploy"*. `expectedRevision: null` created
  four first deployments (XRP, AVAX → Vanguard; xyz_jpy, xyz_gold →
  Breakwater), taking the radar to its **20/20 cap, 20 scanning, 0 idle**.
  `radar-first-deployment-not-creatable-over-mcp` closed (the fix landed
  silently somewhere v3→v13 — the probes only ever tried integers);
  successor filed for the product surface, which still assumes
  replacement-only. Coin ids matter: TradFi synthetics deploy as
  `coins.id` (`xyz_jpy`), never ticker. Also
  established: a plan's `coinSelection` is compile-time context, not
  strategy state — an UPDATE carrying only it is refused as having no
  updatable field.
- **Qualification, minutes after launch**: Breakwater qualifies **BNB
  long/short at 84 vs 62** (ranging + band extreme — its exact setup);
  Undertow's new coins came in hot — FARTCOIN 72, MOODENG 65, MELANIA 85
  all above gate. Aggregate worst-case daily loss across the fleet:
  $4.25 on $49.15 (~8.6%), each agent independently capped.

**State**: fleet = Vanguard (trend, majors) + Undertow (carry fade, 7
memes) + Breakwater (range reversion, alts+TradFi) — three mathematical
families, regime-complementary, one brain (GLM-5.2) for clean
attribution. Two bench strategies await slot growth or rebinds.

**Watch out**: three qualifying coins on Undertow at launch means the
first executed trade is likely imminent — the min-notional fix gets its
live proof (or refutation) there. And the platform's 4h regime is
bull_ranging: Breakwater's week, not Vanguard's. That asymmetry is the
design.

## 2026-08-08 (fourth round) — two agents born from the mathematical families, and v14 breaks the create path

**Did**: the operator asked for new strategies and agents built from the
platform's mathematical families, with the risk-reward failures of the
incumbent (`THE .0`) diagnosed and designed out — and for the v14 re-probe
first, since a live `initialize` answered **v14.0.0** against the morning's
v13 record.

**The re-probe** (`the-surface-record-is-v14`, 129th change, lite): 70
reads called, 0 failed. **The tool count moved for the first time ever,
110 → 114** — four reads added (`get_agents_hub`,
`get_agent_conviction_calibration`, `get_radar_activity`,
`list_deployment_policies`) — and the agent writes changed underneath the
product: `tradingConfig` dropped `atrTimeframe` +
`atrMatchesStrategyTimeframe` (20 → 18), and a CUSTOM brain now
**requires** `behavior: {risk, outlook, conviction}`. The app's own create
path was refused wholesale when this session ran it first — filed
`agent-create-composes-fields-v14-refuses` (p1), the tenth member of the
composed-write-the-platform-refuses class, **and closed it the same
session** (`the-agent-write-follows-v14`, 130th change): the two names
left `TRADING_CONFIG_FIELDS`, `READ_ONLY_CONFIG_FIELDS` grew to five, and
the six red payload-conformance/wire-values guards — red because the v14
record made them state the break, which is their whole job — are green
again. The brain half needed no product change: the app has sent the
behavior triple since findings-agents F-5; v14 merely made required what
was already sent (the behavior-missing refusals were this session's raw
script omitting it). Also refreshed
`battlegrid-mcp-capabilities.json`, which had sat at **v9** while record
and reference moved — the divergence the v13 round warned about, one
artifact over.

**The diagnosis that drove the design** (probed live before building):
`THE .0` is **gross-profitable and fee-eaten** — 31 closed trades, gross
+$0.36, fees $0.57, net −$0.21, avg notional **$15** at flat 5×. Its
28-of-67 exchange failures trace to VOLATILITY_AUTO sizing under the $10
min notional (`EXCHANGE_MIN_NOTIONAL_UNREACHABLE` fired again the same
morning); both loss caps read "no limit set"; conviction floor 0.35 and
RR floor 1.0 let 49%-conviction churn through; WALTHER's hair-trigger
management closed 26 of 31 by stop. The realized win/loss asymmetry
(1.85:1) says the edge is real; the chassis burned it.

**Two strategies, born whole by compile→apply CREATE plans** — the plan
grammar carries name, timeframe, gate, `minAtrPct`, coin scope, sections,
conditions *and rules*, so no fork-and-retune loop:

- **Trafalgar** (`3a354541…`, r1) — time-series momentum: MTF pullbacks
  (tier 3) in MTF/HTF-aligned trends (tier 2), `trend_adx_trending`
  **required**, gate 0.62, minAtrPct 0.35, `TRENDING_TAPE` condition
  (`ADX_now ≥ 22` — headers resolved via `get_strategy_column_contract`),
  coins BTC/ETH/SOL/BNB, 8 sections.
- **Cannae** (`f901a336…`, r1) — carry/positioning fade: funding extremes
  (tier 3) confirmed by OI divergence + perp/spot flow (tier 2) at
  structure (tier 1), gate 0.62, minAtrPct 0.5, `FUNDING_STRETCHED`
  condition (ANY of `rate ≥ 0.0004`, `rate ≤ −0.0004`), meme/perp coins.

Compile taught three times: conditions require a `verdict`
(`UP|DOWN|NEITHER`); `ACTIVE_SIGNAL_DATA_NOT_IN_REPORT` named the sections
my weighted signals needed (CVD/volume for Trafalgar, structure zones for
Cannae); and the platform seeds section-fed signals at tier 1 around the
explicit hierarchy — 34/20 active rules where 15/12 were sent, core intact.

**Two agents, v14-composed, created OFF → deployed → flipped on**:
**Vanguard** (`c8f20b9e…`, Trafalgar, BTC/ETH/SOL @1h) and **Undertow**
(`d0f6829f…`, Cannae, HYPE/WIF/TRUMP @1h), both GLM-5.2 with the
now-required behavior triple (MODERATE/REALIST/MEASURED and
CONSERVATIVE/REALIST/MEASURED). The shared chassis, each line answering an
observed failure: MANUAL sizing 8/11/15% (≈$16–30 notional on $49 — clears
the $10 min the auto-sizer kept missing), leverage 4, **maxDailyLossUsd
1.5 and maxCumulativeDrawdownUsd 6 set** (the incumbents have none),
RR ≥ 2, conviction ≥ 0.6, 4/3 trades/day (vs 34), slippage 200bps,
signal timeout 5m, trailing ATR ×2 with break-even at 45/40% and
time-decay only on the fade agent. Radar: six of `THE .0`'s sixteen coins
re-pointed (its config untouched — the operator asked for new agents, not
an improved incumbent). Agent slots now 3/3.

**The qualification screen graded the build immediately.**
`MIN_STOP_LOSS_PCT: requested 1.5, reachable 0.62` on BTC — my stop floor
was unreachable on a 0.21%-ATR tape, fixed to 0.5 (Vanguard r3) and levels
derive on ETH/SOL. And the discipline is visible on day one: Vanguard
fails BTC/ETH/SOL on `AGGREGATE_BELOW_MIN` + the ATR floor (correct — 4h
regime reads `bull_ranging`, a trend agent should sit out), Undertow sits
out HYPE (50/62) and WIF (60/62) and **qualifies TRUMP long at 64/62**.
Selectivity is the design; the incumbents' failure was trading anyway.

**State**: 13 capabilities, 130 archived changes, 24 open backlog items,
0 active. Full suite green on the v14 record (1902 vitest + 235 harness +
typecheck + lint; the one pre-existing typecheck error on main —
`trade-story-probe` reading `.reason` off an unnarrowed union — fixed in
passing).

**Watch out**: the radar policy grammar (v14 confirmed) supports
regime-conditioned slots per coin — a trend agent could be slot-gated to
expansion regimes and stop paying for evaluations in ranges. Unconsumed;
a natural refinement once the two agents have a record.
`get_agent_conviction_calibration` (new at v14) is the tool that will
grade the 0.6 conviction floor against outcomes. And the recorder cron is
still the operator's to start — every uncaptured day stays unbackfillable.

## 2026-08-08 (third round) — the record catches v13, and the stale reference confesses v11

**Did**: the freshness alarm from the sweep was acted on the same hour.
Re-probed the surface at **v13.0.0** (67 reads called, 0 failed),
regenerated the reference from a fresh dump, shipped as
`the-surface-record-is-v13` (128th change, lite).

The diff settled two deploys at once:

- **v11 → v13 is the quietest on record**: declared schemas, constants and
  annotations byte-identical across all 110 tools; observed key-structure
  unchanged on every consumed tool. The only movement:
  `get_market_context` 23 → 25 modules (`marketBreadth`,
  `referencePairs`) — unconsumed.
- **v9 → v11 carried real movement the stale reference hid**: the
  committed `BATTLEGRID_MCP_REFERENCE.md` was still generated from v9, so
  nobody saw that **`arenaChallengeEnabled` was dropped** from create,
  update, *and the agent payloads*, that create's declared output gained
  `feasibilityAdvisory`, and that a vocabulary enum shifted. The
  conformance guards never lied — they read the record, which was v11 —
  but record and reference had diverged by a deploy. Filed
  `two-agent-owned-fields-no-tool-can-write` (p3): `AGENT_OWNED` still
  offers arena + overlay as proposable, both now unwritable and unreadable
  on the platform; every agent maps them to constants. Nothing renders
  either field; fix is its own change.

**State**: 13 capabilities, 128 archived changes, 24 open backlog items,
0 active. Full suite green on the v13 record.

**Watch out**: keep record and reference in lockstep — the alarm only
guards the record. This round's rule: a re-probe is not done until
`generate_mcp_reference.py` has run against the same server.


## 2026-08-08 (second round) — a closed trade tells its story

**Did**: the open-orders discovery read came back empty again (`{orders:
[]}`, no position open at probe time — shape still unobserved, slice still
unbuildable, recorded on the item). Pivoted to the observable siblings on
the same backlog item and shipped them as **`a-closed-trade-has-no-story`**
(127th change, standard track):

- **Discovery first**: `get_trade_chart` answered READY on 6/6 settled
  evaluations (83 × 5m candles, levels with the platform's own display
  labels, entry/exit markers, freeze stamp); `get_position_audit_history`
  answered 10 events on the probed WIF winner — TP/SL placed, entry
  filled, the stop **replaced five times** (break-even, then trailing ×4,
  every move `improved: true`), SL cancelled, TP filled at +2.29%.
  Level/marker role vocabulary captured across five trades before any
  renderer keyed off it. `positionId` is carried by the chart and by
  nothing else on a closed trade (26-key outcome row checked raw), so the
  join is forced: chart first, trail through the chart's id.
- **Built**: `readTradeChart` + `readPositionAudit` on `AgentsPort`
  (audit prices as decimal strings, exactly as sent);
  `ReadTradeStoryQuery` with the trail failing independently — and
  `audit: null` when the chart names no position, which is a third state,
  not an empty trail; `/agents/[id]/trades/[logId]` with a server-rendered
  SVG chart (levels labelled **as placed** — the probed chart's stop line
  is the `SL_PLACED` price, five moves behind the stop that ended the
  trade) and the reprice timeline; per-row "How it unfolded" links;
  `read_trade_story` on the MCP surface (25 tools).
- **Proven**: live probe through the product path read the real story off
  a real outcome — decimal strings kept their trailing zeros end to end.
  +24 tests (13 adapter/query, 8 rendering, 3 MCP).

**Also**: the surface map's consumed count was wrong before this change —
`get_agent_coin_qualification` has been consumed since #60 but sat in the
unused list (it landed after the map's last regeneration). Corrected with
a note: 56 consumed, not 53+2.

**State**: 13 capabilities, 127 archived changes, 23 open backlog items,
0 active. 1,902 vitest + 81 db + 235 harness green. Full serial keyed
sweep: **26 passed / 2 failed / 17 write-gated skips** — both failures are
`surface-freshness` firing as designed: **BattleGrid redeployed, recorded
11.0.0 → live 13.0.0**. Every product path answered green against v13,
including the new trade-story probe. The re-probe is the next action.

**Next**: re-probe the surface against v13.0.0 (`BATTLEGRID_API_KEY=…
python3 tools/probe_mcp_surface.py`) and diff what moved — nine
conformance guards read that record. Then: `trading-telemetry-is-unread`
still holds open orders (probe while a position is open) and the
market-context reads. Operator-side: the recorder cron and key rotation
are still theirs to do.

**Watch out**: an open position's log has never been charted — the READY
branch for a not-yet-settled trade is unobserved. The discrimination
handles whatever it answers; the probe prints which branch it saw.


## 2026-08-08 — top to bottom of what was waiting

**Did**: the operator approved and PR #76 merged (`c908677` — the proposals
FK fix is on main). Then the two findings the keyed sweep left open were
settled and archived the same hour:

- **`the-cost-is-only-fresh`** (125th change): the cost-null mystery is
  solved by a raw discrimination read — BattleGrid serves `ownerView` (the
  billing join) **only for fresh evaluations**: populated at ~30 minutes of
  age, null on every sibling older than ~2 hours, same agent, same minute.
  Not drift, not a product bug; the spec already promises cost only "where
  the platform reports" it. The probe now asserts the shape when reported
  and the honest degradation when not — rerun keyed, green.
  `an-owned-evaluations-cost-reads-null` closed.
- **`the-live-suite-paces-itself`** (126th): `vitest.live.config.ts`
  (serial, tests/live only) + `npm run test:live`; the pacing rule moved
  from HANDOFF prose into the command. `live-probes-run-concurrently-by-
  default` closed.

**State**: 13 capabilities, 126 archived changes, 22 open backlog items,
0 active changes. 1,878 vitest + 81 db + 235 harness green.

**Next**: everything actionable-from-here is done. The waiting list is now
purely: the operator's cron + key rotation; browser-consent and funding
items; BattleGrid-side reports; the buildable-but-unhurried tail
(open-orders telemetry slice first, one discovery read away).

**Watch out**: `list_intelligence_agents` returned **1** ACTIVE agent
during the discrimination read (THE .0) — the roster's other agents are
presumably OFF/ARCHIVED and unlisted by default. Not investigated; noted so
a future "where did the agents go" starts here.


## 2026-08-07 (keyed round) — the proposals FK bug: confirmed, fixed, archived; the read sweep ran

**Did**: PR #75 merged (`b311133`). Then the key settled the standing
suspicion in one call: through the real MCP server in personal-key mode
against a real database with zero users rows, `propose_agent_change` failed
with `violates foreign key constraint "proposals_user_id_users_id_fk"` —
the model-proposes feature had **never worked on a personal deployment**.
Fixed and archived the same hour (`a-proposal-records-on-a-personal-
deployment`, 124th change): the FK is dropped (migration 0003), ownership
stays in the WHERE where it always was enforced, the proposals db suite now
runs against bare `users` and records as `owner` (the same load-bearing test
the recorder tables carry), and the identical live call now answers
`proposalId` + `/pending/<id>`. One existing test asserted the FK itself
("refuses a user the database does not know") — its premise was the bug, and
it now asserts the property that actually holds: a stranger's row is
invisible, not unrecordable. mcp-control's record-a-proposal requirement
gained the personal-deployment scenario.

**Also**: the full keyed read sweep. First run went out **concurrently** —
my mistake, HANDOFF says probes run serially — and came back 9-failed with
platform-weather shapes (freshness reading an empty version mid-sweep,
rosters unreadable): rate-limiting, not regressions. **Serial: 26 passed /
2 failed / 16 write-gated skips.** Of the two: `column-grammar-probe` is
per-call platform flapping (the failure moved to a different test on rerun;
appended to `battlegrid-is-returning-internal-errors`), and
`own-evaluation-probe` is a real, stable finding — **the cost-to-think
reads null on an owned evaluation**, twice, on platform 11.0.0, filed as
`an-owned-evaluations-cost-reads-null` (p2) with the discrimination recipe.

**State**: 13 capabilities, 124 archived changes, 23 open backlog items,
0 active changes. Full CI green.

**Next**: the operator's cron (`docs/FIRST_SESSION.md` §3) — still the one
step only they can take — and rotating the key that passed through chat.

**Watch out**: run `tests/live/` with `--no-file-parallelism`, always; the
concurrent sweep's failures cost a diagnosis round. Worth a follow-up item
if it recurs: pinning serial execution for `tests/live/` in the vitest
config rather than in operator memory.

## 2026-08-07 (follow-up) — the recorder is live-proven, first capture recorded

**Did**: PR #74 merged (`07a5138`), and the operator supplied a key the same
afternoon. Freshness gate green (live battlegrid 11.0.0 = the recorded map),
then both proofs: the key-gated probe (16 deployments captured, 0 failed,
SP500 keep-rate **84 raw rows → 84 mapped readings**), and the CLI end to end
into a real PostgreSQL — run `921f8db4`: 1 run, 16 captures, **1,344
readings**, raw answers whole, platform 11.0.0 stamped, exit 0. 255 of 1,344
readings were triggered at that moment. `the-recorder-is-unproven-against-live`
closed with the evidence; the change's one open task (8.2) is thereby
fulfilled.

**State**: 13 capabilities, 123 archived changes, 24 open backlog items,
0 active changes. Every write and now every read path of the recorder is
live-proven.

**Next**: operational, not evidential — the operator starts the cron on the
machine that keeps the database (`docs/FIRST_SESSION.md` §3). The capture
proven here lives in an ephemeral container; the record that matters begins
with the first scheduled run at home.

**Watch out**: the key was used for reads only and lives nowhere in the repo.
`prove-token-lifetimes` and the proposals-FK suspicion
(`a-proposal-cannot-be-recorded-on-a-personal-deployment`) both become
one-call answers now that a key exists — worth the next keyed session.

## 2026-08-07 — the signal recorder: proposed, planned, built, gated, archived

**Did**: the full-track change `nothing-records-what-the-signals-said` end to
end in one session — proposal (PR #74), master plan, execution, verifier
round, production gate PASS, archive. `signal-recording` is the **thirteenth
capability**: what the signals said, captured forward, because the platform
serves current readings only and every day without a recorder is history
nobody can re-fetch.

- **Capture**: `bin/grid-commander-record.ts` (cron-owned schedule, exit
  nonzero when the record didn't grow) → `get_coin_signal_preview` per coin
  (unweighted; the deployments choose when nothing is named) → three tables:
  runs (provenance + platform generation), captures (metrics + the raw
  answer whole), readings. Raw-beside-normalized is the load-bearing
  decision — all nine historical data bugs were mapper drops, and a
  recorder's drop is permanent.
- **Honesty set**: failed reads are recorded gaps with reasons (raw kept
  even when unmappable); coverage derives gaps (spacing > 2× series median,
  one definition in `domain/recording/coverage.ts`); never-recorded /
  unreadable / attempted-and-never-captured are three rendered states.
  Surfaces: `/recorder`, `/recorder/[ticker]?signal=`; MCP:
  `read_signal_history`, `read_record_coverage`.
- **The guards worked, five times**: the vocabulary guard rejected a signal
  id in a tool description; reachability demanded the nav rows; the
  failure-is-explained guard took two own-store exemptions on the
  proposal-queue precedent; the verifier caught the untested no-credential
  scenario (now spawn-tested on the real process); and the audit's ripgrep
  refused to read the store file — a literal NUL byte in a template string
  had made it binary to every text scan (PG-001, fixed).
- **One guard evolved** (DL-008): `live-writes` now derives what a
  `*Command` reaches (shared derivation with `mcp-read-only` in
  `tests/support/write-reachability.ts`) instead of matching the spelling —
  `CaptureSignalsCommand` was the honest read-only case the spelling rule
  couldn't hold.

**Filed**: `a-proposal-cannot-be-recorded-on-a-personal-deployment` (p2 bug
— `proposals.user_id` FKs `users`, and personal mode has no users row; the
recorder's tables were designed around that trap),
`the-recorder-is-unproven-against-live` (p2, waiting on operator),
`recorded-signals-are-not-yet-evidence` (p2, the analysis layer),
`agent-evaluations-are-not-recorded` (p3), `the-record-cannot-be-forgotten`
(p3).

**State at wrap**: 13 capabilities, 123 archived changes, 25 open backlog
items, 0 active changes. 1878 vitest + 80 db green, full local CI green.
Branch `claude/signal-recorder-strategy-y1davv`, PR #74 (draft).

**Next**: the operator — run the live probe
(`BATTLEGRID_API_KEY=… npx vitest run tests/live/recorder-probe.test.ts`),
then start the cron (`docs/FIRST_SESSION.md` §3). Every day before the first
scheduled capture is the loss the capability exists to stop.

**Watch out**: the recorder CLI acts only on personal-key deployments (the
delegated path has no session to resolve headlessly — same as the MCP
server). Coverage gaps need ≥2 captures to define a cadence; a single
capture claims no gap on purpose. And the proposals-FK suspicion above means
`propose_agent_change` may error on exactly the deployment mode the operator
runs — one live call settles it.

## 2026-08-07 — the research map, and the measurements that kept falsifying it

**Did**: `_PM/TRADE_CATEGORIES_AND_MATHEMATICAL_FAMILIES.md` — 13 trade
categories mapped onto a 16-operator mathematical algebra, a benchmark spec, and
a measurement protocol. Probed live and read-only against `battlegrid v11.0.0`:
84 metrics, 16 transforms, all 84 signal definitions, 715 realised trades from 20
public agents, 2,820 joined coin-bars, and a 40-coin × 84-signal cross-section.
Four backlog items filed: `the-surface-map-is-two-majors-stale` (p1),
`nothing-records-what-the-signals-said` (p1),
`a-stop-inside-the-noise-looks-like-a-tight-stop` (p1),
`four-signals-depend-on-a-timeframe-columns-cannot-reach` (p2). PR #69, 7
commits, merged `main` at 95bb95a.

**State**: PR #69 open and mergeable, docs-only (3 files). Local `./scripts/ci.sh`
green — Actions is `workflow_dispatch`-only here, so that is the real gate.
Nothing was written to BattleGrid; the whole session was read-only by
construction (tools filtered on the server's own `readOnlyHint`). Benchmark v0 is
specified and **not built** — that was the operator's call, and the repo work it
implies is filed rather than started.

**Next**: `/propose` `nothing-records-what-the-signals-said` (p1). It is the
structural unlock — there is no backtest API and the history reads cap at 100
candles, so every strategy claim in the doc that sits at evidence tier T3/T4 is
there only because no forward data exists. Every day without a recorder is a day
of signal history permanently lost.

**Watch out**:

- **Three claims in the doc were falsified by later measurement in the same
  session.** The "two majors stale" surface finding was wrong (the freshness gate
  proves `surface.json` is current; the real gap is that the probe records
  *shapes*, so the vocabulary's values are unrecorded). C2's
  `mtf_pullback_long/short` were specified `required: true` and fire **0/40** —
  that strategy would never have traded. C5's `structure_*` signals need a
  `HIGHER` table its spec omitted. All corrected in place, with the original
  claim and its disproof both visible. Expect more of this: the doc's Part D is
  the only empirical section and it is thin.
- **Nothing in Part D is statistically established.** 23 agents, 776 trades, ~2
  weeks, one market regime (a downtrend). The headline module finding — structure
  zones, +0.898/trade — is **two agents, 51 of 61 trades from one**. The best
  agent in the whole population has 51 trades; you need 150–200 to see a 5pp
  difference.
- **`maxDailyLossUsd: 0` and `maxCumulativeDrawdownUsd: 0` mean OFF, not zero.**
  The account's own live agent THE .0 carries both, plus a 1% stop ceiling
  against a 1.25% six-bar noise floor, WALTHER, 34 daily trades, and a $250
  exposure ceiling on a $49 balance. Diagnosed read-only and **left untouched** —
  the operator asked for the breakdown first. `a-stop-inside-the-noise-looks-like-a-tight-stop`
  covers making it visible; retuning it is a separate, unfiled decision.
- **Signal scores are graded, not binary**, and steeply so — `rsi_oversold`
  scores 0.10 at RSI 27 against 0.50 at RSI 15. A high aggregate means signals
  fired *deeply*, not that many fired. Nine signals also document scores above
  1.0 while `simulate_aggregate_score` declares `[0,1]`, so offline tuning
  understates the aggregate wherever those are weighted.
- **The two research scripts live in the session scratchpad, not the repo.**
  They are gone when this container is reclaimed. `tools/probe_mcp_surface.py`
  provides the transport; the analysis was ad hoc and would need rewriting.


## 2026-08-07 (wrap-up) — the documentation matches the product, for the first session

**Did**: the branch documentation brought current end to end, so the next
session — the operator's first *working* session — starts from truth instead
of archaeology. No code changed.

- **`README.md` is now the product's**, not the pipeline's. The SKILLMOREL
  pipeline documentation moved whole to `docs/PIPELINE.md` with a pointer at
  its old identity; the root README now says what Grid-Commander does, the
  three facts that shape every decision, how to run it, and where every other
  document lives.
- **`docs/FIRST_SESSION.md` is new** — the operator runbook: boot with a
  personal key (no OAuth registration; `/connect` says "nothing to connect"
  when a key is set), trust it via the freshness gate, the reading tour in the
  order the questions come up (stoppages → pipeline → trades → qualification →
  the field), first writes in ascending blast radius, what the product refuses
  on purpose, and what platform weather looks like.
- **`CLAUDE.md`** no longer claims "no application code yet".
- **`HANDOFF.md` refreshed whole**: the capabilities table names what actually
  shipped (harness 124 → 235; conditions saved, not just tried; spend;
  qualification), "What the App Can Do" gains the final three rounds' surfaces,
  the stale "waiting on BattleGrid" start-here block — written when
  `the-model-can-propose…` was unarchived — is replaced with the real state
  (everything proposed is built; the 20 open items split into waiting-on-
  operator / waiting-on-BattleGrid / waiting-on-evidence / buildable-not-
  urgent), and the live-probe table covers the eight probes added since it was
  written.

**State at wrap**: 12 capabilities, 122 archived changes, 20 open backlog
items, 0 active changes, 0 open design tickets. 1811 vitest + 62 db + 235
harness, all ten CI gates green keyless, keyed suite fully green since the
explorer subsystem recovered. Every write path live-proven. PRs #8–#72 merged.

**Where the next session starts**: as the operator — `docs/FIRST_SESSION.md`.
As a developer — `/board`, then the backlog's buildable tail (the open-orders
slice of `trading-telemetry-is-unread` is the largest remaining read surface,
one discovery read on account 2 away).

## 2026-08-07 (round five) — five builds, and two items settled by reading the code

**Did**: four agents finished, one stalled and its work was completed by hand.
Five changes archived (117 → 122), six items closed, none filed. Backlog
24 → 20 — the first round in five that shrank it, because the probes are
answered and the findings they opened are now the work being done.

| change | closes |
|---|---|
| `a-cancelled-session-is-promised-nothing` | `a-cancelled-session-is-told-to-wait-for-settlement` (p2) |
| `the-session-page-reads-both-payloads` | `the-session-page-reads-the-narrower-of-two-payloads` |
| `the-brains-name-and-the-spend-are-read` | `the-cost-of-an-agent-reads-differently-from-two-tools` |
| `the-copy-can-be-named` | the product half of `forking-a-name-that-exists-is-a-500` |
| `a-unification-ships-its-guard` | `a-sweep-cannot-see-files-born-in-the-same-round` |

**Two items settled without building anything, by reading the code first.**
The prose-marker item was filed P2 on the premise that an operator agrees to a
removal and then meets the `MARKET_READ_MARKER_UNKNOWN` refusal — but
`DescribeConditionWriteQuery` compiles as its *first* act, so the refusal lands
on the describe, before any confirmation is minted. Re-graded P3. And the v5
item's one buildable section (the `bars`/`ordering` controls) had already
shipped in round four; the rest are records, and it now says so. The lesson is
the round's title: a filed item is a claim, and the cheapest verification is
often reading what is already there.

**What the builds did**: the arena no longer promises results to the 48 of 50
sessions that are CANCELLED and never settle (bespoke prose only for observed
statuses; anything else gets the platform's-own-word treatment). `/arena/[id]`
reads the list row alongside the detail, so the session's own page can finally
say "needs 5 more players" and who hosts it. The brain renders its human name
(`GLM-5.2`) instead of the flattened `CUSTOM`, and spend renders on `/limits` —
read from the list, the copy that answers, with the detail's stable zero
fenced off at the mapper so no refactor can route it to a surface. The fork
form takes an optional name (the tool always accepted one; the product never
sent it), and a refused fork now renders on the form in the platform's words
instead of crashing the action.

**One agent stalled** after writing a complete proposal for the process rule.
Finished by hand: the unification-ships-its-guard rule now lives in the
executor skill (Step 5), the UI checklist (Tailwind row 6, v1.1.0), and
`change-lifecycle.md` §5 — whose new integrator paragraph was applied to this
very round before it shipped: every round-introduced guard re-run against the
merged tree, 217 architecture tests green.

**The explorer outage resolved itself** in under six hours; both formerly-red
live probes pass, so the keyed suite is fully green again with no change on
this side. Recorded on `battlegrid-is-returning-internal-errors`.

**Next**: the backlog's remaining P2s all wait on someone else — the operator
(a browser consent, funding three agents), or BattleGrid (reporting the fork
500, the internal errors record). The P3 tail is genuinely small. The largest
unbuilt read surface is `trading-telemetry-is-unread`'s open-orders slice,
which needs one discovery read on account 2 first.

## 2026-08-06 (round four) — six builds, and a write path proven live

**Did**: five agents plus one build of my own, and the reserved live probes run
serially. Seven changes archived (110 → 117), **ten** items closed, **eight**
new ones filed. Backlog 26 → 24. The probes answered five standing questions and
every answer opened something real — which is why closing ten only moved the
count by two.

| change | closes |
|---|---|
| `the-schedule-comes-off-the-list` | `the-session-list-already-carries-the-schedule` |
| `the-last-stock-buttons-and-the-guard` | `agent-edit-still-stock` |
| `the-record-carries-the-whole-condition-union` | `the-record-flattens-the-condition-union` |
| `the-inside-of-a-section-is-composable` | `strategy-metric-editor` |
| `a-drafted-condition-can-be-saved` | `a-drafted-condition-cannot-be-saved` |
| `the-players-above-you-are-shown` | (filed and built the same day) |

### The write path is not a seventh dead one

`a-drafted-condition-can-be-saved` shipped a `full`-track write and its own live
walk, deliberately unrun. I ran it:

```
fork:     Tobruk (fork) r1
before:   conditions=5
describe: proposal, naming the whole resulting list and the bound-agent count
after:    r2 conditions=6, GC_PROBE_DRAFT added, tagline and sections unchanged
remove:   r3 conditions=5, back to the original five
cleanup:  fork archived, parked strategy restored — every audit entry succeeded
```

**It took three corrections to get there, and all three were in the probe.**

1. The control case resubmitted the strategy's own condition list and expected a
   plan. The platform refuses it — `Strategy update contains no effective
   changes` — which is *better* evidence: the compiler can only know to refuse
   by comparing the submitted list against the stored one. Made two-armed, not
   loosened.
2. It forked `Dunkirk`, and **`fork_strategy` answers `INTERNAL_ERROR` when a
   strategy of the fork's name already exists.** Twenty-two were named
   `Dunkirk (fork)`. Isolated by forking `Leningrad` and `Tobruk`, which have no
   such name — both clean. Not the quota, which refuses properly and publishes
   `{used: 25, limit: 25, remaining: 0}`. A refusal wearing the wrong clothes,
   so this product correctly renders a fixable mistake as a broken server.
3. Its column search did not recurse into groups, so `London`'s eight conditions
   yielded none and the walk **skipped after forking** — reporting success having
   proved nothing. That skip now throws.

The read half also found a **fourth reference site**: `marketReadText` names
conditions by `{KEY}` marker, so removing one is refused for a reason the
describe does not mention. `unresolvedReferences` is correct and incomplete.

### The probes: five answers, and two published claims corrected

- **`conditionOutcomes[].verdict` exists.** Declared, never captured, now
  observed populated (`NEITHER` on BTC and ETH). The preview can state the
  strategy's own call per coin. The capture also carries `counts` and
  `provisional`, neither previously recorded.
- **Forking preserves conditions**, and the item claiming otherwise was wrong.
  All 22 forks on account 1 carry their parent's two. The split is *when* —
  `fork_strategy` pins a `sourceRevision`, all twelve SYSTEM strategies were
  batch-edited on 2026-08-05, and account 2's forks predate the revision that
  added conditions. Confirmed twice over by the live walk: a fork taken today
  arrived with all 8 of Leningrad's and all 5 of Tobruk's.
- **The leaderboard has rows** — ten per metric, where the probe recorded `[]`.
  `/explorer` had modelled them the whole time and rendered none. Built the same
  day, because mapped-and-unrendered is what `binding.state` sat in until the
  platform said ORPHANED and the roster said "Bound".
- **The agent cost ceiling is not readable anywhere.** One cost-named field on
  the whole payload; `get_agent_budget` has none. So `/limits` cannot gain a
  fifth gauge — that question is closed, not open.
- **`get_agent_performance` works and `get_agent_fund_allocation` does not.**
  The pair has separated: performance answers to the cent with a 27-point curve
  where a budget exists; allocation is all zeros on that same budgeted, trading
  agent. So `lifetimeAllocatedUsd: 0` can no longer be read as "never funded" —
  the second correction.

**And one field disagrees with itself.** `last24hCostUsd` is `0.09022839` on the
list row and `0` on the detail read, for the same agent at the same moment,
stable across repeated samples, with every other key identical. Whichever
surface renders spend must read it from the list. Same shape as the
`connectionId` defect: a wrong value from a plausible source, invisible because
nothing compared it against a second one.

### Corrections to the record

`coinPicks.rosterSize` was recorded as `0` and is `36` — the roster is
populated, only the picks are empty, and three fields (`others`, `topLeanUp/
Down/Even`) were never named. The arena itself is 2 PENDING and 48 CANCELLED
with `playerCount: 0` everywhere, so "watch for a session with players" has
nothing to find. And 48 of those 50 sessions are told results arrive after
settlement, which for a CANCELLED session never happens.

**Next**: the `docs/specs` → `docs/checklists` rename is still in flight. The
two P2s the probes filed — the prose/condition reference and the fork 500 — are
the pointed ones. `conditions: []` is still unobserved: the probe'''s empty-list
case was refused by the marker rule, not by anything about an empty list.

## 2026-08-06 (round three) — six builds, and a destructive risk that turned out not to be

**Did**: five agents plus one build of my own. Six changes archived, six items
closed, five new items filed. PR #69. Backlog 23 → 26 — it went *up*, because
finishing work honestly means filing what it uncovers.

| change | closes |
|---|---|
| `a-drafted-condition-can-be-tried` | `conditions-are-an-unmodelled-authoring-layer` |
| `the-game-is-legible-before-it-is-played` | `market-grid-is-an-unmodelled-module` |
| `brain-presets-are-read-not-remembered` | `brain-presets-are-hardcoded-and-short-one` |
| `buttons-and-labels-from-one-source` | `buttons-and-labels-untokenised` |
| `the-snapshot-says-how-old-it-is` | `a-priced-position-goes-stale-while-you-read-it` |
| `the-last-two-surfaces-that-assume-a-binding` | the binding-copy remainder |

**The conditions build stopped at the write and was right to.** It found that
`compileUpdateIntent` omits `conditions`, while `toApplyPlan` copies
`postState.conditions` — so if the compiler treated an omitted list as empty,
**every tagline edit would silently clear the layer that decides direction**, on
a fleet-wide apply. Nothing in the repo distinguished that from the benign
reading, so it refused to guess and filed it.

**Settled live, and it is the benign one.** `compile_strategy_plan` performs no
write, so one call answers it. On `Dunkirk (fork)` — user-owned; a SYSTEM
strategy answers `FORBIDDEN` — with the request composed byte-for-byte as the
product composes it:

```
BEFORE  rev=4  conditions=2  [ALL_AGREE_UP, ALL_AGREE_DOWN]
postState.conditions: 2 entries [ALL_AGREE_UP, ALL_AGREE_DOWN]
AFTER   rev=4  conditions=2   (compile wrote nothing)
```

The compiler fills `postState` from the stored strategy. Two things learned on
the way: a **no-op UPDATE is refused** (`VALIDATION_ERROR — Strategy update
contains no effective changes`), and `compile_strategy_plan` takes a **`request`
wrapper** — a flat payload is refused on `path: ["request"]`, which is why a
hand-rolled probe must be checked against the adapter and not the schema alone.

It opened a new question rather than closing cleanly: **twenty-five of the
twenty-six user-owned strategies across both accounts have zero conditions**,
while every SYSTEM strategy has two to ten — and the twenty-sixth,
`Dunkirk (fork)`, has two. So "forking drops them" cannot be the whole story.
Filed.

**The brain-presets item was diagnosed wrong, and the correction is the lesson.**
It read as staleness — ten hard-coded, eleven declared. It was never stale: the
2026-07-27 capabilities record already held eleven, and the constant was written
2026-07-29 with ten because it copied the field's **description prose**, which
enumerates presets in a sentence, rather than the `enum` constraint beside it.
The comment saying "if BattleGrid adds one, this is where the surprise lands"
was already out of date when it was written, and being the designated landing
place did not make anyone look for eight days. The enum is now read live.

`CUSTOM` is excluded without a guess: the offered set is the preset enum
**minus every value that also appears as a `brain.kind` discriminator**, derived
at runtime from both enums, so it holds if either moves. What
`{kind: PRESET, preset: CUSTOM}` means is still unestablished and still filed.

**The buttons item was also wrong about itself.** It deferred on the grounds
that no design ticket had spent the tokens. DT-0002 had: `plan-review.tsx`
carried both weights as inline strings, screenshotted in both schemes. The new
constants are those strings lifted byte-for-byte — no visual language invented.
Two buttons turned out to be wearing `CONTROL`, i.e. a submit dressed as a text
input, `w-full` and all.

**Market Grid found a dead path**: `get_market_grid_results` had been on the
port since the arena shipped and was never called. It is reached now, from
`/arena/[id]` rather than the fan-out over fifty rows — which is where this
morning's 429 came from. It also filed a p2 questioning the fan-out itself: the
session list already carries `status`/`lockAt`/`settleAt`/`playerCount`, so the
per-session detail read may be unnecessary. It did not act on that, because
removing it would retire three live scenarios.

**Staleness took both options** — an age beside the stamp (not replacing it, so
rounding hides nothing) and a server-rendered re-read link — with a third state,
`ahead-of-clock`, so the panel can never say "priced -1 minutes ago". Clock
through the port, plus a guard forbidding `Date.now()` under `src/presentation/`
and `app/**/*.tsx`.

**A test I loosened deliberately**, in my own build: `not.toContain('bound to')`
failed *on the fix*, because `BindingSummary` legitimately says "the strategy it
**was bound to** … can no longer be read". It now names the claim
(`'returns to your roster bound to'`) rather than the phrase. A guard broad
enough to catch the honest wording is one that gets relaxed carelessly the next
time it fires.

**CI**: keyless green. The keyed run failed two live probes on BattleGrid
**504s** — third time today — and the platform, not the product, is what moved.

**Next**: `an-update-that-omits-conditions-is-unobserved` is answered, so the
condition **write** now has one blocker left rather than two — the record
flattens the condition union, so `payload-conformance` cannot check a condition
payload. `the-session-list-already-carries-the-schedule` (p2) is small and
would undo a fan-out that has already cost one outage.

## 2026-08-06 (round two) — four more in parallel, and one of them found the reason a field was always empty

**Did**: four agents, four changes archived, five backlog items closed. PR #68.
CI green on the four-way merge, no conflicts. 23 items open.

| change | closes |
|---|---|
| `bound-and-on-duty-are-claims-the-payload-must-back` | the two lifecycle p2s |
| `the-condition-outcomes-are-legible` | `condition-outcomes-are-unrendered` |
| `the-probe-applies-the-edit-it-described` | the write-probe digest mismatch |
| `the-exposure-panel-explains-itself` | the sweep's one deferred exemption |

**The best find is why a field was always empty.**
`preview_strategy_report` takes `conditions` as an **optional input** and no
`strategyId` — it resolves only what it is *sent*. That is why
`conditionOutcomes` had been `[]` in every capture this repo holds, including
the probed surface record. So the work was never "render a field we ignored";
it was a round trip nobody had noticed was missing a leg. The strategy's
conditions now go back **whole, as the platform sent them**, on
`conditionsAsGiven` — kept off `StrategyDetail` so `read_strategy` does not
answer a model with two copies of one list, and passed through rather than
re-serialised from the domain shape, which would drop any `unrecognised` form.

Three things it refused to flatten, all from the item's own warnings.
`unresolvedCount` is carried with **no false count**, and a test forbids
`total -`, `- unresolvedCount` and `- trueCount` anywhere in the mapper or the
component — subtraction is exactly how "unresolved" becomes "false". `counts:
null` stays null rather than becoming 0-of-0. And `outcome` is kept as the
platform's **string**, not narrowed to the declared three words, because a union
has to coerce or crash on a fourth — which is where a three-state becomes a
two-state, four times documented in this repo.

**The lifecycle change put the join in the domain and let the compiler find the
callers.** `deploymentsFor` now takes the agent's lifecycle and can return a
fourth standing, `slot-held-not-scanning`. Three surfaces render standing, and a
check repeated at three call sites is three chances to forget it once — which is
how they disagreed in the first place. Taking lifecycle as a parameter means a
caller that has not read it **cannot compile**. That flushed out two call sites
that never wanted standing at all (`describeUndeploy`, `readQualification`);
both now call `deploymentsNaming` for membership only, so neither is taught to
invent a status.

Two restraints in it worth keeping: an open position the radar attributes to the
agent **outranks lifecycle** — an archive is not evidence a position closed —
and the market-level occupancy only ever claims the negative. `no-active-agent`
licenses "deployed and unscanned"; `active-agent-present` is never turned into
"covered", because a policy can be `enabled: false` and that is unread here.

**The probe fix did not loosen the guard.** The write probe described
`{tradingConfig: {}}` and applied `{maxDailyTrades: 7}` — two digests, an
unspendable token, a test that could never have passed. It now forms one intent
and splits it with `editArguments`, the product's own split. Proven offline with
a **negative control**: the old pair is run deliberately and asserted refused,
without which the passing test is a fake agreeing with itself.

**On wording.** The exposure panel's subject is `this agent's positions are`
rather than the `these positions are` the item sketched — because nothing is
listed on that branch, so a demonstrative points at the very list that failed to
load. The reason line stays directly above it, so the sentence denies only that
the failure is evidence, never that the market did not move.

**Filed rather than done**, by the agents themselves:
`the-edit-and-reactivate-copy-assume-the-binding-is-intact` (p3, a component
swap now that `binding.tsx` exists) and `preview-per-ticker-verdict-is-unobserved`
(the output schema declares a *required* per-ticker `verdict` that appears in no
capture; the live probe now prints the rows so a keyed run settles it).

**Procedure, corrected from round one**: worktrees removed *before* linting, so
`eslint .` never scanned them.

**Next**: `conditions-are-an-unmodelled-authoring-layer` (p2) is the sibling of
the change that just landed. `approval-expired-on-a-full-execution-agent` (p2)
still needs the operator rather than the product.

## 2026-08-06 (backlog sweep) — five builds in parallel, and what the parallelism found

**Did**: five agents in isolated worktrees, one backlog item each, integrated
here. Five changes archived, five items closed, three new items filed from the
second-account survey, two new items filed *by the agents* from things they hit
on the way. PR #67. CI green on the five-way merge with no conflicts.

| change | closes |
|---|---|
| `a-failed-read-explains-itself` | `an-unreadable-branch-need-not-explain-itself` |
| `the-stop-that-moved-is-shown-as-moved` | `the-stop-that-moved-is-not-the-stop-we-show` |
| `a-model-can-ask-whether-it-would-take-a-coin` | `screening-is-not-offered-over-mcp` |
| `a-probe-reuses-its-throwaway-agent` | `probes-have-littered-the-second-account` |
| `the-connect-response-says-only-what-is-read` | `unread-connect-response-fields` |

**Three of the five found a defect the item did not describe.** That is the
argument for doing them properly rather than as a sweep.

- **`connectionId` was not merely unread — it was wrong.** The connections
  insert is `onConflictDoUpdate` on `userId` whose `set` never touches `id`, so
  on every reconnection the surviving row keeps its key while the code returned
  a freshly minted one. Nothing caught it because `FakeConnectionStore.upsert`
  *replaces* its stored connection with the fresh id: **the fake agreed with the
  code and disagreed with the database**, and `expect(res.connectionId)
  .toBeTruthy()` passed against both. Same shape as the `FakeAgentsPort`
  confirmation trap already in HANDOFF.
- **`/agents/new` reported a rejected credential as an outage.** It branched on
  `catalog.kind !== 'catalog'` and discarded `cause`. Fixing it moved
  `CatalogResult` from the domain to the ports — the domain cannot name
  `FailureCause`, so the adapter had been producing one all along and only the
  *type* dropped it.
- **`write-probe` cannot spend the confirmation it mints.** Its trading-limit
  step describes `{tradingConfig: {}}` and applies `{maxDailyTrades: 7}`; the
  two digest differently, so the guard refuses the write. Established against
  the fakes with the two differing targets rather than guessed, and filed as p2
  rather than fixed inside an unrelated change.

**The unreadable sweep's guard is the part worth keeping.** It walks `app/` and
`src/presentation/`, finds every `.kind === 'unreadable'` test, extracts *the
region that branch renders* by balanced-delimiter scan, and requires the shared
sentence inside that region — per branch, not per file. An unrecognised branch
shape fails loudly rather than passing. Exemptions are a declared table with a
written reason each, checked **in both directions**: a stale entry fails, and so
does one whose branch has started carrying the sentence. 32 of 36 branches
explain themselves; the other four say why not, and the fourth
(`exposure.tsx`) is deferred with a filed item rather than argued away.

It also caught two subjects that read *"This does not mean this agent's limits
gone"* — the sentence had no verb, on surfaces that had used the component
correctly for weeks.

**The stop-drift join has a third state I would not have specified.**
`incomparable`, for when the decision recorded no stop *or* the position
reports none now. Two absences are not agreement: folded into `as-decided`, a
stop that had vanished from a live position would render as one that never
moved. It produces the most alarming sentence the join can make — *"The
decision set the stop at 55.67 and this position reports no stop now."*

**On running five agents at once.** Disjoint file sets held: no merge conflicts
across 39 files. The one integration cost was self-inflicted — the worktrees
live under `.claude/worktrees/`, so `eslint .` scanned them and reported 427
errors that were not in the merged code. Removing the worktrees after merging
is part of the procedure, not an afterthought.

**Next**: `an-orphaned-agent-is-shown-as-bound` and
`an-archived-agent-is-shown-on-duty` (both p2, both filed today, both the same
defect family — a surface asserting what the payload contradicts).
`write-probe-describes-a-different-edit-than-it-applies` (p2) is small and
self-contained.

## 2026-08-06 (closing) — the money that was at stake, and the money that never got there

**Did**: both P1s from the second-account walk, as one change —
`what-it-holds-and-what-it-could-not-place`. PR #66. Sixteen requirements on
`agent-understanding`.

**An agent could hold leveraged money and nothing rendered it.** `/trades` is
closed trades, `/pipeline` is decisions already made. `THE .0` opened HYPE LONG
at 17:10 — $12.37 notional at 5×, $2.47 margined — and every surface reported
normally. `/agents/[id]` now shows it, above everything retrospective.

Sourced from `list_user_active_positions`: **one account-wide read** carrying
`agentId` per row, richer than the per-agent tool and cheaper than N calls —
and one source rather than two that can disagree. Every figure is the
platform's. Mark price, unrealized result, ROE, margin and liquidation price
all arrive computed; recomputing any from an entry price would disagree with
the exchange the first time BattleGrid changed how it marks.

**`unpricedPositionCount` is the platform writing our own rule as a field.** A
position it could not price renders as unknown, not flat. Zero is a result;
null is silence — the same distinction as a null win rate and an unconfigured
gauge, arriving from the other direction for once.

**The stop is now the one that is actually in force.** The position reports
`effectiveStopLoss: 55.954`; the decision that opened it recorded
`55.67456526`. `/pipeline`'s stop is relabelled *"at the decision"* so one word
cannot mean two numbers across two surfaces. The join that shows the drift is
still open as a p2.

**The second P1 needed no new read at all.** `AgentFunnel` has carried
`executed`, `failed` and `enterDecisions` since Phase 2, and `/pipeline` has
rendered them the whole time — as a row of figures, which is exactly where 28
reads as a number rather than as half of everything the agent decided. The
change was the sentence: **28 of 60 entries never became an order**, and
"failing is the more common outcome" when `failed >= executed` — a comparison
of the platform's own two counts, not a threshold anyone picked.

Two refusals, both from this item's own notes: **no reason per failure** (the
row carries an `executedAt` and no `executedOrderId`, and that absence is the
evidence), and **no reconciliation** of BattleGrid's `fillRatePercent: 63`
against counts that give 27 of 60. Different computations, unknown to us, so
both are shown and each is attributed.

**The position closed while this was being built** — open 17:10, gone by 19:10.
So `exposure-probe` asserts the shape of whatever it finds and *prints which
branch it saw*, rather than demanding `holding` and failing on market timing.
It reported the other P1 through the product's own path on its first run:

```
THE .0: flat · fills 27 executed / 28 failed of 60
```

**Next**: `the-stop-that-moved-is-not-the-stop-we-show` (p2) is now a small
join — the position carries `decisionId` and the decisions are already read.
`approval-expired-on-a-full-execution-agent` (p2) is still the open question
and still needs the operator, not the product.

## 2026-08-06 (late) — a full walk of every controller, and it found a 500

**Did**: built `all-controllers-probe` — every read controller, one live
account, one run, printed as a table. Ran it against both accounts. It found a
defect on its **first execution**. `one-bad-session-must-not-take-the-arena-down`
archived; PR #65.

**The finding, in two lines of its own output:**

```
watchArena   THREW BattleGrid is limiting how often this deployment may ask (HTTP 429).
readField    field=unreadable leaderboard=unreadable
```

Same rate limit, same run, opposite behaviour. `WatchArenaQuery` reads the
session list through a guarded call and then **fans out** per session to
`sessionDetail` and `hasSubmitted` — and the guard was on the first call only.
One rate-limited session threw out of the use-case, which at a route is a 500.
`/arena` had this for the life of the feature.

No single-feature probe could have found it: `arena-probe` reads the arena
alone and never generates enough traffic to be limited. It took a walk of
everything at once.

**The second defect is the worse one.** `ArenaSession.entered` was a `boolean`,
and the page rendered `!entered` as *"This account has not entered this
session."* So a submission check that failed produced a **definite claim from a
read that returned nothing** — the same error as an unreadable roster shown as
an empty one, which this product names in four other places. Now three states,
and `null` renders as unknown.

**The probe's own first run was also wrong, and that stays in the file.** It
read `listings[0].id` where the shape is `listings[0].strategy.id`, and
`field.agents` where it is `field.field.agents`. Both `if`s fell through and
**four controllers were never called in a run that reported success**. Every
controller is now walked or printed as `SKIPPED — <why>`, and the row count is
asserted at 25. A survey whose gaps are invisible is precisely what it exists
to catch.

**Both accounts now walk clean — 25 controllers, 0 threw** — and the diff
between them is the argument for having built it:

| | account 1 | account 2 |
|---|---|---|
| `readTradingRecord` | `none` | `record outcomes[5] total=27` |
| `readPipeline` | `evaluations=none decisions=none` | all four populated |
| `readOwnEvaluation` | skipped, nothing to open | `evaluation` |
| `readBudget` | `unbounded[0]` | `unbounded[2]` |
| `listStrategies` | 59 listings, `at-capacity` | 18 listings, `available` |

The empty column on the left is why every existing probe stayed green while a
500 shipped. Account 1 exercises fewer paths; a suite that only ever ran there
could not reach them.

**One CI note.** The keyed run failed once on `column-grammar-probe` with an
HTTP **504** from BattleGrid and passed on retry, unchanged. Platform, not
product — the same flapping recorded all day. The keyless run, which is the
deterministic gate, is green.

**Next**: `an-open-position-is-invisible` (p1) and
`half-of-what-it-decides-never-reaches-the-exchange` (p1) are still the two
builds, and they share a surface.

## 2026-08-06 (night) — cross-referencing what we built against an account that trades

**Did**: ran the built surfaces and the unread tools against `THE .0`, the one
agent on either account with real volume. Corrected a load-bearing claim,
unblocked two items, filed three. PR #64.

**A documented "platform defect" turned out to be a misreading, and we were
telling users about it.** `docs/MCP_SERVER.md` sold this product partly on
*"`get_agent_performance` answers zeros on an agent carrying real losses"* —
three sessions of observations behind it. The second account says otherwise:

| | Fade Master II (acct 1) | `THE .0` (acct 2) |
|---|---|---|
| `maxConcurrentExposureUsd` | 0 | 250 |
| `get_agent_performance` realized | **0** | **-0.23** |
| curve points | **0** | **26** |
| trade record | -4.47 (18 trades) | -0.236 (26 trades) |

Where a budget is configured the tool is **correct to the cent**, with one
curve point per closed trade. It measures P&L **against the risk-budget
baseline**, and account 1's agents have no budget, so there is no baseline and
it reports zero. Not a lie — a narrower question than its name suggests.
Corrected in `docs/MCP_SERVER.md`, `src/ports/agents.ts` and two backlog items.
`read_trading_record` still derives from the trades and still should: it
answers the same either way.

**The biggest gap is a p1 the product cannot do at all.** `THE .0` opened HYPE
LONG at 17:10 today — $12.37 notional, 5×, $2.47 margined — and was still
holding it. **No surface in Grid-Commander shows an open position.** `/trades`
is closed trades; `/agents/[id]` is deployments and stoppages. The first thing
an operator would look for is the one thing absent.

It was filed as blocked because the position tools answered empty on account 1,
and this repo does not model unseen shapes. **The second account has the
shape** — `get_agent_open_positions` and `list_user_active_positions` both
answer, the latter with mark price, unrealized P&L, ROE, margin, age,
liquidation price, and `decisionId`/`signalLogId` back to the reasoning.
`open-position-rows-are-unobserved` closed; `an-open-position-is-invisible`
filed p1 with the recorded shape.

**And inside it, a wrong number we already render.** The decision recorded
`stopLoss: 55.67456526`; the live position reports `effectiveStopLoss: 55.954`.
Trailing has walked the stop up and `/pipeline` shows the decided one — wrong
in the direction of *understating* protection, on the surface where someone
decides whether to intervene. `position-management-editing` shipped the
configuration and the preset drift; it never showed the effect. Filed p2.

**Two fields worth remembering.** `pricingStatus: LIVE` with
`refreshIntervalMs: 10000` — the platform tells a client how often to re-read,
and every surface here is a static server render, so a position page has a
staleness problem no other page has. And `unpricedPositionCount`, which is the
platform drawing the *unreadable is not empty* distinction this product
enforces everywhere, arriving as a field.

**One field is simply wrong**: `accountEquityUsd: 0` on both accounts,
including one holding $49.13. Nothing renders it and nothing should until it is
understood.

**Next**: `an-open-position-is-invisible` (p1) is the build —
`half-of-what-it-decides-never-reaches-the-exchange` (p1) is the other, and the
two share a surface: what the agent is holding, and what it tried to hold and
could not.

## 2026-08-06 (evening) — the second account broke two of my claims

**Did**: surveyed the second account, reads only. Corrected two published
claims, filed three items. No source changes.

**The second account is a different product.** `Fibonacci` — $49.13, one active
agent (`THE .0`), **16 radar deployments** including SP500 and BRENTOIL, and an
agent that is genuinely trading: 71 evaluations, 27 executed orders, 26 closed
trades, evaluating as recently as 17:00 today. Account 1 has three agents that
have never evaluated anything.

**Two claims from this morning were wrong, and the second account is what
found them.**

1. *"The block lands on agents that have never traded, not on the one that
   has."* `THE .0` has 71 evaluations **and** 90 `AGENT_APPROVAL_EXPIRED`
   blocks. The account-1 pattern did not generalise one account.
2. *`lifetimeAllocatedUsd: 0` means never funded.* `THE .0` reads 0 with 26
   closed trades behind it. Whatever that counter is, it is not that.

Both were generalisations from a single account, stated with more confidence
than one account can carry. Corrected in the item.

**The conclusion they supported survived, on better evidence.** The operator's
"a signal fired and the order missed its fill window" reading is still not what
the code counts — `THE .0` has `expiredCount: 5` against **90** blocks, and on
that account the windows do not even overlap: the five expiries are 28–29 July,
the blocks run 30 July → 6 August.

**And the intuition found something real anyway.** The five expired decisions
are each exactly 15 minutes from creation to expiry, against
`signalTimeoutMinutes: 15`. First live confirmation of what that setting
governs.

**The finding that matters most is new and is p1.** `THE .0`'s decisions:

```
EXECUTED 27 · FAILED 28 · SKIPPED 11 · EXPIRED 5     fillRatePct: 63
```

**28 of 60 entries never became an order.** Every FAILED row carries an
`executedAt` and no `executedOrderId` — the platform reached the point of
placing and got nothing back. Sizes are 0.5–0.76% under `VOLATILITY_AUTO`,
which on $49 is a notional around $0.30 before leverage. This account has
already been told why, once, in the platform's own words:
`EXCHANGE_MIN_NOTIONAL_UNREACHABLE {equityUsd: 240, minEquityUsd: 333.33}` —
and that fired when equity was **$240**.

`what-keeps-stopping-this-agent` will not show any of this: these decisions were
never blocked. They passed every gate, spent a model call each, and died at
execution. Filed as `half-of-what-it-decides-never-reaches-the-exchange` (p1).

**Also filed**: eight archived `GC probe` agents on the operator's second
account are ours, from write-probe runs across several sessions. All OFF and
archived so none can trade — but there is no delete tool, so they cannot be
cleaned up from here. The fix that is ours to make is having the probes reuse
one throwaway instead of creating a new one per run.

**Next**: `half-of-what-it-decides-never-reaches-the-exchange` is p1 and is the
money surface. Everything it needs is already read — `fillRatePct` is on
`AgentFunnel` and rendered today as a statistic; what is missing is treating a
low fill rate as a finding and joining it to the `minEquityUsd` the platform
has already quoted for this account.

## 2026-08-06 (later) — the platform was already saying it

**Did**: `what-keeps-stopping-this-agent` archived. Fifteen capabilities' worth
of requirements on `agent-understanding`; PR #61.

**Folded every gate block on the account and the picture changed.** 371 blocks
across five agents, and almost all of them one reason repeating:

```
CONTRARIAN:  98× AGENT_APPROVAL_EXPIRED   30 Jul → today   {}
Fade Master: 79× EXCHANGE_MIN_NOTIONAL_UNREACHABLE  {equityUsd: 89.49, minEquityUsd: 1000}
Fade Master II: 80× INSUFFICIENT_EQUITY   {equityUsd: 2.18, thresholdUsd: 10}
```

`/pipeline` shows the ten most recent blocks, so the ninety-eighth looked
exactly like the first. An agent can sit unable to trade for a week with every
surface reporting normally, and one did.

**The backlog item's premise was wrong, in our favour.**
`an-agent-can-be-structurally-unable-to-trade` proposed deriving the verdict —
balance × preset × leverage against an exchange minimum *scraped out of
rejection message text*, "because the exchange minimum is not published by any
tool". It is published. `minEquityUsd`, per agent, with the arithmetic done:
Fade Master's reads 1000, CONFLUENCE's reads 222.22 at `smallPct: 0.9,
maxLeverage: 5`. A derivation of ours would have disagreed with the platform
and been wrong the first time BattleGrid changed how it sizes. **Read, don't
derive** — the same lesson, found again from the other side.

**The detail pairs are matched on field name, not reason code.**
`equityUsd`/`thresholdUsd`, `availableUsd`/`requiredUsd`, `atrPct`/`minAtrPct`.
So a code nobody has seen renders its arithmetic the day it ships, and there is
no table of what codes mean to go stale. Nothing here paraphrases a code —
the platform's word renders verbatim and the numbers do the explaining.

**The biggest finding is one I refused to explain.**
`AGENT_APPROVAL_EXPIRED` is the commonest block on the account — 134 in a week
across three agents — carries `{}` every time, and fires on agents that are
`FULL_EXECUTION`, which per BattleGrid's own reference needs no approval. Three
readings, no evidence to choose between them. The surface shows the code, the
count and the window, which is true under all three. Filed as
`approval-expired-on-a-full-execution-agent` (p2) with the three readings and
the three unread tools most likely to settle it.

**A correction.** The journal entry above this one said the surface record was
v9.0.0. It was v11.0.0 by 15:12 — the platform shipped **two more majors in one
working day**, still 110 tools, and one `./scripts/ci.sh` run failed `freshness`
mid-afternoon and passed on the next with no change to the record. That is the
gate doing its job. Six majors observed, the count has never moved.

**Also fixed**: a source-text assertion in `deployment.test.ts` pinned to
`const radar = await app.readDeployments.execute`, which broke when the page
started reading the radar and the summary in one `Promise.all` — a change that
touched nothing the test protects. Loosened to the call; the three branch
assertions are the property.

**Next**: `approval-expired-on-a-full-execution-agent` is now the sharpest item
and it is a *question*, answerable with three unread tools —
`get_agent_activity_feed`, `get_agent_automation_status`,
`get_agent_decision_context`. `screening-is-not-offered-over-mcp` (p3) is the
small follow-on from the previous change.

## 2026-08-06 — v9 mapped, reconciled, and the first surface that asks forward

**Did**: PRs #53–#59 merged, five changes archived —
`the-model-can-propose-and-only-a-human-agrees` (full track, PASS on every
production-gate line), `the-token-estimate-moved-into-the-budget`,
`a-count-in-a-description-goes-stale`, `the-v9-datasets-are-reconciled`, and
now `why-it-would-not-take-this-coin`. Fourteen capabilities.

**BattleGrid replaced itself three more times today: v5.1.0 → v9.0.0 → v11.0.0,
six majors, 110 tools throughout.** The record now reads v11.0.0; an earlier
version of this entry said v9, which was true for about an hour. Sixth
deployment where the tool count does not move — and the second time in one day
that a major version landed between two runs of the same suite. The re-probe at
v9 found a
perp/spot flow module added cleanly, `VOLUME_RATIO` removed from every metric
enum — harmless, because vocabulary is read at runtime and `structure.test.ts`
forbids writing it into source, which is that design paying for itself — and
`estimatedTokenCount` moved into `budgetUsage`, which was **not** harmless
because we read it.

**Two new bounds arrived that had to be refused.**
`agentMinConfidenceFloorPercent: 30` beside `agentMinConfidenceFloor: 0.3`.
Adding the new names to `BOUND_KEYS` — which is what "reconcile the new
datasets" invites — would compare a config value of 0.7 against a floor of 30
and refuse every valid configuration in the product. Pinned in
`tests/strategy/v9-datasets.test.ts`.

**Expanding the probe from 43 tools to 61 found a defect five gates had
missed.** `preview_strategy_report` renders its sections inside a nested
`section` object; the mapper read the outer one, so five preview sections
rendered empty with everything green. Composite arguments (`coinSelection`,
`sections`, `gate`, `signals`) and a refusal-driven retry are what reached it.
`column` and `request` are deliberately still unbuilt — two guesses were made
and both were refused on grammar, and the failures are written down.

**Then the build, and the data chose it.** `approvals-have-no-write-side` was
next on the list and is blocked twice: `accept_entry_decision` requires
`mcp:wager`, which `Read Scope Is Requested And Wager Scope Is Not` forbids
asking for, and `list_pending_approvals` answers `{approvals: []}` — the row
has never been seen. The whole positions and orders cluster is empty too.
Building any of it means inventing key names, which produced three of the dead
paths in HANDOFF.

`get_agent_coin_qualification` had never been called and has real rows. It is
the **first prospective surface in the product** — every other agent page
explains what already happened; this one asks whether the agent would act now.

**The live sweep is what shaped it.** Five agents × twelve coins, sixty
verdicts, three findings that changed code:

- **`requiredCount` came back `NOT_ENFORCED` with `count: 0, min: 0` on every
  one.** Rendered as a measurement that reads "0 signals against a minimum of
  0" — a gate that looks satisfied by accident, on the surface whose whole job
  is to say what is stopping the agent. This capability already carries the
  requirement for that exact mistake: *A Limit Nobody Set Is Not A Limit Of
  Zero*, written for the budget gauges in July.
- **Long and short genuinely disagree.** CONTRARIAN on LINK stops long at
  `ATR_VOLATILITY_BELOW_MIN` and short at `CANDIDATE_LEVELS_UNAVAILABLE`. Two
  obstacles, one coin, one call.
- **One unknown ticker fails the whole call.** `["BTC","ZZNOTACOIN"]` answers
  `NOT_FOUND` and returns no verdicts at all. Reported as unreadable, never as
  coins the agent would not take.

**The half that took the most care was choosing the coins.** "None of these
qualify" is a finding about coins the agent is deployed on and a triviality
about coins the product picked off a ranked list. So the source travels with
the result and the page states it — including *why* it fell back, because an
agent deployed nowhere and a radar that would not answer produce the same list
and opposite conclusions.

**Where the answer stops.** The three gates are all about the market. None
consults balance, allocation floor, leverage or the exchange minimum — so an
agent with $4.20 can screen a coin as qualifying in full and still fail the
order. `an-agent-can-be-structurally-unable-to-trade` now says so, and this
page is where that sentence belongs.

**Next**: `an-agent-can-be-structurally-unable-to-trade` (P2) is the sharpest
item on the list and just got sharper — every input is already read, and the
surface to say it on now exists. `screening-is-not-offered-over-mcp` (P3) is
the small follow-on: a model tuning an agent would ask this question more than
any other, and the MCP surface cannot. `image-never-built` still needs registry
egress, not just a daemon.

## 2026-08-05 (evening) — the outage was the test

**Did**: #50 and #51 merged. `the-outage-explains-itself` archived — a
thirteenth requirement on `battlegrid-connection`. The five-day confirmation
flake closed. Backlog reconciled.

**BattleGrid was down all day, and that turned out to be worth more than the
work it blocked.** It went from per-tool `INTERNAL_ERROR`s to a flat **502 Bad
Gateway from nginx** — HTML where JSON was expected. So the app was booted in
personal mode against the real key and every route walked while the condition
lasted, because it disappears when the platform recovers and it had never been
observed.

**The structure held.** Nothing crashed. Every read came back `unreadable` with
`cause: 'unreachable'` rather than `empty`, and `/pending` and `/audit` — which
need only this product's own database — worked normally. The "unreadable is not
empty" design had only ever been proven against a *fake* that returns a failure.
This was the first time it faced a platform that was genuinely gone.

**The sentences did not.** An operator read `Your roster could not be loaded.
tools/call failed with 502` — the classification right, the wording a transport
artefact, on five web surfaces and every MCP tool result, because
`unreadable(err)` carries `err.message` and the transport threw a bare `Error`.
Now `PlatformUnavailableError`, four cases because they have four remedies and
one of them is "wait". And `/explorer` said *"Configuration changes are
unavailable"* for `get_agent_explorer` — a read, on a page that configures
nothing. The refusal was right; the claim about what was refused was never ours
to make.

**Pinned against the real nginx 502 body**, HTML behind a `text/html` content
type, which no fake would have invented — then re-walked live rather than
asserted.

**The flake, after five days, was a fixture.** `SequentialRandom` counted from
zero per instance, so two of them minted the same token; the probe builds a
fresh one per describe while sharing one store, and `issue()` was a plain
`Map.set`. The second describe silently overwrote the first's unconsumed entry.
Reproduced offline in one run — `expected 'r1' not to be 'r1'`. The counter is
per module now, **but the smaller half**: the fake accepting a duplicate in
silence is why it cost five days and read like a product defect.

**Two things a future session should not have to rediscover.**
`FakeAgentsPort` records what a write bound its confirmation to and does not
check it — a test that calls `update.execute` and sees `updated` proves nothing
about binding. And `docker` exists in these environments but the network policy
denies Docker Hub's blob CDN, so `image-never-built` fails at the first `FROM`;
it needs registry egress, not just a daemon.

**Next**: BattleGrid, when it returns. `BATTLEGRID_API_KEY=…
BATTLEGRID_LIVE_WRITES=1 npx vitest run tests/live/proposal-probe.test.ts` — if
the write test stops skipping, tasks 6.1 and 7.1 close and
`the-model-can-propose-and-only-a-human-agrees` can be archived. Offline, the
best-shaped item is `an-unreadable-branch-need-not-explain-itself`: 30 surfaces
render an unreadable branch, 5 use the shared component, and the **guard** is
worth more than the sweep.

## 2026-08-05 (later) — the write path closed, and four defects the walk found

**Did**: #46, #47 and #48 merged. `the-model-can-propose-and-only-a-human-agrees`
is built end to end — 31/35 tasks — and **left open**, not archived, because
two of its gates are blocked by the platform rather than by us.

**The loop closes.** A model calls `propose_agent_change`, which records an
intent and stops. The operator opens `/pending/<id>`, where the describe runs
*then*, against the account as it is *then*, and agrees through the same
confirmation any web-initiated change uses. The model never holds an unspent
authorization; an old proposal is noise rather than danger. This is option 2
from `the-assistant-cannot-be-trusted-with-a-write`, now closed — and
**elicitation was not established, so it was not chosen**, which is what that
item asked for.

**Running the live walk found four defects, and the first one moves money.**
`/pending/[id]` handed the whole proposed `changes` object to `updateAgent`, so
a `tradingConfig` travelled inside it. BattleGrid requires all twenty members
once that object is present and **resets what a send omits — it does not
error**. A model proposing `tradingMode: OFF` would have had every loss cap on
the agent cleared as the price of stopping it. The edit form had always split
the config out inline; the proposal page never learned it had to. The split is
now `editArguments`, shared by both, and the digest is unaffected because
`confirmationTarget.agentEdit` sorts keys — which is what lets the split happen
*after* the token is minted.

The other three: `reconcile` compared a partial config against the whole object
and so read "will change" even for an agent already off; a proposal the account
already satisfied arrived `ready`, so the page showed a button to agree above
the words "nothing here would change the account"; and `readOnlyHint: true` was
served for **every** tool, which stopped being true the moment a tool that
records shipped.

**That last one is the fifth defect of the same shape this week**: a check, or
a claim, that matched how something was *spelled* rather than what it *reached*.
The `live-writes` guard was the same story in the same session — it read "the
file's one `const live =` must mention WRITES" and broke on the first probe that
legitimately gated its reads and its writes differently. It is per-block now.
**When a rule and an honest new case disagree, suspect the rule.**

**BattleGrid is unwell today, and it is not us.** `create_intelligence_agent`
answers `INTERNAL_ERROR` for every payload — both accounts, every SYSTEM
strategy, and a payload with **no `tradingConfig` at all**. A deliberately
malformed payload still comes back with a full `-32602` field-by-field report,
so the 500 is downstream of a request the schema accepted; and
`surface-freshness` is green throughout, so nothing was renamed under us. Four
other live probes — preview, field, competitor, column-grammar — fail on
INTERNAL_ERROR and 504. Filed as `battlegrid-is-returning-internal-errors`.

**So the write half of the live walk skips, naming that, rather than passing.**
It is *not* walked against the operator's own agents instead: every one of them
is in `FULL_EXECUTION`, and editing a live trading agent to make a probe pass is
not a trade a test gets to make on someone's behalf. There is no clone tool for
agents, so the probe creates its own subject or it skips.

**Next**: when the platform recovers, run
`BATTLEGRID_API_KEY=… BATTLEGRID_LIVE_WRITES=1 npx vitest run tests/live/proposal-probe.test.ts`.
If the write test stops skipping, tasks 6.1 and 7.1 close and the change can be
archived. Nothing else is waiting on it.

## 2026-08-05 — the day the map was two versions stale, and BattleGrid deployed twice more

**Did**: five changes merged (#41–#45) and one planned (#46).
`the-map-knows-when-it-is-stale`, `the-freshness-check-is-a-named-gate` and
`the-condition-layer-is-legible` archived; a twelfth capability,
`platform-mapping`. `the-model-can-propose-and-only-a-human-agrees` is
proposed, designed and planned, 3/33 tasks.

**The single most important fact for whoever reads this next: BattleGrid
deploys, often, and the tool count never moves.** Three deployments were
observed in one session — v3.0.0 → v5.0.0 → v5.1.0 — and every one of them
reported exactly **110 tools**. Any check that counts proves nothing. This
is not a caution, it is the observed behaviour of the platform this product
depends on.

**The record could not tell you it was stale, because it never recorded a
version.** `probe_mcp_surface.py` had never called `initialize`. Nine test
files gate what this product puts on the wire against
`docs/battlegrid-mcp-surface.json`, and `wire-values.test.ts` even carries a
comment saying it "must fail loudest when the surface is stale" — what it
asserted was that the file *has* input constants, which a snapshot frozen at
v3 satisfies forever. The probe now records `server` and `probed_at`, an
offline guard asserts the record is comparable, and a live guard compares it.
**Absent is not matching**: a record with no version fails rather than skips.

**It found a live break on its first real run.** `apply_strategy_plan` on v5
dropped `conditionVerdicts` while keeping `conditions`, and all three plan
variants are `additionalProperties: false` — so every apply this product
composed was being rejected for an unknown key. The tenth dead write path,
and the first found by a guard rather than by an operator.

**Then running the guard found that `npm test` was writing to the live
account.** Every live probe gated on `BATTLEGRID_API_KEY` alone, so a key in
the environment ran four mutating probes *concurrently* against the real
account — forking, archiving, creating an agent, tripping each other's
optimistic concurrency. Nothing was lost; the confirmation ceremony refused
what it should. But nobody had decided that, and the freshness gate makes
running with a key normal. Five probes now need `BATTLEGRID_LIVE_WRITES=1`.

**And the guard for that had the same shape of hole.** It matched BattleGrid
tool *names* in test source, so it missed `apply-probe.test.ts` entirely —
that file forks and applies through `ForkStrategyCommand` and
`ApplyPlanCommand` without naming a tool. It ran unasked during CI, past the
guard written to stop exactly that. **Derive from what code can reach, not
from what it happens to spell.** That lesson is now DL-3 of the write-path
plan, because the same trap is waiting there.

**Conditions: a boolean layer above signals that this product had been
carrying blind for five days.** `compiled-plan.ts` already listed
`conditions` in its apply projection — added by an earlier session to fix the
sixth dead write path, without asking what it was. I first wrote it up as a
v5 addition; that was wrong and is corrected in the archived proposal. The
layer arrived between 2026-07-27 and 07-31. What v5 removed was
`conditionVerdicts`.

**It is being rolled out under us.** Three of 37 strategies carried
conditions in the morning; **twelve** by evening, and eleven of fifteen on
the operator's second account. The eight that changed are platform
strategies that went from zero to between two and nine each across a single
deployment. Reading first was worth it twice over: it also established that
**an evaluation carries nothing about conditions** — 31 keys on a signal log,
`conditionKey` nowhere even nested, checked against an agent *bound to a
conditioned strategy*. A pipeline surface would have been built around a
payload that does not exist.

**The distinction the rendering turns on**: a `null` verdict is a named
building block, not an absence of opinion. Twenty-seven of fifty-five
conditions are blocks referenced by the ones that decide, so a page listing
Berlin's six as equals reports six ways to decide direction where there are
two. And nesting must be drawn, never flattened — Berlin's
`NOT( ref FLOW_UP )` flattened reads as "flow must be rising", the exact
inverse of the rule.

**Two things were deliberately not built.** `conditionOutcomes` answers and
is far richer than the name suggests — per *ticker*, with clause-level
`evidence` (observed value against required), a `provisional` flag, and an
`unresolvedCount` third state the schema does not hint at. It is filed as
`condition-outcomes-are-unrendered` and the delta was **trimmed** rather than
left asserting unbuilt behaviour. And `applyPlan` is excluded from the
write-path proposal: `DescribeApplyRequest` needs a `CompiledPlan` carrying a
five-minute token, so its consequence cannot be recomputed when a human
finally reads it.

**Two decisions the operator delegated, recorded with reasoning** (DL-1,
DL-2). Seven proposable operations. A 72-hour staleness horizon — chosen on
signal-to-noise grounds because **safety does not rest on it**: a proposal
carries no authority and the consequence is computed fresh on open, so an old
one is noise rather than danger.

**Next**: stage 1 of the write-path plan — the guard rewrite, deliberately
sequenced before any `propose_*` exists, so it cannot be adjusted to admit
what was just built.

**Watch for**: the operator pasted two live keys into chat this session. Key
handling is theirs by their own instruction (2026-08-03) and is not to be
re-raised. Both are in the session scratchpad only, never in the repo.

## 2026-08-03 — Grid-Commander is an MCP server

**Did**: `grid-commander-is-an-mcp-server` (full track, archived) — an
eleventh capability, `mcp-control`, and the thing the operator has been
describing since 2026-08-01.

**Both gating questions were settled, and the second dissolved the first.**

The operator asked whether they could install their own model — open
weights, Hermes, the Claude Code SDK — and separately whether to build the
MCP server or the chat UI first. Server, decisively: *"the controller is
the utmost priority… our heart and soul will be the MCP controller
understanding and creating a data frame for this language model to have
control over the things of the MCP."*

Which answers the model question by removing it. **An MCP server contains
no model.** It is driven by whatever client the operator points at it, so
model choice is theirs per session, and no inference credential exists on
our side at all. "Whose Anthropic key pays" stopped being a question.

And the codebase already argued for this. `one-destination.test.ts` exists
because `@anthropic-ai/sdk` once sat in `package.json` powering an assistant
that could never run — "sixteen files and a nav entry whose whole function
was to announce their own absence". A chat UI re-adds an outbound host to a
model provider. An MCP server adds none: it is inbound.

**The use-cases turned out to be the data frame already.** Eighteen tools,
each calling the same object a web route calls. Nothing new sits between a
tool and a port, because Clean Architecture had already put the product's
understanding in a place that does not care who is asking. That is the
whole change: a second adapter beside the web one.

**What crosses the boundary is what the product knows, not what BattleGrid
says.** `get_agent_performance` answers zeros on an agent carrying real
losses, so `read_trading_record` derives the record and says it is derived.
`unreadable` never becomes an MCP error, because a model reporting a failed
roster call very often says "you have no agents" — the exact lie
`RosterResult` was shaped to prevent, one boundary further out. That is the
single most important assertion in the new test file.

**Reads only, and the reason is structural.** Every write runs describe →
confirm → perform with a digest-bound token, and that design assumes a
human reads the consequence. Over MCP a model occupies that seat and
nothing compels it to show anyone "this will archive Apex and stop three
deployments". So no writes — enforced by a guard that derives the mutating
use-cases from `composition.ts` rather than listing them, because an
allowlist passes while the next one is added. Filed as
`the-assistant-cannot-be-trusted-with-a-write` with the three ways the seat
could be provided and the one option ruled out.

**A guard stopped this and was right to.** P6 said the MCP SDK may be
imported in exactly one directory — a rule written when the SDK had exactly
one use: being a *client* of BattleGrid. There are now two uses in opposite
directions. Widened to name both, with a counterweight test asserting
`src/mcp/` builds no URL and imports no port, so the permission cannot
become the bypass the rule exists to prevent.

**Live**: spawned as a real subprocess over real stdio, driven by a real
client. 18 tools, every one annotated read-only; 15 agents read; the field
at 37 agents and −$162.07; and `archive_agent` refused as no such tool.

**State**: 0 active changes · 20 open backlog items · 83 archived changes ·
11 capabilities · 1183 vitest (+26 key-gated) + 62 db + 221 harness · all
nine ci.sh gates green.


## 2026-08-03 — the what-if, after checking it was worth building

**Did**: `the-what-if-is-answerable` (standard, archived). Everything this
product showed about a strategy was retrospective: the retune ceremony
lets an operator change a signal's weighting and save it, and nothing said
what that change would have *done*. They found out by waiting, with real
money in the loop.

**The check came first, and it decided the change.** The filed item said to
verify before building, because a simulator that models something other
than what the pipeline runs is worse than none. Fed five real evaluations'
triggered signals and effective allocations back in, each with its own
gate:

| evaluation | fired / consulted | platform | simulator |
|---|---|---|---|
| BTC (EXPIRED) | 14 / 72 | 0.647 | 0.64705 |
| ETH (PASS) | 12 / 72 | 0.566 | 0.56614 |
| BTC (PASS) | 18 / 72 | 0.636 | 0.63579 |
| APT (EXPIRED) | 8 / 72 | 0.53 | 0.53 |

Exact to the platform's own rounding, and the attribution percentages
matched signal-for-signal. It is the pipeline's arithmetic exposed, not an
approximation. It also settled that the aggregate is built over the
**triggered** signals only — the ~58 that did not fire contribute nothing,
which is why showing them was worth doing and why the what-if seeds from
the fired ones.

**I argued against this placement three changes ago, and answered myself.**
`the-scorecard-is-legible` said a what-if beside a real outcome "invites
reading the simulation as the thing that occurred". True — and not a reason
to keep them apart, because a blank form asking an operator to invent
scores produces a number about nothing. The whole reason to trust this tool
is that it reproduces reality. So it seeds from a real evaluation, and the
honesty is structural rather than tonal: a spec requirement that the
simulated figure states it did not happen and sits beside the real score,
with a test.

**Three platform facts it is built around.** The cap is twenty and
twenty-one is **refused**, not truncated — one real evaluation fired 21, so
the page says it cannot be re-scored rather than dropping one to fit.
Allocation 0 contributes nothing, and an all-zero set scores 0 rather than
erroring. And `wouldRoute` is `>=`, carried from the platform rather than
recomputed, because a second implementation of the one rule this surface
exists to report faithfully could disagree with the pipeline.

**The live probe is the guard.** It feeds an evaluation its own weightings
and asserts the score comes back unchanged — so if BattleGrid ever changes
the aggregation, this fails. That is the point: a what-if that has quietly
stopped agreeing with the pipeline looks exactly like one that works. Live:
ENA, 13 fired, platform 40%, simulator 40%, gate 55%, would not route —
matching the SKIP that really happened.

**State**: 0 active changes · 20 open backlog items · 82 archived changes ·
10 capabilities · 1164 vitest (+25 key-gated) + 62 db + 221 harness · all
nine ci.sh gates green.


## 2026-08-03 — your own agent is as legible, and now you can see what it cost

**Did**: `your-own-agent-is-as-legible` (standard, archived) — closing the
asymmetry filed two hours earlier, which asked *which* of two causes it was
and said not to assume.

**It was the first, and it was not close.**

| | keys |
|---|---|
| `list_signal_logs` row — what `ReadPipelineQuery` read | **23** |
| `get_signal_log` — never called | **31** |

The eight unread: `scorecard`, `attributions`, `pipeline`,
`linkedEntryDecision`, `challenge`, and three identity fields. The
**eighth** instance of `the-payload-carries-more-than-is-read`, and the
second this month caught after shipping. `get_signal_performance` was
unused too — the same funnel built for competitors, sitting there for the
user's own agents.

**The part that goes past parity.** `pipeline.attempt.ownerView` is nulled
on every public read and **populated on your own**:

```json
{"modelDisplayName": "Claude Opus 4.6", "billingType": "PLATFORM",
 "costUsd": 0.047775, "durationMs": 20711}
```

Live on "Flow State": one SKIP on ENA cost **4.8 cents and 20.7 seconds**,
over 64 signals consulted and 13 fired. No surface in this product had ever
shown what a decision cost to reach, and no competitor page ever can. Null
stays null — an unreported price and a price of zero are different facts,
and only one of them should reassure someone watching their spend.

**One mapper, two readers.** `get_signal_log` and
`get_public_agent_signal_log_detail` return the *same* `log` shape; the
public one nulls the owner telemetry and nothing else. So
`ConsultedSignal`, `ScoreAttribution` and `EvaluationChain` moved to
`src/domain/agent/scorecard.ts` and one `mapEvaluationScorecard` serves
both, with `owned` deciding whether the cost is reached for at all rather
than read and hoped to be null. Two copies would have drifted, and the copy
that drifted would have been the one nobody was looking at.

**Two guards earned their keep, and a third caught a bug before it
rendered.** The boundaries test refused a route importing the domain
directly — fixed by re-exporting through the port, as `ExplorerPort`
already did. The reachability walker refused a three-level-deep page that
could not get back to the agent it was about. And the pipeline page's `pct`
helper takes a 0..1 fraction while the funnel reports `fillRatePct: 76`;
passing one through the other renders **7600%**. Caught while wiring, fixed
with a second helper and a test that asserts the wrong one is not used.

**State**: 0 active changes · 20 open backlog items · 81 archived changes ·
10 capabilities · 1151 vitest (+24 key-gated) + 62 db + 221 harness · all
nine ci.sh gates green.


## 2026-08-03 — the scorecard, and an asymmetry worth fixing

**Did**: `the-scorecard-is-legible` (standard, archived) — the bottom of
the explorer stack. `/explorer` says the field loses money;
`/explorer/[agentId]` says how a competitor operates; this says what one
agent **actually read**, indicator by indicator.

**Seventy-two signals consulted. Twelve fired.** Every evaluation checked
live carried the same 72, across seventeen modules, each with its module,
trigger state, score, bias, primary/required flags, the raw indicator
values, and the platform's own sentence:

> `RSI(14) at 38.1 — not oversold (threshold 30)`

The sentence states the reading *and* the bar it missed, which no derived
label could reconstruct. **The sixty that did not fire are the point** —
what an agent looks at and dismisses is as much its strategy as what
triggers it — so nothing filters them.

Alongside them, `attributions` answers *why that number*:
`macd_bull_divergence` was worth 13% of the aggregate. And `pipeline` is a
real state machine — `LLM_APPROVED` → `ENTER` at 62% → `CLOSED` → `LOSS
−$0.40`, or `LLM_DECLINED` → `SKIP` at 28% and nothing after it. A stage
the platform did not record is omitted, never rendered empty.

**The counter-example worth keeping**: `CRV` fired **21** signals and
SKIPPED; `APT` fired **8** and ENTERED. Signal count is not the decision,
which is exactly why the attribution and the untriggered rows matter.

**A listed evaluation can publish no detail.** Four of twenty answered
`{log: null}` — every one a `FAILED` evaluation, with all other statuses
resolving. A perfect correlation over twenty rows is a pattern, not a
contract, so every row is still linked and the detail page renders the null
as its own state. Hiding links on a prediction would be guessing on the
reader's behalf.

**Two things carried rather than interpreted.** `executionMessage` is JSON
inside a string (`{"kind":"INDICATOR_STATE","indicator":"emaCross",…}`) and
is shown verbatim — parsing means modelling a shape seen once, and the
clean enum beside it (`expiryReason: INDICATOR_FLIP`) already says what
happened. And the owner-private fields are not merely unrendered: the
adapter never names them, which a test asserts against the source with
comments stripped, so the file's own explanation of why cannot satisfy the
check.

**What this surfaced, and it is backwards.** This product now explains a
*stranger's* agent better than the user's own: the public read gives 72
consulted signals with attribution, while `/agents/[id]/pipeline` gives a
verdict for the ones that fired. Either the owner-side tools carry more
than we read — which would be the eighth instance of the pattern that
produced a shipped bug this month — or the public projection is genuinely
richer. Not assumed either way. Filed as
`our-own-agents-show-less-than-strangers` at **P2**, with the diff recipe
that found the 35-vs-11 gap.

**State**: 0 active changes · 21 open backlog items · 80 archived changes ·
10 capabilities · 1130 vitest (+23 key-gated) + 62 db + 221 harness · all
nine ci.sh gates green.


## 2026-08-03 — a competitor can be opened

**Did**: `a-competitor-can-be-opened` (standard, archived). `/explorer`
shipped an hour earlier with every row a dead end — the field could say
*"you are 7th of 37 and the field loses money"* and nothing about what the
leaders actually do. Four public reads close that.

**The funnel is the answer, and it is one call.** `Market Predator`, rank 1,
live 2026-08-03:

```
245 evaluations → 102 decisions → 73 entered → 51 executed
                                               9 failed, 13 expired
   fill 76% · avg score 63% · avg conviction 49% · avg R:R 2.26
   23W/28L · +$50.06 · held 9.4h on average
```

143 of 245 evaluations produced no decision at all. How much an agent looks
at versus how much it acts on is the difference between two agents with the
same win rate, and it is not visible anywhere else in this product —
including for our own agents.

**The declaration contradicted itself, and a call settled it.**
`get_public_agent_unrealized_pnl` says "any ACTIVE agent … the same data an
anonymous visitor sees" in its summary and "one of **your** intelligence
agent UUIDs" in its argument description. `public-agent-detail-is-unread`
flagged it rather than guessing. Called both ways: it answers for a rival
exactly as for one of ours. The summary is right, the argument text stale.

**Two traps in the payload.** `skipCount` (decisions that were SKIP: 29)
and `skippedCount` (pipelines ending SKIPPED: 0) are different questions
with near-identical names — two fields on the port, two labels on the page,
never summed. And `isWin` is the platform's verdict, carried rather than
re-derived: a break-even trade is a loss if the platform says so, and
`netPnl > 0` would have agreed by luck while `netPnl >= 0` would not.

**One shape refused rather than modelled.** No agent anywhere in the field
holds an open position — `activeTradeCount` is 0 across all 37 — so
`positions[]` has only ever been seen empty. The declaration promises size,
entry price, leverage and ROE but not the key names, and inventing key
names is what produced three of the dead paths in this project's history.
`positionsUnmodelled: readonly unknown[]` carries the rows through
untouched; the page states the count and admits it cannot read inside them.
Filed as `open-position-rows-are-unobserved` with a one-call recipe.

**An architecture guard was right to stop me, and was too narrow.**
`identifiers.test.ts` requires any mapper reading an id off an untyped
payload to be able to refuse it — and knew only one refusal: throwing. This
adapter refuses by returning null and filtering the row out, which is the
right call where the row is one of many (dropping one unattributable
competitor from a ranking of 37 loses less than refusing the ranking). The
guard now admits both, requires the drop shape to actually filter, and
pins the adapter by name so the widening is a distinction rather than a
loophole.

**State**: 0 active changes · 21 open backlog items · 79 archived changes ·
10 capabilities · 1107 vitest (+22 key-gated) + 62 db + 221 harness · all
nine ci.sh gates green.


## 2026-08-03 — the field: every number in this product finally has a denominator

**Did**: `the-field-is-visible` (standard, archived) — a tenth capability,
`agent-comparison`, and the answer to a question the reporting phase kept
raising without being able to settle. An agent down $9.64 over three
trades: is that bad?

**Now it is answerable. The field as a whole loses money.** 37 agents, 773
closed trades, **31% win rate, −$162.07 net**. Of nine model vendors,
exactly one is in profit (Moonshot AI, +$27.97 over 88 trades);
Anthropic-model agents — 18 of them, 351 trades — are down $59.98. This
account is rank 7 by profit (97th percentile), rank 1 by volume and by
score, with its own agents placing 14th and 18th. That is the
expected-value anchor, and it took two tool calls.

`get_agent_explorer` is not a list of names — each entry is a resume: rank,
model and vendor, owner, tenure, windowed P&L, win rate, trade count, ROI,
best and worst trade with tickers, live position count, behaviour triple,
the 21 intel toggles, the full trading spec, and the platform's own
subtitle and objective. And `currentUser` puts this account's own agents in
the same ranking.

**Three ways this page could have lied, all caught before it shipped.**

1. **The list can be shorter than the field it reports, and `limit` does
   not widen it.** `ALL_TIME`/`NET_PNL` answered 5 rows against
   `totalAgents: 37` at limits 3, 10, 37 and 100 — four runs running. I
   wrote that up as deterministic platform behaviour. Then the live probe
   returned all 37 to the same request an hour later, so the write-up was
   wrong and got corrected in five places. **Intermittent is worse than
   deterministic**: a page that renders rows under a "37 agents" heading is
   right some of the time and silently wrong the rest, with nothing to
   tell the two apart. `shown` and `totalAgents` are separate values that
   nothing reconciles.
2. **A win rate can be null, and null is not zero.** DeepInfra and xAI have
   agents and no trades; a day nobody traded has no field win rate. Drawn
   as 0% that reads "everyone lost" instead of "nobody played".
3. **Sorting by win rate promotes the smallest sample.** First place was
   100% *on one trade*, ranked above an agent at 45% over 51 trades and $50
   of profit. Every rate on the page is printed beside its trade count, and
   the win-rate sort says so out loud.

**Left open**: the seven per-agent public reads. Every row in the new list
is currently a dead end — filed as `public-agent-detail-is-unread`, with
one contradiction already spotted in the declarations
(`get_public_agent_unrealized_pnl` says "one of *your* agent UUIDs" in its
argument while its summary says any public agent), to be settled by a call
rather than a reading.

**State**: 0 active changes · 20 open backlog items · 78 archived changes ·
10 capabilities · 1080 vitest (+21 key-gated) + 62 db + 221 harness · all
nine ci.sh gates green.


## 2026-08-03 — the decision shows its work, and a mode we cannot serve

**Did**: `the-decision-shows-its-work` (standard, archived). Went looking
for the accept/cancel writes, found two things that mattered more.

**The surface shipped hours earlier was throwing away its best data.**
Discovery for the *next* change read the raw `list_entry_decisions` row and
counted **35 fields**. `mapEntryDecision` kept eleven. Among the twenty-four
dropped was `signalChecklist` — eight entries per decision, one per signal
the agent consulted, each with a label, a verdict, and a written
interpretation. It was already arriving on the wire, on every row, on the
newest page in the product.

That is `the-payload-carries-more-than-is-read` caught in the act, hours
after shipping, by reading a payload instead of a type.

**Three verdicts stay three.** The platform sends `CONFIRM`, `WARN` and
`REJECT`. `SignalVerdict.verdict` is a string, not a boolean, and the page
prints the spread before any interpretation: *"4 REJECT · 2 CONFIRM · 2
WARN across 8 signals"*. Collapsing WARN into either edge would have turned
that live decision into a 4–4 tie or a 6–2 rout — reporting certainty the
agent did not have. Same discipline as a missing figure that must not
become a zero.

**`get_entry_decision` was the obvious build and would have been wasted.**
It returns the same 35 keys the list row already carries — verified across
four decisions spanning SKIP/SKIPPED, ENTER/EXECUTED, ENTER/FAILED and
ENTER/EXPIRED. No detail route, no second fetch.

**The second finding is a hole we made ourselves.** `tradingMode` accepts
`APPROVAL_REQUIRED` over MCP, and `MoneyLimits` has been offering it all
along — *"Approval required — proposes trades, waits for you"* — while
`accept_entry_decision` and `cancel_entry_decision` are unbuilt. The
product could put an agent into a mode whose whole point is waiting for a
human, then give that human no screen. The option now says so where it is
chosen, and names where answering still happens. The writes stay filed
(`approvals-have-no-write-side`) because they need `mcp:wager` and the full
ceremony.

**What discovery settled about those writes**: both take one argument
(`decisionId`); cancel is `destructiveHint: true`, accept is not;
`list_pending_approvals` takes no arguments and returns the whole queue
unpaginated. It answers `{approvals: []}` because **no agent on this
account has ever been in that mode** — all 15, active and archived, are
`OFF` (9) or `FULL_EXECUTION` (6). The queue's row shape is still
unobserved, and is still not being modelled from its declaration.
Producing one means changing how a real trading account behaves, which is
the operator's call.

**Live**: agent "Flow State" skipped ENA — 8 signals read, 4 rejecting, 2
confirming, 2 warning, the first of them *"RSI well into overbought
territory above 70, warns against new longs"*.

**State**: 0 active changes · 20 open backlog items · 77 archived changes ·
1057 vitest (+20 key-gated) + 62 db + 221 harness · all nine ci.sh gates
green.


## 2026-08-03 — why it did or didn't trade: the decision pipeline

**Did**: `why-it-did-not-trade` (standard, archived) — the second change of
the reporting phase, and the answer to the question an operator asks second.
The trading record says what an agent did. This says why it didn't.

**Discovery found three stages, not one surface.** A candidate can die at
three distinct places, and BattleGrid keeps a separate log for each:
`list_gate_blocks` (stopped before evaluation), `list_signal_logs`
(evaluated and skipped), `list_entry_decisions` (decided, with the model's
own paragraph). All three share an `{entries, total}` envelope, so one
private `stage<T>()` helper in the adapter serves all three.

**The stages fail independently, and the types make them.** `StageResult<T>`
is generic for that reason: an agent whose gate blocks cannot be read still
has evaluations worth showing, and a stage that is *empty* is a finding
rather than a blank. `/agents/[id]/pipeline` renders all three with a
`StageNote` component, so every branch says something — "nothing was
stopped before evaluation" and "we could not ask what was stopped" send an
operator to different places.

**Two details that would have been easy to get wrong.** Gate blocks carry
both a reason code and its quantified detail; the code is only the label —
`INSUFFICIENT_EQUITY` is a category, `{equityUsd: 2.18, thresholdUsd: 10}`
is the answer, and the page prints the numbers. And `mapSignalEvaluation`
reads `effectiveMinAggregateScore`, the threshold *in force when the
evaluation ran*, not the strategy's setting today — reading today's would
narrate history against a bar it was never measured on.

**Live**: agent "Flow State" evaluated ENA at **0.397 against a 0.55
threshold → SKIPPED**, explaining "extreme overbought conditions across
multiple indicators (RSI 76.2, Stochastic…)". The account-wide gate block
was `INSUFFICIENT_EQUITY` at $2.18 against a $10 floor — the whole account's
silence, explained in one row.

**Left open deliberately**: `accept_entry_decision` / `cancel_entry_decision`
(both `mcp:wager`, one destructive — their own change, full ceremony) and
`list_pending_approvals`, which answers `{approvals: []}` on this account,
so its row shape has never been observed. Filed rather than modelled from
the declaration — the seven dead paths above all came from trusting a
declaration over an observation.

**State**: 0 active changes · 19 open backlog items · 76 archived changes ·
1049 vitest (+20 key-gated) + 62 db + 221 harness · all nine ci.sh gates
green.


## 2026-08-03 — Phase 2 opens: what the agent did with the money

**Did**: `the-trading-record-is-readable` (standard, archived) — the first
change of the reporting phase, and the answer to the question an operator
asks first.

**Discovery settled the design.** `list_trade_outcomes` is rich and real:
26 fields per closed trade — entry and exit fills, both fees, realized and
net P&L, slippage on *each* side, effective leverage, the conviction the
agent held, who closed it and why, duration, and the ids linking back to
the decision and the signal log. Meanwhile `get_agent_performance` answered
`realizedPnlUsd: 0` with an empty curve on an agent carrying real closed
losses — the third such observation across three sessions.

**So the record is derived, and the surface says so.** `/agents/[id]/trades`
lists the trades whole and computes the summary the platform will not
publish — closed / won / lost / flat, net after fees, average time in a
position, and the close-reason spread — under a line stating those totals
are computed from the trades shown, not published by BattleGrid. Three
distinctions the types keep alive: a missing figure stays null rather than
becoming a zero that understates a loss; an agent that never traded says so
instead of rendering a summary of zeros; and an unstated net is neither a
win nor a loss nor flat.

**Live**: agent "Apex" — 3 closed trades, 0W/3L, net **−$9.64** after
$1.34 in fees, all `STOP_LOSS`. The platform's own performance figure for
that same agent is zero. That gap is exactly why this surface exists.

**State**: 0 active changes · 20 open backlog items · 75 archived changes ·
1037 vitest (+19 key-gated) + 62 db + 221 harness · all nine ci.sh gates
green.


## 2026-08-02 — session close: the handoff refreshed for a clean start

**Did**: wrapped the session. `HANDOFF.md` rewritten where it had gone
stale — a "Start Here" section naming the recommended next move (Phase 2:
`trading-telemetry-is-unread`, then `entry-decisions-have-a-read-side`)
with the operator-side items separated out; a documentation map so the next
session knows which of the nine docs answers which question; the seventh
dead-path finding added with the pattern all seven share (none was
findable without a real call to the real platform); the ten live probes
tabulated with what each proves and a note on the slot shuffle; the
hard-limits list extended with what this month established (first radar
deployment uncreatable, arena watch-only by decision, custom tables created
by definition not by key, archived strategies unreadable); and the
turbopack answer recorded where a developer will hit it.

**Open recommendation to the operator**: rotate the API key. Every write
path is live-proven and the table campaign is finished, so the reason for
deferring it no longer holds.

**State at close**: 0 active changes · 20 open backlog items · 74 archived
changes · 9 capabilities · 1021 vitest (+18 key-gated) + 62 db + 221
harness · all nine ci.sh gates green · main = `3ce217c`.

## 2026-08-02 — the table-authoring campaign: the grammar mapped, a shipped bug found

**Did**: the operator's campaign — author tables across the mathematical
families, manipulate them, map everything — run live after BattleGrid's
~10-hour outage lifted. Three phases, all green, plus one real bug caught.

**The grammar** (`docs/REPORT_TABLE_GRAMMAR.md`, 250 lines, every claim
live): 14 metrics swept across every transform they declare. Three shapes
named — `trajectory` fans one column into five headers ending in a
`direction`; `entitySet` metrics (STRUCT_ZONES) have their own transform
vocabulary and a `priceRange` type no scalar produces; classification/event
metrics take `value` and little else. **The operand law**: `spread` joins
only unit-commensurable metrics, and the platform names the legal set in
every refusal (oscillators↔oscillators, price↔price, percent↔percent, …).
**The timeframe-inertia law**, found by a refused derivatives table: a
section containing any *timeless* metric must declare no section timeframe
— dropping it made the same table compile unchanged. And
`regimeTimeframe` is required when `regimeAutoDerive` is false.

**Five tables, five families, live against BTC**: momentum (feeds 16
signals), flow (8), derivatives (6), structure (4), mixed-timeframe (14) —
each rendering real values with its token cost and budget gauges.

**Create and modify, walked live**: the platform mints custom section keys
— defining a table inline with no key creates it (`REPORT_CUSTOM_SECTION_NOT_OWNED`
if you invent one), and restating it *with* that key modifies it. Fork →
add a momentum table (r2, `custom:8b041f05…`) → preview it → widen it with
a CVD column (r3) → everything restored. Also settled: an UPDATE that omits
the regime settings preserves them, and an archived strategy is listed but
its detail answers NOT_FOUND.

**The bug** (`a-custom-table-survives-the-round-trip`, lite, archived): the
preview surface shipped hours earlier refused **every strategy holding a
custom table**. The platform returns a saved custom section whole — title,
timeframe, columns — but the domain's `StrategySection` carried only kind
and key, and `preview_strategy_report` rejects `{kind:'custom', sectionKey}`
outright while accepting a platform section by key alone. The domain now
carries the definition and sends it back whole; two tests pin it and the
live walk proves it.

**State**: 0 active changes · 20 open backlog items · 74 archived changes ·
1021 vitest (+18 key-gated) + 62 db + 221 harness · all nine ci.sh gates
green.

## 2026-08-01 — outage filler: the health check that checks, and the turbopack answer

**Context**: the table-authoring campaign (operator-requested: create and
modify custom tables across the mathematical families, map the grammar) is
paused on BattleGrid's third and longest outage of the day — authenticated
calls time out while the edge answers 401, 3+ hours and counting. Recovery
watch + restart-proof scheduled check-ins armed; campaign assets
(grammar-sweep script, five-table preview script, create/modify probe,
`docs/REPORT_TABLE_GRAMMAR.md` frame) committed. Meanwhile, two non-live
items closed rather than idling.

**`a-health-check-that-checks`** (lite, archived): `GET /api/health` — no
session, no cookie, one `select 1` through the application's own pool;
200 ok / 503 unavailable, nothing else in the body. Probed by the serving
gate on every run — deliberately *after* the transaction-accounting helper,
because probing it first hands that helper a pool it did not expect to be
driven (found by the gate's own failure on the first run; the helper's
"owns its environment" assumption is now stated in the script).
`no-health-endpoint` closed done.

**`turbopack-build-unproven`** answered: `next dev --turbopack` (Next 15.1)
cannot resolve the `.js` specifiers through the `@/` alias and Turbopack
has no `extensionAlias` equivalent — webpack is the supported path, dev and
build alike, recorded beside the webpack option. Closed done.

**State**: 0 active changes · 20 open backlog items · 73 archived changes ·
1019 vitest (+18 key-gated) + 62 db + 221 harness · all nine ci.sh gates
green · campaign resumes on platform recovery.

## 2026-08-01 — the draft is previewable: Phase 1 is complete

**Did**: `the-draft-is-previewable` (standard, archived) — the phase's
closing change, and the strategy maker's missing answer: *what does the
agent actually read?* `previewReport` renders a composition as the literal
report text over a bounded coin selection (ranked top-N or explicit
tickers) with the token estimate, its counting model, and every budget
gauge the platform declares (names pass through, never enumerated);
`deriveRuleView` answers report membership for all 82 signals — which
weights would do something. `/strategies/[id]/preview`, linked from the
strategy page beside its sections; a refused draft renders in the
platform's words with membership still shown (the two reads are
independent). Nothing is written by previewing, and the rendering suite
proves it.

**Live**: Dunkirk through the product path — 5 sections rendered, ~1393
tokens (`o200k_base`), four gauges, 12/82 signals in report.
`strategy-draft-preview` closed done (the draft-*composer* slice recorded
as its residual).

**Phase 1 of the assistant roadmap is complete**: signal vocabulary →
metric/column grammar (with the platform's teaching refusals) → the
scorecard write (live-proven, full ceremony) → the agent's-eye preview.
The strategy maker now closes its loop: learn, compose, check, retune,
preview. Phase 2 (reporting/EV: `trading-telemetry-is-unread`,
`entry-decisions-have-a-read-side`) is next.

**State**: 0 active changes · 22 open backlog items · 72 archived changes ·
1016 vitest (+17 key-gated) + 62 db + 221 harness · all nine ci.sh gates
green.

## 2026-08-01 — the scorecard is tunable: Phase 1's first write, walked live same-day

**Did**: `the-scorecard-is-tunable` (**full track**, archived, gate PASS) —
`update_strategy_signal_rule` behind the complete ceremony. The token binds
strategy **at the revision read**, the signal, and a digest of the exact
values (DL-1: agentEdit's digest + the rebind trio's revision — a tampered
hidden field, values or expectedRevision alike, dies on the recomputed
target in the guard). Membership before minting (only a rule the strategy
carries; adding stays with compile→apply). Declared params always sent when
declared (the agentEdit merge lesson). The consequence carries the real
bound-agent count and the platform's own stakes: propagates immediately,
open positions do not block. `/strategies/[id]/rules/[signalId]` two-step
page, params prefilled from the rule with the signal definition's bounds;
rule rows on the strategy page link in.

**Live (DL-5), first attempt**: slot shuffle — DIST-03 parked → Dunkirk
forked → `bollinger_cci_overbought` retuned 0→1 through
describe→confirm→perform → read back at allocation 1, r1→r2 → fork parked,
DIST-03 restored. Account as found. **Phase 1's write path is proven.**

**Guards that moved**: ENVELOPED now wraps three tools (the mcp-conformance
comment that predicted this moment updated to the new truth);
payload-conformance carries the retune case; reachability pinned the new
scoped form route.

**State**: 0 active changes · 23 open backlog items · 71 archived changes ·
1002 vitest (+16 key-gated) + 62 db + 221 harness · all nine ci.sh gates
green. Phase 1 remaining: draft preview (`strategy-draft-preview`).

## 2026-08-01 — the column grammar is learnable: the platform teaches through its refusals

**Did**: `the-column-grammar-is-learnable` (standard, archived) — Phase 1
change 2. Discovery first: the vocabulary payload's `metrics` key (which
this product had been dropping) IS narrowed by category — ten categories,
75 distinct metrics, the union read at concurrency four (sequential ≈35s
live; a ten-wide burst drew gateway 504s). `get_metric_construction_hints`
carries per-transform authoring detail (parameters/defaults, formula, null
behavior, chain successors); `get_strategy_column_contract` compiles a
candidate column without market data — and **its refusal is structured
teaching**: authoring code, offending path, received value, and an
`allowedDomain` naming exactly what is legal (spread on RSI14 → the six
unit-commensurable oscillators, with the reason). Built: three port reads,
`ReadMetricIndexQuery`/`ReadMetricQuery`/`CheckColumnQuery` (membership
gates the metric only — everything else goes to the platform so its
teaching comes back), `/strategies/metrics` + `/strategies/metrics/[metric]`
with a GET-form column workbench that renders the contract or the lesson,
never a flattened "invalid".

**Found and fixed on the way**: `CapabilityCache.load` ran a full
`tools/list` discovery on every tool call, so the first fan-out surface
turned ten reads into twenty concurrent requests and one failed discovery
degraded the whole read. Discovery is now single-flight — concurrent calls
share one read; sequential calls still rediscover (freshness per burst).
Three new discovery tests pin it.

**Live**: every probe case passed repeatedly through the product path
(75-metric index, RSI14 card, valid contract, the teaching refusal intact);
the platform also served intermittent gateway 504s all hour — rendered
honestly as unreadable-with-reason, noted in the probe header.

**State**: 0 active changes · 23 open backlog items · 70 archived changes ·
983 vitest (+15 key-gated) + 62 db + 221 harness · all nine ci.sh gates
green.

## 2026-08-01 — the signal vocabulary is readable: Phase 1 of the assistant roadmap begins

**Did**: `the-signal-vocabulary-is-readable` (standard, archived) — the
first change of the strategy-maker phase from
`an-assistant-over-the-use-cases`. Discovery read first (declarations +
live payloads, three temp diags in scratchpad): 82 signals across 18
modules; the definition is a full authoring card (detects/fires/worked
examples/best-for/watch-out, param schema with defaults, indicators);
an unknown id enum-rejects with -32602. Built: `listSignals` +
`signalDefinition` on the strategies port/adapter (refuse-whole-read),
`ReadSignalLibraryQuery` (grouped by module; zero signals renders
unreadable — the vocabulary is the platform's, "none exist" is not ours to
claim), `ReadSignalQuery` (membership first, the roster pattern — no
unlisted id is ever sent onward), `/strategies/signals` +
`/strategies/signals/[id]`, linked from `/strategies`. The reachability
walker derived the new entity route on its own (pin updated).

**Live-proven**: `tests/live/signal-vocabulary-probe.test.ts` — the
library and one card read through the product path against the real
platform; the ghost id answers no-such-signal without a platform call.

**State**: 0 active changes · 23 open backlog items (4 filed from the
exploration) · 69 archived changes · 961 vitest (+12 key-gated) + 62 db +
221 harness · all nine ci.sh gates green.

## 2026-08-01 — the arena is watchable: the ninth capability

**Did**: `the-arena-is-watchable` (standard, archived) — the read-only
Market Grid surface, built to the shapes recorded in the observation.
`MarketGridPort` (list/detail/hasSubmitted/results), `McpMarketGridAdapter`
(refuse-whole-read on an unusable row, the same rule as the radar mapper;
the pre-settle CONFLICT mapped to a `not-settled` *state*), `WatchArenaQuery`
(arena/empty/unreadable — an unreadable list never renders as an empty
arena), `/arena` page + nav section. Two platform facts are now code and
spec: the played fact comes from `check_market_grid_submission` alone
(`get_market_grid_player_grid` 500s for "not played" and is never called),
and the settled-results payload stays opaque until one is observed. The
submit tools (entry fee 10 — a real stake) stay out of scope; remaining
tail recorded in the backlog item.

**New capability**: `market-grid` — the ninth. 19 new tests (11 mapper,
3 query, 5 rendering); the reachability walker picked `/arena` up as a
top-level section on its own.

**State**: 0 active changes · 19 open backlog items · 68 archived changes ·
942 vitest (+10 key-gated) + 62 db + 221 harness · all nine ci.sh gates
green.

## 2026-08-01 — the Market Grid observed: the arena's shapes are recorded

**Did**: The read-only first step of `market-grid-is-an-unmodelled-module`
(the last unmodelled module), live: presets carry the game's economics
(entry fee 10, multipliers, jackpot rule, 3×3 of 9 on a 1H cadence);
sessions list/detail/lock/settle/coin-pool observed; results-before-settle
is an honest CONFLICT the surface must render; submission check is clean;
per-session agent-position totals answer with zeros. One platform mismatch
found and recorded: `get_market_grid_player_grid` answers **500** for "you
have not played", so a surface may only read that state through
`check_market_grid_submission`. Leaderboard/top-coins arg shapes still need
the discovery read. All recorded in the item — the read-only arena slice is
ready to take as a fresh change.

**State**: 0 active changes · 19 open backlog items · 68 archived changes ·
all suites green · CI = ./scripts/ci.sh by policy.

## 2026-08-01 — CI is local, by decision

**Did**: The operator chose option D of the decision sheet: everything stays
local. `ci-is-local-by-policy` (lite, archived): **`./scripts/ci.sh`** runs
every gate the workflow's seven jobs ran — harness+validate, typecheck,
lint, vitest, drizzle check, migrate+db (when DATABASE_URL set, loud skip
otherwise), build, serving (CI_SERVING=1) — one command, per-gate table,
proven green end-to-end including the serving probe. `validate.yml` is
`workflow_dispatch`-only: no more seven ~2s failures painting every PR red.
`ci-creates-no-runs` (P1) closed as a decision with its residual stated:
green means "green where ci.sh was run", recorded per-session here.

**State**: 0 active changes · 19 open backlog items · 68 archived changes ·
one P1 left (`image-never-built`, needs Docker) · 923 vitest (+10 key-gated)
+ 62 db + 221 harness green.

## 2026-08-01 — the sixth dead write path: apply never could have worked, and now it does

**Did**: The operator authorized the slot shuffle (archive an unbound
strategy → fork → walk → put everything back), and the first live
`apply_strategy_plan` promptly found the sixth dead write path:
`toApplyPlan` — the projection between the compiler's plan and the wire —
was missing three fields the platform requires (`expectedRevision` top-level,
`conditions` and `conditionVerdicts` from `postState`). Every apply this
product ever composed was rejected by input validation. The guard could not
see it because `payload-conformance` exempted `request.plan` as
PASS_THROUGH — "the server's own plan handed straight back" — while the code
projected. The exemption is deleted; the guard now holds `toApplyPlan`'s
real output against the declared demands, and `anApprovedPlan` carries the
live shape (mapped by a read-only compile probe; two temp diags, deleted).

**Live-proven** (`tests/live/apply-probe.test.ts`, committed, key-gated):
slot freed (DIST-03 archived) → Dunkirk forked → compiled (viable, blast
radius 0) → described with the platform's own consequence → **applied,
r1→r2, tagline read back changed** → fork archived → DIST-03 restored.
Account as found. Also learned on the way: an empty `sections` list is
rejected when conditions read report columns (CONDITION_COLUMN_UNKNOWN) —
the probe sends the fork's own sections.

**Every write in the product is now live-proven**: create, rename, limits,
position-management path (same command), rebind path (same guard), archive,
reactivate, deploy-replace, strategy archive/restore, fork, compile, apply.

**State**: 0 active changes · 20 open backlog items · 67 archived changes ·
923 vitest (+10 key-gated skips) + 62 db + 221 harness green.

## 2026-07-31 — BattleGrid recovered; restore walked live, and it works

**Did**: The platform came back after its ~3h database outage and the parked
walk ran (`tests/live/restore-probe.test.ts`). The account turned out to be
at the 25-strategy cap — fork refused — so the probe learned to acquire its
subject the least invasive way available and end the account exactly as
found. On the operator's unbound "DIST-03" strategy: archive → **the roster
lists archived strategies** (THE reachability question — restore is
reachable, `includeInactive: true` honored) → **restore succeeded live for
the first time ever** (r3→r5, read back active) → subject left active as
found. Closes `restore-has-never-been-walked` — the last live-blocked P2.
Noted for later: the strategy cap now also gates the fork→compile→apply
walk.

**State**: 0 active changes · 20 open backlog items · 66 archived changes ·
923 vitest (+9 key-gated skips) + 62 db + 221 harness green.

## 2026-07-31 — the rebind race closed, and five debts swept

**Did**: Two changes while the outage holds, both archived.

**`rebind-binds-the-destination-it-described`** (standard): the last flow
whose confirmation did not cover everything it described.
`confirmationTarget.agentRebind` binds the trio (`@r<revision>`); the
describe reads the destination live — real name, real revision; the
caller-supplied `toStrategyName` left the request shape, so a URL can no
longer decide what the user believes they are binding to — and the perform
re-reads it, refusing a moved destination with both revisions named and
nothing attempted. The write-results ledger's rebind row expired exactly as
its "benign today" verdict predicted, and the file demanded its deletion.
Closes `rebind-is-not-bound-to-the-revision-it-read`.

**`the-small-debts-sweep`** (standard): five filed P3s in one pass —
audit list id-tiebreak (stable same-millisecond order, db-tested);
`complete()` throws on zero rows instead of reporting success against
nothing; `ConfirmationStore.diagnose()` gives the guard four distinct
refusal messages, each naming its next step (expired / already used /
values changed / not recognised); `compileUpdateIntent` becomes the one
home of the compile UPDATE shape (page and conformance guard both call
it); and the surface import cross-check says so on stacks it cannot read
(`design_surface_sources_unchecked`, info) instead of passing silently.

**State**: 0 active changes · 21 open backlog items · 66 archived changes ·
923 vitest (+9 key-gated skips) + 62 db + 221 harness green · validation
clean. Restore walk still parked on BattleGrid's outage.

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
