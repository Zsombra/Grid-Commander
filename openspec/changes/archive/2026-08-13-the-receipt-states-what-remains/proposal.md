# The trim receipt states what the record now holds

## Problem

`/recorder/trim`'s receipt renders the `?trimmed=` query string verbatim
(`app/(app)/recorder/trim/page.tsx:31`) as *"Record trimmed — Removed 4 runs:
120 captures, 2 failed attempts, 480 readings."*

**The numbers are real.** `performTrim` builds that sentence from
`result.outcome`, a `TrimOutcome` the store returns after the delete. Nothing is
invented. The defect is the **transport**: real data put into an editable URL
becomes a claim nobody can check.

Two consequences, both reachable without any tooling:

- **Edit the URL** and the page attests to a removal that never happened. It
  renders whatever the parameter says, in the notice role, past tense.
- **Re-open the bookmark** a week later and it re-attests a removal long past,
  as though it had just occurred.

This is a receipt for a **permanent** act. `confirmation.ts:160` is explicit
that the loss "is permanent in a way BattleGrid's archives are not" — nothing
trimmed can be re-recorded. Every other redirect-carried message in the product
(`?problem=`, `?note=`, `?declined=`) reports a *refusal or a note*, where
verbatim-from-URL is the decided pattern and forgery is harmless. A receipt of a
destructive act is the one case where that pattern asserts something about the
past that the page cannot substantiate.

The page already promises the fix in its own closing line: *"Back to the record
— its coverage now begins where the trim left it."*

## Intent

**Make the receipt state a checkable present fact, re-derived on every render,
instead of an unverifiable past claim carried in the URL.**

After a trim, the page states what the record **now holds** — where its coverage
begins and how much survives — read from the record at render time. Re-opening
the URL re-derives it, so the sentence is true whenever it is read. Editing the
URL cannot fabricate a removal, because no removal is claimed from it.

**Nothing is lost by not restating what went.** The operator has already been
told: the describe states the runs, captures, failed attempts, coins and date
span that would go, and the confirmation is bound to that extent — they agreed
to a specific removal before it ran. The receipt's job is to confirm the record
is now what they asked for, and that is exactly what a derived reading says.

## Capabilities touched

- **signal-recording** — MODIFIED (the trim requirement's "outcome" clause is
  disambiguated: it is what the trim returns to its caller, not what the page
  renders) + ADDED (the receipt's own behavior, currently unspecified)

## Scope

### In scope

- The receipt state of `/recorder/trim` reads the record's current coverage and
  states what survives
- `performTrim` stops encoding an outcome sentence into the redirect
- The receipt's unreadable branch: if the record cannot be read while rendering
  the receipt, the page says the trim completed **and** that the coverage could
  not be read — never guessing either half
- Delta specs for both the disambiguation and the new receipt behavior

### Out of scope

- **An audit trail for the trim.** Deriving the receipt from an audit entry was
  the first option considered and was rejected as much larger than this change:
  there is no `AuditPort`, no audit store, and no audit capability spec anywhere
  in `src/`. `trim-record.command.ts` calls only `store.trimPreview` and
  `store.trim`. That gap is real — CLAUDE.md states "every write this product
  makes on a user's behalf must be auditable", and this destructive write has no
  audit at all — but it is its own decision at its own priority, not a rider on
  a p3 receipt fix.
- **Restating what was removed on the receipt.** Doing that honestly requires
  the audit trail above. The describe already states it before the act.
- **The other redirect-carried messages** (`?problem=`, `?note=`,
  `?declined=`). They report refusals and notes, not receipts of completed
  destructive acts; verbatim-from-URL stays the decided pattern for them.

## Why standard, not lite

It modifies a capability requirement and adds another. The act it reports on is
irreversible, so what the surface asserts about it is a product contract rather
than copy. Not `full`: no migration, no auth or money, single package, and
trivially reversible.
