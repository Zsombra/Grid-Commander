---
id: the-assistant-cannot-be-trusted-with-a-write
title: The MCP server is read-only because MCP gives the human no seat at the confirmation
type: risk
status: open
priority: p2
created: 2026-08-03
updated: 2026-08-03
capability: mcp-control
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
