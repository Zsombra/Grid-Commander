---
id: the-archiver-writes-crlf-on-windows
title: The archiver writes CRLF specs on Windows, against the repository's own .gitattributes
type: bug
status: open
priority: p3
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: harness-integrity
github: "209"
blocked_by: []
tags: [windows, line-endings, harness, archiver]
---

# The archiver writes CRLF specs on Windows

## What

`.claude/tools/openspec.py:1685` writes every merged spec with

```python
path.write_text(text, encoding="utf-8")
```

`encoding` is pinned and `newline` is not, so Python's default (`newline=None`)
translates every `\n` to `\r\n` on Windows. The repository's `.gitattributes`
sets `* text=auto eol=lf`.

Both archives run on 2026-08-13 produced CRLF specs:

```
openspec/specs/battlegrid-connection/spec.md   799 CR
openspec/specs/platform-mapping/spec.md        449 CR
```

The first was committed that way before anyone noticed.

## Why it matters

p3, because git normalises on the way in — the committed blob is LF, so the
repository is not corrupted and no reader downstream is affected.

It matters at all because of what the same class already cost here.
`.gitattributes` carries the reason in its own header: CRLF working trees made
two guards match `\n` against `\r\n` and read nothing, and made esbuild refuse a
CRLF `.mjs` outright, so `tests/tools/mutate-guard.test.ts` collected **zero
tests** — nineteen failures about the platform, none about the product, on a
suite whose whole job is telling those apart (#171).

Specs are read by guards. A tool that quietly re-encodes them every time it runs
is a standing invitation to that failure, and it fires on every archive rather
than once.

## Evidence

- `.claude/tools/openspec.py:1685` — the only write, `newline=` absent
- `grep -n "newline=" .claude/tools/openspec.py` → no matches
- `.gitattributes:13` — `* text=auto eol=lf`, with the #171 story above it
- Observed twice on 2026-08-13, once per archive, both normalised by hand
  afterwards

## What would settle it

One argument: `path.write_text(text, encoding="utf-8", newline="\n")`.

Worth a sweep of the other writers in the same file while it is open — the
archiver is simply the one that was caught, and any `open(..., "w")` without
`newline=` in the harness has the same behaviour. The Python harness suite (255
tests) would cover a regression if one asserted on the bytes written rather than
on the parsed content.

## Notes

Found while archiving `the-two-records-describe-one-server`, whose own gate
scans for CRLF across the changed set — which is the only reason it surfaced
rather than being committed a second time. Related in kind, not in cause, to
[[truncating-the-test-database-strands-a-live-grant]] (#208): both are the
harness doing something to the working tree that the product's own rules forbid.
