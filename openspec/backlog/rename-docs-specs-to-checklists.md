---
id: rename-docs-specs-to-checklists
title: Two directories named "spec" is a standing source of confusion
type: debt
status: done
priority: p3
created: 2026-07-27
updated: 2026-08-06
change: the-checklists-are-named-checklists
capability: ""
blocked_by: []
tags: [harness, naming]
---

# Two directories named "spec" is a standing source of confusion

## What

`openspec/specs/` is the behavior contract. `docs/specs/` was the review
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

---

# Done 2026-08-06 — and the archive was deliberately left alone

`docs/specs/` → `docs/checklists/` via `git mv`, with 21 live files rewritten:
four skills, three commands, three references (including the config template),
`openspec/config.yaml`, `CLAUDE.md`, `README.md`, `HANDOFF.md`,
`docs/MIGRATION_v3.md`, and four backlog items.

The three "two things named spec" headings became *"Behavior contract vs
engineering standards"*. **Their tables stayed** — which directory holds
behavior and which holds engineering standards is still worth stating; only the
claim of a naming collision is now false. `design-contract.md` §2 turned out
not to be one of the four at all: it is a three-way table (spec / design ticket
/ checklist) distinguishing things that remain genuinely easy to confuse.

**100 of the 128 references are in `openspec/changes/archive/`, and they stay.**
An archived proposal citing `docs/specs/` is not wrong, it is dated — rewriting
it would make it claim a path that did not exist on the day it was archived.
`JOURNAL.md` and `CHANGELOG.md` likewise: a log that edits itself is not a log.
An agent following a stale link in an archived proposal gets a loud miss, which
is the right failure; the quiet one this item was filed about — reading or
editing the wrong live directory — is closed.
