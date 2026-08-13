# Proposal: The Harness Can See A Key Collision

## Why

**No test in this repository can observe a React key collision** (#194).
`tests/rendering/support/render.ts` walks the element tree and never runs
React's reconciler. Two `<li>` sharing a key are two nodes in that tree and one
in the DOM, so the walker counts both whatever the keys are.

This is not theoretical. While implementing `what-the-page-shows-is-what-happens`
a test written for the two-key-less-entries case passed against the **fixed**
code and passed identically against the **broken** code, verified by reverting
the fix. The test was deleted rather than kept, because a green assertion that
cannot fail reports coverage that does not exist. The defect it was written for
(#167) was then fixed with **no test able to hold it fixed.**

35 test files depend on this harness.

## What the item concluded, and where it is wrong

#194 reasons that key collisions "only exist during reconciliation", and its
first step contemplates swapping in a real renderer. The first half is true of
the *collision's effect* and false of the *key*.

A React element is `{$$typeof, type, key, ref, props}`. The key is a property of
the element object, sitting in the tree the walker already visits — `expand`
destructures `type` and `props` off it and simply never reads `key`. React
reconciles siblings within one array, which is exactly where `expand` already
iterates.

So the collision is observable without reconciling anything, without a DOM, and
without a new dependency. That makes this change small, and it is the reason to
do it now rather than carry #194 as a renderer migration.

## What changes

`expand` collects the keys of each array's members as it walks them, and records
any key seen twice in the same array. `Rendered` gains `duplicateKeys`.

The collector bar this file sets for itself is met exactly: *"a property whose
absence lets a wrong page pass a reasonable-looking test."* Its absence already
did.

`expand`'s four positional collectors become one object. Not tidying — a fifth
positional argument threaded through eight recursive calls is how the next
collector gets skipped, and the doc comment invites a next one.

## What does not change

No product code. No behaviour. No spec, hence `skip_specs: true` — this changes
what the tests can *see*, not what the application does.

Nothing is asserted globally. A page whose keys collide does not start failing
every test; `duplicateKeys` is a collector like `links`, and only a test that
reads it can fail on it. Turning it into a blanket assertion would be a
different change with a much larger blast radius across 35 files, and it should
be argued separately.

## Not in scope

#167's other half — the inline `ConditionCard` near-duplicate and `editQuery`'s
first-value-only truncation — is a presentation refactor with no bearing on the
harness. Mixing it in would muddy the mutation check that this change turns on.
