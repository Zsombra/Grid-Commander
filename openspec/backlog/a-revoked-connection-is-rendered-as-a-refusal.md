---
id: a-revoked-connection-is-rendered-as-a-refusal
title: A mid-write revocation renders as "Refused:" with a live retry, instead of routing to the remedy
type: debt
status: open
priority: p3
created: 2026-08-12
updated: 2026-08-12
change: ""
capability: battlegrid-connection
github: "175"
blocked_by: []
tags: [refusal, auth, spec-tension]
---

# A revoked connection is rendered as a refusal

## What

Four command-level catches flatten every thrown error into
`{ kind: 'refused', reason: err.message }`:

- `src/application/use-cases/deploy-agent.command.ts:158` and `:269`
- `src/application/use-cases/retune-rule.command.ts:198`
- `src/application/use-cases/rebind-agent.command.ts:214` (re-throws
  `ConfirmationRequiredError` only)

`ConnectionRevokedError` is one of the errors that arrives there. The adapter
raises it on a 401/403 mid-call (`mcp-adapter.ts:399`) and takes explicit care
to preserve it — `mcp-adapter.ts:285`: *"A revoked connection is already a
domain error and must not be reshaped into something that looks retryable."*
The catches then reshape it into exactly that.

## Why it matters

p3, and **narrower than it first looks** — the check that matters was done
before filing. The error's message is `"Your BattleGrid connection is no longer
valid. <remedy>"`, so the diagnosis *and* the remedy both survive into the
banner. The requirement `A Remedy Named Must Exist In That Deployment`
(openspec/specs/battlegrid-connection/spec.md:325-334) is satisfied in
content.

What is wrong is the framing and the routing:

1. It is labelled **"Refused:"** — an operation-level rejection, when the
   authority itself is gone.
2. The confirm form stays live beneath it, inviting a retry that cannot
   succeed — against the system principle *"Nothing is styled to look
   disabled when retrying cannot help. A refusal explains; it does not
   present a dimmed control to click at."*

## Evidence

- `src/infrastructure/battlegrid/mcp-adapter.ts:283-290` — the deliberate
  preservation, with its comment.
- `src/infrastructure/battlegrid/mcp-adapter.ts:392-399` — the throw site,
  whose comment cites R10's second scenario.
- `src/domain/errors.ts:109-113` — the message shape carrying the remedy.
- The four catch sites above.

## The trap — read before "fixing" this

**Do not fix this by re-throwing.** There is no error boundary in the
product: no `app/error.tsx`, no `app/global-error.tsx`, and nothing in
`app/` or `src/presentation/` catches `ConnectionRevokedError`. A re-throw
escapes the server action into Next.js's default error page — the exact
crash class closed by `the-outcome-reaches-the-person` (#164). That would be
strictly worse than today: the banner at least carries the diagnosis and the
remedy; the error page carries neither.

This was the original recommendation for this item, and it was wrong. Checked
2026-08-12 before any code was written.

## First step

A `/propose` deciding where a mid-write revocation should land. `/connect` is
the likely destination and is already remedy-aware in both deployments — it
tells a configured-credential deployment that no authorization can be started
from it (spec.md:336-340) — so one redirect serves both. That is a behavior
change (where the user ends up, and the loss of their place in the ceremony),
so it needs a delta spec rather than a quiet edit.

The alternative worth weighing in the same proposal: keep it on the page but
render it as an authority failure rather than a refusal, and withdraw the
form. Cheaper, keeps the user's place, and needs no routing decision.
