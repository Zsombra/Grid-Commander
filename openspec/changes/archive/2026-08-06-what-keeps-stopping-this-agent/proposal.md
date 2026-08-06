# Proposal: What Keeps Stopping This Agent

## Why

`why-it-would-not-take-this-coin` answered *would it take this market*. This
answers the prior question — **can it act at all** — and the account says it
often cannot.

Read live 2026-08-06, across the operator's five agents:

| agent | blocks | the dominant one |
|---|---|---|
| CONTRARIAN | 118 | `AGENT_APPROVAL_EXPIRED` **98×**, 30 Jul → today |
| Fade Master II | 122 | `INSUFFICIENT_EQUITY` 80× |
| CONFLUENCE | 39 | `AGENT_APPROVAL_EXPIRED` 27× |
| VELOCITY | 12 | `AGENT_APPROVAL_EXPIRED` 9× |
| Fade Master | 80 | `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` 79× |

**371 blocks, and almost every one is the same handful of standing
conditions repeating.** An agent stopped 98 times by one thing over a week is
not having a run of bad luck; it is in a state. Nothing in this product says
so — `/agents/[id]/pipeline` shows the ten most recent blocks as a list, so
the ninety-eighth looks exactly like the first.

## What the backlog item got wrong, in our favour

`an-agent-can-be-structurally-unable-to-trade` proposed that the product
*derive* the verdict: compute largest notional from balance × preset ×
leverage, compare against an exchange minimum scraped out of rejection
message text, because "the exchange minimum itself is not published by any
tool".

**It is published.** `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` arrives as a gate
block with the arithmetic already done:

```json
{"equityUsd": 89.490186, "minEquityUsd": 1000, "smallPct": 1, "maxLeverage": 1}
```

`minEquityUsd` is the answer to "how much would I need", from the platform.
So this change **reads rather than derives** — the discipline this repository
keeps returning to. The only thing derived is recurrence, and that is derived
from observed rows, not from a table of what we think codes mean.

## What Changes

- Gate blocks read across the available history rather than the last ten, and
  summarised per reason code: how many times, over what window, most recent
  first, with the detail the platform attached.
- A **standing verdict** on the agent: what has been stopping it, and whether
  that is one event or a condition. Shown where the agent is read, not only on
  a page you have to know to open.
- `reasonDetail` rendered as a sentence carrying its own numbers — "your equity
  is $4.20 and this agent will not trade below $10" — instead of the current
  `equityUsd: 4.199037 · thresholdUsd: 10` key-value dump.
- **A code is never paraphrased into a meaning we invented.** The platform
  declares 19 of them; a code this product does not recognise renders as
  itself, with whatever detail came with it.
- **A block with no detail is still shown.** `AGENT_APPROVAL_EXPIRED` carries
  `{}` and is the single most common block on this account. A surface that
  renders only the blocks with numbers would hide the biggest finding.
- The window is stated. The platform pages at 100 and reports a `total`; a
  summary over the most recent 100 of 118 says so rather than implying it
  counted everything.

## What is deliberately not here

**What `AGENT_APPROVAL_EXPIRED` means for a `FULL_EXECUTION` agent.** The
reference ties approval to `APPROVAL_REQUIRED` mode and `signalTimeoutMinutes`,
yet all three agents carrying this block are in `FULL_EXECUTION` today. Either
they were switched, or the code means something else. **Not guessed** — filed
as a question. The product shows the code, the count and the window, which is
true whatever the answer turns out to be.

## Capabilities

**Modified**: `agent-understanding` — two ADDED requirements.
