# A unification ships its guard

## Why

`a-sweep-cannot-see-files-born-in-the-same-round` (P3, `harness-integrity`)
records a structural hole in parallel rounds: N agents branch from the same
commit, one of them is a cross-cutting sweep over "every file that exists",
and sibling agents create files the sweep cannot see. The sweep's premise is
invalidated by its own siblings before it merges. It has happened —
`condition-composer.tsx` was born in the round-three squash `95bb95a` beside
the buttons-and-labels sweep, carrying eighteen stock labels, and drifted for
zero days before round four caught it.

The mitigation is known and was applied by hand twice: **land the scan in the
same change, not after.** A guard written once the tree is clean is one line,
and a guard deferred is the one that never arrives. This change makes the
habit a rule.

## What changes

**Standing text only. No source, no tests, no new guard.** The buttons/labels
case already has its guard (`tests/architecture/controls.test.ts`, no
allowlist); this is the rule that makes the next extraction — a shared date
formatter, a shared money renderer, a shared error component — ship its own.

- `.claude/skills/executor/SKILL.md` — Step 5 (Enforce Implementation Rules)
  gains the rule: *a change that unifies N spellings into one ships, in the
  same diff, the check that the spelling cannot recur.*
- `docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md` — the same rule as a
  Tailwind checklist row, with the incident as its why. Applied the way
  checklist-generator UPDATE mode expects: a checkbox-table row (no
  prose-only rules), MINOR version bump 1.0.0 → 1.1.0, dated, and the review
  output template's category count follows. The checklists carry no
  do-not-hand-edit banner; UPDATE mode's own trigger — "a bug happened that
  the checklists should have caught" — is this exact case, and the triaged
  backlog item is the approved proposal.
- `.claude/references/change-lifecycle.md` — one paragraph for the
  integrator, at the end of §5: after merging a parallel round, re-run any
  guard the round introduced against the merged tree, not only against the
  branch that wrote it. No reference dedicated to multi-agent rounds exists,
  so the lifecycle document every pipeline skill reads is where it goes.

## Track

`lite`, `skip_specs: true`. Standing text in the pipeline's own files; no
observable product behaviour changes, so there is no delta spec to write.
Same call as `the-checklists-are-named-checklists`.
