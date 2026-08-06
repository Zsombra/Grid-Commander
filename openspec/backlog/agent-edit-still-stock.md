---
id: agent-edit-still-stock
title: agent-edit.tsx keeps the stock button and label utilities, and blocks the guard
type: debt
status: done
priority: p3
created: 2026-08-06
updated: 2026-08-06
change: "the-last-stock-buttons-and-the-guard"
capability: app-access
blocked_by: []
tags: [ui, design, test]
---

# agent-edit.tsx keeps the stock button and label utilities, and blocks the guard

## What

`buttons-and-labels-from-one-source` moved every button and field label in the
product onto `BUTTON_PRIMARY`, `BUTTON_SECONDARY` and `LABEL` in
`src/presentation/components/control.ts`. `agent-edit.tsx` was out of that
change's scope and still carries the originals: four `rounded border px-4 py-2
text-sm` submits, three `px-4 py-2 text-sm underline` cancels, and four labels
spelled `block text-sm font-medium` and `block text-sm`.

It is at least internally consistent — button and cancel were both left, so no
pair inside the file is now mismatched — but `/agents/[id]/edit`,
`/agents/[id]/reactivate` and the rename form are the only places in the product
where a confirmation does not look like the other eleven.

## Why it matters

The second half is the one that compounds. `controls.test.ts` can assert
`className={CONTROL}` on every input in the tree because there is no exception to
it, which is why the control treatment cannot regress. The button and label
equivalent could not be written: it would have failed on this file, and shipping
it with an allowlist means shipping a guard whose allowlist nobody ever deletes.

So the treatments are asserted on the constants — that they are made of tokens —
and not on their use. Nothing stops the next component from spelling out
`rounded border px-4 py-2 text-sm` again, which is exactly how seven byte-identical
copies of `w-full rounded border p-2` came to exist in the first place.

## Evidence

- `src/presentation/components/agent-edit.tsx:53, 63, 119, 143, 146, 207, 231,
  238, 322, 325, 365, 368`
- `tests/architecture/controls.test.ts` — the `describe` block explaining why the
  scan is absent, and naming this item.

## Notes

The sweep is mechanical: the same substitution applied to eleven other files.
The labels at `:207` and `:238` are `block text-sm`, and `:231` is a checkbox row
(`flex items-center gap-2 text-sm`) which should be left alone — that exclusion
is the same one the earlier change made everywhere else.

Land the scan in the same change, not after: a guard written once the tree is
clean is one line, and a guard deferred is the one that never arrives. The shape
is the existing `renders no control styled by browser defaults` check, over
`<button>` and `<label>` tags, with a vacuity check beside it.
