---
id: write-probe-describes-a-different-edit-than-it-applies
title: The write probe's trading-limit step cannot spend the confirmation it minted
type: bug
status: open
priority: p2
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: battlegrid-connection
blocked_by: []
tags: [live, probes, confirmation]
---

# The write probe describes one edit and applies another

## What

`tests/live/write-probe.test.ts` walks the trading-limit edit in two steps that
do not agree about what is being changed:

```ts
// describes …
).execute({ ...who, agentId: agent.id, changes: { tradingConfig: {} } });
// … and applies
tradingConfigChanges: { maxDailyTrades: 7 },
```

The confirmation is bound to a digest of the described intent
(`confirmationTarget.agentEdit`), so those two produce different targets. The
token the describe minted cannot be consumed by the apply, `enforce()` refuses,
and `UpdateAgentCommand` throws `ConfirmationRequiredError` before any request
is built. The probe's `expect(limits.kind).toBe('updated')` cannot pass.

## Why it matters

This is the only place `update_intelligence_agent` is walked against the live
platform carrying a trading-config change, and the assertion beside it —
"the 23-key write was rejected before this change" — is the evidence that the
read/write projection defect is actually fixed on the real server. While the
step cannot complete, that claim rests on fakes alone.

It is a defect in the probe, not in the product: the guard refusing a
submission that does not match what was described is the guard working. The
same pairing done correctly is `edit-binding.test.ts`'s "lets an unaltered
submission through, exactly once".

## Evidence

Driven against the fakes on 2026-08-06 — `DescribeEditQuery` with
`{tradingConfig: {}}`, then `UpdateAgentCommand` with
`{maxDailyTrades: 7}` — and the two targets the run produced:

```
issued target: agent:a1#82b404faa46fc08e6506f4b74bd79744daa22bdcb1357636a7e4f3ee…
write target : agent:a1#f2e6d89648c14c5e546e43f81429d98f37cf426952549a7031a87b6f…
```

`tests/live/write-probe.test.ts` — the `DescribeEditQuery` call preceding the
`maxDailyTrades: 7` update.

## Notes

The likely history: the probe was written and run before
`confirmation-is-not-bound-to-values` narrowed the target from the bare agent
id to a digest of the intent. Under the old binding both steps produced
`agent:<id>` and the pairing worked; the narrowing made them disagree, and
nothing has run the probe since.

The fix looks like one line — describe the change that is actually applied,
`{ tradingConfig: { maxDailyTrades: 7 } }` — and it changes what a live run
does, so it wants a live run to confirm it. Found while converting the probes
to reuse a throwaway agent (`a-probe-reuses-its-throwaway-agent`), which
deliberately did not touch it.
