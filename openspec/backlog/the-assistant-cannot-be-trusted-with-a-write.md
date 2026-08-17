---
id: the-assistant-cannot-be-trusted-with-a-write
title: The MCP server is read-only because MCP gives the human no seat at the confirmation
type: risk
status: done
priority: p2
created: 2026-08-03
updated: 2026-08-05
capability: mcp-control
change: the-model-can-propose-and-only-a-human-agrees
blocked_by: []
tags: [mcp, confirmation, safety]
---

# The MCP server cannot write, and the reason is structural

`grid-commander-is-an-mcp-server` (archived 2026-08-03) exposes eighteen
read tools and no writes. Not an oversight and not phasing for its own
sake.

Every write in this product runs describe → confirm → perform, with a token
digest-bound to the exact values it was formed against. That binding stops
a *changed* payload being performed. What it cannot stop is a model calling
describe and perform back to back without ever showing the operator "this
will archive Apex and stop three deployments".

The ceremony's premise is a human reading the consequence. MCP does not
provide that seat.

## The three ways it could be provided

1. **MCP elicitation.** The protocol has a client-driven prompt capability.
   If a client supports it, `perform` could elicit a confirmation from the
   human directly rather than trusting the model to have asked. Support is
   uneven, and a server that silently degrades to "no confirmation" on a
   client that lacks it would be worse than one that refuses.
2. **Out-of-band release.** `describe` mints the token as now, and the
   token is only released by the operator in the web app — the model can
   propose but not agree. Slower, and it works on every client, because it
   asks nothing of the client at all.
3. **Read-only forever, and the web app is where changes happen.** The
   current state, and a defensible destination rather than a stopgap.

## What would decide it

Whether the operator wants the model to *act* or to *draft*. (2) is right
if the answer is draft: the model prepares a change, the human agrees to it
where consequences are already rendered properly. (1) is right only if a
client's elicitation can be relied on, and that must be established by
using it, not by reading the spec.

## First step when taken

Establish (1) empirically on whichever client the operator actually uses:
does it support elicitation, and does a server see a refusal distinctly
from an unanswered prompt? Until that is observed, (2) is the safer design
and needs no client cooperation.

Do not start by adding a write tool behind the existing token. That is the
one option ruled out above.

## Resolved — option 2, on 2026-08-05

`the-model-can-propose-and-only-a-human-agrees` took **option 2**:
out-of-band release. The model proposes; only a person agrees.

`propose_agent_change` records an intent — which agent, which settings, the
values verbatim — and stops. It holds no BattleGrid port, so it cannot read a
consequence or mint a confirmation, and the response carries a reference and a
URL and no token. The confirmation is minted when the operator opens
`/pending/<id>`, from a describe run **then**, against the account as it is at
that moment. So the model never holds an unspent authorization, and an old
proposal is noise rather than danger.

**Elicitation was not established, and that is deliberate.** This item said to
establish (1) empirically before choosing it; nothing has, so it was not
chosen. Option 2 asks nothing of the client, which is exactly why it could ship
without that evidence. If a client's elicitation is ever established by use
rather than by reading the spec, (1) remains available — but it would be a
different change, and it would have to answer what a server does on a client
that silently lacks the capability.

Option 3 is no longer the destination, but its substance survives: nothing on
the MCP surface writes to BattleGrid, and `mcp-read-only.test.ts` now proves it
by reachability rather than by tool-name prefix — so a `propose_*` tool passes
because it reaches nothing, not because of what it is called.

One thing this change added that the item did not anticipate: recording a
proposal writes a row to *this product's* store, so `propose_agent_change` is
served with `readOnlyHint: false`. "Read-only against BattleGrid" and
"read-only" are different claims, and the annotation has to make the one that
is true.
