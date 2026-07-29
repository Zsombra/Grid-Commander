---
id: assistant-has-no-spend-ceiling
title: One question is bounded; a thousand questions are not
type: debt
status: done
priority: p2
created: 2026-07-28
updated: 2026-07-29
change: only-mcp-control
capability: assistant
blocked_by: []
tags: [assistant, cost, multi-tenant]
---

# One question is bounded; a thousand questions are not

> **Closed as moot** — `only-mcp-control`.
>
> There is no longer a key to spend. The assistant was removed; the product
> holds one third-party credential and it is BattleGrid's.
>
> If an assistant is ever proposed again, this item is the reason it needs a
> ceiling *before* it ships, not after.

## What

`ClaudeAssistant` bounds a single answer: `MAX_ROUNDS = 6`, `MAX_TOKENS = 8192`,
and tool results truncated at 20,000 characters. So one question has a known
worst case.

Nothing bounds how many questions a user asks, or how many users ask them. The
deployment holds one `ANTHROPIC_API_KEY` and every tenant's questions are billed
to it.

## Why it matters

This is a **third-party multi-tenant client**. The person paying the Anthropic
bill is whoever deployed Grid-Commander; the people spending it are everyone
with a connected BattleGrid account. That asymmetry is the whole problem — it is
not a user protecting themselves from their own usage, it is an operator with no
instrument at all.

The idea brief names LLM inference as the dominant variable cost. Right now the
only lever an operator has is removing the key, which turns the capability off
for everyone.

## Evidence

`src/infrastructure/assistant/claude.ts` — `MAX_ROUNDS`, `MAX_TOKENS`,
`MAX_RESULT_CHARS`, all per-answer.
`src/composition.ts` — one assistant, built once, shared across every request.
Deferred from `wire-the-assistant-model`, out of scope by declaration.

## Fix

Per-user rate limiting is the obvious answer and probably the wrong first one —
it needs storage, a window, and a policy, and none of those are decidable
without knowing how the product is deployed.

Cheaper and more useful first: make the spend **visible**. Every assistant
answer already writes audit rows for its reads. Recording the token usage the
API returns alongside them would let an operator see the shape of the cost
before choosing a limit for it, and `usage` is on every response already.

Then decide the limit with data rather than a guess.
