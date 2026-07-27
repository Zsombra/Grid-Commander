# Proposal: Regression tests for the harness tool

## Why

`openspec.py` is load-bearing for three layers, and nothing tests it. It was
verified once, by hand, against fixtures that lived in a scratch directory and
no longer exist.

The archive merge is the sharp edge. It rewrites `openspec/specs/` in place
using line ranges computed from a parse of the existing file — a regression
there corrupts the source of truth, silently, at the one moment nobody is
looking. Every other failure in this system is recoverable by re-running
something. That one is not.

The validation codes have the opposite problem: there are 55 of them, they are
the entire contract between the tool and the skills, and a code that stops
firing looks exactly like a project with nothing wrong.

## What Changes

- Add a `tests/` suite runnable with `python3 -m unittest`, no dependencies.
- Pin the archive merge by asserting on **resulting file content**, not exit
  codes — ADDED appends, MODIFIED replaces the whole requirement block, REMOVED
  deletes it, RENAMED rewrites only the header, and a new capability is seeded
  from the delta's Purpose.
- Pin merge abort: a validation error or a merge conflict must leave both the
  main specs and the change folder exactly as they were, so the run is
  repeatable after a fix.
- One fixture per validation code, and a meta-test that reads the codes out of
  the tool's own source so an uncovered code fails the suite.
- Run the suite in CI alongside `validate --all`.

## Capabilities

**New**: `harness-integrity` — the guarantee that the tool owning the source of
truth behaves as specified and stays that way.

**Modified**: none. `spec-validation` covers CI enforcing *artifact* integrity;
this covers the *tool's own* behavior, which is a different contract.

## Out of Scope

- Refactoring `openspec.py`. Tests first; the tool is described as it is, and
  anything the tests reveal gets filed rather than fixed inline.
- Coverage measurement. A percentage would invite writing tests for the lines
  that are cheap rather than the ones that are dangerous.
- Testing the skills or commands. They are prose instructions to an agent, not
  code, and unittest has nothing to say about them.
- Property-based or fuzz testing of the spec parser. Worth considering later;
  the named failure modes come first.

## Impact

New `tests/` directory. One added job in `.github/workflows/validate.yml`. No
change to `openspec.py` itself — if a test fails, that is a finding to file and
fix as its own change, not something to paper over by editing the test.
