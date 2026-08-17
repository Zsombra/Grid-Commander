# Proposal: Why It Would Not Take This Coin

## Why

`why-it-did-not-trade` built the *retrospective* half: what an agent decided,
and where a candidate stopped. What an operator cannot ask is the **prospective**
question — *would it trade this coin right now, and if not, what is stopping it?*

`get_agent_coin_qualification` answers exactly that, and has never been called.

## What was chosen, and what was refused

This was going to be `approvals-have-no-write-side`. The data said no, twice:

- **The write side is forbidden by our own spec.** `accept_entry_decision` and
  `cancel_entry_decision` both state *"Requires mcp:wager scope"*, and
  `Read Scope Is Requested And Wager Scope Is Not` says Grid-Commander MUST NOT
  request authority to commit funds. Building it would break a standing
  requirement, which is a decision for the operator and not a quiet commit.
- **The read side has no observable shape.** `list_pending_approvals` answers
  `{approvals: []}` — no agent on either account uses `APPROVAL_REQUIRED`, so
  the row has never been seen. The same is true of the entire positions and
  orders cluster: open positions, active positions, open orders and trade
  outcomes all return empty here.

Modelling any of them means inventing key names, which is the specific mistake
behind three of the dead paths in `HANDOFF.md`. So they stay unbuilt and stay
filed.

Qualification is different: **observed, populated, and on this account today.**

## What Changes

- `get_agent_coin_qualification` behind the agents port, mapped from the shape
  the probe recorded on 2026-08-06.
- A surface answering the question per coin: whether it qualifies, and for each
  of the three gates the platform names — `aggregateScore`, `atrVolatility`,
  `requiredCount` — the **measured value against the threshold**, not a verdict
  word alone. "Blocked" without a number is not an answer an operator can act on.
- Long and short are separate verdicts, because they are. A coin can qualify one
  way and not the other, and collapsing them would hide which.
- Which coins are asked about comes from the agent's own deployments where it
  has them, and the platform's ranked list where it does not — stated either way,
  because "your agent would not trade these" means something different when the
  product picked the coins.

## Capabilities

**Modified**: `agent-understanding` — one ADDED requirement.
