# Tasks

- [x] 1.1 **DONE** — `CONTROL` drops `focus-visible:outline-none`,
      `focus-visible:ring-2` and `focus-visible:ring-focus`.
- [x] 1.2 **DONE** — the comment records both reasons, and corrects the original
      claim that the `focus` token was unreferenced.
- [x] 2.1 **DONE** — `carries no focus treatment of its own` asserts no
      `focus-visible:`, no `ring-`, no `outline-` on `CONTROL`.
- [x] 2.2 **DONE** — `and the global rule draws it, on keyboard focus only, at
      2px offset` reads `app/globals.css` rather than restating it here, so a
      constant in the test file cannot agree with itself while the stylesheet
      says otherwise.
- [x] 2.3 **DONE — confirmed non-vacuous.** Restored the three utilities and
      `carries no focus treatment` fails; removed them and it passes.
- [x] 2.4 **DONE — and a real defect was caught doing it.** The first version of
      these regexes went through a shell heredoc, where `\b` collapsed and
      Python emitted **three 0x08 bytes**. `/\x08ring-/` matches nothing, so two
      `.not.toMatch` assertions were **vacuously true and passing**. Found by
      byte-inspecting the file, repaired from `chr(92)` in a script written to
      disk rather than piped. This is the hazard `backslashes-collapse-in-shell-heredocs`
      records, and it nearly shipped a green test that checked nothing.
- [x] 3.1 **DONE** — 21 manifests re-pinned for `control.ts`, digest only.
- [x] 3.2 **DONE** — `tsc` clean, `lint` clean, **2713/2713 across 212 files**,
      `validate --all` 0 errors.
