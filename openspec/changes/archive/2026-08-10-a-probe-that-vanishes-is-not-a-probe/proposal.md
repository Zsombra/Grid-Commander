# Proposal: A Probe That Vanishes Is Not A Probe

## Why

`platform-mapping` already states the rule this change applies:

> A check that disappears from the summary when it cannot run is
> indistinguishable from one that ran and passed.

That was written for the freshness gate, and it holds for it. **Thirty other
live probe files disappear exactly that way**, and one of them does something
worse than vanish.

`tests/live/**` is inside the ordinary suite — `vitest.config.ts` includes
`tests/**/*.test.ts` and excludes only `node_modules` and `tests/db/**`. So
`gate "vitest" npx vitest run --silent` reaches all thirty probe files:

- **Without a key** they `describe.skip`, silently, inside a gate that reports
  `ok`. Thirty checks that never ran, summarised as a pass.
- **With a key they all run, in parallel**, against the operator's real trading
  account. That is the sweep `vitest.live.config.ts` pins
  `fileParallelism: false` to prevent, after the 2026-08-07 concurrent run
  produced **nine phantom failures** that a serial re-run collapsed to two.

And `HANDOFF.md`'s "Start Here" tells the next session to do it:

> Then **run `./scripts/ci.sh` with a key** — if `freshness` is red, BattleGrid
> has deployed and the map needs re-probing before any other work is trustworthy.

**The keyless half was known.** The freshness gate's own comment says so — *"one
of nineteen live files that `describe.skip` without a credential, so inside the
`vitest` gate above it vanishes silently"* — and the gate exists to rescue that
one file from the vanishing. The keyed half was not considered, and the file
count has since grown from nineteen to thirty.

## What Changes

- **`tests/live/**` leaves the ordinary suite.** The default config excludes it,
  so the `vitest` gate stops reporting thirty absent checks as a pass and stops
  being a way to fire them all at once.
- **The live suite becomes a named gate**, run through `vitest.live.config.ts`
  so its serial pinning actually applies. Opt-in on `CI_LIVE=1` — it takes ~9
  minutes against a rate-limited platform, which is the same reason `serving` is
  opt-in — and named in the summary either way.
- **The freshness gate moves onto the live config too.** It names a single file
  so parallelism never mattered, but once the default config excludes
  `tests/live/**` the gate would select nothing at all. Left alone, this change
  would silently delete the check it is written to protect.
- **The discovery document is re-fetched by default** (#117). It needs no
  credential, and nothing has ever run it, while `oauth-conformance.test.ts`
  runs offline against the recording it verifies.

## Reachable, not merely unreached

A gate that fails when someone's network hiccups is the "red noise that meant
nothing" the operator removed Actions for. So the OAuth gate runs when the
endpoint answers and is **named as skipped when it does not** — reachability is
probed first, and unreachable is reported as unchecked rather than as a
failure or as a pass. That is the same distinction the product makes everywhere
between *unreadable* and *empty*.

## What this does not lose

Excluding `tests/live/**` from the default suite does not stop the probes being
compiled: `tsconfig.json` includes `**/*.ts`, and `npx tsc --noEmit --listFiles`
lists all **thirty** live files today. A probe that stops parsing still fails the
`typecheck` gate. The exclusion costs nothing but the silent skips.

## What is deliberately not here

- **No change to which probes exist or what they assert.** This is about when
  they run and how their absence is reported.
- **No unconditional live gate.** Nine minutes on every keyed run would make the
  fast path — check freshness, get on with it — expensive enough that people
  stop taking it, and a gate people route around protects nothing.

## Capabilities

**Modified**: `platform-mapping` — one ADDED requirement.
