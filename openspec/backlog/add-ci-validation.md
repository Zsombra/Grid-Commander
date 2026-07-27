---
id: add-ci-validation
title: Run openspec.py validate --all in CI
type: chore
status: done
priority: p1
created: 2026-07-27
updated: 2026-07-27
change: add-ci-validation
capability: ""
blocked_by: []
tags: [harness, ci]
---

# Run openspec.py validate --all in CI

## What

The repository has no GitHub Actions workflows at all. Nothing runs
`python3 .claude/tools/openspec.py validate --all` automatically, so a broken
delta spec, a dangling backlog link, or an invalid design ticket only surfaces
when someone happens to run the tool.

## Why it matters

The validator is the mechanism that keeps the spec, tracking, and design layers
honest. A validator nobody runs is documentation. Drift accumulates silently
and is discovered at archive time, which is the most expensive moment.

## Evidence

`ls .github/workflows` — empty. PR #1 merged with zero checks.

## Notes

A single job: checkout, `python3 .claude/tools/openspec.py validate --all`.
Zero dependencies, so no setup step beyond `actions/setup-python`. Exit code 1
on errors already does the right thing.

Consider a second non-blocking job that reports warnings as a PR comment —
the drift warnings (`backlog_change_archived`, `design_state_not_covered`) are
the ones that compound when ignored.
