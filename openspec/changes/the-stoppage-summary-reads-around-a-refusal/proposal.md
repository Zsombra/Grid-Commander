# Proposal: The Stoppage Summary Reads Around A Refusal

## Why

**The feature `/agents/[id]` leads with is dark for every agent still running.**
The account holds fifteen agents; all three that are `ACTIVE` report
`unreadable`, while three archived ones summarise normally from the same call:

```
Vanguard:     unreadable        (ACTIVE)
Undertow:     unreadable        (ACTIVE)
Breakwater:   unreadable        (ACTIVE)
THE .0:       100 read of 297   (ARCHIVED)
Volatilis:    100 read of 970   (ARCHIVED)
Quadratorum:   27 read of  27   (ARCHIVED)
```

That split is the point. The refusals cluster at the **head** of the history,
so an agent whose history is still growing is exactly the one that goes dark,
and an agent that stopped writing rows weeks ago reads fine. The surface fails
precisely where it is load-bearing.

`list_gate_blocks` refuses on **specific rows** — a dense block at the head of
the history plus isolated ones far below it, deterministic per row (#100, re-
bisected 2026-08-13). `readGateBlocks` makes **one call**, so a single poisoned
row anywhere in the requested window darkens the whole summary.

The data is not gone. Rows 151–250 on Undertow read perfectly and carry exactly
what this surface exists to say: 100 blocks, all `OPEN_POSITION_CONFLICT`, 86 of
them on one coin. The product is showing nothing while holding a readable answer
one page away.

**This surface wants history, and history is what survives.** #100's own note
anticipated it: *"A surface that needed history could use it. A surface that
needs what just happened cannot."* The standing-condition summary is the first
kind.

## What Changes

- When the single gate-block read refuses, the adapter **pages around it** —
  reading in smaller windows and skipping the ones that refuse — instead of
  giving up.
- The summary **states what it could not read**, in the same breath it already
  states what it did not read. This is the existing coverage rule extended from
  *unread* to *unreadable*; a summary that silently omitted refused rows would be
  worse than the outage, because it would look complete.
- **The fallback engages only on refusal.** A healthy platform costs exactly one
  call, as today, and the workaround disappears on its own when BattleGrid fixes
  the rows.

## Capabilities

**Modified**: `agent-understanding` — what the stoppage summary does when part of
its history refuses.

## Out of Scope

- **Paging around refusals for the other two pipeline stages.** `list_signal_logs`
  and `list_entry_decisions` share the `{entries, total}` envelope and neither is
  refusing; building for a fault they do not have is how a workaround becomes
  architecture.
- **Reading the whole history.** 5,483 rows at a page size that survives is
  thousands of calls against a rate-limited platform. The summary reads a bounded
  window and says so — which the existing requirement already demands.
- **Fixing #100.** It is BattleGrid's, it is now reportable in sharp terms, and
  this change is explicitly a mitigation with a stated end.

## Impact

| Area | Effect |
|---|---|
| `src/infrastructure/battlegrid/agent-adapter.ts` | gate blocks gain a paged fallback; the other stages untouched |
| `src/domain/agent/stoppage.ts` (or its summary type) | carries how much refused |
| the stoppage surface | states the gap, alongside the window it already states |
| Live | more calls **only** when the platform is refusing; one call otherwise |

## Risk

The honest one: a summary assembled from surviving pages is **biased toward the
readable past**. The head refuses, so the most recent blocks are exactly the ones
missing — and this surface is about what is stopping an agent *now*. Saying "100×
OPEN_POSITION_CONFLICT" over a window that ends before the refusal begins could
read as current when it is not.

So the window's end must be stated as plainly as its size, and the summary must
never imply it reaches the present when it does not.
