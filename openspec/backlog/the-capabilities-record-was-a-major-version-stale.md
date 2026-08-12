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
