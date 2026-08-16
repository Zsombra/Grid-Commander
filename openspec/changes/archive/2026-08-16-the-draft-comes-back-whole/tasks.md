# Tasks

- [x] 1.1 **DONE** — `editQuery` appends every string value; `problem` still
      excluded.
- [x] 1.2 **DONE** — the doc comment states the rule and why the collapse is
      still right in `one()`.
- [x] 2.1 **DONE** — `keeps every value, not just the first`: asserts every
      carrier of the round-tripped query holds both values. Asserts over the
      composer link *and* the hidden `draft` field rather than pinning one,
      because which renders depends on the branch.
- [x] 2.2 **DONE** — `still drops the problem it may have arrived with`: a
      repeated `problem` is still excluded, so the fix did not widen the one
      thing `editQuery` deliberately drops.
- [x] 2.3 **DONE — confirmed non-vacuous.** Reverted to `out.set(key, first)`
      and the first test fails with *"the second value was dropped — #317"*;
      restored and it passes. A test that passes against broken and fixed code
      alike is the failure #194 already cost this repository, so it was checked
      rather than assumed.
- [x] 3.1 **DONE** — `tsc` clean, `lint` clean, **2713/2713 vitest across 212
      files** (up 2, the new tests; the suite was 2711/2711 earlier today).
- [x] 3.2 **DONE** — `openspec.py mirror` clean, item `done` against issue #317
      CLOSED.
