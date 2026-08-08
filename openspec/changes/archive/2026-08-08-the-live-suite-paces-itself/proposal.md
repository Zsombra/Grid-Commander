# Proposal: The Live Suite Paces Itself

## Why

`npx vitest run tests/live/` runs 27 probe files concurrently, and
BattleGrid rate-limits: the 2026-08-07 concurrent sweep came back 9-failed
with pure weather shapes (an empty server version mid-sweep, rosters
unreadable) that a serial re-run collapsed to 2. The serial rule lived in
HANDOFF prose — a check on how something is *spelled* in a paragraph rather
than what a command *does*, the exact defect shape this repository
distrusts. Backlog: `live-probes-run-concurrently-by-default` (p3).

## What Changes

- `vitest.live.config.ts`: the live suite only, `fileParallelism: false`.
- `npm run test:live` runs it; docs name the script instead of the raw
  vitest invocation, so the pacing travels with the command.
- The main suite stays parallel — slowing 1,879 unit tests to protect 27
  probes would be the wrong trade.

Tooling only; no observable product behavior changes (`skip_specs: true`).

## Capabilities

**New**: none. **Modified**: none.

## Out of Scope

- Retry/backoff inside probes — a probe that retries through weather reports
  weather as green.

## Impact

`vitest.live.config.ts` (new), `package.json`, `HANDOFF.md` command lines;
the backlog item.
