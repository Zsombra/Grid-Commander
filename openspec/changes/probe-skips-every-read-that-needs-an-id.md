---
id: probe-skips-every-read-that-needs-an-id
title: The probe skips every read that needs an id, which is most of them
type: feature
status: done
priority: p2
created: 2026-07-29
updated: 2026-07-31
change: an-agent-can-be-read-thinking
capability: battlegrid-connection
blocked_by: []
tags: [probe, observation]
---

# The probe skips every read that needs an id, which is most of them

## What

`probe_mcp_surface.py` calls a tool only when `readOnlyHint` is true **and** its
schema declares no required arguments. That is 21 of 110. Of the 87 skipped, most
are reads whose only requirement is an id the probe could discover for itself:
`agentId` from `list_intelligence_agents`, `strategyId` from `list_strategies`,
`decisionId` from `list_entry_decisions`.

Concretely: fourteen of the sixteen agent-internals tools have never been called
by anything, only because they take an `agentId`.

## Why it matters

**Observation is the only thing that has caught a defect on this branch.** Every
one — the unread envelope, the two dead strategy writes, `brain.kind`,
`sizingStrategy: 'FIXED'`, the 23-vs-20 config — was found by calling the real
tool, and none by a test, a gate or a review.

So the set of tools the probe *can* call is the set the product can safely be
built against. Everything outside it must be modelled from a declared schema,
which is precisely the practice that produced those defects.

Building `an-agent-can-be-read-thinking` needed five of these tools observed, and
that was done by hand in an ad-hoc script. The knowledge went into the change and
not into the artifact, so the next person starts where this one did.

## Fix

Let the probe resolve ids from tools it has already called, then call reads whose
requirements it can satisfy:

1. After the argument-free pass, harvest ids from the responses already
   collected — `agents[].id`, `strategies[].id`, and so on.
2. For each skipped **read** tool, check whether every required argument can be
   filled from that pool. Call it if so; record `not_called_because` naming the
   argument it could not supply if not.
3. Keep the safety property where it is: **only** `readOnlyHint` tools, filtered
   in code before any request is built. Widening the id supply must not widen the
   classification.

Worth recording per tool whether the id came from discovery or was unavailable,
so the artifact distinguishes "observed" from "observable but not observed".

## Related

- change `an-agent-can-be-read-thinking` — needed five of these and called them
  by hand
- `two-read-tools-do-not-answer` — found by the argument-free pass; the same
  class of finding is waiting behind every skipped read

## Closed 2026-07-31

The id-discovery pass exists and worked against the live server: round one harvested agentId and strategyId, and 22 id-gated reads were called that the first-generation probe could not reach (43 called total, up from 21). `decisionId`/`logId` went unharvested only because the account had no entry decisions that day — recorded per-tool as 'no <arg> available on this account'.
