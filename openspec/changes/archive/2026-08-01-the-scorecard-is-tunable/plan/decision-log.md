# Decision Log — the-scorecard-is-tunable

## DL-1 (PLANNING) — the token binds revision as well as values

`strategyRule(strategyId, revision, signalId, digestOf(intent))`. The
`agentEdit` precedent binds values; the rebind trio binds the revision that
was described. This write is both value-carrying and fleet-wide, so it gets
both: a tampered hidden field — values *or* `expectedRevision` — fails the
recomputed target in the guard before the platform is ever asked. The
platform's own CONFLICT check remains behind it.

## DL-2 (PLANNING) — editing only; adding is out of scope

The tool's description says "update exactly one signal allocation";
whether it creates a rule for an absent signal is unobserved. The describe
therefore requires membership in the strategy's current `signalRules` and
refuses without minting. Adding rules belongs to compile→apply with
`strategy-draft-preview`.

## DL-3 (PLANNING) — declared params always sent when declared

The `agentEdit` lesson: a partial config send let the platform decide what
omissions meant. The form carries every parameter the signal's definition
declares, prefilled from the rule's current values (declared defaults as
fallback), and the proposal digests exactly what will be sent.

## DL-5 (EXECUTION) — walked live on a zero-bound fork, first attempt

2026-08-01, the slot shuffle: DIST-03 parked → Dunkirk forked →
`bollinger_cci_overbought` described (blast radius zero stated with the
inheritance warning) → retuned allocation 0→1 through
describe→confirm→perform → read back at allocation 1, r1→r2 → fork parked,
DIST-03 restored. Account as found. The write's success payload carries a
`strategy` object (consistent with its siblings); it remains pass-through —
the proof is the re-read, per design D5.

## DL-4 (EXECUTION) — the platform names its own refusals

No local gate on SYSTEM strategies or parameter ranges beyond the declared
input bounds: the platform's refusal arrives in its own words on
`?problem=`. Pre-judging would replace its teaching with this product's
guess — the same rule the column workbench follows.
