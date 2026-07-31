---
id: confirmation-is-not-bound-to-values
title: A confirmation binds to the operation and target, not to what was agreed
type: risk
status: done
priority: p2
created: 2026-07-29
updated: 2026-07-31
change: the-binding-guard-that-was-claimed-exists
capability: battlegrid-connection
blocked_by: []
tags: [confirmation, guard, security]
---

# A confirmation binds to the operation and target, not to what was agreed

## What

```ts
consume(token: string, userId: string, tool: string, target: string)
```

Four things are matched: who, which tool, which agent, and the token itself.
**The values are not among them.** A token issued against

> Sets the most it may lose in a day to $25 …

is accepted by a submission carrying $25,000, because both are
`update_intelligence_agent` against the same agent.

The consequence *is* stored with the token, so the audit log records the sentence
that was agreed to — which means a mismatch is **detectable afterwards** and
prevented not at all.

## Where it applies

Product-wide, not new. Every confirmed operation carries its values back in
hidden form fields beside the token:

```
agents/[id]/edit      displayName, tc.*        money  ← the sharpest case
agents/[id]/rebind    toStrategyId             replaces a whole configuration
agents/[id]/archive   expectedRevision
strategies/[id]/…     same shape
```

`money-limits-are-editable` did not introduce this and deliberately did not
half-fix it: a UI change is the wrong place to alter the confirmation contract.

## Why it is P2 and not P1

The realistic attack needs someone editing hidden fields in their own browser,
against their own account, on a personal deployment. That is a person
circumventing a speed bump they installed for themselves.

It matters anyway, for one reason: **the confirmation's whole claim is that a
person read a specific sentence and agreed to it.** If the sentence and the
operation can differ, the claim is weaker than the audit log states — and the
audit log is what this product offers instead of trust.

## Fix, when it is taken

Two candidates, and the second is better:

1. Re-derive the consequence from the submitted values in the command and
   compare it to the stored one. Cheap, and leaves the values as the input.
2. **Store the accepted changes with the confirmation and apply those**, so the
   confirmation *is* the intent rather than a permit to submit one. The
   resubmitted values become redundant, which is the strongest form: nothing to
   tamper with.

Either way `ConfirmationToken`, the guard, and three flows move together.

## Related

- `money-limits-are-editable` — the change that made this worth writing down,
  because it put money amounts behind the confirmation

## Closed 2026-07-31 — resolved by `a-confirmation-binds-to-what-was-agreed`, re-triaged and verified

Filed 2026-07-29; the binding change landed 2026-07-30 and nobody came back to
close this. Re-triage evidence, flow by flow:

| Flow | Issue target | Spend target | Values bound? |
|---|---|---|---|
| agent edit | `agentEdit(id, accepted)` (describe-edit:94) | recomputed from the **submitted** values (update-agent:137) | ✓ intent digest — the $25/$25,000 case is `edit-binding.test.ts`'s own scenario, refused |
| rebind | `agentRebind(id, toStrategyId)` | recomputed from the request | ✓ the pair |
| apply plan | `strategyPlan(id, intentDigest)` | recomputed from the request | ✓ the compiler's digest |
| agent archive/reactivate | `agent(id)` | `agent(id)` | identity-only **by documented design** — the operation carries no agreed values beyond the agent; revision is concurrency, platform-checked |
| strategy archive/restore | `strategy(id)` | `strategy(id)` | identity-only; the revision comes from a re-read, not the form |

Fix candidate 1 (values bound into what the token matches) is what landed,
via digested targets rather than consequence re-derivation. The one residual
shard — rebind not bound to the revision it read — was already its own item
(`rebind-is-not-bound-to-the-revision-it-read`, P3).

The re-triage found one real gap and closed it: `confirmation.ts` cited a
guard file that did not exist for the claim that no caller composes a target
inline. That scan now exists in `edit-binding.test.ts` and passes with
exactly one composer: the builder itself.
