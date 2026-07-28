---
id: spec-parser-ignores-code-fences
title: Spec parser reads headings inside fenced code blocks as real structure
type: bug
status: open
priority: p1
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: spec-validation
blocked_by: []
tags: [harness, parser]
---

# Spec parser reads headings inside fenced code blocks as real structure

## What

`parse_requirements()` and `SpecDoc._parse()` scan line by line for `## `,
`### Requirement:`, and `#### Scenario:` prefixes with no awareness of
` ``` ` fences. A spec that shows the spec format in an example — which is
exactly what a spec *about* the spec format will do — has its example parsed
as live structure.

## Why it matters

Two failures from one cause. The phantom requirement truncates the real one,
so the real requirement's scenarios are attributed to the example and the tool
reports `requirement_without_scenario` against a requirement that plainly has
one. That is a false error on a correct spec, and false errors are how a
validator loses its authority.

Worse, the phantom is a `Requirement` object like any other, so `archive`
merges it into `openspec/specs/`. A documentation example becomes a
requirement in the source of truth.

## Evidence

Reproduced 2026-07-28. Delta with one real requirement whose body contains a
```` ```markdown ```` fence showing `### Requirement: Example` and
`#### Scenario: not real`, followed by the real `#### Scenario: real`:

```
ERROR   requirement_without_scenario: cap / Docs: requirement has no scenario
        at openspec/changes/c/specs/cap/spec.md:7
WARNING requirement_not_normative: cap / Example: no SHALL/MUST ...
        at openspec/changes/c/specs/cap/spec.md:12
```

`Docs` has a scenario. `Example` is not a requirement. Both diagnostics are
wrong, and `Example` would be archived into the main spec.

Code: `.claude/tools/openspec.py:137` (`parse_requirements`), `:175`
(`SpecDoc._parse`), `:869` (`read_journal` has the same blind spot).

## Notes

Cheapest correct fix: one pre-pass that returns the set of line indices inside
fences, and skip those lines in every scanner. Track the opening fence's
character and length so a ```` ```` ```` block containing ``` ``` ``` nests
correctly, and treat an unterminated fence as running to end of file.

This is not hypothetical for this repo specifically — the `spec-validation`
capability is about the spec format, and `.claude/references/spec-format.md`
is entirely worked examples. The first spec anyone writes about the format
itself trips this.

Same pre-pass fixes `read_journal`, where a fenced `## 2026-01-01 — ...`
example inside an entry body would be read as a separate entry. `JOURNAL.md`
carries exactly such a block in its header today; it survives only because the
regex wants a date and the example lives above the first real entry.
