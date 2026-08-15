# Design: The Approval Can Be Answered

## Technical Approach

The queue is a read of `list_pending_approvals`, mapped behind the existing
BattleGrid port into a domain type, rendered on a new surface reachable from the
agent pipeline. The two answers are `cancel_entry_decision` and
`accept_entry_decision`, both taking `decisionId` alone, both requiring
`mcp:wager`.

The whole risk of this change sits in one place: an operator agreeing to one
thing and a different thing happening. Everything below exists to close that
gap, and the ordering — cancel proven before accept exists — exists so the
first live exercise of `mcp:wager` in this product's history costs nothing if
it is wrong.

## Decisions

### Decision: The confirmation binds decision id plus the three price levels

Chosen because the platform publishes **no revision on a decision**. The payload
was read in full on 2026-08-15 (recorded verbatim in
`openspec/backlog/approvals-have-no-write-side.md`) and carries 35 keys with no
`revision`, `version`, `updatedAt`, or ETag. This is the one place BattleGrid
departs from the `expectedRevision` optimistic-concurrency pattern that every
other mutation on the platform uses, and `accept_entry_decision` accepts exactly
one argument.

`entryPrice`, `stopLoss` and `takeProfit` are what the operator actually reads
and judges. Re-reading them immediately before performing the answer, and
refusing on any difference, detects the change that matters: accepting a
decision whose stop moved is a different act from the one agreed to.

**What this does not protect against, stated plainly**: a decision that changes
in a field we do not compare (conviction, reasoning, `positionSizePct`) passes
the check. A decision replaced by a different decision with identical levels
would also pass. Neither is defended, and no surface may imply otherwise —
hence the requirement's own sentence forbidding a stronger claim.

Rejected: **binding `expiresAt`** — fixed at creation, so it detects nothing.
Rejected: **binding the whole payload by digest** — `reasoning` is model-authored
prose and any incidental re-render would refuse every answer, training the
operator to retry through a safety check.

### Decision: The queue is read with `list_entry_decisions`, not `list_pending_approvals`

Chosen because on 2026-08-15 both were called in the same second against a live
pending decision and returned a **byte-identical row** — the same 35 keys, the
same values. `list_pending_approvals` declares it returns decisions "enriched
with execution and outcome context"; no enrichment exists. The only difference
is the envelope, `{approvals: […]}` versus `{entries: […], total}`.

Given identical payloads, `list_entry_decisions` wins on capability: it
paginates, filters by status, coin, direction and verdict, and returns a total.
`list_pending_approvals` does none of that and is documented as unpaginated.

This also retires the "unknown enrichment envelope" that an earlier draft of
this design named as a bounded unknown. It is neither unknown nor an envelope.

**Liveness is `status === "PENDING"` and `closedAt === null`.** The tool
description names `AWAITING_APPROVAL`; that string does not appear anywhere in
the live payload, and code matching it would match nothing.

### Decision: Cancel ships and is proven before accept is written

Chosen because cancelling commits no money and accepting opens a position at
real size. The same client code, the same scope, the same binding and the same
audit path are exercised by both; cancel proves all of it for free. `tasks.md`
puts a verification gate between them, and accept is not begun until cancel has
been performed against the live platform and read back.

Rejected: building both and testing together — it makes the first live `mcp:wager`
call in this product's history one that opens a position.

### Decision: The step-up is offered from the point of use, never at connect

Chosen because it keeps the standing posture true for every user who never
answers a decision: they connect with read and configuration authority and
nothing about the product asks for more. It also keeps the blast radius of a
compromised connection at its current size by default.

Rejected: **adding wager to the connect scope** — it would make every user grant
fund-committing authority for a feature most will not use, and would silently
falsify the product's central safety claim.

### Decision: The size is described as a proportion, never a currency amount

Chosen because the platform does not compute size until accept time. A decision
carries `positionSizePct` and `positionSizePreset` with `entryFillPrice`,
`entryFillQuantity` and `entryFee` all null. Size is resolved from the agent's
headroom at the moment of acceptance — so two decisions accepted back to back
size differently, and a figure computed at render time would be a number the
product invented.

Rejected: **computing the amount ourselves** from headroom × pct × leverage. The
formula is known and reconstructs observed fills exactly, but it is our
arithmetic presented as the platform's fact, on a confirmation, about money.

## Data Flow

1. Operator opens the approvals queue.
2. Query reads `list_pending_approvals` through the port; the adapter maps rows
   to a domain `PendingDecision`, carrying id and the three levels.
3. Surface renders each decision; the time remaining is derived from `expiresAt`.
4. Operator chooses cancel or accept; the confirmation shows the consequence and
   the levels, carrying the id and the three levels it was rendered from.
5. On confirm, the use case re-reads the decision and compares the three levels.
   Any difference → refuse, state which moved, re-render. Missing → refuse.
6. Connection authority is checked before the call is attempted. Absent → refuse
   and offer the step-up.
7. The write is performed; the audit records the decision, the bound levels, the
   authority used, and the platform's response — success or refusal.

## Keeping the domain clean

The domain gains `PendingDecision` and the answer use cases. It does not learn
that MCP exists: the port grows `listPendingDecisions`, `cancelDecision` and
`acceptDecision`, and the BattleGrid adapter is the only place tool names
appear. The binding comparison is domain logic over domain values, so it is
testable without a client.

Tool availability is discovered at runtime as everywhere else in this product —
a tool list is not authoritative after a deployment.

## File Changes

- `src/domain/agent/pending-decision.ts` (new) — the decision awaiting an answer,
  and the level-binding comparison
- `src/domain/ports/battlegrid.port.ts` (modified) — three port methods
- `src/infrastructure/battlegrid/agent-mapper.ts` (modified) — map the observed
  row; no field invented
- `src/infrastructure/battlegrid/battlegrid.client.ts` (modified) — the two
  wager calls, refusing before attempting when authority is absent
- `src/application/use-cases/read-pending-decisions.query.ts` (new)
- `src/application/use-cases/answer-decision.command.ts` (new) — re-read, compare,
  refuse or perform, audit either way
- `src/presentation/.../approvals/` (new) — queue surface and confirmation
- connection step-up surface (modified) — offer wager authority from point of use
