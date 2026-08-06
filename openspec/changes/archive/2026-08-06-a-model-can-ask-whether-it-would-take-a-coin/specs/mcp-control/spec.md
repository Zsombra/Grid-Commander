# mcp-control — delta

## ADDED Requirements

### Requirement: A Model Can Ask Whether An Agent Would Take A Coin

The MCP surface SHALL let a model ask, for one of the operator's own agents,
whether that agent's gates would admit a trade on a set of coins **right now** —
and where they would not, which gate stops it and by how much.

Every other read on this surface explains something that already happened. A
model asked why an agent is not trading can otherwise only reason forward from
backward evidence, and the answer it needs is one the platform will state
directly, without the agent acting and without spending a decision.

**The answer SHALL state where the screened coins came from, and SHALL state it
as prominently as the verdicts themselves.** The model MAY name the coins; where
it does not, the product chooses them, and which of those happened changes what
the answer means. "None of these qualify" is a finding about the agent when the
agent's owner or the agent's own deployments chose the subject, and a finding
about this product's fallback when it did not. A model that reports the verdicts
without the provenance reports a stuck agent to its owner.

Where the product had to choose, the answer SHALL also say **why** it fell back.
An agent deployed nowhere and an agent whose deployments could not be read
produce the same coins and mean opposite things, and only one of them is a
finding about the agent.

Where no coins could be chosen at all, the tool SHALL say so, and SHALL NOT
answer with a screening of nothing — an empty verdict list reads as "this agent
would take none of them", which is a claim about the agent made on the strength
of a subject that was never chosen.

#### Scenario: A model screens an agent's own coins
- **GIVEN** an agent deployed on coins
- **WHEN** a model calls the screening tool without naming any
- **THEN** it receives a verdict per coin, with each gate as a measured value
  against the threshold it is judged on
- **AND** the answer states that the coins are the agent's own deployments

#### Scenario: The product chose the coins
- **GIVEN** an agent that is deployed nowhere
- **WHEN** a model calls the screening tool without naming any coins
- **THEN** coins from the platform's ranked list are screened
- **AND** the answer states that the product chose them, and that the agent is
  deployed nowhere
- **AND** it names the ranking the coins were taken from

#### Scenario: A fallback that means something else
- **GIVEN** an agent whose deployments could not be read
- **WHEN** the screening falls back to the ranked list
- **THEN** the answer states that the deployments could not be read
- **AND** it does not state that the agent is deployed nowhere

#### Scenario: The model names the coins
- **GIVEN** a model that names the coins to screen
- **WHEN** the tool answers
- **THEN** those coins are screened rather than any the product would have chosen
- **AND** the answer states that they were the ones asked about

#### Scenario: No coins could be chosen
- **GIVEN** neither the agent's deployments nor a ranked list can be read
- **WHEN** the tool answers
- **THEN** it says which coins to screen could not be determined
- **AND** it does not report that no coin qualifies

#### Scenario: The screening cannot be read
- **GIVEN** the platform does not answer the screening call
- **WHEN** the tool returns
- **THEN** the result says it could not be read, as data naming itself rather
  than as a tool failure
- **AND** where the coins came from is still stated
