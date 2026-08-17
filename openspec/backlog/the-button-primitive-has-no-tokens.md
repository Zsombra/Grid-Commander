---
id: the-button-primitive-has-no-tokens
title: The button primitive names four variants and tokenises none of them
type: debt
status: done
priority: p3
created: 2026-08-06
updated: 2026-08-12
change: ""
capability: app-access
github: "108"
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

## 2026-08-12 — gaps 1 and 3 are closed; the item narrows to gap 2

The prescription above was executed exactly.

- **Gap 1 (the token) is closed.** `system.json` now carries
  `size.control.min: 44px`; `generate-theme.mjs` emits
  `--gc-size-control-min` and a `minHeight.control` Tailwind extension, so
  the buttons wear `min-h-control` and `min-h-11` appears nowhere under
  `src/` or `app/`. `tests/architecture/controls.test.ts` asserts the whole
  chain — system value, theme mapping, CSS variable — so the utility cannot
  silently become a class Tailwind drops. Ticket: **DT-0003**, implemented.
- **The first confirmation page is surveyed and designed.**
  `/agents/[id]/archive` → `openspec/design/surfaces/agent-archive-confirm.json`,
  restyled under **DT-0004**: consequence block in the `consequence` role, a
  bounced attempt in `danger` with a semibold "Refused:" prefix, the
  cannot-archive refusal in `notice`, secondary button's first hover
  treatment (landed in `control.ts`, so every page inherits it), mobile
  full-width stacking. The survey also found the missing pending-feedback
  state — filed separately as
  `a-submitted-confirmation-gives-no-sign-it-is-working` (#153), since it is
  behavior, not styling.
- **Gap 3 (stale strategy-editor manifest) had already been resolved** by an
  earlier re-survey; `validate --all` reports no `design_surface_stale`.

**What keeps this open, narrowed to gap 2:** `/connect`, `/explorer`,
`/pending`, the pipeline simulator and the remaining confirmation pages still
have no manifest and no ticket — their treatments are DT-0002/DT-0004
precedent worn without a decision recorded per surface. `ghost` and `danger`
stay deliberately undefined until a surface renders them (DT-0003's rationale
records this as the design agent's decision now, not a comment's).

## 2026-08-12, later — `/connect` joined the designed column

Second surface pass, same session: `openspec/design/surfaces/connect.json`
(7 components — the consent, the declined/failure banners with their roles
and constraints, the personal-deployment branch), then **DT-0005** (the
not-view-only warning wears consequence, the Not requested block wears
quiet; not one word changed) and **DT-0006** (the shared not-connected
component's connect link wears `BUTTON_SECONDARY` — the way in as a target,
by DT-0001's strategy-not-found precedent, inherited by every authenticated
page). Both implemented. Remaining in gap 2: `/pending`, `/explorer`, the
pipeline simulator, the other confirmations, and tickets for the three
surfaces still `functional` (agent-roster, audit-log, strategy-catalog).

## 2026-08-12, third pass — `/pending` joined whole

Both routes surveyed (`pending-queue`, `pending-proposal` — 13 components
between them, the fresh problem/note banners recorded with their roles as
constraints) and **DT-0007** implemented: the proposal page's consequence
sentence wears consequence, the departs warning wears notice, the
nothing-would-change conclusion wears quiet. The queue needed no ticket —
its banners landed pre-roled by `a-bounced-agree-says-why` and its lists
were already tokened; recorded as `designed` on that basis. Remaining in
gap 2: `/explorer`, the pipeline simulator, the other confirmations, and
first tickets for agent-roster / audit-log / strategy-catalog.

## 2026-08-12, fourth pass — `/explorer` (the field page)

Manifest `explorer-field` (7 components); **DT-0008** implemented — cards
take `border.default` at `radius.2` (the precedent treatment #155's sweep
executes), the partial-field honesty sentence takes notice. The redirect
sweep this pass opened with came back clean: every remaining
query-carrying redirect lands on a page that reads it, so `/connect` and
`/pending` were the only two instances of the dropped-message bug.
Remaining in gap 2: the explorer subpages, the pipeline simulator, the
other confirmations, and first tickets for agent-roster / audit-log /
strategy-catalog.

## 2026-08-12, fifth pass — the explorer subpages join whole

Manifests `explorer-competitor` and `explorer-evaluation` (12 components);
**DT-0009** implemented — the signals-disagreed sentence wears notice on
the evaluation page. The pass also caught the border sweep's directional
residual: 4 bare `border-l` rails, fixed as `the-rails-join-too` (lite,
archived). The competitor page needed no ticket — every treatment arrived
decided via the sweep. Remaining in gap 2: the pipeline simulator, the
remaining confirmations, and first tickets for agent-roster / audit-log /
strategy-catalog.

## 2026-08-12, sixth pass — the pipeline simulator joins whole

Manifests `pipeline-stages` and `pipeline-evaluation` (15 components,
recording the stage-independence discipline, verdicts-never-colour, the
at-the-decision copy law, and the simulator's refuse-rather-than-truncate
constraint); **DT-0010** implemented — DT-0009's disagreement ruling
landed identically on the own-evaluation page. The stages page needed no
ticket. **Gap 2 is down to its last slice**: the remaining confirmation
pages (edit/deploy/rebind/reactivate/undeploy and the strategy-side
ceremonies) and first tickets for agent-roster / audit-log /
strategy-catalog.

## Closed 2026-08-12, end of session — the substance is done, the tail has its own record

The title's claim is no longer true: the primitive's missing token exists
(`size.control.min`, DT-0003), its variants' treatments are decided and
worn product-wide (DT-0002..DT-0010, the border sweeps,
`the-refusals-dress-alike`), and `ghost`/`danger` stay deliberately
undefined by the design agent's recorded decision. The remaining
record-keeping — eleven ceremony manifests, first tickets for the three
early list surfaces — is `the-design-lane-has-a-tail` (#157).
