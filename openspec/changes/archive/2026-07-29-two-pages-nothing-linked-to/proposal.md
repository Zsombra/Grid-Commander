# Two pages nothing linked to

## Why

`/agents/[id]/thinking` and `/agents/[id]/limits` were built, tested, proven
against the live platform, and archived. **Neither was reachable.** Of twenty
routes, the only two an orphan check finds are the two added the same afternoon.

This is the defect this branch opened with, mirrored. `close-the-reachability-gap`
fixed five links pointing at routes that did not exist. These are routes nothing
points at.

**The guard could not have caught it.** `reachability.test.ts` compares offered
against servable in one direction — no link may 404 — and nothing compared the
other way. That is DL-106's shape one level up: the blind spot it closed was a
control inside a form reaching no payload, and this is a page inside the app
reaching no link. Both are capability the operator cannot get to.

## What Changes

- The agent page offers both, alongside the journal. Ungated on purpose: the
  four existing actions are gated on what BattleGrid permits for that agent, and
  reading an agent's reasoning is worth offering whatever its state — arguably
  most for an archived one, since "why did it do that before I retired it" is
  the question archiving prompts.
- `reachability.test.ts` gains the mirror check: no servable route may be
  unoffered.

## Capabilities

- `app-access` — one requirement modified.

## Out of Scope

- **Where these belong in the eventual navigation.** They sit with the other
  per-agent actions, which is where a reader looking at an agent will find them.
  Whether the agent page should group reading apart from acting is a design
  question for `/design`, not a reachability fix.
