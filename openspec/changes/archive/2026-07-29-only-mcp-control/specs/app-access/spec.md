# app-access — delta

## MODIFIED Requirements

### Requirement: The Composed Application Is Assembled Once, From Configuration
Grid-Commander SHALL construct the adapters that reach BattleGrid and the
database in one place, from configuration read at startup. A request MUST NOT
construct its own route to BattleGrid.

**The application SHALL reach BattleGrid and nothing else.** This product exists
to control BattleGrid agents over MCP. A second outbound destination is a second
place a user's data can go, a second credential to hold, and a second reason a
deployment can fail — and it must therefore be a decision someone makes on
purpose, not something that accumulates.

The one that had accumulated was a model API behind an assistant, which could
never be exercised: no credential for it existed in any environment this product
was built in, so the surface shipped saying it was unavailable. It was removed
rather than carried.

This does not constrain what a *BattleGrid agent* runs on. An agent's brain is
chosen from BattleGrid's own catalogue of approved models, and those model
identifiers name someone else's inference — reached by the platform, never by
this product.

#### Scenario: A request reaching BattleGrid
- **WHEN** any request causes a BattleGrid call
- **THEN** it goes through the single composed adapter
- **AND** the guard sequence applies to it

#### Scenario: An outbound destination that is not BattleGrid
- **WHEN** the application is inspected for the hosts it can reach
- **THEN** BattleGrid's MCP endpoint is the only one

#### Scenario: Configuration is missing
- **WHEN** required configuration is absent
- **THEN** the application does not start
- **AND** it does not run with a value it invented

#### Scenario: Credentials a deployment must hold
- **WHEN** a deployment is configured from the documented variables
- **THEN** the only third-party credential it needs is for BattleGrid
