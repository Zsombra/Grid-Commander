---
id: a-repeated-draft-param-is-truncated-on-round-trip
title: editQuery keeps only the first value of a repeated query param, silently truncating a draft
type: debt
status: done
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

## Fixed 2026-08-16 — every value is kept

The grammar question this item deferred twice was put to the operator, who chose
**keep all values**. `editQuery` now appends every string value of a repeated
param instead of `set`-ing the first and dropping the rest.

```ts
for (const each of Array.isArray(value) ? value : [value]) {
  if (typeof each === 'string') out.append(key, each);
}
```

**It changes no behaviour, and that is what makes it safe.** `draftFromQuery`
reads every field through `one()`, so the first value still decides — the extra
values survive the round trip without steering it. The asymmetry is deliberate
and is now written at the call site: **collapse where a scalar is wanted
(`one()`), preserve where a draft is carried (`editQuery`)**.

That also answers the honest objection to this option: values that survive but
never steer could be read as a lie. They are not, because the thing being
preserved is *the operator's URL*, which the `strategy-conditions-save` manifest
names as something they may "keep, share, or edit by hand". A draft that comes
back from a refusal missing part of itself is the page describing an edit nobody
submitted — which is the actual complaint here.

### Tests

Two, in `tests/rendering/condition-write.test.ts`:

- **`keeps every value, not just the first`** — renders the describe with
  `m0.value: ['0','7']` and asserts every carrier of the round-tripped query
  (the composer link and the confirm form's hidden `draft` field) holds both.
- **`still drops the problem it may have arrived with`** — a repeated `problem`
  is still excluded, so the fix did not widen the one thing `editQuery`
  deliberately drops.

**Confirmed non-vacuous.** Reverted to `out.set(key, first)` and the first test
fails with *"the second value was dropped — #317"*; restored and it passes.
A test that passes against the broken code as well as the fixed one is the
failure #194 already cost this repository, so it was checked rather than assumed.

### Gates

`tsc` clean, `lint` clean, **2713/2713 vitest across 212 files** (up 2 — the two
new tests; the suite was 2711/2711 green earlier today).
