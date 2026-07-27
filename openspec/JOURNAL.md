# Journal

Session handoff log. **Newest entry at the top**, directly under this header.

Every session that changes anything ends with an entry here. This is what a
fresh agent — or you in three weeks — reads to know where things stand and what
the last session learned the hard way.

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

**State**: `main` plus the harness suite on
`claude/work-review-next-steps-clb36a`. `validate --all` is 0 errors, 4
warnings — three are `backlog_capability_not_found` for `harness-integrity`,
which clear when this change archives, and the fourth is the placeholder design
system. Backlog is 7 open — 1×P1 in-progress, 2×P2 (one new), 4×P3 (one new).

**Next**: Let CI go green, then `/archive` this change. After that the blocker
is unchanged and now the only thing in the way: **decide what Grid-Commander
is**, fill `CLAUDE.md` + `openspec/config.yaml`, then `/idea`.

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
