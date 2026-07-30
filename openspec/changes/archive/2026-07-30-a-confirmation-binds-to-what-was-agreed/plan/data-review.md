# Data Review: a-confirmation-binds-to-what-was-agreed

## The flow, end to end

```
form / query  →  editIntent            one reader, one coercion
              →  DescribeEditQuery     partitionEdit → accepted
                                       describeEdit(accepted)      → consequence
                                       confirmationTarget.agentEdit(id, accepted)
              →  confirmations.issue   { token, target, consequence }
   ── a second request the user initiated ──
form          →  editIntent            the same reader
              →  UpdateAgentCommand    partitionEdit → accepted
                                       applyEdit(current, typed) → all 20 fields
                                       confirmationTarget.agentEdit(id, intent)
              →  AgentsPort.updateAgent { changes: merged, confirmation: pair }
              →  enforce()             consume(token, user, tool, target)
              →  BattleGrid            only if the target matched
```

## No layer is skipped

Every stage above is present on both requests. The value the user typed reaches
`describeEdit` and reaches the digest; the digest reaches the store on the way out
and `enforce()` on the way back in. Nothing is recomputed from a different source
at any stage — which was the defect: the target was recomputed, from the agent id
alone, in the adapter.

## No hidden recomputation (Iron Rule)

**This change removes two.**

1. The adapter recomputed the target from `params.agentId` / `params.strategyId`.
   That is the Iron Rule violation exactly: a value the upstream layer had already
   decided, derived again downstream from less information. It is now forwarded.
2. The edit page coerced money twice, differently — `pick` kept `"25"`, `numberish`
   produced `25`. One reader now, called from both requests.

## Absent is distinguished from empty

- `editIntent` omits `tradingConfig` entirely when no money field was touched,
  rather than emitting `{}`. "No configuration change" and "a configuration change
  that changes nothing" are different intents and must digest differently.
- A money field left blank is skipped, not sent as `0`. `Number('')` is `0`, and a
  `maxDailyLossUsd` of 0 is the most expensive possible misreading of an empty box
  — the same rule `moneyAnswers` already followed.
- A value that does not parse as a number is carried as the text the user typed,
  not as `NaN`. The platform should refuse their input, not a number we invented.

## The digest input is stable

`canonicalise` sorts keys, so an intent rebuilt in a different property order
digests identically. That matters here and not only in the compile pipeline: the
review builds `{ displayName, tradingConfig }` from a query string and the apply
builds it from a form, and the two need not enumerate in the same order.

Types must also agree, which is why there is one coercion. Sorted keys do not save
you from `"25"` versus `25`.

## Persistence

No schema change. `confirmation_tokens.target` is `text` and already stores
composite targets for two flows; it now stores one more shape of the same kind.
DL-1 records why a `changes` column was not added and when to revisit.

## What the pipeline does not carry

The digest covers the **submitted intent**, not the twenty-field object sent to
BattleGrid. The merge in between is deterministic given the agent's current
config, and `expectedRevision` refuses the write if that config moved — so the
remaining gap is closed by optimistic concurrency rather than by the confirmation.
Stated here and in the architecture review rather than left implicit, because the
requirement's wording is stronger than what the digest alone proves.
