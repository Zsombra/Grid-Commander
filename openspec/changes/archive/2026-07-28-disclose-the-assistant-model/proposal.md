# Proposal: Disclose The Assistant Model

## Why

`/assistant` tells the user two true things and omits a third.

> I can read your agents, your strategies, and the record of what
> Grid-Commander has done on your behalf. I cannot change anything.

Since `wire-the-assistant-model`, answering a question sends what it reads to
Anthropic. The page does not say so.

Every other outbound path in this product is BattleGrid, which the user
connected on purpose through an OAuth screen that named it. This one is not, and
there is nothing on the page — or anywhere a user can reach — that would let
them find out.

The product's stated value is legibility: showing what a thing will do before it
does it. A surface that reads someone's trading configuration and sends it
somewhere they were not told about is the direct inverse of that, on the one
page whose entire job is answering honestly.

**Disclosure here is not a footnote, it is the consent.** Asking is opt-in per
question. Someone told beforehand that asking sends their setup to a third party
can decline by not asking — which is a real choice, available immediately, and
needs no preference store to exist. That is why this change is disclosure and
not a consent mechanism.

## What Changes

- **`AssistantPort` gains `describe()`**, returning who answers. The port
  already exists because *which model answers is a deployment decision*; a
  deployment fact the user must be told is the same fact, read rather than used.
  `NotConfiguredAssistant` reports that nothing answers. `ClaudeAssistant`
  reports a named third party.
- **`DescribeAssistantQuery`**, so the page reaches it through the same door as
  everything else. Routes may not import infrastructure, and this must not be
  the first one that does.
- **The disclosure renders from that**, not from a hardcoded sentence. A
  deployment with no key sends nothing, and telling those users their data goes
  to Anthropic would be a new false statement in place of a missing true one.
- **It sits with the question box**, not in a footer. A disclosure below the
  fold is one a user finds after the thing it warns about.

## Capabilities

**Modified**: `assistant` — one ADDED requirement. Nothing in the existing six
covers where an answer is produced, because until this week nothing produced
one. The capability's other requirements describe what the assistant may *read*;
this is the first about what it *emits*.

## Out of Scope

- **Asking without the data leaving.** A per-user opt-out needs storage, a
  policy, and a decision about what the assistant is for when it cannot read.
  The deployment-level opt-out already exists and is honest — no key configured,
  nothing sent. Remains filed.
- **Naming the model version to the user.** `claude-opus-5` means nothing to
  someone checking on their trading agents, and pinning a version string into a
  user-facing sentence makes a model upgrade a copy change. The organisation
  that receives the data is the fact that matters.
- **Disclosing on the answer.** The citation already names every tool the
  assistant read, after the fact. The gap is what a user knows *before* asking.
- **A record of what was sent.** The audit log already records each read, marked
  as the assistant's. Nothing new is needed for someone reconstructing what left.
