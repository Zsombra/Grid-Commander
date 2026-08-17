# Tasks

- [x] 1.1 Read gate blocks with the platform's paging, carrying `total`, so a
      summary can say what window it covers
- [x] 1.2 Summarise blocks by reason: count, window, most recent, first detail
      seen — derived from the rows, never from a table of assumed meanings
- [x] 1.3 Render a reason with its own numbers; a detail-less reason still
      renders; an unrecognised code renders as itself
- [x] 1.4 Surface the standing verdict where the agent is read, not only on the
      pipeline page
- [x] 1.5 Tests over the observed shapes, including the empty-detail reason and
      the more-exist-than-were-read case
- [x] 1.6 A live probe, and `./scripts/ci.sh` green
- [x] 1.7 File the `AGENT_APPROVAL_EXPIRED` question; reconcile the backlog item
      whose derivation premise this change replaces

## What the live fold found

371 blocks, five agents, 2026-08-06 — and the folded view is a different
document from the list:

```
CONTRARIAN:      100 read of 118
    98× AGENT_APPROVAL_EXPIRED            2026-07-30 → 2026-08-06  {}
     2× INSUFFICIENT_EQUITY               2026-08-06 → 2026-08-06  {equityUsd: 4.20, thresholdUsd: 10}
Fade Master:      80 read of 80
    79× EXCHANGE_MIN_NOTIONAL_UNREACHABLE 2026-04-10 → 2026-04-30  {equityUsd: 89.49, minEquityUsd: 1000, …}
CONFLUENCE:       39 read of 39
    27× AGENT_APPROVAL_EXPIRED            2026-07-31 → 2026-08-06  {}
     9× EXCHANGE_MIN_NOTIONAL_UNREACHABLE 2026-04-10 → 2026-04-17  {minEquityUsd: 222.22, smallPct: 0.9, maxLeverage: 5}
```

Three things this changed:

- **The backlog item's premise was wrong in our favour.** It proposed deriving
  the exchange minimum from balance × preset × leverage, scraped out of
  rejection text, because "the exchange minimum is not published by any tool".
  It is published, per agent, as `minEquityUsd` — and CONFLUENCE's 222.22 next
  to Fade Master's 1000 shows a derivation of ours would have produced a
  different number from the platform's.
- **The commonest reason on the account carries no detail at all.** A surface
  that rendered only reasons with numbers would have hidden 134 blocks.
- **The detail pairs are recognised by field name, not by reason code.** So a
  code nobody has seen renders its arithmetic on the day it ships, and no table
  of what codes mean exists to go stale.

Not done, deliberately: any statement of what `AGENT_APPROVAL_EXPIRED` means
for a `FULL_EXECUTION` agent. Filed as
`approval-expired-on-a-full-execution-agent` (p2).
