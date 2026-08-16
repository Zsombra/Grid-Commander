# One focus ring

## Why

`CONTROL` carried `focus-visible:outline-none focus-visible:ring-2
focus-visible:ring-focus`, and it is used in **71 places** — every text input,
select and textarea. The `outline-none` switched off the global rule in
`globals.css` for all of them (#338).

Two things make that a defect rather than a duplication:

1. **Nineteen surface manifests say it cannot happen.** Twelve assert *"Focus
   ring comes from the one global rule in globals.css — do not add a per-element
   ring"*; seven assert the ring is global. The code contradicted all nineteen
   and nothing checked, which is what #318's sweep was measuring when it found
   this.
2. **The two treatments differ.** `openspec/design/system.json`'s own principle
   is *"Every interactive element has a visible focus state at 2px offset."* The
   global rule is `outline: 2px` with `outline-offset: 2px`; a Tailwind `ring-2`
   has **no offset**. So the override did not restate the principle, it broke
   it — a focused input wore a different indicator from a focused link.

## What Changes

- `CONTROL` drops all three focus utilities. The global rule applies to inputs,
  selects and textareas as it already does to links and buttons.
- `tests/architecture/controls.test.ts` — the two tests that pinned the override
  (`uses the focus token that nothing used`, `rings only on keyboard focus`) are
  **moved, not deleted**: one asserts `CONTROL` carries no focus treatment, the
  other reads `app/globals.css` and asserts the global rule is `:focus-visible`
  at `outline: 2px` / `outline-offset: 2px` and keyboard-only. Deleting them
  would leave the nineteen manifest claims checked by nothing, which is how they
  came to be false.
- 21 surface manifests re-pinned for `control.ts`.

## Capabilities

**New**: none
**Modified**: none — no behavior changes. Every interactive element keeps a
visible keyboard-only focus indicator in the `focus` token; what changes is that
inputs now get the same one as everything else.

## Out of Scope

- **Changing the global rule.** It already matches the design principle and the
  manifests. This change makes the code agree with it, not the reverse.
- **Manifest prose.** No manifest describes the override — `ring-2` appears in
  none of them. The nineteen claims are *repaired* by this change rather than
  falsified, so the re-pin is digest-only and this proposal is where the
  reasoning is recorded rather than in 21 files.

## Impact

- `src/presentation/components/control.ts` — the constant and its comment.
- `tests/architecture/controls.test.ts` — two tests replaced by two.
- 21 files under `openspec/design/surfaces/` — `source_digest` only.
- The `focus` token is **not** orphaned: `globals.css:20` reads it as
  `var(--gc-focus)`, which is where it always belonged. The original comment's
  claim that it *"was referenced by nothing until now"* was the reason the
  override existed and was mistaken about the global rule already consuming it.
