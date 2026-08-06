# Tasks

- [x] 1.1 A shared helper in `tests/support/` that finds this probe's throwaway
      agent on a roster including archived ones, reactivates it, and creates
      only when none exists
- [x] 1.2 Selection refuses on two independent grounds — the naming convention
      *and* `tradingMode: OFF` — and refuses an agent whose configuration did
      not arrive; both re-checked against a fresh read before any write
- [x] 1.3 An unreadable roster creates nothing and reports the run as not
      performed
- [x] 1.4 The helper refuses to compose a create that could trade, so the
      invariant selection depends on is established where the agent is minted
- [x] 1.5 Release the throwaway archived and still off, so the next run finds it
- [x] 1.6 Convert `write-probe.test.ts` — including a rename that keeps the slot
      prefix, or the next run cannot recognise what this one renamed
- [x] 1.7 Convert `proposal-probe.test.ts`, arming its throwaway to
      `APPROVAL_REQUIRED` through the product's own propose-then-apply path as
      an explicit setup step
- [x] 1.8 Unit-test the selection over a fake roster with no network: picks the
      leftover, never picks a real agent, creates only when none exists
- [x] 1.9 Extend `live-writes.test.ts` so reach analysis follows a helper, and
      prove the extension catches a probe routed through one
- [x] 1.10 `npx tsc --noEmit`, `npx eslint .`, and
      `npx vitest run tests/architecture/ tests/support/` green
- [x] 1.11 File what the conversion found and is not fixing

## What the conversion found

**`write-probe`'s trading-limit step cannot succeed.** It describes
`{tradingConfig: {}}` and applies `{maxDailyTrades: 7}`. The confirmation is
bound to a digest of the described intent, so those two produce different
targets:

```
issued target: agent:a1#82b404faa46fc08e6506f4b74bd79744daa22bdcb1357636a7e4f3ee…
write target : agent:a1#f2e6d89648c14c5e546e43f81429d98f37cf426952549a7031a87b6f…
```

Established against the fakes rather than inferred — the same way
`edit-binding.test.ts` drives the store instead of comparing strings. The guard
refuses the write, which is the guard being right and the probe being wrong. It
predates this change, fixing it alters what a live run does, and it cannot be
verified without one. Filed as
`write-probe-describes-a-different-edit-than-it-applies` (p2).

## What the selection is, in one line

Both, never either:

```ts
displayName.startsWith(`GC probe ${slot}`) && tradingConfig?.fields.tradingMode === 'OFF'
```

The unit test drives it over the second account's real roster shape — three
`FULL_EXECUTION` traders, a leftover probe, a paused agent, and an agent wearing
a probe's name — because the one case that matters is the one case nobody may
run live to find out.
