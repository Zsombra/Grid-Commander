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
