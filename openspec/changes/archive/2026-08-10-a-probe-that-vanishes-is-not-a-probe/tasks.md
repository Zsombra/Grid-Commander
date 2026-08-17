# Tasks

- [x] 1.1 Exclude `tests/live/**` from `vitest.config.ts`, with the reason and
      what still compiles them written beside it
- [x] 1.2 Move the `freshness` gate onto `vitest.live.config.ts`. **Do this in
      the same commit as 1.1** — once live is excluded from the default config,
      the existing gate selects nothing, and a change written to protect that
      check would be the thing that deleted it
- [x] 1.3 Add a named `live` gate running `npm run test:live`, opt-in on
      `CI_LIVE=1` and requiring a key; a named skip otherwise, saying which
      condition was missing
- [x] 1.4 Add the OAuth discovery gate: probe reachability first, run it when
      the endpoint answers, name it skipped when it does not. Unreachable is
      unchecked, never failed and never silently passed
- [x] 1.5 An architecture test that the offline suite selects no live probe —
      derived by resolving the config's include/exclude against the files on
      disk, not by matching the config's text
- [x] 1.6 An architecture test that every live probe file is still compiled by
      something, so 1.1 cannot quietly become the reason a broken probe ships
- [x] 1.7 A harness test that the summary names every gate it did not run.
      Feed it a violation before trusting it — the rule this repository has
      relearned six times, most recently while writing a guard against it (#87)
- [x] 1.8 `./scripts/ci.sh` green keyless; then with a key, confirming
      `freshness` still runs and the live suite is named as skipped without
      `CI_LIVE=1`
- [x] 1.9 One `CI_LIVE=1` run with a key end to end, through the live config,
      to prove the gate does what its name says
- [x] 1.10 Close #117 and #118 against what shipped; update `HANDOFF.md`, whose
      "Start Here" is what aims the next session at the trap

## What building it changed

**The change nearly deleted the check it was written to protect.** Excluding
`tests/live/**` makes `npx vitest run tests/live/surface-freshness.test.ts`
select nothing — the gate passes having run zero tests. Tasks 1.1 and 1.2 were
bound to one commit for that reason, and the guard asserts the live config is
named on every single-file live gate.

**Two of the first four mutations did not fail, and neither was a gap.** An
exclusion widened to `tests/**` exits vitest with `No test files found, exiting
with code 1` — the gate fails loudly even though the guard cannot report on
itself. And removing one `skip "live"` arm left the other; the live gate has
two, and removing both does fail. Worth recording that both were checked rather
than assumed.

**The guard's own first draft carried the #87 bug.** Reading a line-continued
shell gate with `[^\n]*(?:\\\n[^\n]*)*`: the greedy class consumes the
backslash, so the alternation can never match and only the first line is seen.
Second time in one session that shape appeared while writing a check against it.
Line continuations are joined before matching now.

**`oauth-live` runs by default and passes**, which closes #117 — the reachability
probe is what makes a keyless network gate safe to run unconditionally.

**Gates**: `./scripts/ci.sh` green three ways — keyless, with a key, and with
`CI_LIVE=1` and a key, the last reporting **every gate ok** including the full
serial live suite. 1,986 vitest, 81 db, 243 python harness.
