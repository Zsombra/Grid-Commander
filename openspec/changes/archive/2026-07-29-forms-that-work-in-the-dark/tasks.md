# Tasks: Forms That Work In The Dark

## The treatment

- [x] `src/presentation/components/control.ts` — one constant, token-based
- [x] A constant rather than a component: the three element types take different
      props, and the thing worth sharing is the treatment
- [x] Sets a background, which is the whole defect — without one the browser
      supplies white whatever the page is doing
- [x] Uses the `focus` token, which had existed since DT-0001 and was referenced
      by nothing
- [x] `focus-visible` rather than `focus`, so a mouse click does not draw a ring
      that only a keyboard user needs

## Applied everywhere

- [x] All 7 controls across 4 files converted — `assistant/page.tsx`,
      `strategies/[id]/edit/page.tsx`, `agent-edit.tsx`, `agent-form.tsx`
- [x] No stragglers: the old string survives only in the doc comment explaining
      what it was

## Guards

- [x] `tests/architecture/controls.test.ts` — no control styled per-file, the
      treatment is made of tokens, and the ring is keyboard-only
- [x] Re-inject each defect and watch the guard fail — 5 injected, 5 caught
- [x] Rendered and looked at, both schemes, all three element types

## Gates

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test` — 492 passing, up from 486
- [x] `npm run build`
- [x] `./scripts/check.sh`
- [x] `./scripts/check-serving.sh`

## The guard was wrong once, and the code was right

A first version asserted `CONTROL` contained no bare `border`, reasoning that a
width with no colour was the defect. It failed against correct code: in Tailwind
the bare `border` *is* the width and `border-border-default` is the colour, and
both are required. The meaningful assertion — that the colour classes are
present — was already on the line above. Corrected, and the reasoning recorded in
the test so it is not re-derived wrongly.

## Verified by rendering

`docs/merge/proof/control-light.png`, `docs/merge/proof/control-dark.png`.
Computed styles in dark mode: background `rgb(24, 28, 34)` where it was
`rgb(255, 255, 255)`, border `rgb(57, 64, 74)`, text `rgb(242, 244, 247)`. The
focus ring renders on the text input in both schemes.

## Filed rather than swept in

`buttons-and-labels-untokenised` (P3). Buttons and labels use stock utilities
too, and unlike the inputs they are legible in both schemes — untokenised, not
broken. Keeping them out meant "the inputs are fixed" stayed a checkable claim.
