# Proposal: A Cap Above The Money Cannot Bind

## Why

`THE .0` carries `maxConcurrentExposureUsd: 250`. The account behind it holds
**$43.67**.

A cap 5.7× the money it governs cannot ever stop the agent. It renders as a
limit, it reads as prudence, and it is the last row of the p1
`a-stop-inside-the-noise-looks-like-a-tight-stop` still unbuilt — the item named
this exact comparison and this exact agent.

`a-number-alone-says-nothing` shipped every other row and had to skip this one,
because the change believed no tool published a balance. **That was wrong**, and
the correction is recorded in GitHub #84: `get_account_state` returns

```json
{"balance": {"usdc": "43.667427", "totalBalance": "43.67", "hasAccount": true},
 "agentSlots": {"limit": 3, "used": 3, "remaining": 0},
 "mcpWagerEnabled": true, "tradingWalletProvisioned": true}
```

and the product has never called it. It appears twice in `src/`: a comment
explaining why it was not chosen to answer *which account is this* — correct, it
carries no id — and the read-classification list. That comment is why the
balance went unread for the life of the product.

## The pool question, settled

The blocker was that BattleGrid calls it a **"play balance (USDC)"** and puts
`tradingWalletProvisioned` beside it, so whether it is the perps wallet was
unestablished — and assuming two similar numbers are one pool is the mistake
this codebase keeps recording.

Read live 2026-08-10, both sides at the same moment:

| | |
|---|---|
| `get_account_state` → `balance.usdc` | **43.667427** |
| `list_user_active_positions` → `totals.marginedUsd` | **25.229691**, 7 positions, notional 89.29 |

$25.23 of margin sits inside a $43.67 balance. And decisively: **`balance.usdc`
is the only balance the platform publishes anywhere across its 114 tools.**
`tradingWalletProvisioned` is a boolean — whether the wallet exists — not a
second figure. There is no second pool to confuse this one with, so the
comparison is honest as *the cap against the only balance the platform reports*,
and the surface says exactly that rather than claiming a perps-specific number.

`get_agent_fund_allocation` is the one tool that claims to split the money per
agent, and it answered `committedUsd: 0` for an agent holding **$17.45** of
margin at that same moment (#107). It cannot refine this and must not be used to.

## What Changes

- **The exposure cap is shown against the balance behind it**, as a multiple, in
  the risk panel `a-number-alone-says-nothing` built. Where the cap exceeds the
  balance it SHALL be named as unable to bind — that is the finding, and a bare
  `5.7×` leaves the reader to work out its direction.
- **The balance is read once per page and labelled as the account's**, not the
  agent's. Several agents share one balance, so a per-agent surface implying
  each has its own would misstate the account by the number of agents on it.
- **A balance the platform cannot state is stated as unknown**, never as zero —
  `hasAccount: false` and an unreadable read are different facts, and both are
  different from a balance of nothing.
- **It fails independently**, like the panel's other three reads. An unreadable
  balance costs the comparison, not the exit geometry beside it.

## What is deliberately not here

- **No per-agent allocation.** `get_agent_fund_allocation` is wrong rather than
  empty (#107), and dividing one account balance across agents ourselves would
  invent a figure the platform declines to publish.
- **No arithmetic on the cap.** The panel says what the cap is against the
  balance; whether the operator lowers the cap or funds the account is theirs.
- **No writes.** The p1 said it: retuning a live agent is a separate item.
- **`agentSlots` and `mcpWagerEnabled` are read but not surfaced here.** They
  are real account-level facts nothing reads — slots belong beside the roster
  and the wager flag beside the arena, and putting them on a limits page because
  the read happened to carry them is how a surface becomes a payload dump.
  Filed rather than bolted on.

## Capabilities

**Modified**: `agent-understanding` — one ADDED requirement.
