# Renaming an agent is offered and cannot work

## Why

Renaming an agent is broken three ways over, and the third one hides the other
two.

**1. It cannot reach the platform.** `update_intelligence_agent` carries
`destructiveHint: true`, so the guard requires a confirmation bound to the
agent. `AgentsPort.updateAgent` has no `confirmationToken` parameter.
`rebindAgent` and `setLifecycle` both have one; update is the omission. Observed
live:

```
ConfirmationRequiredError: "update_intelligence_agent" is destructive
and needs confirmation: no confirmation was supplied
```

**2. It cannot report failure.** `app/(app)/agents/[id]/page.tsx:84`:

```ts
await app.updateAgent.execute({ … });   // result discarded
redirect(`/agents/${agentId}`);
```

Every outcome is thrown away — `not-editable`, `invalid`, `rejected`, and the
confirmation error above. The operator presses Rename, the page reloads, the
name is unchanged, and nothing on screen says why. The sibling page
(`edit/page.tsx:79`) reads its result and renders reasons; this one does not.

**3. It is offered where it cannot work.** `AgentRenameForm` renders
unconditionally at `page.tsx:71`. An archived agent shows an editable name box.
`UpdateAgentCommand` already refuses archived agents and already says to
reactivate (`update-agent.command.ts:45`) — the rule exists, the screen does not
honour it, and because of (2) the refusal is invisible anyway.

**The pattern, again.** The domain is right and the surface is silent. This is
the fourth time in two days: the roster's three-state design was correct while
the envelope discarded the data; `undefaultableFields` derived the money
questions while the page sent `tradingConfig: null`; the read/write shape
mismatch was filed as a warning while the failing code already shipped.

## What Changes

- `AgentsPort.updateAgent` takes a `confirmationToken`, forwarded by the adapter
  as `{ target, confirmationToken }` — the shape `setLifecycle` already uses.
- A propose step for renaming, modelled on `ProposeRebindCommand`: it names the
  consequence and issues a token bound to the agent. **Not self-issued.** A
  confirmation the product grants itself records that the product intended to
  proceed, which was never in doubt.
- The rename action reads its result and renders the reason, like its sibling.
- An agent that cannot currently be changed is not offered a control that would
  change it. For an archived agent the page says it is retired and that
  reactivating it makes changes possible again — which is true, and which the
  reversibility requirement already promises.

## Capabilities

- `agent-authoring` — one requirement added, one modified.

## Out of Scope

- **`agent-edit-form`.** Neither call site sends `tradingConfig` today; both only
  change `displayName`. The trading-config editor stays backlogged, and with it
  the question of whether changing a loss cap deserves heavier confirmation copy
  than a rename.
- **Deleting archived agents.** The MCP surface has no delete tool. Archived is
  as removed as anything gets, and the operator can see them; this change makes
  their state legible rather than trying to hide them.
- **Whether a rename is truly destructive.** BattleGrid says the tool is, and
  this product treats server annotations as authoritative. Revisiting that is a
  platform conversation, not a local override.
