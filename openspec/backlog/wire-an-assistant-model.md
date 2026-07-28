---
id: wire-an-assistant-model
title: The assistant has no model behind it
type: chore
status: open
priority: p2
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: assistant
blocked_by: []
tags: [deployment, assistant]
---

# The assistant has no model behind it

## What

`assistant-readonly` delivered the capability complete: the read-only toolset,
the citation, the incompleteness handling, the revocation abandon, the audit
actor, and the surface. What is wired behind `AssistantPort` is
`NotConfiguredAssistant`, which truthfully says no model is configured and points
at the pages holding the same information.

Recorded as AL-7 and PG-402.

## Why it matters

The capability is real and unreachable in the sense that matters to a user: they
can ask, and they get an honest non-answer.

It matters less than it sounds, because every guarantee this capability makes is
independent of the model — read-only is a filtered toolset, the citation is built
from what the use case observed, and the revocation abandon happens above the
port. A model can be swapped in without any of those moving.

## Fix

Implement `AssistantPort` against a chosen model. The port receives a question, a
read-only toolset, a history and a `callTool`; the implementation runs the tool
loop and returns text plus whatever it consulted (which the use case ignores in
favour of what it observed).

Two things worth getting right in the prompt, neither of which is a guarantee:
tell it to say when it does not know, and tell it the tools it has are the only
ones. Both are already enforced structurally — the prompt is for quality, not
safety.
