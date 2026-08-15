# Proposal: The Approval Can Be Answered

## Why

The product's premise is "the human decides, informed". `/agents/[id]/pipeline`
delivers *informed* — an operator can read "ENTER HYPE short, 0.55 conviction,
entry 56.377 / stop 56.723 / target 55.302" with the agent's own reasoning and
its whole signal checklist — and then has no way to say yes or no. The decision
expires unanswered fifteen minutes later. That happened on this account at
13:18:03Z on 2026-08-15 and is the observation this change is built from.

Grid-Commander already offers `APPROVAL_REQUIRED` on the create and edit
surfaces, and `An Unanswerable Trading Mode Says So` currently obliges those
surfaces to admit the option is unfinished. This change finishes it.

## What Changes

- A queue surface listing every decision awaiting an answer, built from the
  decision payload the platform actually returns.
- **Cancel is built, shipped, and proven before accept exists.** Cancelling
  costs nothing; accepting opens a position at real size. They are separate
  tasks with a verification gate between them, not one feature.
- A confirmation bound to what was shown — decision id plus the three price
  levels — that refuses when the decision moved underneath it.
- **BREAKING (posture, not API)**: Grid-Commander begins requesting `mcp:wager`
  authority, which it has never requested. Not by default and never at connect
  time: only as an explicit step-up the operator begins, for this purpose.
- `An Unanswerable Trading Mode Says So` is retired — its whole content is that
  answering is unbuilt.

## Capabilities

**New**: none — this extends surfaces that exist.

**Modified**:
- `agent-understanding` — the queue, the two answers, the confirmation binding,
  the expiry path; and the retirement of the unanswerable-mode disclosure
- `battlegrid-connection` — the standing scope posture, narrowed to the
  connection default, plus the step-up that answering requires

## The requirement that cannot be met as stated

The operator's instruction was that the confirmation bind **decision id,
revision, and the price levels**. The decision payload was read in full on
2026-08-15 and **carries no revision, version, `updatedAt`, or ETag** — 35 keys,
none of them a concurrency token. This is the one place BattleGrid departs from
the `expectedRevision` pattern every other mutation on the platform uses, and
`accept_entry_decision` takes exactly one argument: `decisionId`.

So the binding is proposed as **decision id + `entryPrice` + `stopLoss` +
`takeProfit`**, with the three levels serving as the change-detector a revision
would otherwise be. `design.md` records why, what it does not protect against,
and the two alternatives rejected. **This needs an explicit decision before
implementation** — it is a contract gap, not an oversight.

## Out of Scope

- **Putting agents into `APPROVAL_REQUIRED` from this product.** The mode is
  settable over MCP and the surfaces already offer it; this change answers
  decisions, it does not manufacture them.
- **Editing a decision before accepting it.** The platform offers accept or
  cancel; there is no amend. Do not build an illusion of one.
- **A dollar amount on the confirmation.** The platform does not compute size
  until accept time — a decision carries `positionSizePct` and
  `positionSizePreset` with every fill field null. Filed as `a-confirmation-
  that-cannot-name-the-amount`.
- **Notifying an operator that a decision is waiting.** A fifteen-minute window
  on an unwatched account expires unread; this change makes answering possible,
  not timely. Filed as `an-approval-expires-while-nobody-is-looking`.
- **`get_entry_decision`.** It returns the same keys `list_entry_decisions`
  already sends per row. Adding a detail fetch would be a third path to the same
  payload.

## Impact

- **New surface**: an approvals queue, reachable from the agent pipeline.
- **New writes**: `cancel_entry_decision` (destructive per the platform's own
  hint) and `accept_entry_decision` — the first two `mcp:wager` operations this
  product has ever made. Both take `decisionId` alone; ownership is enforced
  server-side from the stored decision.
- **Connection flow**: a step-up path that requests wager authority, and every
  refusal path for a connection that does not hold it.
- **Audit**: both writes are money-moving and must be recorded as such.
- **Domain**: the queue row becomes a domain type mapped behind the BattleGrid
  port. The domain must not learn the MCP client exists.
- Two reads already mapped and unused — `capitalAtRiskUsd` and `headroomUsd`
  (`agent-mapper.ts:434-435`) — are adjacent but belong to #299, not here.
