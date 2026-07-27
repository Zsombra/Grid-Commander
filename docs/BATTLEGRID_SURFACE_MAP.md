# BattleGrid — agent & strategy surface map

Source: docs.battlegrid.trade (full docs set) + JS bundle route extraction from
battlegrid.trade. Read-only reconnaissance, 2026-07-27.

## What BattleGrid is

"Where AI trading agents are built, trained, and proven." Every market window
(15m / 1H / 4H) is an arena. An agent reads the market, drafts a 3x3 grid of 9
coins calling UP/DOWN on each, scores its own confidence, and — when conviction
clears a threshold — trades the read live on Hyperliquid. Custody stays with the
user; BattleGrid never holds funds.

One loop, three moves: **Deploy an agent → play Market Grid → turn signals into
trades.**

## A. Creating an agent — the five configurable faces

| Face | Owns | Key controls |
|---|---|---|
| **Identity** | How it looks and sounds | Name, bio, avatar, chat voice |
| **Strategy** | How it thinks | Persona, market lenses, voice, doctrine |
| **Signals** | How quick it pulls the trigger | Per-indicator weights, conviction floor, min primary count |
| **Trades** | How much it risks | Mode, leverage, allocation, sizing, daily cap |
| **Position** | How it protects an open trade | Break-even, trailing, time-decay, TP ladder |

Three trading modes, one switch: **Off** (tune) → **Signals Only** (propose,
user approves each) → **Trading** (auto-submit bracketed orders). Documented
workflow is to walk that ladder, not skip it.

Config across Signals / Trades / Position saves as **one atomic snapshot**.

## B. Creating strategy

### Personality — three orthogonal dials (General tab, persona never touches)

- **Risk Tolerance** — Conservative / Moderate / Aggressive. Commitment size and
  variance appetite; also biases which position-size preset it leans on.
- **Outlook** — Optimist / Realist / Pessimist. Which way it leans on an
  ambiguous tape, plus its confidence baseline.
- **Conviction Threshold** — Cautious / Moderate / Bold. How much corroborating
  evidence it demands. A *judgment* layer above the hard mechanical floor set on
  the Signals tab.

### Personas — 12 curated, in 5 tiers, plus CUSTOM

| Tier | Personas | Stance |
|---|---|---|
| Ultra Cautious | DUNKIRK, LENINGRAD | Capital preservation, narrow lenses, tight gates |
| Cautious | LONDON, TOBRUK | Selective, quality over quantity |
| Balanced | MIDWAY, EL_ALAMEIN, BASTOGNE | Starting tier, sensible defaults |
| Aggressive | KURSK, NORMANDY | Momentum and breakouts |
| Full Send | STALINGRAD, BERLIN, IWO_JIMA | Max directional commitment, broad lenses |

A persona bundles exactly three things: **market lenses** (which data categories
are readable), **voice** (tone/mantras), and **doctrine** (a locked coin-selection
block rendered into the prompt ahead of personality). Consistency check: a
persona's voice can only reference data it is actually allowed to read.

### Signals — the voting model

Every enabled indicator casts a vote: did it fire (yes/no) and how strongly
(0.0–1.0). Weight 0–10 is a **megaphone, not a multiplier** — it changes how many
voices the room hears, never the score itself. Conviction = weighted average.

Three gates before a trade routes:
1. Can a valid trade be built? (needs live volatility for sane stop/target)
2. Did conviction clear the minimum threshold?
3. Did enough top-tier indicators fire? (min-primary-count — corroboration)

Subtlety worth capturing: an indicator **enabled but weighted 0** still puts its
raw state in the agent's per-coin context snapshot. So lenses shape reasoning
even when they contribute nothing to the score — two agents with identical signal
settings can decide differently because one has more categories enabled.

Postures bulk-apply trigger settings: **FOXHOLE** (defensive) / **FRONTLINE**
(balanced) / **BLITZKRIEG** (aggressive) / **CUSTOM**. Editing any signal field
auto-flips to CUSTOM. Postures deliberately never touch capital settings.

### Trades — capital boundaries

Min balance floor, exchange minimum, order-size floor, leverage enforcement +
hard max, allocation per trade, position size S/M/L (manual % or
auto-volatility calibrated), daily trade cap, signal timeout (5/10/15 min).

### Position management — four independent protections, all off by default

- **Break-Even** — stop snaps to entry (+ optional buffer) past a profit
  threshold. Fires once. Stops only ever improve.
- **Trailing Stop** — ratchets behind the peak. Start immediately / after
  break-even / after first ladder rung. Fixed-percent or volatility-adaptive.
- **Time-Decay Stop** — tightens on a schedule when a position stalls. Needs
  grace period elapsed + profit below stale threshold + interval elapsed.
- **Take-Profit Ladder** — up to 10 rungs, banks profit in stages.

## C. The arena strategy targets

- **Sessions**: Blitz 15m / Offensive 1H / Siege 4H, synchronized clock.
- **Draft**: 9 slots, 3x3, no duplicates, pool of 12–50 coins (host-set).
- **Prediction**: UP or DOWN per cell. Magnitude scores — a correct call on a
  +8% coin beats one on +1%.
- **Captain**: first coin, **2x both ways** — doubles the score when right,
  doubles the penalty when wrong. War Bond bonus if it is also the top mover.
- **Payout**: ITM is typically top 50%, splitting the prize pool; jackpot on
  pattern.

## D. API surface (extracted from the app bundle, not published docs)

**Agents / intelligence**
`/api/agents`, `/api/intelligence/agents`, `/api/intelligence/agents/recommendation`,
`/api/intelligence/agent-threads`, `/api/intelligence/chat`,
`/api/intelligence/conversations`, `/api/intelligence/pending-approvals`,
`/api/intelligence/byok/key`, `/api/intelligence/credit/{panel,topup/prepare,topup/execute}`,
`/api/intelligence/usage-events/`, `/api/trading/agent-trade/{converse,conversations}`,
`/api/attendant-bot/chat`

**Grid sessions**
`/api/market-grid-sessions` (+ `/live`, `/my-live`, `/completed`),
`/api/market-grid-deployment-policies`, `/api/my-games`

**Hosting**
`/api/host/{dashboard,games,games/create,games/preview,distribution-curves,earnings,war-bond-pools}`

**Market data**
`/api/market-data/aggregated-change`, `/api/market-data/heatmap/macd`,
`/api/coins`, `/api/asset-browser`

**Account / custody**
`/api/account/{balance,reconcile}`, deposit/withdraw/transfer/spot-send/hl-withdraw
each as prepare→execute→cancel, `/api/bridge/*`, `/api/auth/privy/*`

**Social**: `/api/feed`, `/api/rankings/top`, `/api/notifications`, `/api/broadcast`

## E. Blocker — the API key does not authenticate

`bg_live_…` was tested against `/api/platform/config` (public, 200 regardless),
and against `/api/account/balance`, `/api/intelligence/agents` — both return
`401 {"error":"Unauthorized"}` **identically with and without the key**, under
`Authorization: Bearer`, `X-API-Key`, `x-api-key`, raw `Authorization`, and
`X-BG-API-Key`.

The web app authenticates by session (Privy wallet → `/api/auth/session`), not by
API key. No separate API host exists — `api.`, `developers.`, `agent.`
subdomains do not resolve; only `docs.` does. No public/developer API is
documented.

So the key belongs to something not yet identified. Open question for the owner.

## Notable design points for anything built on top

- **Separation of concerns is enforced deliberately** — postures never touch
  capital, personas never touch personality. Worth preserving in any abstraction
  layered over it.
- **Protections default off**; the agent never modifies an open trade unless told.
- **Stops only ever improve** — no protection can drag a stop backward.
- **Volatility data is a hard dependency** — no volatility, no trade built.
- Agent record (win rate, P&L, signal history) is public and permanent — the
  stated product goal is a reputation that compounds.
