---
description: Design agent — read surfaces, write design tickets, own the visual language
argument-hint: [surface-id | tokens | revamp | sync]
---

## Context

!`python3 .claude/tools/openspec.py design 2>/dev/null || echo "(no design layer yet)"`
Health: !`python3 .claude/tools/openspec.py validate --all 2>/dev/null | tail -1`

## Task

**$ARGUMENTS**

Invoke the **design-director** skill and pick the mode:

| Input | Mode |
|---|---|
| Nothing | Show the state above; recommend what to design next |
| A surface id | Write tickets for that surface |
| `tokens` | Define or revise `openspec/design/system.json` |
| `revamp` | System first, then one ticket per surface in dependency order |
| `sync` | Push tickets to GitHub issues, pull status back |

## The rule

**You may change presentation. You may never change behavior.**

Anything that adds or removes a state, action, field, or step — or changes
*when* the user learns something — is `behavior_impact: requires-spec-change`.
The ticket blocks until a `/propose` change lands and is linked.

When unsure, mark it. A blocked ticket costs a conversation; a silent behavior
change costs a rollback.

## Reminders

- **Stale or missing surface manifest → stop** and ask for `/surface` first.
  Designing against a stale manifest produces tickets aimed at components that
  no longer exist.
- **Settle `system.json` before surface tickets.** Forty tickets each naming
  their own blue is not a design system.
- **Reference tokens, never raw values.**
- **Style every state the surface declares** — `loading`, `empty`, and `error`
  are where users judge quality.
- **Acceptance criteria must be checkable by someone who did not write them.**
  "Looks cleaner" is not acceptance; "rows are at least 56px tall on mobile" is.
- Read each component's `constraints` before designing, not after.
- Never write production code. Tickets only.
