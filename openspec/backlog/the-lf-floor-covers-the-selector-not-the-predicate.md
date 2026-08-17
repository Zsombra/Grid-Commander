---
id: the-lf-floor-covers-the-selector-not-the-predicate
title: tools-write-lf's offender predicates are unproven in the permissive direction
type: debt
status: done
priority: p3
created: 2026-08-14
updated: 2026-08-16
change: the-record-says-what-was-actually-checked
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

---

## Settled 2026-08-16 — `the-record-says-what-was-actually-checked`

**Extracted first, then proved.** `namesNewline` and `namesEncoding` moved out
of the rule loops into named functions, and a third — `unpinned(source, pins)` —
composes the selector with a predicate. Both rules and the new case call that
one function. This ordering is the point: a proof that re-typed the regex would
have asserted against a *copy* and left the live predicate unexercised, which is
this item's own defect wearing a test's clothes.

**The offender is not synthetic.** It is the line as it actually stood at
`.claude/tools/openspec.py:1685` until #212 pinned it — the write that put 799
carriage returns into a merged spec (#209):

```python
        path.write_text(text, encoding="utf-8")          # reported by the newline rule
        path.write_text(text)                            # reported by the encoding rule
        path.write_text(text, encoding="utf-8", newline="\n")   # passes both
```

Because the historic line names `encoding` and not `newline`, it proves a second
thing for free: **the two predicates are not one regex.** The newline rule must
report it and the encoding rule must pass it, and the case asserts both.

**The mutation this item named as surviving now fails.**

| mutation | result |
|---|---|
| `namesNewline` → `/./` | **1 failed, 4 passed** — only the new case caught it |
| `namesEncoding` → `/./` | **1 failed, 4 passed** — only the new case caught it |
| neither | 5 passed |

The "4 passed" column is the item's claim, reproduced: the floor stays
satisfied and the selector cases stay green with the rule dead. Nothing but the
new case notices.

**One hazard found while writing it, worth the line.** The pinned fixture is a
TypeScript string containing `newline="\n"` — a *single* backslash there is an
escape, so the fixture would have become two lines and every assertion would
have passed for the wrong reason. It was written that way first and caught. The
case now asserts `textWrites(PINNED)` has length 1, so the escaping cannot rot
silently.

**Not swept**: the rest of `tests/architecture/`. #241 did that inventory and
this was its named residual.
