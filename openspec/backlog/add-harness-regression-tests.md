---
id: add-harness-regression-tests
title: Capture the openspec.py test fixtures as a real test suite
type: debt
status: in-progress
priority: p1
created: 2026-07-27
updated: 2026-07-27
change: add-harness-regression-tests
capability: harness-integrity
blocked_by: []
tags: [harness, testing]
---

# Capture the openspec.py test fixtures as a real test suite

## What

`openspec.py` was tested during v3.0 against three hand-built fixtures covering
delta merge correctness, every validation error path, track shapes, backlog
drift, and the design import cross-check. **Those fixtures lived in a scratch
directory and are gone.** The repo has no tests.

## Why it matters

The tool is now load-bearing for three layers. The archive merge in particular
rewrites `openspec/specs/` in place — a regression there silently corrupts the
source of truth, which is the one failure this system cannot recover from
cheaply. It was verified once, by hand, and nothing protects it now.

## Evidence

No test files in the repo. `.claude/tools/openspec.py` is ~1100 lines with
25+ validation codes and a line-range-based spec merge.

## Notes

Highest value first:
1. **Archive merge** — ADDED appends, MODIFIED replaces the whole block,
   REMOVED deletes, RENAMED rewrites the header, new capability seeds Purpose.
   Assert on resulting file content, not just exit code.
2. **Merge abort** — a failing validation must leave the change folder intact
   and specs untouched.
3. Validation codes — one fixture per code.
4. Design import cross-check convergence — three passes on a nested tree.

Plain `unittest` keeps the zero-dependency promise. Pairs with add-ci-validation.
