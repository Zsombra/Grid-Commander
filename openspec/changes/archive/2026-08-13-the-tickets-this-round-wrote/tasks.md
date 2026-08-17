# Tasks

Implementing DT-0022, DT-0023, DT-0024, DT-0025. Every one is
`behavior_impact: none`; nothing here may change what the product does.

## 1. DT-0022 — the button's declared states get a treatment

- [x] 1.1 `BUTTON_PRIMARY` gains a `disabled:` treatment spending
      `bg-bg-sunken`, `text-text-disabled`, `border-border-subtle` and
      `cursor-not-allowed`. No opacity, no raw value.
- [x] 1.2 A client component renders the loading state: progressive label,
      `aria-busy`, and an `aria-hidden` indicator. It keeps the accent ground —
      a working control is not an unavailable one.
- [x] 1.3 **It does not disable the submit while in flight.** DT-0022 defines
      the look and refuses the trigger; entering `disabled` removes an
      affordance and is #153's question for `/propose`.
- [x] 1.4 The indicator is suppressed under `prefers-reduced-motion`; the label
      change carries the state alone there.
- [x] 1.5 Wired on DT-0022's declared surface. The rollout to the other eleven
      perform forms is #153's, because each needs its own progressive label.

## 2. DT-0023 — a terminal failure stops looking like a refusal

- [x] 2.1 `AuthorityLost`'s panel gains a leading `danger.default` edge at
      `space.1`. `CarriedProblem` is untouched.
- [x] 2.2 Both remedy branches styled, and identical apart from whether the
      anchor renders — no reserved gap where it is absent.
- [x] 2.3 `role=alert` survives on the carried sentence; the edge is decorative.

## 3. DT-0024 / DT-0025 — one confirmation row shape

- [x] 3.1 `agent-reactivate-confirm`'s row stacks full-width under `tablet`.
- [x] 3.2 `recorder-trim`'s perform row does the same.
- [x] 3.3 `recorder-trim`'s boundary row stacks its date field full-width above
      the controls; `items-end` is retained only above the breakpoint.
- [x] 3.4 No copy changes anywhere, including the destructive submit.

## 4. Verification

- [x] 4.1 A rendering test drives `form-status.ts` and asserts the progressive
      label and `aria-busy` at pending, and neither at rest.
- [x] 4.2 `AuthorityLost` renders the edge; `CarriedProblem` does not.
- [x] 4.3 Both remedy branches still differ only by the anchor.
- [x] 4.4 **Mutation check** on the pending label and on the edge.
- [x] 4.5 Quality gates: `typecheck`, `lint`, `test`, `build`.

## 5. Owed after this commits

- [x] 5.1 Re-survey — these edits stale the manifests they were written
      against. That is the round's last task, not the next round's surprise.
