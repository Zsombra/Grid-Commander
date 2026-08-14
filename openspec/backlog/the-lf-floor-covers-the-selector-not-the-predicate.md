---
id: the-lf-floor-covers-the-selector-not-the-predicate
title: tools-write-lf's offender predicates are unproven in the permissive direction
type: debt
status: open
priority: p3
created: 2026-08-14
updated: 2026-08-14
change: ""
capability: app-access
github: "252"
blocked_by: []
tags: [testing, vacuity]
---

`tests/architecture/tools-write-lf.test.ts` proves its **selector** and not its
**predicates**. The floor counts `textWrites()` output (the rule's own
machinery — this is why #241's inventory classed the file (a) and left it
alone), and the matcher cases feed `textWrites` a `"wb"` write it must skip and
a `"w"` write it must find. The offender predicates are fed nothing.

## Evidence

- `tests/architecture/tools-write-lf.test.ts:62` — `!/newline\s*=/.test(text)`,
  inline in the rule loop, never exercised against an offending line.
- `tests/architecture/tools-write-lf.test.ts:83` — `!/encoding\s*=/.test(text)`,
  same shape.
- Mutation that survives: either predicate made permissive (`/newline\s*=/` →
  `/./`) empties the offender list forever; the floor stays satisfied, the
  selector cases stay green, the suite passes with the rule dead. The
  permissive half of #87's finding, on the guard #209 (799 CRLFs from a
  careful-looking write) earned.

## What would settle it

A two-line matcher proof — run the composed selector+predicate over a known
offending write line and assert it is reported, plus a pinned line it must
pass — or a planted `.py` fixture under `tests/architecture/fixtures/` walked
by a second run, per the pattern #241 established.

## Notes

Found during #241's inventory and deliberately not swept in: the file's floor
genuinely counts with the rule's own selector, so converting it would have
been churn wearing the change's clothes. This item is the residual — the
predicates are trivial regexes nobody has reason to edit, hence p3.
