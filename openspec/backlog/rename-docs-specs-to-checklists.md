---
id: rename-docs-specs-to-checklists
title: Two directories named "spec" is a standing source of confusion
type: debt
status: open
priority: p3
created: 2026-07-27
updated: 2026-07-27
change: ""
capability: ""
blocked_by: []
tags: [harness, naming]
---

# Two directories named "spec" is a standing source of confusion

## What

`openspec/specs/` is the behavior contract. `docs/specs/` is the review
checklists. They are unrelated, both binding, and their names do not say so.
The distinction is currently carried by prose in four documents.

## Why it matters

Naming that needs a footnote in four places is naming that will be got wrong,
by an agent or a person. The failure mode is quiet: an agent edits the wrong
one, or reads the wrong one when looking for rules.

## Evidence

`.claude/references/change-lifecycle.md` §1, `design-contract.md` §2,
`README.md`, and `CLAUDE.md` each carry a "two things named spec" note.

## Notes

`docs/specs/` → `docs/checklists/` is the cleaner rename — `openspec/specs/` is
the OpenSpec-compatible path and should not move.

Deliberately deferred during v3.0: it touches ~5,000 lines of checklist
templates plus every skill that reads them, and mixing a wide mechanical rename
into a feature branch makes both harder to review. Do it as its own `lite`
change, ideally before the checklists get generated and grow.
