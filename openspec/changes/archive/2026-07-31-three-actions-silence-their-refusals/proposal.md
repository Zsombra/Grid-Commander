# Proposal: Three Actions Silence Their Refusals

## Why

The write-results guard found three server actions that discard a result union
carrying a refusal arm: reactivate and agent-archive drop `setLifecycle`'s
`{kind:'not-permitted', reason}`, strategy-archive drops
`setStrategyActive`'s `refused` and repair arms. A refused operation reloads
the page indistinguishable from success — the exact defect the requirement
"The Outcome Of A Write Reaches The Person Who Asked For It" (agent-authoring)
was written against. Reading the fix pattern surfaced a fourth, adjacent
instance the textual guard cannot see: the restore action branches on
`repair-required` but silently treats `refused` as success. Backlog:
`three-actions-silence-their-refusals` (P2 bug).

## What Changes

- All four actions read their result; refusals redirect back to the surface
  acted from with `?problem=<the reason the operation returned>`, the pattern
  the fixed rename/edit action established.
- The three prompt pages render `problem` as a `role="alert"`.
- The three fixed rows leave the guard's `KNOWN_DROPPED` ledger (the guard
  fails until they do).
- `tests/agent/refusals-reach-the-operator.test.ts` pins the shape per
  surface, as `rename.test.ts` does for the edit page.
- Behavior is already specified — the existing requirement's scenarios cover
  success, refusal, and the gating check — so no delta (`skip_specs`).

## Out of Scope

- The `repair-required` *detection* gap (`repair-required-cannot-be-detected`,
  needs one live observation). This change only stops the archive path from
  discarding the arm if it ever fires; the restore page keeps its dedicated
  guidance rendering.

## Impact

Three page files (action + `problem` rendering), one line in the restore
action, `tests/architecture/write-results.test.ts` ledger, one new test file,
backlog item closed.
