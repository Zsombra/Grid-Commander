# Tasks

## 1. The harness reads the key

- [x] 1.1 `expand`'s collectors become one object, threaded through the
      recursive calls in its place.
- [x] 1.2 Walking an array, `expand` reads each member's `key` and records any
      key seen twice **within that array** — the scope React reconciles in.
- [x] 1.3 `Rendered` gains `duplicateKeys`, documented beside `links` and
      `values` and for the same stated reason.
- [x] 1.4 A key-less member is not a collision. Most elements are not in arrays
      and need no key; `null` keys are skipped rather than folded together,
      which would make every page with two unkeyed siblings report a collision.

## 2. Verification

- [x] 2.1 Two siblings sharing a key are reported.
- [x] 2.2 Two siblings with distinct keys are not.
- [x] 2.3 Two siblings with no keys at all are not — the guard against 1.4
      inverting into a false positive.
- [x] 2.4 Keys equal across *different* arrays are not a collision, because
      React does not reconcile them together.
- [x] 2.5 **The regression test #194 could not write.** Restore the
      two-key-less-entries case on `/strategies/[id]/conditions/save` and assert
      `duplicateKeys` is empty. It must fail against the pre-fix keying.
- [x] 2.6 **Mutation check.** Revert the `named` keying fix in the page and
      confirm 2.5 fails. This is the whole point: the test deleted in
      `what-the-page-shows-is-what-happens` could not do this.
- [x] 2.7 The existing 35 harness consumers still pass unchanged.

## 3. Quality gates

- [x] 3.1 `typecheck`, `lint`, `test`, `build`.
