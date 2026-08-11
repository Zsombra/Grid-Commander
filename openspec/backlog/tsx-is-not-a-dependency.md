---
id: tsx-is-not-a-dependency
title: The recorder's entrypoint depends on tsx, and tsx is not a dependency
type: debt
status: done
priority: p3
created: 2026-08-11
updated: 2026-08-11
change: "tsx-is-a-dependency"
capability: signal-recording
github: "152"
blocked_by: []
tags: [recorder, dependencies, deployment]
---

# The recorder's entrypoint depends on tsx, and tsx is not a dependency

## What

Both CLI entrypoints (`bin/grid-commander-record.ts`,
`bin/grid-commander-mcp.ts`) and every doc that invokes them use
`npx tsx`, but `tsx` is not in `package.json` — the lockfile carries it
only as drizzle-kit's optional peer, and nothing puts it in
`node_modules/.bin`. On a fresh machine the first `npx tsx` run prompts
`Ok to proceed? (y)` and downloads whatever tsx version is current.

## Why it matters

Found 2026-08-11 standing up the recorder cron on the operator's Windows
machine: the prompt landed **inside the scheduled, unattended run** — the
one context where nobody can answer it, on the one job whose silent death
costs unrecoverable history. Beyond the prompt, the first run on any fresh
host depends on npm's network at fire time, and the version is unpinned.

## First step

A lite change: add `tsx` to `devDependencies`, run the suites, done. The
recording host's deployed workaround is `npx --yes tsx` (prompt
suppressed, download still unpinned) — the Windows recipe in
`confirm-the-recorder-is-running` records it; simplify it to `npx tsx`
when this lands.

## Done 2026-08-11 — `tsx-is-a-dependency`

`tsx@4.23.12` added to `devDependencies`, pinned by the lockfile.
`node_modules/.bin/tsx` now exists and `npx tsx --version` answers with
no prompt and no network. All six quality gates green (typecheck, lint,
2121 vitest, build, schema-drift, 85 db). The Windows recipe's `--yes`
note updated to say the flag is now unnecessary.
