---
id: a-paused-radar-is-rendered-as-on-duty
title: The product says "on duty: scanning" for agents whose radar the platform has paused
type: bug
status: done
priority: p2
created: 2026-08-16
updated: 2026-08-16
change: "a-paused-radar-says-so"
capability: agent-deployment
github: "311"
blocked_by: []
tags: [battlegrid, v19, radar, deployment, correctness]
---

# A paused radar is rendered as on duty

## What

`list_radar_deployments` returns a `summary` alongside `policies`. At v19.1.0 it
declares two fields this product does not read:

- `summary.platformPaused`
- `summary.radarPaused`

`src/infrastructure/battlegrid/radar-adapter.ts:36` reads
`payload['policies']` and nothing else — `summary` is discarded whole. And
`grep -rn "paused\|Paused\|PAUSED" src/ app/` returns **zero** matches: the
product has no representation of a paused radar anywhere, at any layer.

Meanwhile `app/(app)/agents/[id]/page.tsx` renders, per deployment:

```
On duty: scanning ${d.coinTicker} on the ${d.timeframe} radar.
```

That sentence is false whenever the radar is paused. Nothing is scanning.

## Why it matters

**This is live on the operator's account, not hypothetical.** The last three
sessions recorded the same reading while polling for the unpause: 20/20
`platformPaused`, `summary.radarPaused: true`, and `lastFireAt` frozen at
2026-08-13T18:01:18Z (see `openspec/JOURNAL.md`, the 2026-08-15 (reconcile) and
(keyed) entries, and `openspec/backlog/approvals-have-no-write-side.md`, which
carries three separate sweeps). For at least three days the agent page has been
telling this operator their agents are scanning markets that no radar is
serving.

It is also **the exact failure this section was built to prevent, one level
deeper.** The deployment section's own comment says:

> ACTIVE means configured; only a radar deployment means scanning. The
> operator's account proved it: two ACTIVE agents, zero positions, absent from
> every slot, and nothing on this page said so.

The rule needs one more clause: a deployment means scanning *unless the radar is
paused*. The product learned the first half from the account and is currently
making the second half of the same mistake.

p2, not p3: it is a false statement about whether money-moving automation is
running, on the surface an operator checks to find out, and it is wrong right
now. It is not p1 — nothing is lost or mis-traded by it, and the direction is
safe (it claims more activity than exists, so it cannot hide a surprise
position; the exposure panel above it reads real positions independently).

## Evidence

- `src/infrastructure/battlegrid/radar-adapter.ts:36` —
  `return { kind: 'deployments', deployments: mapDeployments(payload['policies']) }`.
  `summary` never leaves the adapter.
- `grep -rn "paused\|Paused\|PAUSED" src/ app/ --include=*.ts --include=*.tsx`
  → no matches (2026-08-16).
- `app/(app)/agents/[id]/page.tsx`, deployment section — the four standing
  sentences (`holding-position`, `on-duty`, `slot-held-not-scanning`,
  rotation) have no paused arm.
- Declared at v19.1.0 in `docs/battlegrid-mcp-capabilities.json`:
  `list_radar_deployments` gained `summary.platformPaused` and
  `summary.radarPaused` in the leaf diff against the v18.2.0 generation
  (`fbe0aa2`).
- Live readings, three sessions, unchanged: `openspec/JOURNAL.md` 2026-08-15
  (reconcile) — "still 20/20 `platformPaused`, `lastFireAt` unchanged at
  2026-08-13T18:01:18Z".

## What would settle it

Map `summary` in the radar adapter, carry the pause state through
`RadarPort` → `ReadDeploymentsQuery` → the deployment section, and give the
standing sentences a paused arm. Presentation plus one mapped field; no new
platform call — `list_radar_deployments` is already read on that page.

The interesting design question is **which pause wins the sentence**.
`platformPaused` and `radarPaused` are separate fields and may disagree; a
surface that collapses them would be unable to say whether the operator's own
radar is off or the whole platform is. Read both, and say which.

## Notes

- **The field was observable before it was declared.** Sessions have been
  polling `summary.radarPaused` by hand since at least 2026-08-13, while the
  v18.2.0 record did not declare it. v19 declared what was already being
  returned, which is what makes it safe to model now — and is a second instance
  of the [[battlegrid-declared-vs-observed]] pattern in the harmless direction.
- **Do not map absent to `false`.** A radar read that omits `summary` is a read
  that did not answer, not a running radar — the `=== true` mistake #285/#287
  already paid for once, on `regimeAutoDerive`.
- The pause is also the thing two open items are waiting on:
  [[approvals-have-no-write-side]] (#101) and the #147 watch both fire on the
  unpause. A product that renders the pause would make those watches readable
  instead of hand-polled.
- Found by the #301 survey, 2026-08-16. Related:
  [[v19-moved-thirty-four-output-schemas]].

## Done — 2026-08-16

Built as `a-paused-radar-says-so` (standard). `summary` is mapped at the radar
adapter, the pause travels on `RadarReadResult` → `ReadDeploymentsQuery` to all
three consumers, and `RadarPauseNote` states it above the rows on both the agent
page and the roster. The MCP surface gets it for free — `src/mcp/tools.ts`
returns the query's result whole.

**Two corrections this item got wrong**, both found by reading the declaration
before building (recorded on #311):

- `platformPaused` is a **number**, not a flag — a count of deployed coins the
  platform has stopped. `radarPaused` is the only boolean. `summary` is a
  fourteen-field status histogram, all required, and `summary` itself is
  required beside `policies`.
- `policies[].resolvesNow` carries **no** per-deployment pause, so "which pause
  wins the sentence" was the wrong question. The pause is knowable only at fleet
  level, which is why it sits above the rows and qualifies them rather than
  rewriting any row's standing.

Not proven against a live payload — the fixtures are the declared v19.1.0 shape,
including the account's own recorded reading (20/20 platform-paused, radar
paused, nothing scanning).
