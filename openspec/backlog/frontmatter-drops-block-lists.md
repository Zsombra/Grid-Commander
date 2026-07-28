---
id: frontmatter-drops-block-lists
title: Frontmatter parser silently discards block-style YAML lists
type: bug
status: open
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
