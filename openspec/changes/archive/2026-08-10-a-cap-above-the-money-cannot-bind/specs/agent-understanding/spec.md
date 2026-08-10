# agent-understanding — delta

## ADDED Requirements

### Requirement: An Exposure Cap Is Shown Against The Money Behind It
Grid-Commander SHALL show an agent's concurrent-exposure cap against the account
balance that funds it, and SHALL state plainly where the cap is larger than that
balance.

A cap of $250 on an account holding $43.67 cannot stop anything. It renders as a
limit and reads as prudence, which is the same failure as a stop set inside the
noise: a number that looks careful because nothing sets it against what makes it
careful. The multiple alone is not enough — `5.7×` leaves the reader to work out
which side is larger and what that means, on the one screen built so they do not
have to.

The balance SHALL be described as **the account's**, never the agent's. One
balance funds every agent on the account, so a per-agent surface implying each
holds its own would overstate the money available by the number of agents
sharing it.

Grid-Commander SHALL use the balance the platform publishes and SHALL NOT
derive, apportion or refine it. The platform publishes exactly one balance
figure; the tool that claims to divide it per agent reports nothing committed
for agents demonstrably holding margin, so a division of our own would be an
invention dressed as a reading.

Where the cap is absent or set to the value the platform reads as no cap, no
comparison SHALL be drawn — an unbounded cap is already reported as unbounded,
and a multiple against one would describe a limit that does not exist.

#### Scenario: A cap larger than the balance
- **GIVEN** an agent whose exposure cap exceeds the account balance
- **WHEN** the limits surface renders
- **THEN** both figures are shown with the cap's size relative to the balance
- **AND** the surface states that the cap cannot bind

#### Scenario: A cap the balance can cover
- **GIVEN** an agent whose exposure cap is within the account balance
- **WHEN** the limits surface renders
- **THEN** both figures are shown
- **AND** the cap is not described as unable to bind

#### Scenario: The balance is named as the account's
- **WHEN** the comparison renders
- **THEN** the balance is identified as belonging to the account
- **AND** it is not presented as money held by that agent alone

#### Scenario: An agent whose exposure cap is unbounded
- **GIVEN** an agent whose exposure cap is absent, or set to the value the
  platform reads as no cap
- **WHEN** the limits surface renders
- **THEN** no comparison against the balance is drawn for it

#### Scenario: The platform reports no funded account
- **GIVEN** the account state reports that no account is present
- **WHEN** the limits surface renders
- **THEN** the balance is stated as unavailable
- **AND** it is not shown as a balance of zero

#### Scenario: The balance could not be read
- **GIVEN** the account-state read fails while the agent's other readings succeed
- **WHEN** the limits surface renders
- **THEN** the failure is stated with its reason
- **AND** the exit geometry and the other ceilings are still shown
