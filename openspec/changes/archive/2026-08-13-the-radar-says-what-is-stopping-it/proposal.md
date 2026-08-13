# Proposal: The Radar Says What Is Stopping It

## Why

Every radar deployment on this account renders as an ordinary scanning
deployment. Read live on 2026-08-13 at v18.2.0, **fifteen of twenty are not
qualifying**, and the platform says why on each one:

```
qualified           false ×15,  true ×5
qualificationBlock  AGGREGATE_BELOW_MIN ×14, ATR_VOLATILITY_BELOW_MIN ×1
cooldownUntil       one row carries a real timestamp
regimeUsed          bull_ranging ×10, bear_ranging ×4, bull_expansion ×4, bear_expansion ×2
section             SCANNING ×20
```

`resolvesNow` carries **22 fields** and `radar-adapter.ts:173-174` reads **two**
— `onDutyAgentId` and `openPositionAgentId`. Everything above is on the wire and
discarded, which is the same shape as the entry-decision mapper that kept 11 of
35 fields and threw away the per-signal checklist.

The deployment surface already holds the rule that *a state the product cannot
explain is rendered as unexplained rather than guessed*. Here the platform
explains it and the product drops the explanation.

## What Changes

- The radar deployment carries what the platform resolved: whether it
  **qualified**, the **block** that stopped it, the **regime** it was judged in,
  and any **cooldown** it is sitting out.
- The deployment surface shows those, so a deployment that is scanning-but-not-
  qualifying reads as that rather than as ordinary.
- **`section` is passed through, not interpreted.** A value this product does not
  recognise renders as unrecognised, naming it verbatim. That is what makes
  `BLOCKED` render honestly the day it first appears — without modelling it now.

## Capabilities

**Modified**: `agent-deployment` — what a deployment discloses about why it is
not acting.

## Out of Scope

- **Modelling `blockedReason` / `blockedSince`.** Null on all 20 rows across
  **two major versions**, and no blocked deployment has ever been observed. #135
  is explicit: observe first. Three dead paths in `HANDOFF.md` began as a schema
  read as an observation, and #198's `protection` block is being left alone for
  the same reason today.
- **`blockedAgents[]` and `summary.blocked`.** Present, always empty, row shape
  unobserved. The same rule applies, and whatever eventually models the
  coin-level block should expect this agent-level sibling.
- **`override_agent_protection`'s `observedLiveStopLoss`.** Wager-scoped; this
  product offers no path to that tool.
- **Interpreting the block vocabulary.** `AGGREGATE_BELOW_MIN` is shown as the
  platform's own token with its own words where the platform gives them —
  translating it into product prose would be inventing a meaning for a value
  whose full range is unknown.

## Impact

| Area | Effect |
|---|---|
| `src/domain/agent/deployment.ts` | `RadarDeployment` gains the resolved fields |
| `src/infrastructure/battlegrid/radar-adapter.ts` | maps them; absence stays non-fatal, as today |
| the deployment surface | shows why a deployment is not acting |
| Data | none — no schema, no migration |
| Live | none — one read the product already makes |

## Risk

The observed vocabulary is **two values from twenty rows on one account**. The
product must therefore render an unrecognised block by naming it, never by
falling back to a default sentence — the same discipline `section` gets. A
surface that says "not qualifying" for a token it has never seen would be
guessing, which is the failure this capability's own rule exists to prevent.
