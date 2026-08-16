---
id: v19-narrowed-the-authorable-timeframes
title: v19 retired 1m and 1d from every authorable category — what happens to a strategy already on one
type: question
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-16
change: ""
capability: strategy-authoring
github: "300"
blocked_by: []
tags: [battlegrid, v19, vocabulary, timeframes]
---

# v19 narrowed the authorable timeframes

## What

At v18.2.0 every vocabulary category authorised six timeframes:
`1m, 5m, 15m, 1h, 4h, 1d`. At v19.1.0 all ten categories authorise **four**:
`5m, 15m, 1h, 4h`. `1m` and `1d` were retired platform-wide, in the same
deployment, with no tool added or removed.

Two things are unanswered:

1. **What the platform does with a strategy already authored at `1m` or
   `1d`.** Does it still evaluate? Does an edit of an unrelated field get
   refused because the timeframe is no longer authorable? Nobody has looked.
2. **What this product shows for one.** The authoring surfaces read the
   authorable list at runtime, so the *picker* is correct by construction —
   but a strategy whose saved timeframe is no longer in that list renders a
   value the picker cannot offer, and no branch names that state.

## Why it matters

p3 rather than higher because nothing is provably broken: no product code
hard-codes a timeframe (`grep -rn "'1m'\|'1d'" src/ app/` is empty, verified
2026-08-15), and the picker follows the platform. It is a question, not a
defect, until someone checks whether the account holds such a strategy.

The tripwire class is familiar though: this is exactly the "values move under
an unchanged tool count" shape that #92 was filed for, and it moved under a
version bump this time — which the live vocabulary gate caught, working as
designed.

## Evidence

- `docs/battlegrid-vocabulary.json`, re-probed 2026-08-15 at v19.1.0 —
  `timeframes: ["5m","15m","1h","4h"]` on all ten categories; the v18.2.0
  generation in git history carries six.
- The live re-probe log: `preview_strategy_report` refused with
  `VALIDATION_ERROR: Timeframe '1m' is not authorable` when
  `probe_mcp_surface.py` synthesised `1m` from the declared enum.
- The declared enums did **not** narrow: eighteen input paths still declare
  the full thirteen (`1m … 1w`) — see the sweep in this session's notes. That
  is not itself a defect (a candle *interval* of `1d` is legitimate; a
  strategy *section* at `1d` is not — different concepts sharing one enum),
  but it means the schema cannot tell you what is authorable and the
  vocabulary is the only source that can.

## Notes

Settling it needs one read: `list_strategies` on the keyed account, then check
whether any `summary.timeframe` is outside the authorable four. If none is,
this closes as "no instance exists" and the render question becomes
hypothetical. If one is, the second half becomes a real defect and gets its
own item.

Related: [[the-surface-record-is-a-deployment-behind]] (the re-probe that
surfaced this), and the vocabulary carve-out reasoning in
`tools/probe_vocabulary.py`.

## Settled 2026-08-16 — no instance exists

The one read this item named was run live at v19.1.0 over the authenticated MCP
connector. `list_strategies` returns 17 strategies — 12 SYSTEM and 5 PRIVATE
(quota 5/25):

```
SYSTEM   Dunkirk  Leningrad  London  Tobruk  Midway  El Alamein  Bastogne
         Kursk  Normandy  Stalingrad  Berlin  Iwo Jima
PRIVATE  Salamis  Lepanto  Cannae  Trafalgar  Alesia
```

**Every one reads `timeframe: "1h"`.** Not one sits on the retired `1m` or `1d`.

So question 1 — what the platform does with a strategy already authored on a
retired timeframe — has no instance on this account to ask it of, and question 2
— what this product renders for such a strategy — is hypothetical. That is
exactly the item's own stated closing condition: *"If none is, this closes as
'no instance exists' and the render question becomes hypothetical."*

**Recommended `done`.** Left `open` here pending triage rather than closed
unilaterally.

One fact worth carrying forward rather than losing with the item: the retirement
is scoped to the **authorable vocabulary**, not to the platform.
`get_market_context` still accepts a `primaryTimeframe` of `5m, 15m, 1h, 4h, 1d`
— `1d` remains a legal market-read timeframe while it is no longer an authorable
one. Those are two different lists, and the product must not conflate them.

## 2026-08-16 — the precondition is answered: no such strategy exists, and none can now be made

This item says it *"is a question, not a defect, until someone checks whether the
account holds such a strategy."* Checked, at v19.2.0.

**`list_strategies` read whole: 17 strategies — 12 SYSTEM, 5 PRIVATE. Every one
reads `timeframe: "1h"`.** Not one is at `1m` or `1d`. The materialized configs
agree from the other side: all three agents report
`strategyTimeframe: "1h"`, `regimeTimeframe: "4h"` on
`list_intelligence_agents`, and `get_strategy(Cannae)` reads
`regimeTimeframe: "4h"`.

**And none can be created now.** `1m` and `1d` are no longer authorable in any
of the ten vocabulary categories, so a strategy on either could only exist by
having been authored *before* v19. None was.

That moves both open questions from *unobserved* to *unobservable here*:

1. **"What the platform does with a strategy already authored at `1m` or `1d`"**
   cannot be answered on this account by any read, because there is no such
   strategy and the platform will refuse to author one. Answering it needs an
   account that predates v19 and holds one — which is not this account, and is
   not something a write can manufacture.
2. **"What this product shows for one"** is reachable without the platform: a
   saved timeframe outside the authorable list is a rendering state, and a
   fixture can hold that value even though the platform will not. If anyone
   wants that branch covered, it is a **test**, not a probe. Nothing needs to be
   observed live first.

**Re-priced in substance if not in number.** This stays p3, but the reason
changes: not "nobody has looked" — someone has, and there is nothing to find on
this account. What remains is a defensive rendering branch nobody has asked for.

## Corroboration: the retirement is authorable-scoped, and `1m` went further than `1d`

The item argues that the declared enums not narrowing is not itself a defect,
because *"a candle interval of `1d` is legitimate; a strategy section at `1d` is
not — different concepts sharing one enum"*. A live read at v19.2.0 supports
that, and refines it.

`get_market_context`'s `primaryTimeframe` — a **read** parameter, not an
authoring one — declares:

```
["5m", "15m", "1h", "4h", "1d"]
```

Five values: the four authorable ones **plus `1d`**, and **without `1m`**.

So the two retired values did not go the same way. `1d` survives as a research
interval while being retired from authoring — exactly the two-concepts reading.
**`1m` is absent from both**, which the item's framing did not predict and which
is the sharper fact: it suggests `1m` was withdrawn as a supported granularity
rather than merely as an authoring choice.

That also means neither the schema enums (thirteen values) nor this read enum
(five) can tell you what is authorable. **The vocabulary remains the only source
that can** — which is what this item already says, now with a third distinct
enum width on the same platform version to prove it.

Observed while re-checking #114; recorded here because that is where it belongs.
