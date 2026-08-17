# Proposal: The Tools Write LF Everywhere

## Why

`.claude/tools/openspec.py:1685` writes every merged spec with
`path.write_text(text, encoding="utf-8")`. `encoding` is pinned and `newline` is
not, so Python's default translates every `\n` to `\r\n` on Windows. Both
archives run on 2026-08-13 produced CRLF specs — 799 and 449 carriage returns —
and the first was committed that way before anyone noticed (#209).

**The sweep the item asked for found six more.** Every text writer across
`.claude/tools/` and `tools/` has the same defect, including the probes that
write `docs/battlegrid-mcp-surface.json` and the vocabulary record. Three of them
do not pin `encoding` either — the exact defect #186 fixed in
`generate_mcp_reference.py`, which could not run on Windows at all.

`.gitattributes` normalises on commit, so no committed blob is wrong. The cost is
in the working tree, and its own header says what that costs: CRLF made two
guards match `\n` against `\r\n` and read nothing, and made esbuild refuse a CRLF
`.mjs` outright, so a guard suite collected **zero tests** — nineteen failures
about the platform, none about the product (#171).

## What Changes

- Every text write in `.claude/tools/` and `tools/` pins `newline="\n"`, and the
  three that omit `encoding` pin `encoding="utf-8"` as well.
- A guard holds it: no text write in either directory may omit `newline`.
  Derived from the source, so the eighth writer is covered on the day it is
  added rather than the day it bites.

## Capabilities

**New**: none

**Modified**: `harness-integrity` — what the repository's own tools guarantee
about the files they write.

## Out of Scope

- **Re-normalising files already in the working tree.** Both archives were
  hand-normalised when caught; git's `* text=auto eol=lf` handles the rest on
  commit.
- **Non-text writes.** Binary artifacts have no line endings to translate.
- **Line endings in application code.** This is about the tools that generate
  committed artifacts, not about what the product writes at runtime — the
  product writes no files.

## Impact

| Area | Effect |
|---|---|
| `.claude/tools/openspec.py` | one write, `newline` pinned |
| `tools/*.py` (four files, six writes) | `newline` pinned; `encoding` pinned where absent |
| `tests/architecture/` | one guard, derived from the source |
| Committed artifacts | none change — git already normalised them |
| Live/platform | none |
