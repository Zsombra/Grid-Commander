---
id: may-a-submit-disable-itself-while-it-is-in-flight
title: Nobody has decided whether a perform submit may disable itself while working
type: question
status: open
priority: p3
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: app-access
github: "228"
blocked_by: []
tags: [confirmation, pending-state, dt-0022, behaviour]
---

# Nobody has decided whether a perform submit may disable itself while working

## What

`PerformButton` says it is working — progressive label, `aria-busy`, an
indicator — and **does not disable itself**. So pressing a confirmation twice
still submits twice.

That is not an oversight. DT-0022 defined what `disabled` looks like and
explicitly refused to authorise entering it, because styling a state is
presentation and entering one removes an affordance. The question was left for
`/propose` and has not been asked since.

## Why it is a real question rather than an obvious yes

**What a second press does today is decided behaviour, not an accident.**
Confirmation tokens are single-use — `consume` is the single atomic spender
(`src/domain/capability/confirmation.ts`) — so the second submit is refused by
the guard and the user is told. Disabling the control would replace a refusal
they can read with a click that does nothing.

Three things pull in different directions:

- **For disabling.** The refusal a double-click earns is confusing: nothing the
  user did was wrong, and the message is about a token they never saw. A control
  that cannot succeed should not invite a press — which is a principle this
  design system already states, one context along.
- **Against.** The spec has scenarios about resubmitted confirmations
  (`agent-authoring` spec.md:183, `strategy-authoring` spec.md:134). They are
  about a confirmation reused for a *different target*, so disabling does not
  make them unreachable — but the product's guarantee is currently "the guard
  refuses it", and a UI that prevents the attempt changes what that guarantee is
  for.
- **Neither, and this is the one worth weighing.** A `disabled` control is also
  an unreachable one for a screen reader moving through the form, and the page
  is mid-navigation. `aria-busy` on an enabled control may be the better answer
  and needs no decision at all.

## Why it stays open rather than being guessed

It is a behaviour change with a spec surface, so it belongs in a `/propose`
rather than in a styling ticket or an implementation. That is the whole reason
DT-0022 stopped where it did, and closing this by quietly adding
`disabled={pending}` would undo the distinction the ticket was careful to draw.

## First step when taken

`/propose` a change to `app-access` stating what a second press does and why. The
options are: leave it (the guard answers), disable while pending (the control
answers), or neither-and-explain (the surface says the first press is working and
the second is harmless). Pick one, and say which of the three arguments above
decided it.

Whoever takes it: **do not start from the code.** The code is already correct for
whichever answer wins — a one-line prop either way. What is missing is the
decision.

**The premise above is false, and that is the finding.** This item says nobody
has decided. Something had: `docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md`
§State & Interaction 4 states *"Submit controls disable while in flight"* — a
binding engineering standard, in this project's own words rather than the
generator's template wording, and `design-contract.md` §2 ranks it above any
design ticket. DT-0022 decided the opposite without citing it, and the round
that shipped that decision ran `track: lite`, which runs neither the verifier
nor the auditor — the two roles that read the checklist.

So this is not an open question. It is a contradiction between two binding
records, and it is wider than one control: fourteen perform submits inherit it.
Filed as [[the-checklist-and-the-button-disagree-about-disabling]] (#229), which
supersedes this item's framing and carries the decision.

**What this item is still good for**: the three arguments above are the real
substance of the trade and should be read by whoever resolves #229 — they are
the strongest statement of the case anywhere in the repo. The accessibility
argument in particular ('a `disabled` control is also an unreachable one for a
screen reader moving through the form') is the one thing neither binding record
mentions. Close this as superseded once #229 lands, not before.

`DT-0027` takes no position on the trigger: its treatment renders correctly
whether or not the control disables, and it deliberately writes no test that
locks in either answer. An earlier draft of that ticket claimed to settle the
design half; that claim was withdrawn before implementation, because design does
not outrank the checklist.

## Evidence

- `src/presentation/components/perform-button.tsx` — the deliberate absence, and
  the reasoning, in its own doc comment
- `openspec/design/tickets/DT-0022.json` — defined the look, refused the trigger
- `tests/rendering/design-tickets-0022-0025.test.ts` — asserts no `disabled`
  prop appears, and says a change breaking it needs a spec change rather than a
  fix
- `src/domain/capability/confirmation.ts` — single-use tokens, `consume` as the
  single atomic spender

## Notes

Filed at session handoff because it was living only in a ticket's rationale, a
closed item's body and a test comment. None of those is somewhere an open
question gets found — which is also why the `github: none` it was filed under
did not survive contact with the next session. Mirrored to **#228**.
