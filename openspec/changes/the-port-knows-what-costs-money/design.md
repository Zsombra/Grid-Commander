# Design: The Port Knows What Costs Money

## The one decision everything else follows from

**Where does the fact live?** The port needs to know that
`accept_entry_decision` commits funds. Four candidates:

| | Source | Verdict |
|---|---|---|
| A | BattleGrid's `destructiveHint` | **This is the defect.** It says accept is harmless and cancel is not |
| B | A per-tool scope from discovery | **Impossible.** The platform publishes none — tool entries carry `annotations`, `description`, `execution`, `inputSchema`, `name`, `outputSchema`, `title`, and `execution` is only `{"taskSupport":"forbidden"}` |
| C | A name list this product owns | Viable, and the only one that exists today |
| D | Infer from the operation's own arguments | Rejected — there is nothing in `{decisionId}` that says money |

**C, and it is right rather than merely available.** Whether an operation spends
someone's money is a judgement this product is accountable for. Delegating it to
the counterparty is precisely what produced the defect, and `CLAUDE.md` already
states the general form: *never treat scope alone as a safety boundary*, because
the platform's description of its own danger is not evidence.

## The objection to a name list, and why it is survivable here

A hard-coded list of tool names is exactly what `CLAUDE.md` warns about: *"The
tool list goes stale after a BattleGrid deployment. Rediscover at runtime; never
hard-code a tool list."*

That rule is about **discovery** — never assume the set of tools, never assume a
tool exists, never assume the count. This list is a different thing: a set of
names this product has decided are money-committing. It is not used to decide
what exists; it is used to decide what a *known* operation costs.

Two properties keep it honest, and both must be built:

1. **A name on the list that is absent from the discovered surface is an error**,
   not a silent no-op. That is the failure mode the rule exists for — a list that
   quietly stops matching. `no-population-constants.test.ts` already carries this
   shape as a vacuity guard, and `surface-freshness.test.ts` proves the record is
   current.
2. **Unknown stays fail-closed.** `UNKNOWN_TOOL` already classifies as
   `destructive: true, requiredScope: 'mcp:wager'`. Nothing here weakens it, and
   a new money-committing tool is therefore safe by default until it is
   classified — the list can only ever *add* safety to a known tool.

**Open for review**: whether the list should live in the domain
(`src/domain/capability/`) beside `classify.ts`, or in the adapter beside the
`TOOLS` map that already confines tool names to one directory (A10). The A10 rule
says naming a fund-committing tool outside `src/infrastructure/battlegrid/` is a
violation — which argues for the adapter — but `classify.ts` is domain and is
where the judgement belongs. **This is the first thing the planner should settle.**

## What `destructiveHint` becomes

Kept, and demoted. It stops being an input to the gate and becomes recorded
evidence: it is the platform's own claim about its own operation, it has been
observed to be wrong, and the record of *that* is worth having.

Concretely, the classification grows a distinction the code does not currently
make:

- **what the platform said** — the raw hint, retained
- **what this product concluded** — what the gates key to

The absent case is unchanged and still fails closed: `classify.ts:44` already
reasons *"Where it is absent on a mutating tool, assume the worst rather than the
convenient."* That reasoning was right; it was simply never extended to the
present-and-wrong case.

## The audit column, and the era problem

`call-path.ts:105` writes `destructive: cls.destructive`, and `audit-list.tsx:60`
renders it as a badge. Today a position-opening write reads `destructive: false`.

**Decision: the column records the product's judgement**, because the badge is
rendered as this product's own statement about what it did to someone's account,
and the audit's whole claim is *"this is what we did"*.

**The era problem is real and must be handled explicitly.** Rows written before
this change carry the platform's answer; rows after carry ours. A reader
comparing two accepts across the boundary sees a flag flip with no write having
changed. Three options, for the planner:

1. **Leave history alone and date the change.** Honest, cheapest, and leaves a
   discontinuity a reader can only resolve by knowing this change exists.
2. **Backfill.** Rewrites the audit log, which is the one artifact that should
   never be rewritten. **Rejected** — an audit you edit is not an audit.
3. **Record both, from here on.** The platform's claim and ours, side by side.
   Costs a column; makes the disagreement visible rather than resolved; and turns
   the inversion into standing evidence instead of a footnote.

**Recommendation: 3**, with 1 for existing rows. It fits what this repository
does everywhere else — record the declared and the observed, and never let one
overwrite the other.

## What must not change

- **No second opinion about whether a write is allowed.**
  `answer-decision.command.ts:16-20` is explicit that the port owns
  classification, scope, the confirmation consume and the audit row, and that
  duplicating them in the application layer would create a second opinion. This
  change makes the port's opinion correct; it must not move the decision.
- **The application layer keeps working exactly as it does.**
  `read-answer-authority.query.ts` decides what is *drawn*, never what is
  *permitted* — the P1 rule the approvals change's decision log warns about in
  advance. That separation stays.
- **`inferScope` must stop lying or stop existing.** Its comment claims tools
  needing wager authority "are caught by `declaredScope`". Whatever replaces it,
  no comment may describe a mechanism with no producer — that is how this defect
  survived four months of reading.

## How this gets proven, not asserted

The existing tests pass while the defect is live, so new tests must be built to
fail against today's code:

- **The classification test drives the real record.** `buildClassificationMap`
  over the actual `docs/battlegrid-mcp-capabilities.json`, asserting
  `accept_entry_decision` requires wager and is treated as consequential. Against
  today's code this fails, which is the point.
- **The guard test uses production classifications**, never a hand-built
  `ToolClass`. `tests/agent/answer-authority.test.ts:171-176` hand-builds
  `{ destructive: true, requiredScope: 'mcp:wager' }` and is a *correct assertion
  about a fabricated input* — it must be rewritten to take its classification
  from the map, or it will keep passing whatever the code does.
- **Every new guard is reverted once** to prove it fails, per this repository's
  standing practice.

## The sweep

Of 27 mutating tools, five are money-affecting and annotated
`destructiveHint: false`:

```
accept_entry_decision      opens a position
close_agent_position       realises P&L
submit_market_grid         costs the entry fee
random_submit_market_grid  costs the entry fee
submit_agent_grid          costs the entry fee
```

The product calls only the first. The other four are classified correctly by this
change and remain uncalled — the point is that the class is handled rather than
one tool repaired. The remaining 22 want a line each in the planner's inventory
saying why they are not on the list.
