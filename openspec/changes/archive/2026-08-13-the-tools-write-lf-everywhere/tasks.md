# Tasks

## 1. Pin every writer

- [x] 1.1 `.claude/tools/openspec.py:1685` pins `newline="
"` — the write that
      produced 799 and 449 carriage returns in two merged specs on 2026-08-13.
- [x] 1.2 The sweep the item asked for: **six more writers**, across
      `capture_mcp_dump.py`, `generate_mcp_reference.py` (two),
      `probe_mcp_surface.py` (two) and `probe_vocabulary.py`. All pinned.
- [x] 1.3 Three of those pinned no `encoding` either — the defect #186 fixed in
      `generate_mcp_reference.py`, which could not run on Windows at all. Pinned.

## 2. The guard

- [x] 2.1 `tests/architecture/tools-write-lf.test.ts` — every text write in
      `.claude/tools/` and `tools/` names both `newline` and `encoding`.
- [x] 2.2 Derived from the source, not from output: git normalises on commit, so
      a check that reads committed artifacts passes everywhere and proves
      nothing. Reading the writers covers the eighth on the day it is written.
- [x] 2.3 Binary writes (`"wb"`) are excluded, and the exclusion is asserted, so
      it is a decision rather than an accident of the regex.
- [x] 2.4 Non-vacuous: it fails if it finds fewer than five tools or fewer than
      five writes.

## 3. Verification

- [x] 3.1 **Mutation check.** Un-pinned `newline` on one writer; the guard failed
      and named `tools/probe_vocabulary.py:156` exactly.
- [x] 3.2 Every Python tool compiles (`py_compile`), and the harness suite is
      green at 255.
- [x] 3.3 **End to end**: archiving this very change and checking the line
      endings of the spec the archiver wrote. That is the failure #209 reported,
      run against the fix.
- [x] 3.4 Quality gates: `typecheck`, `lint`, `vitest` (2268, 173 files),
      Python harness (255), `build`, drizzle clean, `test:db` (90).

---

## Execution note — I broke all five tools first

The first attempt pinned `newline` by scripted replacement, and the `
` in the
replacement passed through one more decoding layer than expected: every tool got
a **real newline inside the string literal** instead of the two characters.
Five files, six sites, all with `SyntaxError: unterminated string literal` — and
the Python harness went from 255 passing to **151 errors**, because
`openspec.py` itself no longer parsed.

Two further scripted repairs failed the same way before I stopped inferring and
edited the exact bytes directly.

Worth keeping rather than tidying away, because it is the change's own subject:
**a write that looks careful and is not.** The lesson generalises past Python —
`encoding` pinned and `newline` unpinned, or an escape that survives one layer
and not two, both produce a file that is almost right, and both are invisible
until something downstream refuses to parse it.

It also argues for the guard being source-derived. A guard reading *output*
would have been satisfied by files that could not even be imported.
