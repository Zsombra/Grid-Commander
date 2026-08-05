# UI/UX Review

Against `docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md`. Two surfaces, and the
second is where this change is most likely to go wrong.

## `/pending` — what has been proposed for you

- [ ] Every unresolved proposal is listed with its target and what it would
      change
- [ ] "None exist" and "could not be read" are visibly different
- [ ] Stale proposals appear as history, marked, and offer no way to agree
- [ ] Another account's proposals never appear
- [ ] Reachable from the app's navigation — a queue nobody can find is a change
      waiting to happen that nobody knows about

## `/pending/[id]` — the seat this whole change exists to preserve

The page shows **two things that can differ**: what the model proposed, and
what the fresh describe says will happen. The temptation is to show one.

- [ ] The fresh consequence is rendered from a describe run at open time
- [ ] What was proposed is shown beside it
- [ ] Where they differ, the difference is stated in words — not diffed into
      invisibility, not silently reconciled
- [ ] The confirmation control is the same one a web-initiated change uses, with
      the same wording about blast radius
- [ ] A target that is gone or ineligible: no confirmation control at all, and a
      sentence saying why
- [ ] Declining is available and permanent, and says so before it is used

## Copy

- [ ] Consequences are the product's existing consequence sentences, unchanged —
      this page must not grow a second vocabulary for the same write
- [ ] The page never says a model "requested" or "asked for" agreement in a way
      that implies the model is waiting on the operator. It proposed; nothing is
      pending on the model's behalf
- [ ] Nothing implies a proposal will act if ignored

## Accessibility and tokens

- [ ] Status is conveyed in text, not by colour alone — an operator must be able
      to tell stale from actionable without seeing hue
- [ ] Design tokens only; no raw colour or spacing values
- [ ] Focus order reaches the confirmation control last, after the consequence
      has been passed

**Verdict:** _(executor, then auditor)_
