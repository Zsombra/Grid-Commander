# The journal can never show anything

## Why

`/agents/<id>/journal` says **"THE .0 has not recorded anything yet."** One click
away, `/agents/<id>/thinking` lists eighty-five decisions by the same agent.

The adapter reads keys the platform does not send:

```ts
const raw = payload['entries'] ?? payload['journal'];
if (!Array.isArray(raw) || raw.length === 0) return { kind: 'empty' };
```

`get_agent_journal` answers with neither. Called live:

```
{ username, recentThoughts[10], recentActivity[10], recentGames[10] }
```

So `raw` is `undefined`, `Array.isArray` is false, and the method returns
`empty` — for every agent, on every account, since `d51341c`. The rest of the
mapper is invented the same way: `createdAt ?? at`, `type ?? kind`,
`summary ?? title`, none of which appear in an entry.

**It reports the reassuring one of the three states.** `JournalResult` exists to
keep *unreadable* apart from *nothing recorded* — "a user whose roster failed to
load must not be told they have no agents" — and a fourth case defeats it: the
call succeeded, the payload parsed, and the mapper looked in the wrong place. A
lookup miss is indistinguishable from silence, so the product asserts silence.

`tests/agent/journal.test.ts` covers this path and cannot see it. The fake's
`readJournal` returns a field the test assigns, so the test proves the query
forwards a value it was handed. The mapper — the only place the defect lives —
has no test at all.

### What is behind the wrong key

`recentActivity` is the answer to the first question an operator ever asks, and
nothing in this product shows it:

```
Volatilis    INSUFFICIENT_FUNDS   "Insufficient balance. Required: $10,
                                   Available: $0. Deposit USDC to your
                                   HyperLiquid perps account."
             GRID_SKIPPED         "Agent … is halted — new wagers are blocked."
THE .0       GRID_SKIPPED         { reason: low_confidence, threshold: 0.7,
                                    confidence: 0.68 }
             AUTO_SUBMIT_TRIGGERED, GRID_GENERATED
GC probe     AGENT_CREATED        { strategyName: "Stalingrad",
                                    modelDisplayName: "Grok 4" }
```

Volatilis never traded because the account had no balance. BattleGrid recorded
that in plain English. Grid-Commander's answer today is that Volatilis has not
recorded anything.

The requirement was already right — *"they see that agent's thoughts, activity
and decisions as BattleGrid records them"*. The platform returns those three
arrays under those three names. Only the implementation disagreed.

## What Changes

- `readJournal` maps what the platform sends. `recentActivity` becomes a modelled
  domain type, read from live entries rather than from a guess.
- `recentThoughts` reuses `mapThought` — the same entries `/thinking` already
  renders, already modelled from observation.
- `recentGames` is read for its **outcome**: what was submitted, whether it
  settled, and what it scored. Live entries carry `finalScore: null` and
  `outcome: null` while a session is pending, so a pending game is shown as
  pending rather than as a zero.
- The journal page shows the three as three sections, in the order the operator
  asks for them: what it did, what it thought, how it went.
- `metadata` is **not narrowed**. It differs per `eventType`, and `GRID_SKIPPED`
  alone was observed with two shapes. The known ones are read; an unknown one is
  shown as the platform sent it rather than dropped.
- A guard that would have caught this: the adapter's own mappers are exercised
  against recorded payloads, so a key that does not exist fails a test instead of
  rendering as silence.

## Capabilities

- `agent-authoring` — one requirement modified.

## Out of Scope

- **The remaining unmodelled reads.** `get_agent_performance` and
  `get_agent_fund_allocation` are observed and unmodelled. → backlog.
- **`marketSnapshot` inside a thought.** ~40 KB of per-coin indicators per entry.
  `/thinking` reads three fields from it and that stays true here.
- **Paging.** The platform returns ten of each and offers no page argument on
  this tool. Saying "ten" is honest; inventing a pager is not.
- **The navigation defects found on the same walk** — the agent's own page is not
  linked from its row, and `/thinking` and `/limits` name no agent and lead
  nowhere. Separate change.
