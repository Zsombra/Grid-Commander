# agent-understanding — delta

## ADDED Requirements

### Requirement: The Brain Is Shown Under The Platform's Human Name For It
Where BattleGrid reports a human-readable name for an agent's brain,
Grid-Commander SHALL show that name where the brain is described. Where it
reports none, the surface SHALL fall back to what it showed before — the
platform's own discriminator or model id — and SHALL NOT invent a name.

The read-back flattens the request's two-branch brain union into one field:
every agent observed on both accounts reads back `brainPreset: "CUSTOM"`,
each with a distinct real model beneath it. On read, that word cannot say
whether the brain is a preset or a named model, so the surface SHALL NOT
claim either — it states the name the platform reports and nothing more. The
`provider` field has only ever been observed null and SHALL NOT be rendered.

#### Scenario: A brain the platform names
- **GIVEN** an agent whose payload carries a human-readable model name
- **WHEN** the agent's page describes its brain
- **THEN** that name is shown
- **AND** the surface does not assert that the brain is a preset or a custom
  model

#### Scenario: A brain the platform does not name
- **GIVEN** an agent whose payload carries no human-readable model name
- **WHEN** the agent's page describes its brain
- **THEN** the surface shows what it showed before this change
- **AND** no name is invented for it

### Requirement: What An Agent Has Spent Is Shown Where Stoppage Is Explained, Without A Ceiling
Grid-Commander SHALL state, on the surface that explains what would stop an
agent, that spend is a further way BattleGrid can stop it, and SHALL show the
running 24-hour spend the platform reports. It SHALL NOT present a spend
ceiling, a gauge, or any proximity to being stopped — BattleGrid publishes no
spend cap on any read, and the only cap ever observed arrived inside a breach
message as prose, which SHALL NOT be parsed into a figure.

The figure SHALL be read from the roster read (`list_intelligence_agents`)
and never from the agent detail read: the two disagree stably for the same
agent at the same moment — list `0.09022839`, detail `0` — and the detail's
zero would show an agent that is spending money as one that is not
(`the-cost-of-an-agent-reads-differently-from-two-tools`).

#### Scenario: An agent with reported spend
- **GIVEN** an agent whose roster row carries a running 24-hour spend
- **WHEN** the user reads what would stop it
- **THEN** the total is shown, sourced from the roster row
- **AND** it is presented without a ceiling or a gauge
- **AND** the surface says no spend cap is published to read it against

#### Scenario: An agent whose roster row carries no spend figure
- **GIVEN** an agent whose roster row reports no spend
- **WHEN** the user reads what would stop it
- **THEN** the surface says no figure was reported
- **AND** does not show zero in its place

#### Scenario: The roster cannot be read
- **GIVEN** the roster read fails
- **WHEN** the user reads what would stop the agent
- **THEN** the surface says what it has spent could not be read, with the
  shared explanation
- **AND** does not report the agent as having spent nothing
