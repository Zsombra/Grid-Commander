# Proposal: The Brain's Name And The Spend Are Read

## Why

Two backlog items, one mapping. `list_intelligence_agents` and
`get_intelligence_agent` return the same thirty keys per agent, and after
`performance-was-already-in-the-payload` six of them still reached nothing.
The probe of 2026-08-06 (`the-payload-carries-more-than-is-read`, appendix)
established that two of the six are worth reading now:

**`modelDisplayName`.** Every agent on both accounts reads back
`brainPreset: "CUSTOM"` — the response flattens the request's two-branch
brain union into one field, so on read that word cannot distinguish "the
preset named CUSTOM" from "no preset, a named model"
(`preset-custom-in-the-preset-branch-is-unestablished`). The payload carries
the field that makes the brain legible anyway: `modelDisplayName`, observed
populated (`"GLM-5.2"`) on the one agent measured. The agent page currently
renders the bare discriminator.

**`last24hCostUsd`.** The older account showed spend halting an agent
(`COST_LIMIT_REACHED — "Daily cost limit reached ($6.0544 / $6)"`), and the
product's `/agents/[id]/limits` page — titled *what would stop this agent* —
does not mention spend at all. The probe settled the two questions that were
open:

- **The ceiling is not readable.** `get_agent_budget` carries no cost field;
  the whole agent payload carries exactly one (`last24hCostUsd`). The only
  place a cap has ever appeared is inside a breach message, as prose. So no
  fifth gauge — a gauge needs a ceiling and there is none to read.
- **The two reads disagree, stably.** For the same agent at the same moment:
  list `0.09022839`, detail `0`, identical across repeated samples, every
  other key equal (`the-cost-of-an-agent-reads-differently-from-two-tools`).
  The decision is made: **spend is read from the list only**, and the mapping
  site says why.

## What Changes

- `modelDisplayName` is mapped (both reads carry it identically) and the
  agent page's brain line renders it when the platform reports one, falling
  back to exactly what it shows today when it does not. The page states the
  platform's name; it claims nothing about preset-vs-custom, because that
  distinction is not readable back.
- `provider` is **not** mapped — observed `null` on the only agent measured;
  nothing renders a field never seen populated.
- `last24hCostUsd` is mapped **from the roster read only**. The detail read's
  copy is deliberately left unread, with a comment at the mapping site naming
  its observed value (0, for an agent the list prices at $0.09) and citing
  the backlog item.
- `/agents/[id]/limits` gains a spend section: spend is a further way an
  agent can be stopped, here is the running 24-hour total, and BattleGrid
  publishes no ceiling to read it against — so the figure is shown without a
  gauge. The figure rides the roster read the page already makes for its
  heading, which is the list read — no new plumbing, and no route through
  the detail read's zero.
- A roster that could not be read renders the spend as unreadable, with the
  shared explanation — never as an agent that spent nothing.

## What is deliberately not here

- **No fifth gauge, and no cap parsed from prose.** The observed halt-reason
  string carries "$6" but came from a breach event on another account, not
  from any read this product makes.
- **No claim about what `brainPreset: "CUSTOM"` means.** The read-back
  flattens the union; `preset-custom-in-the-preset-branch-is-unestablished`
  records why, and stays open.
- **The other four fields stay unmapped** — `provider`, `avatarUrl` /
  `modelImageUrl`, `activeGameCount`, `hasActiveAssignments` — because
  nothing has asked for them, which
  `the-payload-carries-more-than-is-read` keeps recording.

## Capabilities

**Modified**: `agent-understanding` — two ADDED requirements.
