---
id: the-checklist-and-the-button-disagree-about-disabling
title: The UI checklist requires submits to disable in flight and fourteen of them do not
type: risk
status: in-progress
priority: p2
created: 2026-08-14
updated: 2026-08-14
change: "a-duplicate-submit-cannot-duplicate-a-write"
capability: app-access
github: "229"
blocked_by: []
tags: [confirmation, pending-state, dt-0022, checklist, process]
---

# The UI checklist requires submits to disable in flight and fourteen of them do not

## What

Two binding records disagree, and nothing has reconciled them.

```
docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md:236
  State & Interaction, 4 — "Submit controls disable while in flight"

src/presentation/components/perform-button.tsx
  "It does not disable itself while pending." — deliberate, reasoned,
  and worn by fourteen perform submits across thirteen files
```

`openspec/specs/` is silent on it. So the disagreement is not spec-versus-code;
it is **checklist versus design ticket**, and `.claude/references/design-contract.md`
§2 already says who wins:

> When they conflict: **spec wins over design ticket** … and **checklist wins
> over design ticket** (a design cannot waive the accessibility floor). Say so
> rather than quietly picking one.

Nobody said so. DT-0022 decided the opposite way in its own rationale, the
implementing round recorded it as task 1.3 — *"It does not disable the submit
while in flight"* — and the checklist item was never mentioned in either.

## The wording is this project's, not inherited

Worth checking before treating the checklist as boilerplate, because it is not.
The generator's template says something materially weaker:

```
template  (clean-architecture/ui-checklist-template.md:186)
  2 — "Buttons prevent duplicate submits during async operations"

this project (UI_COMPONENT_REVIEW_CHECKLIST.md:236)
  4 — "Submit controls disable while in flight"
```

The template states an **outcome** (no duplicate submits) that this product
already achieves by another mechanism — confirmation tokens are single-use and
`consume` is the single atomic spender. The project's rewrite states a
**mechanism** (disable the control), which the product does not do. Someone
narrowed it deliberately, and that narrowing is what conflicts.

That is also the strongest argument for amending the checklist rather than the
code — but amending a binding standard is a decision, not a cleanup, and it is
not the executor's to make quietly.

## Why it survived

**The round that decided it ran on the track with no checklist gate.**
`openspec/changes/archive/2026-08-13-the-tickets-this-round-wrote/.openspec.yaml`
declares `track: lite`, which is proposer → executor. The verifier and the
auditor are the two roles that read `UI_COMPONENT_REVIEW_CHECKLIST.md`, and lite
runs neither. The rollout to fourteen submits (#224) then followed the component
that had already made the call.

So this is not a lapse by any one round. A change that set a UI-wide interaction
rule was right-sized as `lite` because each individual edit was small — and the
ceremony that would have caught it is exactly the ceremony that was skipped.

## Why it matters

p2, and the priority is about the standard rather than the fourteen buttons.

Nothing is broken for users right now: a second press is refused by the guard and
the user is told. The cost is that **a binding engineering standard has been
false since #153 landed and no gate noticed.** A checklist that the code
contradicts is worse than one nobody wrote, because every future round reads it
as describing the product and designs against a rule that was never true.

It also mis-shaped a filed question. `may-a-submit-disable-itself-while-it-is-in-flight`
(#228) says "nobody has decided", enumerates three arguments, and never mentions
the checklist. Its premise is false: something binding had decided, in writing,
and in the opposite direction from the shipped code.

## What would settle it

A `/propose` that picks one and amends the loser. Not an executor fix — both
options change something binding.

1. **Amend the checklist** to the template's outcome-shaped wording, or to
   Grid-Commander's actual mechanism: *duplicate submits are refused by
   single-use confirmation tokens; controls stay pressable so they stay
   reachable mid-navigation*. Then #228's design reasoning stands and the code
   is already correct.
2. **Change the behaviour** — `disabled={pending}` on `PerformButton`, one prop,
   fourteen submits inherit it. DT-0022 already defines what disabled looks like,
   so no design work is needed. This is the option with a spec surface: the
   product's guarantee stops being "the guard refuses it" and becomes "the UI
   prevents it".

The accessibility argument belongs in that decision and is not decorative — but
**the version this item was filed with was false and is corrected here.**

It originally said a `disabled` control is "unreachable to a screen reader
moving through the form". That conflates *not focusable* with *unreachable*.
`disabled` removes a control from the focus order (MDN: "disabled controls can
not receive focus"), but a screen reader in browse mode walks the accessibility
tree, not the tab order, and a disabled button is conventionally exposed there
carrying a disabled state.

The accurate argument is narrower and survives: **the pending label has no live
region.** `src/presentation/components/perform-button.tsx` carries no
`role="status"` and no `aria-live`, so the progressive label reaches assistive
tech today only because the pressed control still holds focus. Disabling removes
focus from that control and therefore removes the only channel the announcement
travels on. The product has 19 live regions elsewhere — on refusals and
consequence blocks — and none on the pending state, which is a WCAG 4.1.3 gap in
the code *as it stands*, independent of how this question is resolved.

That reframes the option set: adding a live region is worth doing whichever way
the disable question goes, and doing it first makes the disable question cheaper
rather than harder.

**Whoever takes it: do not start from the code.** Both options are a one-line
change. What is missing is which record is wrong.

## Evidence

- `docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md:236` — the rule
- `.claude/skills/checklist-generator/references/clean-architecture/ui-checklist-template.md:186` — the weaker wording it was narrowed from
- `src/presentation/components/perform-button.tsx` — the deliberate absence and its reasoning
- `openspec/design/tickets/DT-0022.json` — decided the opposite, without citing the checklist
- `openspec/changes/archive/2026-08-13-the-tickets-this-round-wrote/tasks.md:14` — recorded as task 1.3, done
- `openspec/changes/archive/2026-08-13-the-tickets-this-round-wrote/.openspec.yaml` — `track: lite`, so no verifier and no auditor
- `.claude/references/design-contract.md` §2 — the precedence rule that makes the checklist win
- `src/domain/capability/confirmation.ts` — single-use tokens, `consume` the single atomic spender

## Notes

Found while implementing `DT-0027`, whose first draft asserted that the design
system does not ask for disabling. That assertion was withdrawn before the ticket
was implemented: design does not outrank the checklist, and a ticket saying it
does would have hardened the contradiction with a test. DT-0027 now takes no
position on the trigger and its treatment reads correctly either way, so this
decision can be made later without touching it.

Supersedes the framing of [[may-a-submit-disable-itself-while-it-is-in-flight]]
(#228), which is about the same trigger but was filed believing the question was
undecided rather than contradicted.
