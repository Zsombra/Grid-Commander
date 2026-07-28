# Tasks

## 1. Test harness

- [x] 1.1 `tests/support.py` — load `openspec.py` by path, build a throwaway
      project tree, run the CLI in-process and capture stdout + exit code
- [x] 1.2 Helpers to write a main spec, a delta, a backlog item, a surface, and
      a ticket, so each fixture states only what it is testing

## 2. Archive merge

- [x] 2.1 ADDED appends and leaves prior requirements in order
- [x] 2.2 MODIFIED replaces the entire block — assert a dropped scenario is gone
- [x] 2.3 REMOVED deletes the block and leaves its neighbours intact
- [x] 2.4 RENAMED rewrites the header only — body byte-identical
- [x] 2.5 New capability seeded from the delta's Purpose
- [x] 2.6 Multiple operations in one delta, applied bottom-up without shifting
      each other's line ranges

## 3. Archive abort

- [x] 3.1 Validation error → no spec written, change folder still in place
- [x] 3.2 Merge conflict → no spec written for *any* capability in the change
- [x] 3.3 Re-run after the fix completes normally
- [x] 3.4 Dry run writes nothing and reports the operations it would perform

## 4. Validation codes

- [x] 4.1 One fixture per code — spec, backlog, and design families
- [x] 4.2 Meta-test: read the codes out of `openspec.py` with `ast` and fail on
      any that no fixture triggered
- [x] 4.3 Assert severity too — an error quietly demoted to a warning stops
      failing CI, which is the regression that matters
- [x] 4.4 Cover the two f-string codes (`backlog_invalid_*`, `*_not_found`)

## 5. CLI behavior

- [x] 5.1 Root resolution from a nested subdirectory
- [x] 5.2 `--json` accepted before *and* after the subcommand
- [x] 5.3 Exit code 1 on errors, 0 on warnings and info only

## 6. Design import cross-check

- [x] 6.1 Missing imported UI file is reported
- [x] 6.2 Non-UI files are not reported — a formatter is not a surface
- [x] 6.3 Convergence: adding the reported file makes the next run clean

## 7. CI

- [x] 7.1 Add a `tests` job to `.github/workflows/validate.yml`, no `pip install`
- [x] 7.2 Confirm the suite passes locally and a deliberately broken assertion
      fails the job
