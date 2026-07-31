# Proposal: A Dropped Write Result Fails The Gate

## Why

`agent-authoring`'s requirement "The Outcome Of A Write Reaches The Person Who
Asked For It" carries the scenario *"A result the surface never reads — THEN
this fails a check that gates a change"*. No such check exists. The rule was
stated generally and guarded specifically (`rename.test.ts` covers one
action), which is the decay shape this project has been bitten by four times —
and a fresh scan proves it: **five** statement-position
`await app.X.execute(...)` calls drop their results today, three of them
losing real refusal arms (`setLifecycle`'s `not-permitted` on reactivate and
agent-archive; `setStrategyActive`'s `refused`/repair arms on
strategy-archive). Backlog: `no-action-may-discard-a-write-result` (P2).

## What Changes

- `tests/architecture/write-results.test.ts`: scans `app/**/*.tsx` for
  statement-position `await app.<name>.execute(` — a result neither assigned,
  returned, nor branched on. Every hit must appear in a `KNOWN_DROPPED` ledger
  carrying a reason and a tracking link; the ledger is asserted both ways
  (a new drop fails; a fixed site still listed fails), so it can only shrink
  or be knowingly grown in review.
- The five current sites enter the ledger with honest verdicts: two benign
  (single-arm results whose refusals throw), three real bugs — filed as
  `three-actions-silence-their-refusals` (P2 bug), the fix being its own
  change.
- `no-action-may-discard-a-write-result` closed by the guard.

## Out of Scope

- Fixing the three refusal-dropping sites — that is surface behavior work
  (refusal rendering on three pages) under the existing requirement, filed as
  its own item so the fix shrinks the ledger.

## Impact

One new test file; two backlog items updated, one filed. No production code.
