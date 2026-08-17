# Tasks: The Last Stock Buttons And The Guard

- [x] 1. Check the backlog item's line numbers against the current
      `agent-edit.tsx` rather than trusting them, and confirm which labels are
      field names and which is the checkbox row to leave.
- [x] 2. Apply `BUTTON_PRIMARY` to the three submits that perform the page's
      operation — Rename, Apply, Reactivate — and `BUTTON_SECONDARY` to
      `Review the change`, which sits on the `method="get"` form.
- [x] 3. Apply `BUTTON_SECONDARY` to the three cancel anchors that share a flex
      row with a submit. Leave the two prose `underline` links alone.
- [x] 4. Apply `LABEL` to the four labels naming a control. Leave the checkbox
      row (`flex items-center gap-2 text-sm`) — the same exclusion the earlier
      change made everywhere else.
- [x] 5. Sweep `condition-composer.tsx`, found by writing the scan: eighteen
      labels and one `method="get"` submit, never touched by the extraction
      because it was written in the same merge.
- [x] 6. Check behaviour is untouched: every `type="submit"` still submits,
      every `htmlFor` still binds, no `href` changed, no `action` changed, no
      copy changed.
- [x] 7. Write the scan in `tests/architecture/controls.test.ts` — every
      `<button>` wears one of the two treatments, every `<label>` that is not a
      checkbox row wears `LABEL` — with no allowlist.
- [x] 8. Write the vacuity check beside it, and prove it fires: break the tag
      pattern, watch the scan pass on nothing and the floor fail, put it back.
- [x] 9. Prove the scan fires: restore one stock button and one stock label,
      watch both appear as offenders, put them back. Plant an unstyled
      `<button>` and watch it be caught rather than skipped.
- [x] 10. Replace the `describe` comment that explained why the scan was absent
      with what is true now, and rewrite the constants block to say why it
      outlives the scan rather than being replaced by it.
- [x] 11. `npx tsc --noEmit`, `npx eslint` over the three changed files,
      `npx vitest run` (1657 passed, 41 skipped).
- [x] 12. `python3 .claude/tools/openspec.py validate the-last-stock-buttons-and-the-guard`
- [x] 13. Close `agent-edit-still-stock` — `status: done`, `change:` set.
