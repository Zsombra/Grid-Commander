# Tasks

## 1. Presentation

- [x] 1.1 In `src/presentation/components/strategy-detail.tsx`, extend the
      trade-level policy section: present the stop-loss floor as the
      platform's own volatility-relative reading — a stop closer than
      {minStopLossAtrMultiple}× the ATR is inside ordinary market movement,
      by the platform's own declaration. Interpolate the actual multiple;
      never hard-code `1`. (Requirement: floor presented as the platform's
      noise reference.)
- [x] 1.2 Word the copy so it claims declaration only: attribute the reading
      to the platform's declaration and do not use enforcement language
      ("enforces", "prevents", "protects", "guarantees") anywhere in the
      section. (Requirement: declaration-only constraint.)
- [x] 1.3 Add the sentence naming where the measured half lives: each agent's
      trading record derives how far its trades actually moved from its own
      closed fills. Prose only — no link resolution, no realized-move figure,
      no import from `read-trading-record`. (Requirement: measured half named,
      not duplicated.)
- [x] 1.4 Keep the existing inert-state note and the three `Threshold` values
      untouched — the three existing scenarios must keep passing as written.

## 2. Verification

- [x] 2.1 Rendering test: with a trade-level policy present, the section
      contains the noise-reference statement carrying the declared ATR
      multiple (use a non-default multiple in the fixture, e.g. `2.5`, so the
      test fails if the copy hard-codes `1`), and attributes it to the
      platform's declaration.
- [x] 2.2 Rendering test: the section's copy contains no enforcement claim —
      assert the absence of enforcement vocabulary in the rendered section
      text, and the presence of the declaration attribution.
- [x] 2.3 Rendering test: the section names the trading record as where
      realized moves are measured, and renders no realized-move figure
      (no `moveOf`/median output in the section; `strategy-detail.tsx` does
      not import from `read-trading-record.query`).
- [x] 2.4 Existing scenarios stay green: policy values visible and labelled,
      no editing control, inert-state notice unchanged
      (`tests/strategy/detail.test.ts` and any rendering suite covering the
      panel).
- [x] 2.5 Quality gates: `npm run typecheck`, `npm run lint`, `npm test`,
      `npm run build`, `npm run db:generate && git diff --quiet drizzle/`;
      `npm run test:db` skipped if no local `DATABASE_URL` (say so).
