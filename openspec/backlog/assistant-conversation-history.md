---
id: assistant-conversation-history
title: Each assistant question is independent
type: feature
status: wontfix
priority: p3
created: 2026-07-28
updated: 2026-07-30
change: ""
capability: assistant
blocked_by: []
tags: [ui, assistant]
---

# Each assistant question is independent

## What

`AssistantPort` accepts a `history` of prior turns; the route sends an empty one.
Every question starts fresh.

Recorded as PG-403 and as F-2 in `assistant-readonly`'s UI review.

## Why it matters

"Which of my agents use Berlin?" followed by "and what would change if I edited
it?" is the natural shape of the questions this assistant exists for, and the
second is unanswerable without the first.

## Fix

A conversation needs somewhere to live. The options are a table, the session, or
the URL, and they differ in whether a conversation survives a reload, a new tab,
and a disconnect. Worth deciding deliberately rather than defaulting — a
conversation containing readings of someone's account is not obviously something
to persist without saying so.

## Closed 2026-07-30 — the capability was removed

`only-mcp-control` removed the assistant entirely, on the operator's instruction
that Grid-Commander is MCP control and nothing else: eight requirements, sixteen
files, seventy-seven tests, the route, the nav entry, `@anthropic-ai/sdk`, and
`ANTHROPIC_API_KEY` from `config.ts`, `.env.example` and `check-serving.sh`.
`openspec/specs/assistant/` no longer exists, which is why `validate` reports
this item's capability as having no spec.

Closed as won't-do rather than deleted. If an assistant ever returns, this is one
of the two questions it arrives with already answered once — and a question
answered and thrown away has to be discovered again.
