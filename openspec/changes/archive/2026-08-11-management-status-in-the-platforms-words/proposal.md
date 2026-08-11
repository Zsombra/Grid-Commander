# Management status, in the platform's words

## Why

The exposure surface tells an operator two management facts today: that
the stop and target are the *current* ones ("position management moves
them after the decision"), and what actually rests at the venue. What it
cannot say is whether the management engine is doing anything for the
position in front of them.

v17.2.0 made that sayable: every open position now carries
`breakEvenStatus` and `trailingStatus`. Observed live on 2026-08-11
(#134): present on all 8 open positions across two agents, as plain
strings, all reading `ACTIVE`. The observation is one value deep — the
rest of the vocabulary and the disabled-management case are unseen — so
the build is the verbatim one: the platform's words rendered as
themselves, no enum modelled from a single observed member, a value this
product has never seen rendering as itself.

## What Changes

1. `src/ports/positions.ts` — `OpenPosition` gains
   `breakEvenStatus: string | null` and `trailingStatus: string | null`.
2. `src/infrastructure/battlegrid/positions-adapter.ts` — `mapPosition`
   carries both verbatim; absent maps to null.
3. `src/presentation/components/exposure.tsx` — one line under the
   moved-after-the-decision note: "Management engine: break-even ACTIVE ·
   trailing ACTIVE — BattleGrid's own words." Rendered only when the
   platform said something; absent renders nothing.
4. Fixtures mirror the live read (`ACTIVE`/`ACTIVE`); tests cover
   verbatim carry, absence, and an unseen value rendering as itself.

## Out of scope

- Explaining what a state *means* — the vocabulary is one member deep.
- The disabled-management rendering — unobserved; nothing is invented
  for it.

## Capabilities

- `agent-understanding` — one ADDED requirement.
