---
id: the-stale-journal-warning-mojibakes-its-own-evidence
title: journal_stale renders the commit subject through cp1252, so its evidence is unreadable
type: bug
status: open
priority: p3
created: 2026-08-17
updated: 2026-08-17
change: ""
capability: harness-integrity
github: "344"
blocked_by: []
tags: [openspec, validate, windows, encoding, cosmetic]
---

# The warning is right and its evidence is mangled

`validate --all` fired this today:

```
WARNING journal_stale: openspec/ changed after the last journal entry — newest
is 'audit: production gate PASS â€” the DB gate was run, not wai'
```

`â€”` is an em-dash read as cp1252. **The warning itself is correct** — only the
quoted subject is mangled, and only on Windows.

## Why it is p3 and still worth filing

Nothing is wrong with the check or the data. But this repository's whole
argument is that a record you cannot read is a record that gets ignored, and a
diagnostic that mojibakes its own evidence trains readers to skim the warning
block — which is the failure `.claude/references/tracking.md` §7 already
describes about scoped rules.

It is also the third distinct Windows-encoding defect here
([[the-archiver-writes-crlf-on-windows]], [[the-suite-assumes-a-posix-checkout]]),
so it belongs with them rather than as a one-off.

## Where to look

`.claude/tools/openspec.py` — the `journal_stale` diagnostic reads a commit
subject and prints it. The file already solves this once, at the top: a comment
records that Windows hands Python a cp1252 stdout and that printing an arrow
raised `UnicodeEncodeError`. Whatever fix that comment describes has not been
applied to this path.

## Notes

- Found while closing out 2026-08-17. Cosmetic, deliberately not fixed in that
  session's change, which was about the confirmation gate and had no business
  touching the validator's output encoding.
