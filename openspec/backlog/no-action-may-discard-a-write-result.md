---
id: no-action-may-discard-a-write-result
title: Nothing checks that a server action reads the result of its write
type: debt
status: done
priority: p2
created: 2026-07-29
updated: 2026-07-31
change: a-dropped-write-result-fails-the-gate
capability: app-access
blocked_by: []
tags: [guard, server-actions]
---

# Nothing checks that a server action reads the result of its write

## What

`app/(app)/agents/[id]/page.tsx` awaited `updateAgent.execute(...)`, discarded
the result, and redirected. Every refusal — archived agent, rejected field, and
the missing confirmation that made all of them moot — arrived as a page that
reloaded unchanged.

It is fixed there, and `rename.test.ts` now asserts that specific action reads
its result. **Nothing checks the others.**

## Why it matters

The requirement added by this change — *The Outcome Of A Write Reaches The
Person Who Asked For It* — is stated generally and guarded specifically. That is
the shape of a rule that decays: the next action written can drop its result and
no test will notice.

The failure is invisible by construction. A discarded refusal looks exactly like
a page that reloaded, so it survives review and manual testing alike. This one
lived through four production gates.

## Fix

A scan over `app/**/*.tsx` for `'use server'` functions that call
`app.<something>.execute(...)` whose result is neither assigned nor branched on.
The shape to catch:

```ts
await app.thing.execute({ … });   // result dropped
redirect(...);
```

Distinguish honestly: some commands genuinely return nothing worth acting on,
and the scan should require those to be listed with a reason rather than silently
passing — the same discipline `mcp-conformance.test.ts` uses for tools it cannot
check at the call site.

## Related

- change `renaming-an-agent-is-offered-and-cannot-work` — fixed the instance,
  filed the class
- `A Field Offered Reaches The Operation It Configures` — the sibling rule, about
  inputs rather than outcomes

## Still open 2026-07-30 — what is left

`renaming-an-agent-is-offered-and-cannot-work` archived, which is why the linked
change reads as done. **The general guard was never written.** `rename.test.ts`
asserts that one action reads its result; every other server action is unchecked,
and two have been added since this was filed (`applyEdit` on
`/agents/[id]/edit`, `apply` on `/strategies/[id]/edit`).

The requirement — *The Outcome Of A Write Reaches The Person Who Asked For It* —
is stated generally and guarded specifically, which is the shape of gap this
project has now been bitten by four times. A derived check over every
`'use server'` export is the fix, not another per-action assertion.

## Closed 2026-07-31

The derived check exists: `tests/architecture/write-results.test.ts` scans
`app/**/*.tsx` for statement-position `await app.<name>.execute(` and holds
every hit against a two-way `KNOWN_DROPPED` ledger with per-site verdicts. It
found five current drops — two benign (single-arm results, refusals throw),
three real (`three-actions-silence-their-refusals`, P2). New instances fail
the suite; fixed instances fail it until their ledger row is deleted.
