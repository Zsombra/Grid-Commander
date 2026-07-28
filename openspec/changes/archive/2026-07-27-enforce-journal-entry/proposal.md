# Proposal: Warn when the journal falls behind the work

## Why

The journal is the only continuity mechanism between sessions and agents, and it
is the only layer that runs on discipline alone. Every other layer is
mechanically checked. Skipping the journal is invisible in the moment and
expensive three weeks later, which is exactly the shape of a rule that decays.

This is not hypothetical. The session implementing this check had made four
commits touching `openspec/` — a new backlog item, a resolved one, and two
document rewrites — with the newest journal entry nearly two hours behind. The
tooling had nothing to say about it.

## What Changes

- `validate` warns when `openspec/` has been modified more recently than
  `openspec/JOURNAL.md`, naming the commit that left it behind.
- The check is **advisory**. It never fails the build, and CI keeps passing on
  warnings, because a gate people route around protects nothing.
- No git, no commits, or a repository where neither path has ever been
  committed: the check stays silent rather than guessing.

## Capabilities

**Modified**: `spec-validation` — one added requirement.

## Out of Scope

- A `pre-push` hook. Recorded in the backlog item as the stronger version; it
  belongs to whoever wants it locally, and shipping it here would put a
  bypassable gate in everyone's way for a warning that already surfaces on the
  board.
- Judging the *content* of an entry. Enforcing that a record exists is
  mechanical; enforcing that it is any good is not.
- Failing on staleness. Promoting this to an error would block a typo fix on a
  handoff note.

## Impact

`.claude/tools/openspec.py` — one new validation code, `journal_stale`, and one
git call reusing the existing subprocess-with-fallback pattern. Surfaces in
`validate` and in `board`'s health line.
