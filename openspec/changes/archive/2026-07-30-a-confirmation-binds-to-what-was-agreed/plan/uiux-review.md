# UI/UX Review: a-confirmation-binds-to-what-was-agreed

## Scope

Almost none, deliberately. This change alters what a confirmation *covers*, not
what the user sees. One surface file is touched and no rendered output changes.

## `app/(app)/agents/[id]/edit/page.tsx`

- `pick` and `numberish` replaced by `editIntent`. The values the confirm form
  posts back are unchanged in content; the money fields are now numbers rather
  than strings, which the hidden inputs render identically.
- `AgentEditConfirm`'s `changes` / `tradingConfigChanges` props widen from
  `Record<string, string>` to `Record<string, string | number>`. A hidden input
  accepts both; nothing about the rendered markup differs.
- `MONEY_FIELDS` moved to `src/presentation/form.ts`. It was never rendered.

## States

All five branches of the edit page still render, and the two added by
`the-strategies-walk` (a way back on every state) are untouched. Verified by
`reachability.test.ts`, which still passes including the return-path and
declined-confirmation checks.

## What a user could notice

**A tampered submission is now refused.** Nobody reaches that state by using the
product: it requires editing a hidden field in their own browser. The refusal
renders through the existing `problem=` path, which names what went wrong.

The refusal text is `enforce()`'s existing wording — *"the confirmation was
invalid, expired, already used, or issued for something else"*. That is accurate
for this case and unhelpfully broad. **Filed rather than fixed**: distinguishing
"the values changed" from "the token expired" would let the page say *"the amount
changed since you agreed to it — review it again"*, which is the actionable
sentence. It needs a distinct error case rather than a copy edit, so it is not a
UI change.

## Design tickets

None implicated. DT-0002 governs `plan-review.tsx`, whose treatment is untouched;
its `changeIt` prop landed in `the-strategies-walk`. No surface manifest goes
stale: `openspec/design/surfaces/` describes states and actions, and neither
changed.

## Accessibility

No markup change, so nothing to re-check. The confirm form's structure, labels and
focus order are as they were.
