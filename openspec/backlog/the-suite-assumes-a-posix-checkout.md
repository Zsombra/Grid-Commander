---
id: the-suite-assumes-a-posix-checkout
title: 19 tests fail on a Windows checkout — path separators, CRLF, and process spawns
type: debt
status: done
priority: p3
created: 2026-08-12
updated: 2026-08-12
change: ""
capability: harness-integrity
github: "171"
blocked_by: []
tags: [tests, windows, environment]
---

# The suite assumes a POSIX checkout

## What

Run on the Windows host (first observed 2026-08-12, the first dev session run
on the host rather than the container), the vitest suite fails 19 tests across
11 files at a clean HEAD — before any change is made. Three failure classes:

1. **Path separators** — architecture tests compare discovered file paths as
   strings and receive `src\domain\...` where they expect `src/domain/...`
   (edit-binding, boundaries, structure, one-destination,
   proposals-are-inert, write-results, identifiers, live-probes-are-named).
2. **CRLF** — regexes anchored on `\n` miss `\r\n` (money-limits' required
   counter), and mutate-guard's fixture read breaks outright (SyntaxError on
   an imported .mjs — line-ending sensitive).
3. **Process spawns** — cli-spawn's real-process refusal probes behave
   differently under Windows spawning.

## Why it matters

p3: the container CI (`scripts/ci.sh` with DATABASE_URL) is the gate of
record and stays green — nothing is wrong with the product. But a Windows
checkout cannot tell its own regressions from the baseline noise: a session
working on the host (as the recorder already does, and as this one did) has
to diff failure sets against a stashed HEAD run to know whether it broke
anything. That is a real cost paid this session.

## Evidence

2026-08-12 session: full run at HEAD `cdecf31` on Windows 11 → 19 failed / 11
files; identical set with the session's presentation changes applied (plus
one new passing test). The container CI on the same commits: green.

Normalizing with `path.posix`/`replaceAll('\\\\','/')` at the comparison
sites and `\r?\n` in the two regexes would close classes 1 and 2; class 3
needs a look at cli-spawn's spawn options.

## Notes

`.gitattributes` forcing LF on checkout is the smaller fix for class 2 but
changes every contributor's working tree — the test-side `\r?\n` is the
narrower move. Found while implementing DT-0011–DT-0015.

## Closed 2026-08-12

All three classes fixed; the suite runs **165 files / 2177 tests green on
Windows**, the first fully green run on this machine. `slashed()` shared out
of `failure-is-explained.test.ts` (the one guard in its family that already
passed) into `tests/support/source-tree.ts`, `readText()` alongside it, and
the two spawn sites now run the local entry point with `process.execPath`
instead of `npx` — no shell, no `.cmd`, no PATH lookup.

The `mutate-guard` failure turned out not to be about the test at all:
**esbuild cannot parse a CRLF `.mjs`**, proven by importing a byte-identical
LF copy, which loads. `.gitattributes` now pins checkouts to LF — the blobs
were already LF, so nothing committed changed. That also removes the class
rather than the instance.

Verified the repaired guards still bite: planting an MCP SDK import in
`src/domain/errors.ts` fails both `boundaries` assertions.

