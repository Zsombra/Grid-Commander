# Proposal: Make the coercion guard catch the shape it missed

## Why

The same defect has appeared four times in this project — an identifier or a
bound given a fabricated value instead of a refusal:

| | Where | The code |
|---|---|---|
| PG-003 | domain error | `expectedRevision ?? -1` |
| PG-101 | agent mapper | `slotUsage.limit ?? 0` |
| PG-201 | route handler | `Number(formData.get('expectedRevision'))` |
| PG-301 | strategy mapper | `String(s['id'] ?? '')`, `revision : 0` |

After the third, `wire-the-app` added
`concurrency.test.ts::no identifier is coerced into existence` **specifically so
a fourth would fail the build**. It scans form coercions and
`<identifier> ?? <value>`. PG-301's ternary half contains no `??` at all, and its
`String(s['id'] ?? '')` half sits inside a call the pattern does not reach.

**The fourth occurred and the build stayed green.** It was caught by a human
reading scan output — which is precisely the work the guard existed to replace.

That is worse than the defect. A guard that misses the next instance creates a
belief the class is covered, and the belief is what makes the next one likely.

## What Changes

- A rule written to the shape the defect actually takes rather than the shape the
  last one took: an identifier extracted from an **untyped payload** and given a
  literal fallback.
- Both halves covered — `?? <literal>` and `? … : <literal>`.
- A **positive** half as well: a mapper reading an identifier off an untyped
  payload must be able to refuse it. Scanning for known-bad shapes only ever
  catches shapes already seen.
- Tests that reproduce PG-301 verbatim and assert the rule rejects it, so the
  guard has been seen to fail on the real thing.

## Out of Scope

The Drizzle repositories. They read columns whose types the schema guarantees, so
`row.id` is a `string` by construction rather than by hope. Widening the rule to
cover them would produce noise without covering a real risk.

## Impact

Test-only; no behaviour changes. `lite` track.

The one judgement worth recording: the rule is scoped to
`src/infrastructure/battlegrid/`, the boundary where everything arriving is
`unknown`. A rule that scanned everywhere would be mostly false positives, and a
rule people route around protects nothing.
