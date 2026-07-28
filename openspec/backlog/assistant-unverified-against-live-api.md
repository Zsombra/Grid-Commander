---
id: assistant-unverified-against-live-api
title: The assistant request has never been sent to the real API
type: debt
status: open
priority: p1
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: assistant
blocked_by: []
tags: [assistant, verification, deployment]
---

# The assistant request has never been sent to the real API

## What

`ClaudeAssistant` is tested against a fake `MessageService`: 21 tests, and each
guard demonstrated failing against a re-injected defect. Its request body is
type-checked against the SDK's own `MessageCreateParamsNonStreaming`.

Neither of those is the same as the API accepting it. No `ANTHROPIC_API_KEY` was
available in the environment where this was built, so the first real request
this code makes will be made by a deployment.

## Why it matters

This is exactly the gap `prove-it-runs` and `check-serving.sh` exist to close,
one layer out. A type check is not a build; a fake is not a server. Both times
that lesson was learned here, the thing that broke was the boundary nobody had
crossed.

The specific things a fake cannot tell us:

- Whether `thinking: { type: 'adaptive' }` is accepted alongside `tools` on
  `claude-opus-5`.
- Whether BattleGrid's `inputSchema` values are valid as Anthropic tool schemas.
  They are passed through untouched, by design, and MCP and the Messages API do
  not have to agree on what a valid schema is.
- Whether ~80 read-only tools fit in one request without a limit being hit.

A failure in any of these lands as `AssistantUnavailableError` — a refusal, not
an outage — so the blast radius is one capability answering nothing. That is why
this is P1 and not P0.

## Evidence

`tests/assistant/claude.test.ts` — the whole suite runs against a fake.
`src/infrastructure/assistant/claude.ts` — `describeTool` passes BattleGrid's
schema through unmodified.
Recorded as "Not done" in `wire-the-assistant-model`'s tasks.

## Fix

One real request, against a real key, with a real BattleGrid toolset. Not a
test — a manual check, recorded in the journal with what came back.

If the schema pass-through turns out to be rejected, the fix is a narrowing step
in `describeTool` that keeps only the parts of a schema the Messages API accepts
— and it must stay a *narrowing*, never a substitution, or the model is back to
guessing argument names.
