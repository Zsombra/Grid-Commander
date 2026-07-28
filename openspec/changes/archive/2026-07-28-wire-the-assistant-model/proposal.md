# Proposal: Wire The Assistant Model

## Why

`assistant` is the only capability in this product that is fully specified,
fully tested, audited, archived — and answers nothing. Behind `AssistantPort`
sits `NotConfiguredAssistant`, which truthfully reports that no model has been
chosen and points at the pages holding the same information. Recorded as AL-7,
PG-402, and the backlog item `wire-an-assistant-model`.

A model has now been chosen: Claude, over the Anthropic API. The fit is not
incidental — the domain is already MCP-shaped, and the port's `callTool` maps
onto Claude's tool-use loop with nothing in between.

Two things make this a smaller change than it sounds:

- **Every guarantee the capability makes is independent of the model.**
  Read-only is a *filtered toolset*, not an instruction. The citation is built
  from what the use case observed, not from what the model reported. The
  revocation abandon happens above the port. None of that moves.
- **The port already exists and is already exercised** by a scripted fake in
  `tests/assistant/ask.test.ts`. This adds a second implementation, not a seam.

Two things make it larger:

- **The discovered toolset carries no argument schema.** `rawDiscoverTools`
  keeps `name`, `description` and `annotations` and drops `inputSchema`. A model
  handed a tool with no schema guesses argument names, and every guess that
  misses becomes a failed read the user is told about. The schema has to be
  threaded through.
- **A model can be unreachable, and the current code has nowhere to put that.**
  `AssistantPort.answer` returns text or throws, and the use case rethrows
  anything that is not a revocation — so an Anthropic outage would be a 500 on
  `/assistant`. Refusing is what the spec already asks for; there is no path
  that does it.

## What Changes

- **`ClaudeAssistant`** — `AssistantPort` against `@anthropic-ai/sdk`, running a
  bounded tool-use loop over the read-only toolset the use case hands it. Model
  `claude-opus-5`, adaptive thinking, a hard iteration cap.
- **`inputSchema` threaded** from MCP `tools/list` through `DiscoveredTool` and
  `ReadOnlyTool` to the model. Optional at every step: a tool that reports no
  schema is still offered, with an open object schema, because excluding it
  would silently narrow the toolset on a BattleGrid deployment that changed
  shape.
- **`AssistantUnavailableError`** — raised by an implementation that cannot
  produce an answer at all, converted by the use case into a `refused` answer.
  This is the same shape the use case already uses for a discovery failure.
- **`ANTHROPIC_API_KEY`, optional.** Absent means `NotConfiguredAssistant`
  stays wired, which is what keeps `scripts/check-serving.sh` working — the
  serving gate boots from `.env.example` alone and cannot be given a real key.
  Documented commented-out, exactly like `ALLOW_INSECURE_COOKIES`.

## Capabilities

**New**: none

**Modified**: `assistant` — one ADDED requirement covering the state the
capability has actually shipped in since it was written, and the new way it can
fail. Neither is currently specified: `NotConfiguredAssistant` is behavior with
no requirement behind it, which is the thing an audit is supposed to catch.

## Out of Scope

- **Streaming the answer.** `/assistant` is a server-rendered form submission;
  there is no client to stream into. Revisit when the surface becomes
  interactive.
- **Conversation history.** The port accepts `history` and the page never sends
  any, because the page has nowhere to keep it. The adapter handles it
  correctly; nothing produces it yet.
- **Telling the user which model answers, and that their account data reaches
  it.** A real disclosure question, filed as `assistant-does-not-name-its-model`
  rather than answered here — it needs a surface decision, not an adapter.
- **Per-user cost control.** The loop is bounded per question. Nothing bounds
  questions per user. Filed as `assistant-has-no-spend-ceiling`.
- **Choosing the model per deployment.** One model id, pinned in code. A
  deployment that wants a different one is a change, deliberately.
