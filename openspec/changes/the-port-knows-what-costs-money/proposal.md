# Proposal: The Port Knows What Costs Money

## Why

The port applies two gates to a write: it refuses one the connection lacks
authority for, and it demands a confirmation for one that is destructive. On
`accept_entry_decision` — the only operation this product has that opens a real
position with real money — **neither fires.**

Measured through the real `buildClassificationMap` and the real
`beginGuardedCall`, from the capability record's own annotations:

```
accept_entry_decision -> {"mutating":true,"destructive":false,"requiredScope":"mcp:read"}
cancel_entry_decision -> {"mutating":true,"destructive":true, "requiredScope":"mcp:read"}

accept admitted on mcp:read alone, no token. audit id issued: true
audit row destructive: false
cancel refused with: ConfirmationRequiredError
```

Two independent causes, and they share one missing fact.

**The confirmation gate asks BattleGrid which of its operations are dangerous.**
`classify.ts:45` takes `destructiveHint` at face value when it is present, and
BattleGrid sets it `false` on accept and `true` on cancel. The annotation is
backwards from where the money risk is, and `call-path.ts:71` keys to it. The
confirmation token is minted, passed down, and never spent.

**The scope gate has no producer at all.** `rawDiscoverTools`
(`mcp-adapter.ts:387`) maps name, description, annotations and `inputSchema`, and
never sets `declaredScope`. `classify.ts:50` therefore always falls through to
`inferScope`, which is `return 'mcp:read'` unconditionally (`classify.ts:63`). So
**every known tool classifies as `mcp:read`**, and the wager gate can fire only on
the fail-closed `UNKNOWN_TOOL` path. The comment at `classify.ts:61` — *"tools
that need wager authority say so, and are caught by `declaredScope`"* — describes
a mechanism that does not exist.

That makes `battlegrid-connection`'s scenario *"A tool requiring wager authority
is reached → the operation is refused before it is attempted"* satisfied only
vacuously.

**Nobody has been harmed and the product is not currently unsafe.** The
application layer gates on wager scope (`read-answer-authority.query.ts:36`) and
binds every answer (`AnswerDecisionCommand`, plus DL-19's reachability guard), so
no operator has accepted without authority and no accept has been unbound. The
defect is that **defence in depth is defence in one layer**, and the layer the
spec names as the boundary is the inert one.

## What Changes

- **The port learns which operations commit funds**, from a source this product
  owns rather than from the platform's description of itself.
- **Both gates key to it.** An operation that commits funds requires
  fund-committing authority *and* a confirmation, whatever the platform says
  about it.
- **`destructiveHint` stops being a safety input.** It is kept as evidence — it
  is the platform's own claim and worth recording — but it may no longer be the
  only thing that decides. Where it is absent the existing fail-closed reading
  stands.
- **The audit records the product's judgement**, so a position-opening write
  stops reading `destructive: false` in the operator's own log.
- **The annotation set is swept** for other inversions rather than one tool being
  repaired and the class declared closed.

## Capabilities

**New**: none.

**Modified**:
- `battlegrid-connection` — the confirmation trigger, and the wager-authority
  scenario that is currently vacuous

## The fact the port is missing, and where it can come from

BattleGrid publishes no per-tool scope. The capability record's tool entries
carry `annotations`, `description`, `execution`, `inputSchema`, `name`,
`outputSchema`, `title` — and `execution` is only `{"taskSupport": "forbidden"}`.
So `declaredScope` cannot be populated from discovery; there is nothing to
populate it from.

The fact therefore has to be **this product's own**, which `design.md` argues is
correct rather than merely necessary: whether an operation spends the user's
money is a judgement this product is accountable for, and delegating it to the
counterparty is what produced the defect.

## Out of Scope

- **Asking BattleGrid to fix the annotation.** Upstream defects are answered in
  product here; the annotation is kept as recorded evidence and stops being
  trusted.
- **Re-litigating the application-layer binding.** It works, it is guarded, and
  this change must not create a second opinion about whether a write is allowed
  (the reasoning in `answer-decision.command.ts:16-20`).
- **Calling the four other money-affecting tools.** `close_agent_position`,
  `submit_market_grid`, `random_submit_market_grid` and `submit_agent_grid` are
  annotated `destructiveHint: false` and are money-affecting, but the product
  calls none of them. They are classified correctly by this change and left
  uncalled.
- **The audit badge's visual design.** `audit-list.tsx:60` renders the flag; what
  it renders is in scope, how it looks is not.

## Impact

- **Behaviour**: accept begins requiring a confirmation at the port as well as in
  the application layer. The UI already mints one on that path, so no surface
  changes — but a caller that skipped it would now be refused.
- **Audit**: the `destructive` column's meaning changes for money-committing
  writes. Existing rows are historical and are not rewritten; `design.md` records
  how a reader tells the two eras apart.
- **Risk**: this tightens a guard on the money path. The failure mode of getting
  it wrong is refusing a legitimate accept, which is safe; the failure mode of
  not doing it is the one measured above.
- **Track `full`**: it affects payments authority and changes a contract two
  requirements describe.
