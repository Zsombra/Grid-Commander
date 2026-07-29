# Tasks

- [x] 1. `UNBOUNDED_AT_ZERO`, `removesTheLimit`, `unboundedCaps` — from the
      platform's own field descriptions, not inferred.
- [x] 2. The form warns where the value is typed, inside the `aria-describedby`
      hint rather than in a paragraph above the fieldset.
- [x] 3. `MoneySummary` replaces `tradingConfig ? 'configured' : …` and names
      the caps with no ceiling.
- [x] 4. The wrong comment corrected, and its claim replaced with what the
      platform actually says.
- [x] 5. Re-injected three — treating every zero as unbounded (1 failure),
      dropping the form warning (2), returning to "configured" (1).
- [x] 6. 730 tests, `./scripts/check.sh`, typecheck, lint green.

## How this was found

By checking a claim I had just made to the operator, rather than leaving it as a
hunch. The claim was that "Money limits: configured" and the new limits page
disagreed. They did — and following it one step further found something worse
than a wording problem.

The form asks **"most it may lose in a day"**, promises **"trading stops for the
day once this is reached"**, and accepts `0`. BattleGrid reads that as *no daily
limit*. The most cautious answer the wording offers produces the least bounded
agent.

And this file asserted the opposite in a comment I wrote:

> Zero is a real answer to "most it may lose in a day" — it means the same as
> `OFF` for that limit.

Load-bearing, because it is why nothing questioned a zero anywhere else. It sat
inside `name-what-an-agent-may-spend`, a change whose stated purpose was to stop
creating agents "under limits nobody chose": it closed the case where a limit is
**absent** and left open the case where a limit is **zero**, which the platform
treats identically and the form makes the natural thing to type.

**The live account shows the shape of it.** `THE .0` runs with
`maxDailyLossUsd: 0` and `maxCumulativeDrawdownUsd: 0`, and the agent page
called that "Money limits: configured".
