# Agent Deployment Specification

## Purpose

Deploying and undeploying an agent's radar presence — the acts that start and
stop an agent scanning a market. This is where a configured agent becomes an
acting one, so every operation here is confirmed by a person against the
specific agent and market, and every one is audited.

## Requirements

### Requirement: Undeploying Names What Stops Happening
Where an agent is deployed to a market, Grid-Commander SHALL offer to remove
that deployment, and SHALL perform it only after a person confirms against
the specific agent and market. The confirmation MUST name what stops: the
agent ceases scanning that market. The removal SHALL carry the deployment's
current revision from a fresh read, and a refusal SHALL reach the person on
the surface they acted from with the platform's own reason.

#### Scenario: Undeploying a scanning agent
- **WHEN** the operator confirms removing an agent's deployment on a market
- **THEN** the deployment is deleted on the platform
- **AND** the confirmation they read named the agent, the market, and that it
  stops scanning there

#### Scenario: The radar moved between reading and confirming
- **WHEN** the deployment changed after the consequence was described
- **THEN** the platform's revision check refuses the stale removal
- **AND** the refusal reaches the operator rather than looking like success

#### Scenario: A removal that is refused
- **WHEN** the platform refuses the removal
- **THEN** the reason shown is the one the platform returned, on the surface
  acted from

### Requirement: Deploying Is Agreed To Against The Market It Touches
Where the operator deploys an agent to a market, Grid-Commander SHALL send
exactly the deployment shape the platform accepts — the chosen market and
timeframe, one slot naming the agent, composed from values the platform's
declaration permits — and SHALL perform it only after a person confirms
against the specific agent and market. Timeframe choices SHALL come from
the platform's own declaration discovered at runtime, never a list compiled
into the product.

Where the market already carries a deployment, the confirmation MUST say
whose deployment is replaced, before agreement, and the write SHALL carry
the existing deployment's revision as `expectedRevision`.

Where the market carries no deployment, Grid-Commander SHALL describe a
first deployment with `expectedRevision: null` and a consequence that names
the agent and the market without naming a replacement. The null revision is
the platform's documented first-deploy signal — established live 2026-08-08:
`upsert_radar_deployment` accepts `expectedRevision: null` as `anyOf:
[integer > 0, null]`, four first deployments created (XRP, AVAX, xyz_jpy,
xyz_gold).

#### Scenario: Deploying to a market with no deployment
- **WHEN** the operator asks to deploy an agent to a market that carries no
  deployment
- **THEN** the consequence shown before agreement names the agent and the
  market
- **AND** it states that this starts scanning, not that it replaces anyone
- **AND** `expectedRevision` is null

#### Scenario: Deploying onto an occupied market
- **WHEN** the chosen market already carries a deployment
- **THEN** the consequence shown before agreement names who is deployed there
  now and that this replaces it

#### Scenario: A timeframe the platform does not declare
- **WHEN** the timeframe choices are offered
- **THEN** they are the platform's own declared values from the live
  connection
- **AND** a value outside them is refused before submission

#### Scenario: A deploy that is refused
- **WHEN** the platform refuses the deployment
- **THEN** the reason shown is the one the platform returned, on the surface
  acted from

### Requirement: An Agent's Standing Is Read Against Its Lifecycle, Not From The Radar Alone
Grid-Commander SHALL derive an agent's standing in a deployment from the radar's
report **and** the agent's lifecycle status together. An agent whose status is
not ACTIVE SHALL NOT be reported as on duty or as in the rotation; it SHALL be
reported as holding the slot without scanning.

The radar reports a slot identically whether the agent in it is active or
archived, so a derivation reading the radar alone answers a different question
from the one asked. Live 2026-08-06, second account: fifteen deployments held an
active agent and one, `SP500@15m`, held only `Volatilis` — archived — which this
product reported as on duty.

The join SHALL be made once, where standing is computed, rather than at each
surface that renders it. Three surfaces render standing, and a check repeated at
each is three places to forget it once.

An open position the radar attributes to the agent SHALL still be reported
whatever the agent's lifecycle. That is a statement about money at stake now,
and a lifecycle status is not evidence that the position closed.

Whether BattleGrid intends an archived agent to keep its slot is not
established — whether archiving is meant to vacate the radar and does not, or
the slot is deliberately preserved so reactivation restores coverage.
Grid-Commander SHALL report the pair it was given and SHALL NOT assert either.

#### Scenario: An archived agent in a slot
- **GIVEN** a deployment whose slot names an agent that is not ACTIVE
- **WHEN** that agent's standing is computed
- **THEN** it is holding the slot and not scanning
- **AND** it is neither on duty nor in the rotation

#### Scenario: An active agent the radar resolves as on duty
- **GIVEN** a deployment naming an ACTIVE agent as on duty
- **WHEN** its standing is computed
- **THEN** it is on duty, exactly as before

#### Scenario: An archived agent the radar says holds the position
- **GIVEN** a deployment whose open position is attributed to an agent that is
  not ACTIVE
- **WHEN** its standing is computed
- **THEN** it is reported as holding that position
- **AND** the lifecycle does not suppress it

#### Scenario: No cause is asserted for the slot surviving the archive
- **WHEN** an archived agent's held slot is described
- **THEN** nothing is said about whether the platform meant to vacate it

### Requirement: A Deployment No Active Agent Holds Is Named As Deployed And Unscanned
Where every agent a radar deployment names is not ACTIVE, Grid-Commander SHALL
state on the surfaces that describe that deployment that the market is deployed
and unscanned.

The radar reports the slot as occupied, so a market held only by archived agents
reads as covered. An operator reading "15 deployments" believes fifteen markets
are covered; on 2026-08-06 one of them was `SP500`, and no surface in this
product said so.

Only that negative SHALL be claimed. Grid-Commander SHALL NOT state that a
market **is** being scanned on the strength of an active agent holding a slot: a
deployment can be disabled, and what the platform schedules is not read here.

Where the deployment names an agent whose lifecycle Grid-Commander did not read,
neither statement SHALL be made. A market called unscanned on the strength of an
agent nobody looked up is the same false certainty in a new place.

#### Scenario: A market whose only slot holds an archived agent
- **GIVEN** a deployment naming exactly one agent, which is not ACTIVE
- **WHEN** the agent's page or roster row describes that deployment
- **THEN** it states that no active agent holds it and the market is deployed
  and unscanned

#### Scenario: A market another active agent still holds
- **GIVEN** a deployment naming an archived agent and an ACTIVE one
- **WHEN** either surface describes it
- **THEN** it is not called unscanned

#### Scenario: A market with an active agent on duty
- **GIVEN** a deployment whose on-duty agent is ACTIVE
- **WHEN** either surface describes it
- **THEN** nothing is added about coverage, in either direction

#### Scenario: A slot naming an agent whose lifecycle was not read
- **GIVEN** a deployment naming an agent absent from the lifecycles read
- **WHEN** either surface describes it
- **THEN** the market is not called unscanned
- **AND** it is not called covered

### Requirement: A Deployment Says Why It Is Not Acting
Where the platform resolves a radar deployment and reports that it did not
qualify, Grid-Commander SHALL state that on the surfaces describing that
deployment, together with the block the platform named.

A deployment that is scanning and not qualifying looks identical to one that is
simply waiting. On 2026-08-13 fifteen of twenty deployments on this account were
not qualifying, each with a named block, and every one of them rendered as an
ordinary deployment. The platform's own resolution carries twenty-two fields and
two were read.

Where the platform reports a **cooldown** the deployment is sitting out, or the
**market regime** it was judged in, those SHALL be shown too. They are the
context that makes a block legible — a deployment blocked in one regime and
qualifying in another is a different fact from one that never qualifies.

Where the platform reports no resolution at all, nothing SHALL be claimed in
either direction, exactly as for a deployment whose agents' lifecycles were not
read.

#### Scenario: The platform named a block
- **GIVEN** a deployment the platform resolved as not qualified, with a block
- **WHEN** a surface describes that deployment
- **THEN** it states that it is not qualifying and names the block

#### Scenario: The deployment qualified
- **GIVEN** a deployment the platform resolved as qualified
- **WHEN** a surface describes it
- **THEN** it is not described as blocked

#### Scenario: A deployment sitting out a cooldown
- **GIVEN** a deployment carrying a cooldown that has not elapsed
- **WHEN** a surface describes it
- **THEN** the cooldown is stated

#### Scenario: The platform resolved nothing
- **GIVEN** a deployment whose payload carries no resolution
- **WHEN** a surface describes it
- **THEN** it is described as neither qualifying nor blocked
- **AND** the row is still shown

### Requirement: A Resolution State The Product Does Not Recognise Is Named, Never Interpreted
Where the platform reports a resolution state or block Grid-Commander does not
model, it SHALL be shown as the platform's own value and SHALL NOT be translated
into a product sentence or collapsed into a recognised one.

The observed vocabulary is two block values from twenty rows on a single
account, and the platform declares states this product has never seen — a
`BLOCKED` section among them, null on every row across two major versions. A
surface that rendered an unseen token as "not qualifying", or an unseen section
as idle, would be inventing a meaning for a value whose range is unknown.

This is what lets an unmodelled state arrive honestly rather than requiring the
product to have anticipated it.

#### Scenario: A block value the product has never seen
- **WHEN** the platform names a block Grid-Commander does not model
- **THEN** the surface shows the platform's own value
- **AND** does not substitute a sentence of its own

#### Scenario: A resolution state the product does not model
- **WHEN** the platform reports a section Grid-Commander does not model
- **THEN** the surface names it as an unrecognised state, showing the value
- **AND** does not present the deployment as scanning or idle on the strength of
  a state it could not interpret
