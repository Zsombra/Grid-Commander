---
id: spec-parser-ignores-code-fences
title: Spec parser reads headings inside fenced code blocks as real structure
type: bug
status: done
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

## Outcome (2026-07-28)

Fixed as the notes proposed: one `fenced_lines()` pre-pass returning the line
indices inside fences, consulted by every scanner. Five sites, not the three
filed — `_parse_renames` and `BacklogItem._title_from_body` have the same blind
spot.

`parse_requirements` computes the set itself when a caller does not supply one,
so fence awareness cannot be opted out of by accident; `SpecDoc._parse`
computes it once and threads it through.

CommonMark rules that turned out to matter, each with a test: the opening run
length is tracked so a ````-fence can contain ``` (documenting fenced syntax is
the reason this bug exists); an unterminated fence runs to end of file, which is
how it renders; a backtick fence's info string may not contain a backtick, which
is what separates ```` ```python ```` from inline ``` ``code`` ``` in a
sentence; a closing fence may not carry an info string; three spaces of indent
still opens a fence and four does not.

**One thing worse than filed.** The merge did not just add the phantom — it
rewrote the example. Splitting `Docs` at the phantom heading and rejoining the
pieces injected a blank line after the opening fence, so `archive` corrupted the
very block it should not have been reading. Pinned by
`test_the_fenced_example_survives_the_merge_unaltered`.

`tests/test_fenced_blocks.py`, 24 tests. Of the 13 that exercise existing entry
points, 12 fail against the unfixed parser; the one that passes is
`test_a_spec_with_no_fences_parses_exactly_as_before`, the guard that a
fence-free spec is unaffected. The other 11 are unit tests of `fenced_lines`
itself and error rather than fail without it, since the function is new — worth
noting as weaker evidence than the 12.

Verified behaviour-preserving on this repo: `validate --all` and `journal`
produce byte-identical output before and after.

**Still open**: `archive-allows-incomplete-tasks` (P1),
`frontmatter-drops-block-lists` (P2), `validate-change-metadata` (P2).
