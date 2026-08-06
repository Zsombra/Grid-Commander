# Proposal: A Probe Reuses Its Throwaway Agent

## Why

Surveying the operator's second account (`Fibonacci`) on 2026-08-06 turned up
eleven agents. **Eight of them are ours**, left by `write-probe` and
`proposal-probe` runs across several sessions:

```
GC probe 1315b                           [ARCHIVED]  Stalingrad
GC probe 1315                            [ARCHIVED]  Normandy
Grid-Commander probe (off)               [ARCHIVED]  London
Grid-Commander probe (off) 1785331191732 [ARCHIVED]  Dunkirk
Grid-Commander probe (off) 1785331381166 [ARCHIVED]  Dunkirk
GC probe renamed 1785332728782           [ARCHIVED]  Dunkirk
GC probe renamed 1785332866870           [ARCHIVED]  Dunkirk
GC probe renamed 1785333064996           [ARCHIVED]  Dunkirk
```

Every one is `ARCHIVED` and `tradingMode: OFF`, so none can trade and none costs
anything — the probes were careful about that, which is why this is p3 rather
than higher. It is still worth fixing for two reasons the backlog item states:
every roster read the operator does is now 73% noise, and the litter has already
cost a probe a wrong answer — `proposal-probe` picked `agents[0]`, got an
archived leftover, and had to grow an `anEditableAgent` filter to stop.

**And there is no delete.** `archive_intelligence_agent` is the end of the road;
the MCP surface offers no delete tool, and `canDelete: true` in the payload
describes BattleGrid's own app rather than this client (findings-agents F-1). So
the eight cannot be removed from here at all. The only fix that is ours is to
stop making more, and that is the whole of this change.

## What Changes

- **A probe finds its throwaway agent rather than minting one.** A shared
  helper lists the roster — which already asks for `ACTIVE` *and* `ARCHIVED` —
  looks for the agent this probe's slot left behind, reactivates it, and creates
  only when there is genuinely none. Eight new agents across several sessions
  becomes two, for the life of the repository.
- **Selection refuses on two independent grounds, and needs both.** A candidate
  must carry this repository's own naming convention **and** report
  `tradingMode: OFF`. Every agent the operator actually runs on these accounts
  is in `FULL_EXECUTION`; a probe reactivates, edits and archives what it
  selects, so selecting one of theirs would stop a live trader — which is a far
  worse outcome than the litter this replaces. A name alone is a string anybody
  can type; OFF alone matches an operator's paused agent.
- **Nothing that could trade is ever created.** The helper refuses to compose a
  create whose `tradingMode` is anything but OFF, so the invariant selection
  depends on is established by the only code that mints a throwaway.
  `proposal-probe`, which needed `APPROVAL_REQUIRED` to have something to stop,
  now arms its throwaway through the product's own propose-then-apply path as an
  explicit setup step.
- **An unreadable roster creates nothing.** A probe that cannot see the roster
  cannot know whether its throwaway exists, and creating on that ignorance is
  exactly how eight of them accumulated. It reports the run as not performed.
- **The guard that keeps a credential from being consent to mutate now follows
  helpers.** `live-writes.test.ts` matched tool names and `*Command` identifiers
  in a probe's own source; moving the create into `tests/support/` would have
  taken the marker with it and left a probe that writes looking inert — the same
  miss this file already records against `apply-probe.test.ts`. No spec change:
  "a check that can reach a mutating tool" already covers reaching it through
  one call, and this closes the gap between that requirement and its guard.

## What is deliberately not here

- **Removing the eight.** Nothing in this product can. Asking the operator to
  delete them in BattleGrid's own UI is the other half of the backlog item and
  stays with them; this change makes the ask final rather than recurring.
- **One shared throwaway for all probes.** `vitest` runs the live files in
  parallel, and two probes reactivating, editing and archiving one agent would
  trip its optimistic concurrency — the failure four probes caused between them
  on 2026-08-04. One agent per probe slot.
- **Reclaiming the eight leftovers by name.** They carry no slot marker, so
  selecting one would mean a prefix loose enough to match any of them, and both
  probes racing for the same agent. Two fresh throwaways, named for their slots,
  is the version that cannot collide.
- **A fix for what the conversion found.** `write-probe`'s trading-limit step
  describes `{tradingConfig: {}}` and applies `{maxDailyTrades: 7}`. Those
  digest differently, so the confirmation the describe minted cannot be spent by
  the apply and the guard refuses the write — established here against the fakes,
  not guessed. It is a real defect and it predates this change; fixing it alters
  what a live run does and cannot be verified without one. Filed as
  `write-probe-describes-a-different-edit-than-it-applies`.

## Capabilities

**Modified**: `harness-integrity` — two ADDED requirements. Both are about what
the verification harness does to a real account, which is the same register as
the existing "A Credential In The Environment Is Not Consent To Mutate" in
`battlegrid-connection`, one layer in: that one governs *whether* a check may
write, this one governs *what it may write to*.

## Impact

- `tests/support/probe-agent.ts` — new; the selection and the acquire/release.
- `tests/support/probe-agent.test.ts` — new; the selection over a fake roster,
  no network.
- `tests/live/write-probe.test.ts`, `tests/live/proposal-probe.test.ts` — the
  two probes that mint an agent, converted.
- `tests/architecture/live-writes.test.ts` — reach analysis follows helpers.
- No product code. No dependencies. No data.

## Track

`standard`. It touches no product code and ships no user-visible behavior, but
it decides which agent on somebody's real account a test is allowed to write to,
and that is more than a reviewer should get in one line.
