# Proposal: The Fleet Spend Line

## Why

Model spend was the account's dominant cost line — $3.39/24h against a $43
account at its worst, ~4× the trading loss it was optimising — and the
operator's accept-as-tuition versus cut-volume ruling was blocked for a day on
a dead meter (#96). The meter recovered, the ruling has its input again
($1.34/24h, ~1:1 with trading loss after the fleet re-org), and **no surface
renders it**. The number that decides whether the fleet is worth running is
readable only by calling the platform by hand.

`get_agents_hub` (observed 2026-08-11, shapes in #129) publishes
`summary.totalCost24hUsd` — the fleet's spend as one number, with no other
home on the 114-tool surface. The per-agent figure lives on the roster row and
already renders on each agent's limits page; the total exists only here.

## What Changes

- The agents surface gains the fleet-spend read: the hub's own total and its
  active-agent count, or an unreadable with its cause.
- `/agents` — where the fleet is — says what the fleet spent: the platform's
  total over the last 24 hours, labelled as the platform's own figure, beside
  how many active agents it covers.
- It fails independently: an unreadable hub costs one line, never the roster,
  and an unreadable roster does not silence the spend line.

## What is deliberately not here

- **No per-agent spend on this surface.** The roster row's figure renders on
  `/agents/[id]/limits` already; a second rendering here would be two sources
  of one fact, the recorded disease. The fleet line renders the total alone.
- **No roster-vs-hub cross-check rendered.** The cross-check is diagnostic
  lore (both items record it); rendering a comparison would put an agreement
  scale on screen that neither tool publishes.
- **The message meter stays unrendered** (`messagesUsedToday: 0/100`). It
  belongs beside whatever surfaces conversational use, which today is nothing
  — the payload-dump rule. Recorded on #129's item at close.
- **`hubStatus` is not consumed.** Server-side status precedence with no
  consumer; a model without a consumer is how tolerated shapes accumulate.

## Capabilities

**Modified**: `agent-understanding` — one ADDED requirement.
