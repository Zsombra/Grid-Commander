# Proposal: The Record Carries The Whole Condition Union

## Why

`tools/probe_mcp_surface.py` records, per object path, what the schema accepts
there and whether the object is closed. For the condition grammar it recorded
this, on all three tools that take conditions:

```json
"conditions[].definition": { "closed": true, "accepts": ["kind", "members", "n", "op"] }
```

That is the **group** branch and nothing else. The live schema declares
`definition` as an `anyOf` over six object shapes — four clause forms, a
`conditionRef`, and the group — so a clause's `column`, `value`, `label` and
`labels`, and a reference's `conditionKey`, all read as violations of a closed
set the platform does not close.

The cause is one line of the walk. `input_accepts` gathers the union members
that carry `properties` and recurses through each. This union is **nested**: its
outer `anyOf` holds one plain object (the group) and one *further* `anyOf`, which
has neither `properties` nor `items`. The walk saw exactly one object branch,
recorded it with `record_closed`, and never reached the five shapes inside.

The probe's own docstring says a merged record "can miss a violation but never
invent one". Here it invented one — the more damaging direction, because a guard
that fails against correct code gets disabled rather than fixed. It already was:
`payload-conformance.test.ts` holds every payload this product constructs, and
the two condition payloads were exempt, with the exemption written as a comment
in `src/infrastructure/battlegrid/strategy-adapter.ts`. That comment is the same
shape as the `request.plan` pass-through that hid the sixth dead write path.

Filed as `the-record-flattens-the-condition-union` (p3, debt).

## What Changes

- **The walk follows a branch that is itself a union.** `_union_shapes` flattens
  nested unions before anything is recorded, so all six shapes reach the record,
  along with paths that were previously unreachable — `conditions[].definition.column`
  did not exist in the record at all.

- **A discriminator that cannot pick a branch is repaired rather than emitted.**
  Three clause forms pin `op` with `const` (`between`, `is`, `in`); the fourth
  pins it with `enum: [lt, lte, gte, gt]` and so discriminated on `kind: "clause"`
  alone — which the other three also answer. A reader taking the first match
  would check a `between` clause against the comparison branch and report `low`
  and `high` as violations: the same invented violation, moved. Two rules settle
  it, in order:

  - **Widen with enums, where consts collide.** A `const` is an enum of one, and
    reading one as a discriminator while the other is invisible is a distinction
    of how the schema is *spelled* rather than of what it *reaches*. The record
    gains `when_one_of` beside `when` — matched by membership where `when` is
    matched by equality. Only where it is needed: a discriminator that already
    separates is left exactly as it was, because saying which branch a payload
    belongs to is this field's job and checking that its values are permitted is
    `input_constants`' job.
  - **Merge what still cannot be told apart.** Two branches can differ only in
    which keys they *require* — a report column's `timeframe` is `{rel}` or
    `{abs}`, with nothing pinned on either — so both recorded `when: {}`, both
    matched everything, and `{abs}` read as a violation of a closed set holding
    only `rel`. That is a second live instance of this defect, found while fixing
    the first. Those branches now record as one variant: accepted names union,
    required paths intersect, closed only if every branch is. It can miss a
    violation; it cannot invent one, which is the promise the record already made.

- **The two condition payloads join the sweep**, and the exemption comment is
  deleted: the round trip of a strategy's own conditions into
  `preview_strategy_report`, and a drafted condition composed beside them through
  `composeForResolution`. The drafted one carries every clause form in one group,
  because that is the payload the collision above would have mis-matched.

- **The tripwire in `tests/strategy/condition-draft.test.ts` is flipped.** It
  asserted *"the probed record still cannot express the union this file walks"*,
  written to fail the day this was fixed so the conformance cases would be added
  rather than the gap closing quietly. They are added, so its question changes to
  what the record in hand actually says.

## What The Artifact Needs, And Who Can Do It

`docs/battlegrid-mcp-surface.json` is written by a live probe against a real
account. **It is not regenerated here**, and it is never hand-edited.

`--refresh-declared` is deliberately not used either: it recomputes the declared
fields from `docs/battlegrid-mcp-capabilities.json`, which is a **v9.0.0**
snapshot while the artifact is **v11.0.0**. It would drag all 110 tools'
declared fields back two major versions to fix five, and the version stamp the
freshness gate reads would still say v11.

So the fixed walk reaches the artifact when someone holding a credential runs:

```bash
BATTLEGRID_API_KEY=bg_live_… python3 tools/probe_mcp_surface.py
```

Until then the conformance cases subtract exactly what the pre-fix record must
invent — **derived from the record's own accepted set, not matched by text** —
so they check the whole payload today and check it exactly after the re-probe,
with no edit to either case. The subtraction evaporates the moment the record
carries variants at those paths, which is asserted on a synthetic record rather
than waited for.

## What Was Rejected

- **A wider discriminator everywhere.** Adding every enum-pinned property to
  every variant's `when_one_of` is a simpler rule to state and a worse record: it
  churns twenty variant sets to fix one, and it makes the discriminator assert
  what values are permitted — a claim `wire-values.test.ts` already makes against
  `input_constants`, from the same declaration.
- **Merging the four clause forms instead of widening.** Honest and lossy: the
  merged set would accept `value` on a `between` clause, which the platform
  refuses. Where the schema tells branches apart, the record should say so.
- **Folding the enum into `when` as a list.** A `const` may itself be a list, and
  a reader would have no way to tell "this value" from "one of these". No const
  on the observed surface is a list; the ambiguity is still not worth minting.
- **Hand-editing the artifact, or refreshing it from the v9 dump.** Both make the
  record say something no probe observed. See above.

## Capabilities

**Modified**: `platform-mapping` — three ADDED requirements covering what the
record must say about a path declared as a union, that no two recorded variants
may match one payload, and that the payload sweep holds every payload the
product constructs with any allowance derived from the record itself.

## Out of Scope

- **Regenerating `docs/battlegrid-mcp-surface.json`.** Named above; needs a
  credential this branch does not hold.
- **`input_constants` and `input_required_paths`.** Both already flatten nested
  unions correctly — `input_constants` recurses through `anyOf` unconditionally,
  and `_required_paths` intersects branches at any depth. Only `input_accepts`
  stopped.
- **The `$ref` recursion depth.** `conditions[].definition.members[]` records the
  full union and `members[].members[]` does not, because the walk ends a branch
  that recurses through itself. That is the existing cycle rule and it is
  conservative in the demand-less direction.
- **Any change to what the product sends.** Both payloads already conform; this
  is about what the record can see.

## Impact

`tools/probe_mcp_surface.py` (`input_accepts`, plus four new helpers),
`tests/test_probe_declared_fields.py` (14 cases: the real union out of the
capabilities dump, and the collision rules — the harness goes 221 → 235),
`tests/architecture/payload-conformance.test.ts` (two payload cases, three
guards, `when_one_of` honoured when matching a variant),
`tests/strategy/condition-draft.test.ts` (the flip),
`src/infrastructure/battlegrid/strategy-adapter.ts` (the exemption comment
deleted). `the-record-flattens-the-condition-union` links here.
