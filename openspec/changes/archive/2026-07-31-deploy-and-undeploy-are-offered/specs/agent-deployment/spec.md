## Purpose

Deploying and undeploying an agent's radar presence — the acts that start and
stop an agent scanning a market. This is where a configured agent becomes an
acting one, so every operation here is confirmed by a person against the
specific agent and market, and every one is audited.

## ADDED Requirements

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
against the specific agent and market. The confirmation MUST say whose
deployment is replaced, before agreement. Timeframe choices SHALL come from
the platform's own declaration discovered at runtime, never a list compiled
into the product. Where the market carries no deployment, Grid-Commander
SHALL refuse before agreement is sought, stating that the platform does not
permit creating a market's first deployment through this surface —
established live 2026-07-31: the API requires `expectedRevision > 0` and
answers every value with a conflict when no policy exists.

#### Scenario: Deploying to a market with no deployment
- **WHEN** the operator asks to deploy an agent to a market that carries no
  deployment
- **THEN** the request is refused before any agreement is sought
- **AND** the refusal states that the platform cannot create a first
  deployment through this surface

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
