---
id: the-button-primitive-has-no-tokens
title: The button primitive names four variants and tokenises none of them
type: debt
status: open
priority: p3
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: app-access
blocked_by: []
tags: [ui, design, tokens]
---

# The button primitive names four variants and tokenises none of them

## What

`openspec/design/system.json` declares a `button` primitive with variants
`primary · secondary · ghost · danger` and states nowhere which colour role,
padding, radius or height each one takes. The variant list is a promise the token
set does not keep.

Two gaps, filed together because they are the same absence:

1. **No token for the tap target.** The principles say *"Tap targets are at least
   44x44px on touch viewports"*. The `space` scale runs `6: 32px`, `7: 48px`.
   Nothing is 44. DT-0002 spent Tailwind's `min-h-11`; `buttons-and-labels-from-one-source`
   spent it again in `BUTTON_PRIMARY` and `BUTTON_SECONDARY`, because the
   alternative — a raw `44px` in a className — is what the design contract
   forbids and would be worse. Two files now depend on a number the system states
   in prose and cannot express.

2. **No design ticket covers the surfaces the treatments were applied to.** Four
   surfaces have manifests: `agent-roster`, `audit-log`, `strategy-catalog`,
   `strategy-editor`. The confirmation pages, `/connect`, `/explorer`, `/pending`
   and the pipeline simulator have none. The treatments applied to them are
   DT-0002's, extracted verbatim and extended by precedent, which is the most
   defensible thing available and is still not a ticket.

3. **`strategy-editor`'s manifest is stale.** It lists
   `app/(app)/strategies/[id]/edit/page.tsx` and `plan-review.tsx`, both edited by
   `buttons-and-labels-from-one-source`, so `validate --all` now reports
   `design_surface_stale` against it — alongside `agent-roster` and
   `strategy-catalog`, which were already stale before that change. Nothing the
   manifest *asserts* changed: same components, same states, same constraints,
   only `current_implementation` prose. Refreshing `generated_at_commit` by hand
   without re-surveying would make the manifest claim a currency it does not
   have, so it was left for a real `/surface` pass.

`ghost` and `danger` remain unspent. Nothing in the product is styled as danger
today — deliberately, per DT-0002's reasoning that hazard-styling a legitimate
action teaches people to flinch at it — but that is a decision made twice in
comments rather than once in the system.

## Why it matters

`system.json` is meant to be the single source of truth for every value in the
UI, and `tools/generate-theme.mjs` exists to make that true rather than
aspirational. A primitive whose variants live in a `.ts` constant and a
screenshot is a second source, which is the failure DT-0001 was written to
prevent.

It is p3 because the product renders correctly in both colour schemes today and
nothing is illegible. It is not p4 because the next person who needs a
destructive button has no answer and will invent one.

## Evidence

- `openspec/design/system.json` — `primitives[0]`, four variants, no `button`
  entry under `tokens`; `tokens.space` has no 44px.
- `src/presentation/components/control.ts` — `BUTTON_PRIMARY`, `BUTTON_SECONDARY`,
  and the comment explaining why `min-h-11` is there.
- `openspec/design/tickets/DT-0002.json` — where primary and secondary were
  decided, for one surface.
- `tests/architecture/controls.test.ts` — `meets the tap-target floor the design
  system states as a principle` asserts `min-h-11` so the number cannot vanish
  quietly while it has no token.

## Notes

The right shape is probably a `/surface` pass over one confirmation page —
`/agents/[id]/archive` is the smallest — then `/design` for a `type: tokens`
ticket that adds the missing values and a `restyle` ticket that spends them.
`buttons-and-labels-from-one-source` deliberately did not invent any of it: the
whole change is an extraction of decisions already made, and inventing a danger
treatment would have been the developer agent designing, which the lane rule in
`.claude/references/design-contract.md` §2 forbids.
