# The draft comes back whole

## Why

`editQuery` in `app/(app)/strategies/[id]/conditions/save/page.tsx` rebuilds the
query a describe was formed from, so a refused save returns to a describe over
the *same* edit rather than to a blank page. It kept only the first value of a
repeated param and dropped the rest without a word (#317).

`one()` at the top of the same file makes the same collapse deliberately and for
a different reason — it wants one scalar. `editQuery` round-trips the whole
draft, so for it the collapse is a loss.

Latent, because the composer emits single-valued params for every field it owns.
What it costs is the property the function exists for: the
`strategy-conditions-save` manifest names the query as something *"an operator
can keep, share, or edit by hand"*, and a hand-edited draft that comes back from
a refusal missing part of itself makes the page describe an edit nobody
submitted.

## What Changes

- `editQuery` appends **every** string value of a repeated param instead of
  setting the first.
- The doc comment records the asymmetry as a rule: **collapse where a scalar is
  wanted (`one()`), preserve where a draft is carried (`editQuery`)**.
- `problem` is still excluded, repeated or not.

## Capabilities

**New**: none
**Modified**: none — no behaviour changes. `draftFromQuery` reads every field
through `one()`, so the first value still decides; the extra values survive the
round trip without steering it.

## Out of Scope

- **Making the parser read repeated values.** The grammar decision the item
  deferred was put to the operator, who chose to keep values without changing
  what they mean. Teaching `draftFromQuery` to merge them is a different change
  and a much larger one.
- **Refusing a repeated param.** Considered and not chosen: it adds a failure
  mode to the page whose job is recovering from a failure, and no product path
  can currently produce one.

## Impact

- `app/(app)/strategies/[id]/conditions/save/page.tsx` — `editQuery`, four lines.
- `tests/rendering/condition-write.test.ts` — two tests, plus the `saveRendered`
  helper widened to the signature the page already accepts
  (`string | string[] | undefined`).
- No `src/`, domain, adapter or spec change.
