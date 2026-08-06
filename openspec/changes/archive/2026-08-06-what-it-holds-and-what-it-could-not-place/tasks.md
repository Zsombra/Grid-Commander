# Tasks

- [x] 1.1 Positions port + adapter from the recorded shape; unpriced figures
      stay null rather than becoming zero
- [x] 1.2 A use-case reading exposure and filtering to one agent
- [x] 1.3 The open position on the agent surface, with the effective stop
      labelled as current and the priced-at time stated
- [x] 1.4 Entries that never became an order, stated as a finding from the
      funnel the product already reads
- [x] 1.5 Relabel `/pipeline`'s stop as the stop at the decision
- [x] 1.6 Tests over the observed shapes, including an unpriced position
- [x] 1.7 Live probe, `all-controllers-probe` extended, `./scripts/ci.sh` green

## Notes from the build

**The position closed while this was being written.** Open at 17:10, gone by
19:10 — which is exactly why `exposure-probe` asserts the *shape* of whatever
it finds and prints which branch it saw, rather than demanding a position. A
probe that required `holding` would pass or fail on market timing.

The live probe now reports the second P1 through the product's own path:

```
THE .0: flat · fills 27 executed / 28 failed of 60
```

**No new read was needed for the fill finding.** `AgentFunnel` has carried
`executed`, `failed` and `enterDecisions` since Phase 2, and `/pipeline` has
rendered them all along — as a row of figures, where 28 reads as a number
rather than as half of everything the agent decided. The change is the
sentence, not the data.

**Two figures deliberately not reconciled.** BattleGrid reports
`fillRatePercent: 63` where the counts give 27 of 60, which is 45%. They are
computed differently and this product does not know how, so both are shown and
each is attributed. Merging them would invent an agreement.
