## MODIFIED Requirements

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
