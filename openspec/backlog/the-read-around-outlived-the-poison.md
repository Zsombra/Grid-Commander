---
id: the-read-around-outlived-the-poison
title: The gate-blocks read-around outlived the poison it reads around
type: debt
status: done
priority: p3
created: 2026-08-14
updated: 2026-08-14
change: "a-healed-defect-reads-as-dated-history"
capability: agent-understanding
github: "257"
blocked_by: []
tags: [battlegrid, stale-claim, gate-blocks]
---

# The gate-blocks read-around outlived the poison it reads around

## What

The `list_gate_blocks` row-level 500s (#100) healed upstream between
2026-08-13 and 2026-08-14. The product's windowed fallback and its comments
still describe the poisoning in present tense.

## Evidence

Re-probed 2026-08-14, read-only:

- Undertow (5,520 rows): `page 1 / limit 1`, `page 1 / limit 100`,
  `page 287 / limit 1` — all answer rows, zero refusals.
- Breakwater (649 rows): `page 1 / limit 100` — 100 rows, zero refusals.
- The previously-poisoned class — `gateStage: EVALUATION` — now reads back
  with a structured `reasonDetail: {evaluationFaultDetail: …}`, and the
  envelope carries a new `summary` roll-up (per stage/reason counts with
  `latestAt`) seen in no earlier read.

Stale text: `src/infrastructure/battlegrid/agent-adapter.ts:476-490`
(`readAroundRefusal` doc comment — "refuses on **specific rows**,
deterministically") and `src/ports/agents.ts:429`.

## What to do when taken

Re-word both comments into dated history — refused 2026-08-12→13, healed by
2026-08-14, fallback kept as defense — so the next reader does not budget for
a live defect. **Do not remove the fallback**: it activates only when the
whole read refuses, costs nothing while the platform is healthy, and this
platform has regressed before.

Separately, when something asks for it: the new `summary` envelope key
answers per-reason counts the product currently derives by hand from windowed
rows. Reading it is new modelling of a now-observed shape — its own small
change, not this one.

## Resolution (2026-08-14)

Done by change `a-healed-defect-reads-as-dated-history` (lite): both named
comments plus the `readGateBlocks` header clause ("retires itself the day
#100 is fixed", which contradicted the keep-the-fallback decision) re-worded
into dated history — refused 2026-08-12→13, healed by 2026-08-14, fallback
kept as dormant defense. Comment-only, verified by diff (no executable line
changed), typecheck and lint green. The `summary`-envelope observation stays
recorded above, unfiled by design, until something asks for per-reason
counts.

## Related

- [[battlegrid-is-returning-internal-errors]] (#100) — the defect this
  fallback was built for; carries the full re-verification record.
