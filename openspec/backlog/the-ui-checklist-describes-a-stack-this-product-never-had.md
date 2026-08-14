---
id: the-ui-checklist-describes-a-stack-this-product-never-had
title: A quarter of the UI checklist governs libraries this product has never used
type: debt
status: done
priority: p2
created: 2026-08-14
updated: 2026-08-14
change: ""
capability: harness-integrity
github: "233"
blocked_by: []
tags: [checklists, tooling, vacuity]
---

# A quarter of the UI checklist governs libraries this product has never used

> **Closed 2026-08-14** — fixed in the same operator-approved generator pass as
> the #229 amendment (checklist v2.0.0), exactly as "What would settle it"
> asked: header corrected, dead sections replaced by "Deliberately Absent"
> with a regenerate-first rule, Tailwind item 3 now names `control.ts` and its
> enforcing scan. GitHub #233 closed.

## What

`docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md` is binding — the executor,
planner and auditor all read it. Its header says:

```
docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md:5
**Based On**: Clean Architecture + React / Next.js App Router + shadcn/ui + Tailwind + Zustand
```

Two of those five have never been in this project:

```
grep -c 'zustand|shadcn|clsx|tailwind-merge' package.json   ->  0
```

Three whole sections therefore govern machinery that does not exist: **Hooks
Design** (the product has zero custom hooks and zero `useEffect`), **Store Design
(Zustand)**, and **shadcn/ui Usage**. Roughly a quarter of the document's
checkboxes cannot be failed because they cannot be tested.

**One item is worse than vacuous — a binding test forbids what it requires.**
Tailwind item 3 requires *"Conditional classes composed with `cn()`, not string
concatenation"*. `grep -rn '\bcn('` over `src` and `app` returns **zero**: the
helper does not exist here. Meanwhile `tests/architecture/controls.test.ts`
requires a button's className to read literally `className={BUTTON_X}` or a
template interpolating exactly `${BUTTON_PRIMARY}` — hoisting a class into a
variable makes the file an offender against the scan that catches hand-styled
buttons. **The checklist mandates a spelling an architecture test rejects.**

## Why it matters

p2. Nothing is broken for users; the risk is to every future review.

A binding standard that is a quarter fiction teaches its readers to skim, and a
skimmed standard is precisely why #229 exists — item 4 sat contradicted by the
code for a month and no round noticed. The remedy for #229 is a checklist edit,
and it would be odd to carefully amend one line of a document whose header is
false and whose Tailwind section demands an impossible call.

## What would settle it

Run **checklist-generator in UPDATE mode** — the sanctioned instrument. The
executor is explicitly forbidden from editing `docs/checklists/`, and the
generator halts for human approval before applying anything. In one pass:

- correct the `Based On` header to the stack actually in use
- delete, or explicitly mark absent, the hooks / Zustand / shadcn sections
- fix Tailwind item 3 to describe what this codebase actually requires, and
  cross-reference the test that requires it

Do this **with or before** the #229 amendment, so the document is opened once
rather than twice.

## Evidence

- `docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md:5` — the false header
- `package.json` — no zustand, shadcn, clsx or tailwind-merge
- `grep -rn '\bcn(' src app` → zero call sites
- `tests/architecture/controls.test.ts` — the regex requiring the other spelling
- `.claude/skills/executor/SKILL.md` — "Modify checklists in `docs/checklists/`
  (that's the checklist-generator)" appears under what the executor does NOT do

## Notes

Found while investigating #229, by walking every checkbox in the document to ask
whether item 4 was an isolated falsehood. It was not — which is itself the
answer to a question #229 had assumed away.
