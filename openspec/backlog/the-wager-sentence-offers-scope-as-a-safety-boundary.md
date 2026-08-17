---
id: the-wager-sentence-offers-scope-as-a-safety-boundary
title: A surface tells the operator the connection is read-only, which it is not
type: risk
status: done
priority: p2
created: 2026-08-14
updated: 2026-08-15
change: "the-connection-is-never-called-read-only"
capability: battlegrid-connection
github: "234"
blocked_by: []
tags: [copy, safety, scope, mcp-read]
---

# A surface tells the operator the connection is read-only, which it is not

## What

`src/presentation/components/wager-authority.tsx`:

> BattleGrid would allow MCP-signed wagers on this account. Grid-Commander still
> cannot place one: **it connects read-only** and never requests the wager scope.

The load-bearing half is true: Grid-Commander does not request `mcp:wager` and
cannot place a wager. **"It connects read-only" is not true**, and it is the half
a reader is most likely to carry away.

CLAUDE.md states the opposite as the project's first domain fact:

> **`mcp:read` is write-capable.** 27 of 114 tools mutate, but only 16 need
> `mcp:wager`. Eleven mutate on `mcp:read` alone, six of them destructive.
> **Never treat scope alone as a safety boundary.**

This product archives agents, forks strategies, deploys and undeploys — all on
`mcp:read`. The sentence offers scope as the safety boundary in the one surface a
cautious operator visits to ask how much authority they have handed over.

## Why it matters

p2 rather than p1, and the reason for that is worth stating: the claim the
sentence is actually making — no wager scope, therefore no wagers — is correct,
and no money moves because of this wording.

But it is the wrong sentence in the most safety-relevant surface in the product,
and it is exactly the inference CLAUDE.md warns against. An operator who reads
"connects read-only" may reasonably conclude Grid-Commander cannot change
anything on their account. It can, including destructively.

## What would settle it

Rewrite the clause to say what is true and load-bearing — that Grid-Commander
never requests the wager scope and so cannot place a wager, while it *does* hold
write authority for the operations it performs; scope is not the boundary, the
confirmation ceremony is.

Small copy change. Worth grepping for the same phrasing elsewhere, and worth a
guard, because this is exactly the class of sentence that regrows.

## Evidence

- `src/presentation/components/wager-authority.tsx` — the sentence, in the
  `accountAllowsMcpWagers` branch
- `CLAUDE.md` — domain fact 1, `mcp:read` is write-capable
- `docs/BATTLEGRID_MCP_REFERENCE.md` — the eleven read-scope mutators

## Notes

Surfaced by a sweep run while investigating #229.

**The finding as first reported was overstated**, and it is filed here at the
size it actually is. It was reported as the UI telling users the connection is
read-only, full stop — a headline safety defect. Reading the source shows the
sentence is scoped to wagers and its operative claim is correct. What remains is
a genuinely misleading clause in a safety-relevant place, which is worth fixing
and is not an emergency.

## Closed 2026-08-15 — the sentence says what is true, and a guard covers the surfaces

Archived as `2026-08-15-the-connection-is-never-called-read-only`. The
`accountAllowsMcpWagers` branch now states the missing wager scope beside the
held write authority ("can create and change your agents and strategies —
each change confirmed with you first"), and "connects read-only" is gone. The
requirement "Configuration Authority Is Described Honestly" gained the
standing-connection scenario, and the new guard
`tests/architecture/access-is-described-honestly.test.ts` scans rendered UI
copy for un-negated read-only/view-only claims — the coverage the original
consent guard lacked, which is how the sentence shipped. Mutation-proven both
directions (match-nothing and negation-removal both KILLED).
