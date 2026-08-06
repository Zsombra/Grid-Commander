# Tasks: Buttons And Labels From One Source

- [x] 1. Read DT-0001 and DT-0002 and confirm the button treatments they decided
      are the ones `plan-review.tsx` actually renders, rather than designing new
      ones.
- [x] 2. Add `BUTTON_PRIMARY`, `BUTTON_SECONDARY` and `LABEL` to
      `src/presentation/components/control.ts`, lifted verbatim from
      `plan-review.tsx` so the designed surface renders identically.
- [x] 3. Add `font-normal` to `CONTROL`, so a wrapping `LABEL` cannot push its
      weight into the control it names.
- [x] 4. Point `plan-review.tsx` at the constants it used to spell out.
- [x] 5. Apply `BUTTON_PRIMARY` to every submit that performs the page's
      operation, and `BUTTON_SECONDARY` to every peer and every submit on a
      `method="get"` form.
- [x] 6. Apply `BUTTON_SECONDARY` to the button-shaped cancel anchors that sit in
      the same flex row as a primary, so making the button 44px tall does not
      introduce a mismatch.
- [x] 7. Apply `LABEL` to every label naming a control. Leave checkbox rows.
- [x] 8. Replace the two `<button className={CONTROL}>` — a submit wearing a text
      input's treatment, including its `w-full`.
- [x] 9. Check behaviour is untouched: every `type="submit"` still submits, every
      `htmlFor` still binds, no `href` changed, no `action` changed.
- [x] 10. Extend `tests/architecture/controls.test.ts` with token assertions on
      the three new constants.
- [x] 11. File the two deferrals: `the-button-primitive-has-no-tokens` and
      `agent-edit-still-stock`.
- [x] 12. `npx tsc --noEmit -p tsconfig.json`, `npx eslint .`,
      `npx vitest run tests/rendering/ tests/architecture/`
- [x] 13. `python3 .claude/tools/openspec.py validate buttons-and-labels-from-one-source`
