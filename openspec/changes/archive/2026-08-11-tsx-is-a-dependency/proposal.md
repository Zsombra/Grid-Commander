# Proposal: tsx Is a Dependency

## Why

Both CLI entrypoints (`bin/grid-commander-record.ts`,
`bin/grid-commander-mcp.ts`) and every doc that invokes them run through
`npx tsx`, but `tsx` is not in `package.json` — the lockfile carries it only
as drizzle-kit's optional peer, and nothing installs it into
`node_modules/.bin`. On a fresh machine the first `npx tsx` prompts
`Ok to proceed? (y)` and downloads whatever tsx version is current. Found
2026-08-11 when the recorder's first unattended run on the operator's
Windows host hit that prompt inside the scheduled task — the one context
where nobody can answer it, on the one job whose silent death costs
unrecoverable signal history (GitHub #152).

## What Changes

- Add `tsx` to `devDependencies`, pinned by the lockfile like every other
  dependency, so `npx tsx` resolves locally, offline, prompt-free.
- Simplify the Windows recipe note in
  `openspec/backlog/confirm-the-recorder-is-running.md` (the `npx --yes`
  workaround it records becomes unnecessary once this lands, and the note
  should say so).

## Capabilities

**New**: none
**Modified**: none — no observable product behavior changes; the recorder
and MCP server behave identically once tsx resolves. `skip_specs: true`
(dependency/tooling hygiene).

## Out of Scope

- Changing how the entrypoints are invoked (e.g. a compiled `dist/` build
  or `node --experimental-strip-types`) — `npx tsx` stays the documented
  invocation, it just resolves locally now.
- Updating the operator's deployed `record.ps1` — operator-side; the
  `--yes` flag is harmless after this lands. Recorded in the backlog item
  rather than filed separately, because it should happen opportunistically
  at the next `git pull` on the host, not as tracked work.

## Impact

- `package.json` — one devDependency added.
- `package-lock.json` — tsx and its tree pinned.
- `openspec/backlog/tsx-is-not-a-dependency.md` — closed by this change.
- No source, schema, or behavior changes. All suites must stay green.
