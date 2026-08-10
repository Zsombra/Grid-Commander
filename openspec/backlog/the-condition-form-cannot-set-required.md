---
id: the-condition-form-cannot-set-required
title: The condition form has no control for `required`, so every drafted condition is composed as optional
type: feature
status: open
priority: p3
created: 2026-08-10
updated: 2026-08-10
change: ""
capability: strategy-authoring
github: "88"
blocked_by: []
tags: [battlegrid, v16, ui, strategy-authoring]
---

# A drafted condition can only ever be optional

## What

BattleGrid v16.0.0 made `conditions[].required` a required key on every
condition-carrying write. The product now models and emits it, but the two
paths differ in where the value comes from:

- **Retarget** (`try-condition`, `describe-condition-write`) carries
  `required` from the source condition, alongside the definition — the
  operator asked to retarget, not to change whether it must hold.
- **Fresh compose** (`condition-form.ts`) has **no control for it**, so a
  drafted condition is always `required: false`.

`false` is the right default — it is the platform's own, and the other value
would silently harden a strategy the operator was composing. But it means
the flag is currently unreachable from the UI.

## Why it matters (p3)

Nothing is broken and nothing is misreported: what the form composes is what
gets sent, and the preview shows it. The gap is a capability the platform
offers and this product cannot reach — an operator who wants a mandatory
condition has to author it elsewhere.

Priority is p3 rather than p2 because `required: false` is also what every
condition on the account currently carries, so no existing strategy is
misrepresented by the default.

## What it needs

A control on the condition form, and a delta spec for it — this changes what
the surface can express, so it is a `/propose` change rather than a design
ticket. The write path itself already carries the field.
