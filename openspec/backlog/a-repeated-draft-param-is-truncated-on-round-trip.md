---
id: a-repeated-draft-param-is-truncated-on-round-trip
title: editQuery keeps only the first value of a repeated query param, silently truncating a draft
type: debt
status: open
priority: p3
created: 2026-08-16
updated: 2026-08-16
change: ""
capability: strategy-authoring
github: "317"
blocked_by: []
tags: [ui, drift, latent]
---

# A repeated draft param loses everything after its first value

## What

`app/(app)/strategies/[id]/conditions/save/page.tsx`, `editQuery()`:

```ts
const first = Array.isArray(value) ? value[0] : value;
if (typeof first === 'string') out.set(key, first);
```

`editQuery` rebuilds the query a describe was formed from, so a refused save
returns to a describe over the *same* edit rather than to a blank page. A
param arriving more than once is collapsed to its first value, and the rest
are dropped without a word.

`one()` at the top of the same file makes the same choice, deliberately and
for a different reason — it wants one scalar. `editQuery` is round-tripping
the whole draft, so for it the collapse is a loss.

## Why it matters

p3, and latent. The composer emits single-valued params for every field it
owns, so nothing on the product's own paths can trigger it today. What it
costs is the property the function exists for: an operator who hand-edits the
query — which the surface manifest names as a supported thing to do
("the draft travels as a query string an operator can keep, share, or edit by
hand") — can have part of that draft silently discarded on the way back from
a refusal, and the page will describe an edit that is not the one they
submitted.

## Evidence

Recorded in the 2026-08-12 ceremony survey as an aside on the
`strategy-conditions-save` manifest, and carried in the Notes of
[[conditions-save-render-keys-collide]] (#167) through both of that item's
findings without ever being one of them. #167 closed on 2026-08-16 when its
second finding landed; this is filed on its own so it is not lost with it.

## Notes

Fixing it means deciding what a repeated param *means* for a draft — join,
keep-all as repeated entries, or refuse the round-trip and say so. That is a
question about the draft grammar, not a one-line change, which is why it was
scoped out twice rather than done in passing.

Related: [[a-drafted-condition-cannot-be-saved]].
