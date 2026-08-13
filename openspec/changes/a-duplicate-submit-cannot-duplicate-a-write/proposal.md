# A duplicate submit cannot duplicate a write

Resolves #229.

## Why

Two binding records disagree about what a perform submit does while it is in
flight, and nothing has reconciled them.

```
docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md:236
  State & Interaction, 4 — "Submit controls disable while in flight"

src/presentation/components/perform-button.tsx
  deliberately does not disable — DT-0022 defined the look and refused the trigger
```

`.claude/references/design-contract.md` §2 ranks the checklist above any design
ticket and says to *"say so rather than quietly pick one"*. Nobody said so. The
round that shipped the non-disabling ran `track: lite`, which runs neither the
verifier nor the auditor — the two roles that read that checklist. So a binding
engineering standard has been false since #153 landed, and no gate noticed.

`openspec/specs/` is silent on the question, which is why it drifted at all.

## The wording is this project's, and that is what makes it a real conflict

The generator's template states an **outcome**:

```
.claude/skills/checklist-generator/references/clean-architecture/ui-checklist-template.md:186
  "Buttons prevent duplicate submits during async operations"
```

Grid-Commander's file states a **mechanism** — *"Submit controls disable while
in flight"*. Someone narrowed an outcome into one implementation of it. The
outcome is the property anyone actually wants; the mechanism is one way to get
it, and not the way this product chose.

## What changed since #229 was filed, and why it decides the shape

When the item was filed, restating item 4 as an outcome would have been
**aspirational** — the outcome was not true. It is now, across all eighteen
perform submits, and each of the four groups earns it differently:

| how the write is protected | submits |
|---|---|
| single-use `confirmationToken`; `consume` is an atomic conditional UPDATE | 14 |
| BattleGrid refuses the duplicate — **measured**, named and auto-named | fork |
| `idempotencyKey`, minted per render and carried as a hidden input (#231) | create |
| naturally idempotent (`active: true` again) or without effect (OAuth start) | restore, connect |

And since #232, the refusal a spent confirmation earns **reaches the person**
rather than a framework crash page. That mattered to this decision: "the guard
answers" was the argument for leaving the code alone, and until last week it was
not true. It is now.

So the amendment is a true sentence about the product as it stands, not a
promise. That is the whole reason to make it now rather than when the item was
filed.

## What changes

1. **`docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md` State & Interaction 4**
   is restated as the outcome, naming all three mechanisms honestly rather than
   prescribing one. Via **checklist-generator in UPDATE mode** — the executor is
   explicitly forbidden from editing `docs/checklists/`, and the generator halts
   for human approval, which is correct for amending a binding standard.

2. **`app-access` gains a requirement** stating what a second press does and
   what the operator is told. The spec layer's silence is the root cause; a
   checklist edit alone would leave the same gap open for the next round.

## What does NOT change

**No code.** Not one line. Everything the outcome requires already shipped —
across #153, #231 and #232 — which is what makes this a reconciliation rather
than a feature.

**`disabled={pending}` is not added.** The mechanism the old wording prescribed
is not adopted, and this is the substantive decision, so the reasoning is on the
record rather than in a commit message:

- It is **not needed for the outcome**. All eighteen submits are protected by
  something that works whether or not the control is pressable, including on the
  paths a client-side prop cannot reach — a second tab, a replayed POST, a press
  before hydration.
- It would **cost something real**. `perform-button.tsx` carries no live region,
  so the progressive label is announced only because the pressed control still
  holds focus. Disabling moves focus off it and removes the channel the
  announcement travels on. (The commonly-repeated *"a disabled control is
  unreachable to a screen reader"* is **false** and was corrected on #229;
  `disabled` leaves the tab order, not the accessibility tree. The narrower
  claim is the true one and it is enough.)
- The product has **never disabled a control**, and `system.json` principle 10
  says so on purpose: *"Nothing is styled to look disabled when retrying cannot
  help."*

Anyone who later wants the mechanism can have it: DT-0022 already defines what
`disabled` looks like, and it is one prop. This change records why it was not
taken, so that decision is re-openable on evidence rather than re-litigated from
scratch.

## Track

`standard`. It amends a binding standard and adds a spec requirement, so it
needs the verifier — but it changes no code, so there is nothing for a
production gate to audit. `full` would be ceremony over a documentation
reconciliation.

The one non-standard step: task 1 runs **checklist-generator**, not the
executor, and it stops for human approval before applying.

## Risks

- **The generator regenerates the whole file.** `UI_COMPONENT_REVIEW_CHECKLIST.md`
  has other defects — a `Based On` header naming shadcn and Zustand, neither
  ever in `package.json`; three sections governing machinery that does not
  exist; a Tailwind item mandating `cn()`, which does not exist here, in a
  spelling `controls.test.ts` rejects. Those are #233. Fixing item 4 through a
  tool that rewrites the file means either fixing them too or deliberately
  preserving them. **Decide before running it**, and prefer fixing — editing the
  same file twice is worse.
- **Someone may have chosen the narrowed wording deliberately.** No proposal,
  journal entry or review artifact from around the generation commit says so,
  and the checklist annotates its two project-authored rationales while item 4
  carries none — but absence of a record is not proof. If intent is found, this
  becomes a genuine standard-versus-code conflict and the case weakens.
