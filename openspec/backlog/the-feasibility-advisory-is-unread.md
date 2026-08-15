---
id: the-feasibility-advisory-is-unread
title: feasibilityAdvisory already answers "which coins can this strategy actually trade today" and nothing reads it
type: feature
status: done
priority: p3
created: 2026-08-15
updated: 2026-08-16
change: "the-edit-answers-what-can-be-built"
capability: agent-authoring
github: "291"
blocked_by: []
tags: [battlegrid, advisory, strategy-authoring, ui, pr-82-refile]
---

# The advisory that already exists, and nothing reads

Re-filed 2026-08-15 from draft PR #82's stranded backlog (issue #289,
original filed 2026-08-10 at p2). The premise re-verified today on `main`
at platform v18.2.0: `feasibilityAdvisory` is declared in both
`docs/battlegrid-mcp-surface.json` and `docs/battlegrid-mcp-capabilities.json`,
and `grep -rn feasibilityAdvisory src/` returns nothing — no reader exists.

## What

`update_intelligence_agent` declares a `feasibilityAdvisory` on its output.
Per coin it carries:

| field | |
|---|---|
| `status` | `FEASIBLE` · `STRUCTURAL_ONLY` · `ATR_UNAVAILABLE` |
| `atrPct` | the coin's live ATR |
| `reachableMinPct` / `reachableMaxPct` | the stop band actually constructible today |
| `requestedMinAtrMultiple` / `requestedMinPct` / `requestedMaxPct` | what the strategy asked for |
| **`responsibleBound`** | `MIN_STOP_LOSS_PCT` · `MAX_STOP_LOSS_PCT` · `null` — **which dial blocked it** |
| `shortfallPct` | how far short the request fell |

Nothing in this product reads any of it.

## Why it matters

This is the only surface on the platform that answers **"given today's
volatility, which of my armed coins can this strategy actually build a stop
for, and which dial is stopping the rest?"** — per coin, already computed,
with the responsible dial named.

The original filing was p2 because the fleet's central defect at the time
was a stop floor pinned at 1×ATR (`v15-trade-level-policy-is-declared-but-inert`,
then p1), and the advisory is exactly the instrument that would have shown
it. That item is **done** on `main`, so the "blocked in practice by the p1"
note in the original no longer applies — but neither does the urgency it
lent. Re-priced p3: nothing breaks if this is never built; what is lost is
an already-computed instrument and the natural home for the dial warning
copy. The operator can re-price.

The gap, precisely: the advisory speaks **band language** ("reachable stops
span 0.76–2.27% on this coin"); an operator setting a dial needs
**opportunity language**, aggregated ("at today's volatility, 9 of 12 armed
coins can construct under this ceiling; at 2.00% that drops to 4"). The
delta is presentation only — every input already exists in the DTO, plus
agent leverage for the risk-side line. No new platform call.

## Evidence

- `feasibilityAdvisory` declared: `docs/battlegrid-mcp-surface.json` (1
  match) and `docs/battlegrid-mcp-capabilities.json` (1 match), both at
  v18.2.0, checked 2026-08-15.
- No reader: `grep -rn feasibilityAdvisory src/` empty, 2026-08-15.
- Full field table and dial-direction analysis: the original item on tag
  `archive/claude/agent-creation-data-strategies-fw6av8`
  (`openspec/backlog/the-feasibility-advisory-is-unread.md`).

## Notes

- `ATR_UNAVAILABLE` is its own shape in the schema (`coinTicker` + `status`
  only, no numbers) — a consumer must handle the union rather than assume
  the numeric fields, the same `unreadable`-vs-`empty` distinction this
  product draws everywhere else.
- Dial-direction copy from the original (worth keeping): Max Stop Loss
  limits opportunity when turned **down**, not up — a high ceiling never
  blocks anything; its warning is risk-side.

## Done — 2026-08-16

Built as `the-edit-answers-what-can-be-built` (standard). The advisory is read
at the adapter, carried across the post-write redirect on a signed, agent-keyed,
two-minute cookie, and rendered as opportunity language on `/agents/[id]` — the
platform's own counts for the headline, the responsible dial named per blocked
coin, the unpriced coins named separately as a gap in the reading, and a ceiling
curve marked as this product's arithmetic. `Max Stop Loss limits opportunity when
turned down, not up` is on the surface, as the note below asked.

**Two things this item did not anticipate**, both found while building:

- The v19.1.0 record carries a `counts` block (`total`/`evaluated`/`buildable`/
  `volatilityUnavailable`) and the three dial values at the top of the advisory.
  The headline is BattleGrid's own count, not one this product derives.
- `counts` and `coins[]` are separate fields and can disagree, which would have
  printed "9 of 12 can construct" above "2 coins cannot". The panel reconciles
  them and says so when they do not; the derived curve is withheld entirely when
  this product's arithmetic cannot reproduce the platform's `buildable` at the
  platform's current ceiling.

**Provenance note.** This file did not exist on `main` when the work was done —
it was stranded on PR #295 with three other items from the #289 reconciliation,
and issue #291 was the only readable record. The body above is `cd4b5a1`'s
verbatim; only the frontmatter and this section are new. Expect a one-file
conflict when #295 rebases — this copy is the one to take, and the other three
items on that PR are untouched.
