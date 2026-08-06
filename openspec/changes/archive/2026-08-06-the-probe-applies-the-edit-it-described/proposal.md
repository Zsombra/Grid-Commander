# Proposal: The Probe Applies The Edit It Described

## Why

`tests/live/write-probe.test.ts` walks the trading-limit edit in two steps that
do not agree about what is being changed. It describes an empty `tradingConfig`
and submits `maxDailyTrades: 7`.

The confirmation is bound to a digest of the described intent
(`confirmationTarget.agentEdit`), so the two form different targets. Driven
against the fakes on 2026-08-06 — the same run the backlog item records, and
reproduced again while writing this:

```
issued target: agent:a1#82b404faa46fc08e6506f4b74bd79744daa22bdcb1357636a7e4f3ee…
write target : agent:a1#f2e6d89648c14c5e546e43f81429d98f37cf426952549a7031a87b6f…
```

The token the describe minted cannot be consumed by the apply, `enforce()`
refuses, and the write is rejected before a request is built. The step's
`expect(limits.kind).toBe('updated')` cannot pass.

**This is the guard working, not failing.** A confirmation is bound to the
values it was formed against, which is what stops an agreement about $25
authorising $25,000 — the whole of `confirmation-is-not-bound-to-values`. The
probe is what is wrong, and the same pairing done correctly is
`edit-binding.test.ts`'s "lets an unaltered submission through, exactly once".

It matters because this step is the only place `update_intelligence_agent` is
walked against the live platform carrying a trading-config change. The assertion
beside it — "the 23-key write was rejected before this change" — is the evidence
that the read/write projection defect is fixed on the real server rather than
only in the fakes. While the step cannot complete, that claim rests on fakes
alone.

The likely history is in the backlog item: the probe predates the narrowing of
the target from the bare agent id to a digest of the intent. Under the old
binding both steps produced `agent:<id>` and the pairing worked.

## What Changes

- **The probe forms one intent and uses it twice.** `{tradingConfig:
  {maxDailyTrades: 7}}` is described, and the same object is split into the two
  arguments `UpdateAgentCommand` takes. The describe and the apply concern the
  same edit, so the confirmation is spendable and the step can reach `updated`.
- **The split is the product's own.** `editArguments` is what
  `/agents/[id]/edit` and `/pending/[id]` use to move `tradingConfig` out of
  `changes` and into the merged argument, and `proposal-probe` already walks it.
  A probe composing the two halves by hand is exercising a shape the product
  does not have — which is how the halves drifted apart in the first place.
- **The pair is proven offline.** `edit-binding.test.ts` gains a block that
  drives the probe's describe→apply pair against the fakes and asserts the
  confirmation is spendable, runs the old pair to show it was refused, and reads
  the probe to check both halves still come from one intent through the shared
  split. A live probe nobody may run is not evidence.

## What is deliberately not here

- **Running the live probe.** It creates and edits agents on the operator's real
  BattleGrid account, and the fix is established the way the defect was: against
  the fakes, driving the store's own `consume` rather than comparing two
  strings. The live run remains the operator's to make.
- **Any product code.** Nothing in `src/` or `app/` is touched. The binding, the
  digest, the split and the merge all behave exactly as they did; the probe now
  asks them for something they can answer.
- **Widening `describeEdit` to name `maxDailyTrades`.** The consequence this
  proposal mints reads "Replaces every trading limit this agent runs under." and
  no number, because `maxDailyTrades` is not one of the five money fields
  `describeMoney` spells out. That is a real gap in what a person is shown and it
  is not this change — the digest binds the value either way, and the probe's
  subject cannot trade.
- **Auditing the other live probes for the same shape.** `proposal-probe`
  already uses `editArguments` for both of its edits; nothing else in
  `tests/live/` pairs a describe with an apply. The offline guard added here
  covers the file that had the defect.

## Capabilities

**Modified**: `harness-integrity` — one ADDED requirement. It is about what a
check that walks a confirmed write must do to be evidence, which is the same
register as the two requirements `a-probe-reuses-its-throwaway-agent` added:
those govern *what a check may write to*, this governs *whether what it writes
can be authorised at all*.

No product capability is touched. `battlegrid-connection` already says a
confirmation authorises the change it described, and this change relies on that
being true rather than altering it.

## Impact

- `tests/live/write-probe.test.ts` — the trading-limit step forms one intent and
  splits it with `editArguments`.
- `tests/agent/edit-binding.test.ts` — a block proving the probe's pair offline.
- No product code. No dependencies. No data. No migration.

## Track

`standard`. It ships no user-visible behavior and touches no product code, which
argues for `lite`. Against that: it changes what a live run does to a real
account — the trading-limit write now actually lands, where before it threw
before building a request — and the thing being repaired is a confirmation
binding, where a plausible-looking fix in the wrong direction is to loosen the
guard. That is worth a delta spec and a verification pass rather than a
proposer→executor hop.
