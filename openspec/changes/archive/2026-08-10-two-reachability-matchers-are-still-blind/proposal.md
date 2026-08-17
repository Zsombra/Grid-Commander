# Proposal: Two Reachability Matchers Are Still Blind

## Why

`a-guard-nobody-has-seen-fail` repaired seven guards and deliberately did not
scope `tests/architecture/reachability.test.ts`, because #87 classifies it as
the best-defended file in the directory. The close-out measurement found that
classification true and insufficient — measured 2026-08-10:

| mutation | result |
|---|---|
| the `<form …>` open-tag scan → matches nothing | **SURVIVED** |
| the server-action extractor → matches nothing | **SURVIVED** |

Two rules go quiet: *binds every form to a function rather than a URL* and
*leaves no server action that nothing submits to*. #87 also names the href
extractor inside form blocks (L950) as unpinned — the one that caught
`href=".."` resolving to the roster — and the vacuity check at L976 **retypes**
the form regex rather than calling it, the same guards-its-own-copy defect
`identifiers.test.ts` had.

Reading before repairing found the real count is worse than the item filed: the
form-tag spelling appears **five times** in the file (L143, L535, L650, L943,
L976) and the bound-to-action and GET-exclusion predicates four times each.
Five copies of one rule is five chances for one of them to drift, and the file's
own comment at L644 says the sibling checks share a definition precisely so
"the two cannot drift apart" — which is only true if they actually share it.

## What Changes

- The form matchers, the action predicates, the server-action extractor and the
  in-form href extractor become **named module-scope functions declared once**;
  all six call sites call them, including the L976 vacuity check.
- A proof block feeds each one an input it must report and an input it must not
  — both directions, per the requirement `An Architecture Guard Fails When Its
  Own Matcher Stops Working` and its new clean-pass scenario.
- Every repair is verified by re-running the recorded mutations with
  `tools/mutate-guard.mjs`: the two SURVIVED must become KILLED, and the href
  extractor, predicates and both form shapes must be KILLED too.

## What is deliberately not here

- **No change to what any rule forbids or permits.** The GET exclusion, the
  template-action exclusion (`action={(?!\`)}`) and the generous
  names-actions-read scan all keep their exact semantics.
- **No spec delta.** The requirements this conforms to were merged by
  `a-guard-nobody-has-seen-fail` and sharpened by
  `a-guard-must-also-pass-when-nothing-is-wrong`; this change brings the last
  file into conformance. `skip_specs: true` — tooling/tests, no observable
  product behaviour changes.
- **`confirmation-is-human.test.ts`'s narrow residual stays accepted.** Filed
  separately as a wontfix with its reason, so the acceptance is a decision on
  the record rather than an omission.

## Capabilities

None modified — conformance work under `harness-integrity`'s existing
requirements.
