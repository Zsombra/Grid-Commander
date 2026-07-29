# Tasks

## Model what was observed

- [x] 1. `ThoughtEntry` in the domain: snapshot, reasoning, confidence against
      threshold, outcome. Built from live responses, not the declared schema.
- [x] 2. Outcomes stay open. Recognised ones get copy; an unknown one renders as
      the platform named it.

## Reach it

- [x] 3. `AgentsPort.readThoughtLog` + adapter over `get_agent_thought_log`,
      with `get_user_thought_log` behind the same shape.
- [x] 4. `ReadThoughtLogQuery` — three states, as the roster has: entries, none,
      unreadable.

## Show it

- [x] 5. A route showing decision cycles newest first, confidence against its
      bar, and declined cycles alongside acted ones.

## Guard it

- [x] 6. Unit guards: cleared/not-cleared, absent threshold, unknown outcome.
- [x] 7. Re-inject each and watch them fail.

## Prove it

- [ ] 8. Live read against the operator's account.
- [x] 9. `npm test`, `typecheck`, `lint` green.

## Widen observation

- [~] 10. **Deferred.** Five agentId-taking reads were called by hand to build this; teaching the probe to do it is filed as `probe-skips-every-read-that-needs-an-id`. The probe calls reads needing an id it can discover, so the next
      agent-internals tool is observed before it is modelled.

## Two assumptions the platform corrected

Both were mine, both were caught by asserting against real data rather than a
fixture, and the second is the more useful finding in this change.

**Not every entry carries reasoning.** The live assertion said every one did and
failed. `ERROR` entries have none — two of fifty — because the agent failed
before it wrote anything. `reasonedAtAll` now names that, and the surface must
not present it as an agent that thought nothing; it is an agent that did not get
to think.

**The bar does not gate thinking.** Measured across fifty entries:

```
SUBMITTED                cleared 10   short  0
SKIPPED_LOW_CONFIDENCE   cleared  0   short  3
AGENT_TRADE_THESIS       cleared 29   short  6
```

I had assumed clearing the threshold was what produced a thesis. Six theses sat
below their own bar. The threshold gates whether a thesis becomes a
**submission** — the agent reasons its way to a view first and is gated
afterwards. Two doc comments asserting the causal reading were corrected, and the
`>=` boundary is now marked as the convention it is rather than a measurement it
never was.
