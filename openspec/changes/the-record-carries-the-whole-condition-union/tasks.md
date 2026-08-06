# Tasks

## 1. The walk reaches every shape

- [x] 1.1 `_union_shapes` flattens a union member that is itself a union, so
      `conditions[].definition`'s six shapes all reach `input_accepts`. A member
      carrying `properties` is a shape; a member carrying only more branches is a
      signpost. `_resolve`'s cycle set still ends a branch that recurses through
      itself — the group's `members[]` is a `$ref` back to `definition`.
- [x] 1.2 `input_accepts` walks the flattened shapes for both purposes: choosing
      the object branches, and recursing into each branch's own `properties` and
      `items`. `conditions[].definition.column` was unreachable before and is
      recorded now.
- [x] 1.3 `record_closed` and the single-object-branch case are untouched. A
      nullable closed object is still recorded at its path, not as a variant.

## 2. A discriminator that can pick the branch

- [x] 2.1 `_one_of_pinned` collects the enum-pinned properties a branch
      **demands**. Required-only: a `when_one_of` naming a property a payload may
      legitimately omit makes the variant unmatchable, which reads as "no
      declared variant matches" — the same invented violation at one remove.
- [x] 2.2 `_tellable_apart` decides whether two discriminators can both be
      satisfied by one payload; `_indistinguishable_groups` gathers branches into
      connected components, because "tellable apart" is symmetric and not
      transitive and first-fit grouping would leave a colliding pair split.
- [x] 2.3 `_variants` widens with enums **only inside a colliding group**, then
      merges whatever is still indistinguishable: accepts union, required
      intersect, closed only if every branch is closed. A union already separated
      by its consts is emitted exactly as before — measured against the committed
      capabilities dump: 105 of 110 tools' `input_accepts` are byte-identical.
- [x] 2.4 The reasoning for all three rules is written into `_variants` and
      `_one_of_pinned`, not only into this change.

## 3. The record's readers understand `when_one_of`

- [x] 3.1 `payload-conformance.test.ts`'s `Variant` carries `when_one_of`, and
      variant matching honours it — `when` by equality, `when_one_of` by
      membership. A reader honouring only `when` would take the comparison clause
      for every clause and report `low`, `high`, `label` and `labels`.

## 4. The two condition payloads join the sweep

- [x] 4.1 `preview_strategy_report — a strategy's own conditions, round-tripped`:
      Berlin's `FULL_SEND_DOWN` and `REGIME_DOWN`, the platform's own objects, as
      `PreviewCompositionQuery` sends them.
- [x] 4.2 `preview_strategy_report — a drafted condition, alongside the
      strategy's own`: through `serialiseCondition` and `composeForResolution`,
      carrying every clause form in one group — the payload the `op` collision
      would have mis-matched.
- [x] 4.3 The exemption comment in `src/infrastructure/battlegrid/strategy-adapter.ts`
      is deleted and replaced by a pointer to the two cases.
- [x] 4.4 `theFlattenedRecordsOwnDoing` derives the pre-repair allowance from the
      record's own accepted set at the two definition paths. No text matching:
      the one message template is shared with `violations`.

## 5. Verification

- [x] 5.1 `tests/test_probe_declared_fields.py::TheConditionUnion` drives
      `input_accepts` over `preview_strategy_report`'s **real** schema out of
      `docs/battlegrid-mcp-capabilities.json` — `$ref`s and nested `anyOf`
      intact, no hand-written fixture. Six variants in declaration order, the
      keys that used to read as violations, the enum-widened clause, the
      recursive `members[]` position, `column` recorded, and the same union on
      `compile_strategy_plan` and `apply_strategy_plan`.
- [x] 5.2 An anti-vacuity case asserts the declared union **really is nested**.
      If BattleGrid ever flattens it, that fails first and says so, rather than
      every case above passing without following a nested branch.
- [x] 5.3 A case drives the record the way the guard does — `when` by equality,
      `when_one_of` by membership — over the seven shapes
      `src/domain/strategy/condition-draft.ts` emits, and asserts **exactly one**
      variant matches each and accepts all of its keys.
- [x] 5.4 `tests/test_probe_declared_fields.py::Collisions`: the real
      `timeframe` merge, a union that consts already separate left untouched, a
      nested union followed, an optional enum declining to discriminate, a
      three-branch collision chain merging whole, and a merged variant staying
      open when any branch it covers is open.
- [x] 5.5 `payload-conformance.test.ts` guards: the allowance is exactly the
      flattening and nothing wider; a real defect in a condition payload (an
      extra key, a missing `verdict`) still fails; the allowance evaporates on a
      synthetic re-probed record.
- [x] 5.6 `tests/strategy/condition-draft.test.ts` — the tripwire flipped, both
      generations of the record asserted, and the flip explained in the case.
- [x] 5.7 `./scripts/check.sh` (235 harness tests + spec validation),
      `npx tsc --noEmit`, `npx vitest run` (1659 passed, 41 key-gated skips),
      `npx eslint` over the touched files. Green on the record as committed
      **and** against a locally simulated re-probe (reverted, never committed).
- [x] 5.8 `the-record-flattens-the-condition-union` set `done` and linked here.
