---
id: a-spent-confirmation-shows-a-crash-page
title: A second press shows a framework crash page to someone whose action succeeded
type: risk
status: done
priority: p1
created: 2026-08-14
updated: 2026-08-14
change: ""
capability: app-access
github: "232"
blocked_by: []
tags: [confirmation, error-handling, operator-facing]
---

# A second press shows a framework crash page to someone whose action succeeded

## What

The product wrote a careful sentence for the person who presses a confirmation
twice — `src/infrastructure/battlegrid/call-path.ts`: *"this confirmation was
already used — the change may have landed; check its state before retrying."*

On most routes that sentence never reaches them.

```
src/application/use-cases/failure-outcome.ts

  export function outcomeOf(err: unknown): FailureOutcome {
    // Not an outcome at all: the guard's refusal is a broken request, and the
    // product has always answered it by throwing.
    if (err instanceof ConfirmationRequiredError) throw err;
```

The re-throw is deliberate and reasoned. What is missing is anything to catch it:

- `find app src -name 'error.tsx' -o -name 'global-error.tsx'` → **nothing**
- `grep -rn 'catch (' app --include=*.tsx` → **one**, in `conditions/save/page.tsx`

So on the perform routes whose server action routes failures through
`outcomeOf`, a spent confirmation propagates out of the action and Next renders
its built-in *"Application error: a server-side exception has occurred"* — shown
to a user whose first press **succeeded**.

`/recorder/trim` already demonstrates the right shape:
`src/application/use-cases/trim-record.command.ts` **returns** a refusal instead
of throwing, and the page explains it.

## Why it matters

p1, and it is worse than the question that found it.

The first press worked. The change landed. The user is then shown a page saying
the server broke, with no indication their action succeeded and no way to tell
whether it did. The natural next move is to go back and try a third time.

It violates the product's own UI checklist — State & Interaction item 3,
*"Errors are actionable — what happened, what to do"* — and unlike the disable
question (#229) there is no argument on the other side. Nobody intends this.

It also outranks #229 on the merits. Disabling the control would hide the
double-click path to these pages while leaving them fully reachable from the
back button, a second tab, and a replayed POST. A change that added
`disabled={pending}` and stopped would close a ticket over an unfixed crash.

## What would settle it

Either catch `ConfirmationRequiredError` in each perform action and redirect with
`?problem=` — the pattern the product's other refusal paths already use — or add
a route-level `error.tsx` rendering the product's own sentence.

Prefer the first for the confirmation case specifically: the sentence and the
redirect convention both already exist. Consider the second **as well** — a
product with no error boundary anywhere has no floor under any unexpected throw,
and that is a separate hole this finding happens to expose.

## What shipped

`src/presentation/confirmation-refusal.ts` exports `spending(run, onRefused)`,
and all nine confirmation-spending actions go through it. The tenth,
`conditions/save`, already had its own catch and is left alone.

**A wrapper rather than nine try/catches, for a reason specific to Next:**
`redirect()` works *by throwing*. A `try` drawn around a block that also
redirects catches `NEXT_REDIRECT` and turns a successful navigation into a
swallowed error. The safe form is narrow — the command call inside, the redirect
outside — and passing the redirect as a separate argument makes that shape
unwidenable, where nine hand-written copies would be nine chances to add a line
inside the `try`.

It catches **only** `ConfirmationRequiredError`. A lost connection, an outage
and a bug are not refusals, have no next step to name, and must not be dressed
as `?problem=`.

`tests/architecture/a-refusal-reaches-the-person.test.ts` enforces it, including
that no spender wraps a redirect in its own try. Mutation-verified.

## Two existing guards broke, and neither was lowered

The wrapper moved `app.X.execute(` off the line beginning `await app.`, so
`write-results.test.ts` stopped seeing nine call sites and reported a *cleaner*
tree than before — including one genuinely dropped result whose ledger row then
failed as "no longer found". Deleting that row was the available wrong answer:
the result is still dropped, only the measure had stopped reaching it. The
scanner now reads the binding off the wrapper, where it moved.

`refusals-reach-the-operator.test.ts` pinned five call shapes by regex. The
property — the action reads its result — is unchanged; only the spelling moved,
so the matcher follows it, bounded rather than `[\s\S]*` so it cannot match a
`const result` bound to something else further down. Both re-verified by
mutation.

## Still open

An `error.tsx` was **not** added. Every confirmation refusal now has a
product-authored route, which is the defect this item names; a boundary is a
floor under *unexpected* throws, which is a wider question than this. Worth
doing — the product still has no boundary anywhere — and worth its own item
rather than being folded in here.

## Evidence

- `src/application/use-cases/failure-outcome.ts` — the deliberate re-throw
- `src/infrastructure/battlegrid/call-path.ts` — the sentence that rarely lands
- `src/application/use-cases/trim-record.command.ts` — the pattern that works
- No `error.tsx` / `global-error.tsx` anywhere in the repo
- Exactly one `catch (` in all of `app/**/*.tsx`

## Notes

Found while investigating #229.

**Partly unverified, and the boundary matters.** Directly verified: the
re-throw, the absent error boundary, and the single catch. *Not* verified: what a
production build actually renders on that throw — it was traced through Next's
defaults rather than observed in a browser. Confirm before sizing the fix. The
absence of any handler is the finding, and that part is not in doubt.
