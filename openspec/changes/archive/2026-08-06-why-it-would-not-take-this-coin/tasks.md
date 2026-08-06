# Tasks

- [x] 1.1 Port + adapter for `get_agent_coin_qualification`, mapped from the
      recorded shape; an unreadable answer is never an empty verdict list
- [x] 1.2 A use-case that chooses the coins and says which source it used
- [x] 1.3 A surface: qualifies or not, each gate's measurement against its
      threshold, long and short kept apart
- [x] 1.4 Tests over the observed shape, including a coin that fails one gate
- [x] 1.5 A live probe, and `./scripts/ci.sh` green

## What the live sweep changed

Screening five of the operator's agents against twelve coins on 2026-08-06
produced sixty verdicts, and three of them changed the code:

- **`requiredCount` came back `NOT_ENFORCED` with `count: 0, min: 0` on every
  single one.** Rendered as a measurement that reads "0 signals against a
  minimum of 0" — a gate that looks satisfied by accident, on the surface whose
  entire job is to say what is stopping the agent. This capability already
  carries the requirement for that exact mistake one surface out:
  *A Limit Nobody Set Is Not A Limit Of Zero*. The gate renders "no minimum set
  — this gate cannot stop it" instead, and a rendering test pins it.
- **Long and short genuinely disagree.** CONTRARIAN on LINK stops long at
  `ATR_VOLATILITY_BELOW_MIN` and short at `CANDIDATE_LEVELS_UNAVAILABLE`. Two
  obstacles, one coin, one call — and different settings to reach for.
- **One unknown ticker fails the whole call.** `["BTC","ZZNOTACOIN"]` answers
  `NOT_FOUND` with no verdicts at all. Reported as unreadable, never as coins
  the agent would not take.

Also observed and acted on: `CANDIDATE_LEVELS_UNAVAILABLE` is the **commonest**
stop and is not a gate — it is the construction step before them. The surface
says "Stopped at", not "first gate to fail", for that reason.
