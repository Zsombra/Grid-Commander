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

## YYYY-MM-DD — first entry

**Did**: initialized the spec layer.
**State**: nothing in flight.
**Next**: `/board`, then `/propose` the first change.
**Watch out**: none.
