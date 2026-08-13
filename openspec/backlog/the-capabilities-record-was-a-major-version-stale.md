---
id: the-capabilities-record-was-a-major-version-stale
title: v18 grew 188 output-schema leaves across 11 tools, and the capabilities record never saw them
type: risk
status: open
priority: p2
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: platform-mapping
blocked_by: []
github: "198"
tags: [battlegrid, v18, declared-vs-observed, unrecorded]
---

# v18 grew 188 output-schema leaves that nothing recorded

## What

`docs/battlegrid-mcp-capabilities.json` said **v17.2.0** until 2026-08-13, while
`docs/battlegrid-mcp-surface.json` had said **v18.2.0** since 2026-08-12. The
surface record was re-probed; the capabilities dump was not, because the only
thing that writes it needs a raw capture step that did not exist (#186).

Refreshed, the two versions differ by **188 schema leaves added across 11 tools,
and none removed**:

```
get_public_agent_signal_log_detail  +46    list_session_agent_positions  +29
get_signal_log                      +46    list_user_active_positions    +29
get_radar_activity                  +24    get_trade_chart               + 4
get_public_agent_trade_chart        + 4    list_gate_blocks              + 2
list_radar_deployments              + 2    get_radar_deployment          + 1
preview_radar_resolution            + 1
```

**The session record says v18 moved nothing but one description.** That claim was
about *input* schemas and is still exactly true — no input schema changed, the
tool count held at 114, the read/write split was identical. What it could not
see is that outputs grew, because the artifact holding them was a major version
behind.

## Three of the 188 are not bookkeeping

**`gateStage` gained `EVALUATION` as a declared enum value.** #185 asserted the
product was wrong to say "stopped before it was evaluated" on the strength of a
*description* change. The schema declares it. The reasoning was right and the
evidence was stronger than anyone knew.

**`reasonCode` gained `EVALUATION_FAULTED`**, on gate blocks and on radar's
`blockedReason`. [[radar-says-why-it-is-blocked]] (#135) says the `blockedReason`
vocabulary "is unestablished" and must be observed before modelling. **One value
of it is now established** — declared, not observed, which is the weaker of the
two but not nothing.

**`breakEvenGeometry` is new on open positions** — 29 leaves, on both
`list_user_active_positions` and `list_session_agent_positions`: `armed`,
`armPrice`, `offsetBps`, `distanceToArm`. The venue's break-even state, per
position, which nothing here reads.

## Why it matters (p2)

The capabilities dump is the evidence base. #106 cites it for the brain-preset
enum; #135 cites it for the radar fields. Citing a file that is a major version
behind is how a correct-looking argument gets built on a stale premise, and this
project already has a doctrine about exactly that.

Nothing renders wrong — the product reads none of the new fields, and outputs
growing is additive. The risk is to *reasoning*, not to behaviour.

## What would settle it

`tools/capture_mcp_dump.py` exists now (#186), so refreshing is two commands and
the loop is closed. The standing rule should be that **the capabilities dump is
re-captured whenever the surface record is** — they describe the same server and
drifting apart is what produced this.

Worth a separate read: the +46 on both signal-log tools, and the +29
`breakEvenGeometry`, are the two large ones and neither has been looked at.

## The two large additions, read — 2026-08-13

### v18 publishes what a stop actually did

The `+46` on both signal-log tools is one thing: a **`protection` block**, at
`log.pipeline.liveOverlay.protection`, carrying two geometries and their states.

```
breakEvenStatus   DISABLED | ACTIVE | INACTIVE_SETUP | UNDETERMINED
breakEvenGeometry armPrice, stopPrice, offsetBps, distanceToArmPct, armed
trailingStatus    (same enum)
trailingGeometry  trailDistance, trailLevel, observedExtreme, givebackPct, engaged
```

The same `breakEvenGeometry` is the `+29` on `list_user_active_positions` and
`list_session_agent_positions`.

**This is the thing every agent on the account is configured with and nobody
could see.** Undertow carries `breakEvenEnabled: true, breakEvenTriggerR: 0.86,
trailingEnabled: true, trailingGivebackPct: 45`; Breakwater the same at 1.08.
Until v18 those were settings that went in and never reported back. The platform
now says, per position: whether break-even armed, at what price, how far the
price is from arming, where the trail sits, and **the extreme it has observed**.

`observedExtreme` is the one worth naming. It is the high-water mark the trail
is measured from — a number this product could not compute without candle
history, and [[a-stop-inside-the-noise-looks-like-a-tight-stop]] is explicit
that a floor computed from too little history is worse than none.

### Declared, not observed — and blocked the same way as its neighbours

`liveOverlay` is **null** on a settled log. Read live 2026-08-13 on Undertow's
most recent SKIPPED evaluation: `pipeline.liveOverlay` is null, and the account
holds no open position. So the block can only be seen while a position is open —
the identical blocker as [[trading-telemetry-is-unread]]'s order rows (#116) and
[[performance-and-allocation-are-unmodelled]]'s committedUsd (#107).

**Do not model it from the declaration.** Three of the dead paths in HANDOFF.md
began as a schema read as an observation, and this one is nested three levels
deep behind an `anyOf` that is null today.

### The radar pair

`get_radar_activity` gained `evaluationOutcome` and `screenReason` — two more
refusal-telemetry fields, alongside the `EVALUATION_FAULTED` value that arrived
on `blockedReason`. All of it unread, and all of it [[radar-says-why-it-is-blocked]]'s
territory (#135) rather than this item's.

## What this changes

`#85`'s third blocker is *"the reference number needs history we do not have"*.
It may not need it: the platform now reports `observedExtreme` per position,
which is the platform's own measurement rather than one computed here. That does
not unblock #85 — the trade-level policy is still inert, and the overlay is
still unobserved — but it changes what the eventual panel would read from.

**First step, when a position is next open**: read one `get_signal_log` and one
`list_user_active_positions` while it is, and record what `protection` actually
carries. One observation settles four fields that are currently four guesses.
