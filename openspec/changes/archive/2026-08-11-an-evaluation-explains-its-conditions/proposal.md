# An evaluation explains its conditions

## Why

"Why didn't it trade?" is the question the pipeline surface exists for, and
its current answer stops at gate blocks and aggregate scores. BattleGrid
v17.2.0 added the missing bottom layer: `get_signal_log` now carries a
`conditionEvaluation` block — the strategy's own conditions, evaluated
clause by clause, with the *observed value beside the threshold* on every
clause.

The observation step is done (#133, 2026-08-11): the block is populated on
every evaluation read — OPEN, SKIPPED and PASS alike — so the axis is
real, not v15-style declared-but-inert. The evidence shape is exactly what
this product refuses to derive for itself: the platform's own statement of
what it measured (`operand: "0.0013"`, the live funding rate) against what
the condition demanded (`literal: "0.0004"`), with clause-level TRUE/FALSE
making the boolean structure visible, and `strategyRevision` tying the
verdicts to the revision that defined them.

One branch stays deliberately unmodelled: `verdict` and `decidedBy` have
only ever been observed null, because the account's one condition is
`required: false` — the condition system has never been seen *deciding*.
Those two are carried verbatim and rendered only when the platform says
something, never interpreted.

## What Changes

1. **The domain learns the shape** (`src/domain/agent/scorecard.ts`):
   `ConditionClause` (kind, sectionKey, header, op, operand, literal,
   outcome — strings verbatim; the values' units belong to their columns,
   so nothing here parses them), `ConditionOutcome` (conditionKey, name,
   outcome, required, evidence, provisional), `ConditionReport` (outcomes,
   counts, strategyRevision, provisional, and the two never-observed
   fields verbatim). `EvaluationScorecard` gains
   `conditions: ConditionReport | null` — null when the platform
   publishes none, never an invented empty one.
2. **The shared mapper maps it once**
   (`src/infrastructure/battlegrid/scorecard-mapper.ts`): absent or null
   block → null; an outcome without its `conditionKey` is dropped rather
   than shown nameless (the unattributable-row rule); everything else
   carried verbatim. The public read is untouched by construction — the
   public tool's schema did not gain the block at v17, so absence maps to
   null there without a special case.
3. **The pipeline detail page says it**
   (`app/(app)/agents/[id]/pipeline/[logId]/page.tsx`): a section per
   condition — name, outcome, required marker — with each clause rendered
   as the platform's comparison ("rate ≥ 0.0004 — observed 0.0013 —
   TRUE"), known ops as symbols and unknown ops verbatim, the counts
   line, the strategy revision, and the platform's `provisional` word
   where it says it. No block, no section — the platform publishing no
   condition evaluation is a real state, distinct from unreadable.
4. **Tests**: mapper cases mirroring the observed payload of 2026-08-11
   (populated, absent, null, nameless-outcome dropped); rendering cases
   for the populated section and its absence.

## Out of scope

- Modelling `verdict` / `decidedBy` as meaningful, or the outcome-level
  `counts` (presumably `N_OF`) — unobserved populated; the item keeps the
  gap.
- The scorecard/competitor (public) surface — the public tool does not
  declare the block.
- Any warning or authoring-side rendering of conditions (that lives with
  the strategy surfaces).

## Capabilities

- `agent-understanding` — one ADDED requirement.
