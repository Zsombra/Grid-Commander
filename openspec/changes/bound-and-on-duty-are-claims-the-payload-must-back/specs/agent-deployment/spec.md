# agent-deployment — delta

## ADDED Requirements

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
