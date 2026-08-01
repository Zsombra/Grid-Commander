# Design — the-scorecard-is-tunable

## The shape

The rebind/deploy ceremony, applied to a strategy's rule:

```
/strategies/[id]/rules/[signalId]
  no proposal in the query   → the tuning form (allocation, required,
                               declared params prefilled from the rule)
  proposal in the query      → DescribeRetuneQuery: fresh read, membership,
                               no-op check, consequence, token
  confirm form POST          → RetuneRuleCommand → updateSignalRule
  refusal                    → redirect back with ?problem= (+ the proposal
                               preserved so the describe re-runs)
  success                    → redirect to /strategies/[id] (the fresh read
                               is the proof)
```

## Decisions

**D1 — the token binds strategy, revision, signal, and a values digest.**
`confirmationTarget.strategyRule(strategyId, revision, signalId, intent)`
with `digestOf({allocation, required, params})`. Values because this is a
value-carrying write (the `agentEdit` precedent — the edit-binding guard
demands it). Revision because the perform recomputes the target from the
submitted hidden fields: a tampered `expectedRevision` then fails the
digest match in the guard instead of relying only on the platform's
CONFLICT — defense the rebind trio established. The platform's own
`expectedRevision` check still stands behind it.

**D2 — membership before minting.** The signal must already be one of the
strategy's `signalRules`. Adding a rule is unproven against the platform
and out of scope; the describe refuses without minting, the same way an
unlisted signal id never reaches `get_strategy_signal_definition`.

**D3 — params are the signal's declared ones, always sent when declared.**
The form renders the definition's `paramSchemaJson` fields prefilled with
the rule's current values (falling back to declared defaults). When the
signal declares parameters the proposal always carries all of them — the
`agentEdit` merge lesson: a partial send leaves the platform to decide what
an omission means. A signal declaring none sends none.

**D4 — no local scope gate.** Whether a SYSTEM strategy's rules may be
edited is the platform's ruling; the describe does not pre-judge it. A
platform refusal arrives on the `?problem=` channel in its own words.

**D5 — the response passes through opaque.** The tool's success payload has
never been observed. The adapter returns it unmapped; the surface proves
the write by the redirect's fresh read, not by trusting an unobserved
shape.

## File changes

- `src/domain/capability/confirmation.ts` — `strategyRule` target builder.
- `src/ports/strategies.ts` — `updateSignalRule` on the port.
- `src/infrastructure/battlegrid/strategy-adapter.ts` — the write, with the
  declared `{request: …}` envelope.
- `src/application/use-cases/retune-rule.command.ts` — describe + perform.
- `src/composition.ts` — wiring.
- `app/(app)/strategies/[id]/rules/[signalId]/page.tsx` — the surface.
- `src/presentation/components/strategy-detail.tsx` — rule rows link to it.
- Guards: `tests/architecture/payload-conformance.test.ts` (new case),
  `tests/architecture/reachability.test.ts` (pins as derived).
- Tests: `tests/strategy/retune.test.ts`, `tests/rendering/retune.test.ts`;
  fakes extended; live probe `tests/live/retune-probe.test.ts` (slot
  shuffle, platform permitting).
