---
id: frontmatter-drops-block-lists
title: Frontmatter parser silently discards block-style YAML lists
type: bug
status: done
priority: p2
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: ""
blocked_by: []
tags: [harness, parser, backlog]
---

# Frontmatter parser silently discards block-style YAML lists

## What

`parse_frontmatter()` understands inline lists (`tags: [a, b]`) and scalars.
A block-style list —

```yaml
blocked_by:
  - some-other-item
```

— parses as the empty string, because the `key:` line has nothing after the
colon and the `- item` lines are skipped for having no colon. The field then
becomes `[""]`: a one-element list holding an empty string.

## Why it matters

`[""]` is truthy, so it defeats the check written to catch exactly this
situation. `backlog_blocked_without_cause` fires only when `blocked_by` is
falsy, so an item that names its blocker in valid YAML is reported as having
named one, while the blocker itself is invisible everywhere else —
`board` prints `⊘ blocked by ` with nothing after it, and
`backlog_blocked_by_unknown` skips the empty string.

Block style is the more common YAML spelling and nothing in the tool rejects
it. An author writes correct YAML, the tool reports clean, and the dependency
is gone.

## Evidence

Reproduced 2026-07-28 on a backlog item using block lists for `blocked_by`
and `tags`:

```json
"blockedBy": [""],
"tags": [""]
```

`validate` reports no diagnostic for the item.

Code: `.claude/tools/openspec.py:76` (`parse_frontmatter`). `read_meta` at
`:59` has the same shape but only reads `.openspec.yaml`, which has no list
fields today.

## Notes

Two parts, both needed:

1. **Parse block lists.** After a `key:` line with an empty value, consume
   following lines matching `^\s+-\s*(.+)` as list elements. Twelve lines,
   no dependency, consistent with the inline form already supported.
2. **Never produce `[""]`.** Filter empty strings out of the list fields in
   `BacklogItem`. Whatever the parser does later, an empty entry is never
   meaningful and it is what turns a parse miss into a silently passing check.

Worth a validation code as well — `backlog_unparsed_frontmatter_line`, warning
severity, for a line inside the `---` block the parser could not interpret.
The general lesson from this and from `import-check-js-only` is that this tool
has several checks whose failure mode is silence, and silence reads as a pass.

The design layer is unaffected: surfaces and tickets are JSON.

## Outcome (2026-07-28)

Two halves, and the filed report only named the first.

**The parser.** `parse_frontmatter` now reads block-style lists: a bare `key:`
opens one when `- item` lines follow, terminated by the next key. Blank lines
and comments inside the block do not end it, and items are unquoted like
scalars.

**The wrapper.** `BacklogItem` did `[blocked] if not isinstance(blocked, list)`,
so an empty `blocked_by:` became `[""]` — truthy — regardless of the parser.
Fixing only the parser would have left the original symptom intact for the
empty case, which is precisely the case
`backlog_blocked_without_cause` exists to catch. Now normalised through
`_as_list`, which drops blank entries: empty means empty.

Found by `test_an_item_that_names_no_blocker_is_still_reported`, written as the
other side of the check and failing after the parser fix was already in.
