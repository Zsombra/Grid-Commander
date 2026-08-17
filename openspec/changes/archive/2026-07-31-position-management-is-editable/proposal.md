# Proposal: Position Management Is Editable

## Why

`position-management-can-be-edited` (P3, filed from the close of
`a-preset-does-not-constrain-its-config`). Position management is how an
agent exits — trailing, break-even, time decay. Since
`preset-configs-are-discarded` it can be *chosen* at create; it can never be
seen or changed again in this product. And the display half is worse than
absence: an agent may name `WALTHER` while carrying values that are not
WALTHER's, and any surface showing the label alone would lie confidently.
`update_intelligence_agent` accepts `tradingConfig.positionManagement`
(inside the closed 20-key set), so the existing describe→confirm→edit flow
carries it; nothing about the guard changes.

## What Changes

- **Drift is computed in the domain and said on the edit page**:
  `positionDrift` compares the agent's current fourteen values against the
  catalog's config for the preset it names — "matches WALTHER", or "names
  WALTHER, differs on trailingType, trailingFixedPct". `CUSTOM` (values
  deliberately its own) and a catalog that cannot answer produce no claim.
- **The edit page gains a Position management section**: a preset select
  ("leave as it is" default, the five catalog presets offered only when
  their config arrived, and CUSTOM) plus the fourteen fields prefilled with
  the agent's current values. Choosing a preset sends the platform's own
  values wholesale (the same rule as create); choosing CUSTOM sends the
  fourteen fields as edited; leaving the select alone sends no position
  change at all.
- **One coercion, both requests**: the resolved fifteen-key object is
  carried to the confirm form as `pm.*` hidden fields and read back by the
  same typed coercion (`positionFromTransport`) the review used — the DL-5
  lesson, applied before it can bite. The digest the confirmation binds is
  over the resolved values, so agreement about WALTHER's numbers cannot
  spend against different ones.
- **The consequence names the change**: "Position management becomes
  BattleGrid's own WALTHER configuration." / "…becomes fourteen custom
  values." — alongside the existing money sentences.

## Capabilities

**Modified**: `agent-authoring` — one ADDED requirement (position
management is edited with stated values, and drift between label and values
is said).

## Out of Scope

- Live proof of the pm edit (BattleGrid's database is down today); the
  existing limits-edit live proof exercises the identical command path, and
  the payload stays inside shapes `payload-conformance` holds.
- Per-field bounds/validation beyond type coercion — the platform refuses
  out-of-range values and the refusal reaches the form (`?problem=`).
