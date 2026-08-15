# Tasks

- [x] 1. Export `ConditionCard` from
      `src/presentation/components/strategy-conditions.tsx` and add
      `blockNote?: boolean` and `actions?: React.ReactNode`. Documented why the
      annotation is a parameter rather than a constant — the heading carries
      it in one surface and the text has to in the other.
- [x] 2. Replaced the inline `<li>` in
      `app/(app)/strategies/[id]/conditions/save/page.tsx` with
      `<ConditionCard blockNote actions={…}>`, and hoisted the `defined` set
      out of the row loop (it was rebuilt per row, same answer every time).
- [x] 3. **Rendered result diffed across the change, not eyeballed.** A
      throwaway dump of the listing state's `text`, `links` and `headings`
      before and after (the change stashed, re-rendered, popped) is
      **byte-identical**, and the fixture exercises the annotation — Berlin's
      `REGIME_DOWN` carries `verdict: null`, so `· a named building block`
      is in the compared text rather than absent from both sides.

      The one difference is the one the proposal predicted. Adding a
      condition whose definition uses a form the product does not model, the
      after-render gains exactly one sentence — "Part of this condition uses
      a form Grid-Commander does not model. What is shown is incomplete." —
      and `Not understood by Grid-Commander: …` is present on **both** sides,
      confirming `spec.md:750-756` was already satisfied and this is additive.

      *(The dump's first run "passed" while writing `{}`: `rendered()` is
      async and was not awaited. Exactly the vacuity `render.ts` warns about
      in its own header. It now throws on an empty walk.)*
- [x] 4. Re-pinned `openspec/design/surfaces/strategy-conditions-save.json` —
      `current_implementation` said the markup "near-duplicates ConditionCard
      … rather than reusing it", which this change makes false; both edited
      files re-digested. **Proved the re-pin was load-bearing** by restoring
      the old page digest and confirming `design_surface_stale` fires naming
      the file, then restoring.
- [x] 5. Gates: `npm run typecheck` clean, `npm run lint` **exit 0 from the
      repo root** (#315's ignore holding), `npm test` **205 files / 2575
      tests passed**, `npm run build` clean, `validate --all` 0 errors / 13
      standing warnings. (`test:db` skipped — no schema change.)
