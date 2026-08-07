# The checklists are named checklists

## Why

Two directories were named "spec" and they are unrelated:

- `openspec/specs/` — the **behavior contract**, written by the archiver.
- `docs/specs/` — the **review checklists**, written by `checklist-generator`.

Both binding, and their names said nothing about the difference. The
distinction was carried by prose in four documents —
`.claude/references/change-lifecycle.md`, `design-contract.md`, `README.md` and
`CLAUDE.md` each had a "two things named spec" note.

Naming that needs a footnote in four places is naming that will be got wrong,
by an agent or a person, and the failure mode is quiet: reading the wrong one
when looking for rules, or editing the wrong one.

`docs/specs/` → `docs/checklists/`. `openspec/specs/` does not move — it is the
OpenSpec-compatible path.

## Why now

`rename-docs-specs-to-checklists` deliberately deferred this during v3.0, and
said why: it touches every skill that reads the checklists, and mixing a wide
mechanical rename into a feature branch makes both harder to review. It also
said to do it **before the checklists get generated and grow**. They have not
grown — the three files are the same three — so this is the last cheap moment.

## What changes

**Paths and the prose describing them. Nothing else.** No checklist content is
edited, nothing is reordered, and no behaviour moves.

- `git mv docs/specs docs/checklists`, so history follows the files.
- 21 files rewritten: four `.claude/skills/`, three `.claude/commands/`, three
  `.claude/references/` (including the config template), `openspec/config.yaml`,
  `CLAUDE.md`, `README.md`, `HANDOFF.md`, `docs/MIGRATION_v3.md`, and four
  backlog items.
- The three "two things named spec" headings become
  *"Behavior contract vs engineering standards"* (and, in `CLAUDE.md`, *"Two
  directories, two jobs"*). **The tables under them stay** — which of the two
  holds behavior and which holds engineering standards is still worth stating;
  it is only the claim of a naming collision that is now false.

`design-contract.md` §2 keeps its note unchanged apart from the path. It is not
one of the four: it is a three-way table (spec / design ticket / checklist)
distinguishing things that are genuinely easy to confuse, and the rename does
nothing for it.

## What is deliberately left alone

**The archive.** 100 of the 128 references live in
`openspec/changes/archive/`, and they are a record of what was true when they
were written — a proposal from 2026-07-27 citing `docs/specs/` is not wrong, it
is dated. Rewriting them would make each one claim a path that did not exist on
the day it was archived, for no reader benefit: an agent following a stale link
in an archived proposal gets a loud miss, which is the right failure.

`openspec/JOURNAL.md` and `CHANGELOG.md` are left for the same reason — both
are dated logs, and a log that edits itself is not a log.

## Track

`lite`, `skip_specs: true`. No behaviour changes, so there is no delta spec to
write. That is the same call `bump-actions-node20` made.
