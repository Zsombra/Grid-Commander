# Tasks

## The guard first

- [x] 1. A guard that a confirmation is not issued and consumed in the same
  request. Derived — find the actions that call `describeEdit`/`propose*` and
  assert none of them also calls the command that spends the token. It must
  **fail on the tree before the fix**, naming `updateAgent`.
- [x] 2. Check the same property for every confirmed operation, not only this
  one, so the guard is about the pattern rather than about one function.

## Make the consequence visible

- [x] 3. Split `updateAgent` into propose and apply. Propose renders the
  consequence; apply spends the token on a request the user initiated.
- [x] 4. Reuse the shape `rebind` already has — hidden token, hidden values, a
  submit button that names what it does, and a way out that does nothing.

## Money limits

- [x] 5. `MoneyLimits` takes current values and prefills. One component, so the
  zero-means-unbounded warning cannot drift between create and edit.
- [x] 6. The edit form sends the six undefaultable fields as
  `tradingConfigChanges`; `applyEdit` merges them onto the rest.
- [x] 7. Delete the refusal copy, which describes a problem that was fixed.

## Verify

- [x] 8. Re-inject: collapse propose and apply back into one action and watch the
  guard fail. Remove the prefill and watch a test catch a form that would blank a
  limit.
- [x] 9. Live: created a throwaway agent on the older account by cloning a real
  agent's full config, drove the form **in a real browser**, applied, read the
  result back from BattleGrid, archived it. The account is back to its nine
  original agents.
- [x] 10. typecheck, lint, tests, `./scripts/check.sh`, `check-serving.sh`.
- [x] 11. File the token-is-not-bound-to-values gap, with `rebind` named as
  carrying the same shape.

## What the browser found that nothing else could

Driving the real button — Playwright against the pre-installed Chromium, because
Next's server-action wire protocol is not worth reverse-engineering — turned up a
defect on the first press:

```
problem: $ACTION_ID_405…: "$ACTION_ID_405…" is not a field this agent owns.
```

The apply action swept `formData.entries()` and skipped the two keys it knew
about, so Next's own action-id field arrived as a proposed change. **A denylist
of framework internals can never be complete**; it is now an allowlist of the
seven fields the form sends. No unit test would have invented that field, and the
hand-built `curl` body I tried first did not carry it.

`partitionEdit` refused it rather than sending it, which is the layered defence
working exactly as intended — the product declined itself and said why.

## Proven end to end, against BattleGrid

```
displayName  GC edit probe …  →  GC edit probe renamed
dailyLoss    10  →  42
drawdown     20  →  99
exposure     30  →  30      (untouched, and it stayed)
revision      1  →  2
23 fields present afterwards — the form sent six, applyEdit merged the rest
```

That last line is the all-or-nothing rule surviving contact: `maxLeverage`,
`maxDailyTrades` and everything else the form never showed came back unchanged.

## The consequence was the find

The review screen initially read *"Replaces every trading limit this agent runs
under."* and nothing else — accurate, and useless. A person agreeing to it could
not tell $25 from $25,000, on the one screen whose entire purpose is that they
read what they are agreeing to.

It now names every value, and says **"to no limit at all"** where the platform
reads `0` as no cap. That is `zero-does-not-mean-nothing` carried to the last
screen before the write, and it was found by walking the finished form rather
than by any test.
