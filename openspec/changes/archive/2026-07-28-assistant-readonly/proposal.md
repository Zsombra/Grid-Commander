# Proposal: A read-only assistant

## Why

Four changes have built a workbench over 110 BattleGrid tools. A user can connect,
author agents, author strategies through compile → review → apply, and read back
every write made on their behalf. What they cannot do is **ask a question**.

That gap is larger than it sounds. The surface is 110 tools, 10 metric categories,
61 metrics, 12 system personas and a strategy pipeline with five discovery steps
before you can compile anything. A user who wants to know *"which of my agents is
bound to Berlin, and what changes if I edit it?"* currently has to know that the
answer lives in `list_intelligence_agents` and `list_strategies`, and read both.

This is the last MVP change, and it is deliberately last for one reason: **it only
reads**. An assistant that could act would need the human-readable review surface
to exist first, and that surface is the previous four changes.

## What Changes

- A user asks a question in natural language about their own BattleGrid setup.
- The assistant answers from live reads of that user's account, through the same
  guarded call path as everything else.
- **The assistant can only read.** It holds no mutating tool, and the refusal is
  structural rather than a matter of prompting.
- Every read it performs on the user's behalf is attributable — the user can see
  what was consulted to produce an answer.
- The assistant says what it does not know rather than inferring it. A tool that
  failed, a field the platform did not return, and a question outside the
  connected account are three different answers, and none of them is a guess.
- Asking is refused when the connection cannot act, in the same terms as
  everywhere else.

## Capabilities

**New**: `assistant` — how a user asks questions about their BattleGrid setup and
what the answers are allowed to be built from.

## Out of Scope

- **A write-capable assistant.** Deferred by decision in the idea brief, and the
  reason holds: an LLM holding tools that rebind agents needs the review surface
  to be the thing a human sees, not a thing the model summarises. V2.
- **Anything that spends.** Unchanged and unchanging.
- **Answering about BattleGrid in general** — market data, other people's agents,
  the public leaderboard. The assistant answers about *this user's setup*, which
  is what makes "only reads" a boundary rather than a slogan.
- **Choosing or hosting a model.** The assistant is defined here as a port; which
  model answers is a deployment decision, and the requirements must not depend on
  one.
- **Streaming.** Worth having; not a behaviour the spec needs.

## Impact

The first capability whose output is generated rather than derived, which changes
what "correct" means. Everything before it either returned what BattleGrid said or
refused; this one composes prose, and prose can be confidently wrong in a way a
tool result cannot.

Two properties therefore matter more here than anywhere else:

1. **Read-only must be structural.** A model instructed not to write is a model
   that will not write until something in its context suggests otherwise. The
   guarantee has to live in what the assistant is *given*, not in what it is told
   — and the classification layer from change 1 already knows which tools mutate.
2. **The reads must be attributable.** An answer nobody can check is worse than no
   answer, because it will be trusted. What the assistant consulted is part of the
   answer.

There is a third thing worth naming as a risk rather than a requirement: the tool
list is not authoritative after a BattleGrid deployment, and an assistant is the
surface most likely to reach a tool that changed under it. The existing
capability discovery handles this — but it means the assistant's tool set is
per-session, and its refusals must degrade the same way the rest of the product
does.
