## MODIFIED Requirements

### Requirement: An Agent's Spending Limits Are Stated Before It Exists
Where the platform declines to default a limit on what an agent may spend,
Grid-Commander SHALL obtain that limit before creating the agent, and MUST NOT
create one whose limits it cannot state.

A platform that defaults a value has decided it. A platform that declines to
default one has not — and treating the second as though it were the first
creates something that trades under limits nobody chose.

**A value that removes a limit SHALL be described as removing it.** BattleGrid
reads `0` as *no cap* on the exposure, drawdown and daily-loss ceilings. A form
that asks "most it may lose in a day", promises "trading stops once this is
reached", and accepts `0` invites the most cautious operator to create the least
bounded agent. Where a value means unbounded, Grid-Commander SHALL say so where
that value is entered, and MUST NOT present the resulting agent as one whose
limits are set.

The same holds when limits are **changed**. `tradingConfig` is all-or-nothing: a
partial send does not error, it resets what it omits, so completeness is checked
before an edit is sent and not only before a create.

**A limit that can be set SHALL be changeable.** Showing an operator a ceiling
they cannot move — or declining to offer the change for a reason that has since
been fixed — leaves them able to read a danger and unable to act on it. Where the
product can write a value, the surface offers it; where it cannot, it says which
of the two reasons applies.

**A limit SHALL be described by what the platform actually meters, and by how
it enforces it.** A ceiling that trips and a base that sizes are different
mechanisms, and an operator who is told the first while the platform does the
second cannot reason about either. `maxConcurrentExposureUsd` is metered on
**margin**, not notional, and it does not trip: BattleGrid sizes each order from
the headroom remaining under it, so as the cap fills, orders shrink, and one
eventually falls under the exchange minimum and is refused without exposure ever
being named. Where the enforcement is silent, the description SHALL carry the
consequence the operator would otherwise have to infer from an agent that simply
stopped trading.

#### Scenario: Composing an agent
- **WHEN** a user composes an agent
- **THEN** they are asked for every spending limit the platform declines to
  default
- **AND** told that the platform sets no default for them

#### Scenario: Changing what an agent may spend
- **WHEN** a user changes an agent's spending limits
- **THEN** the current values are shown as the starting point
- **AND** the limits the platform does not default are all present in what is sent

#### Scenario: A value that removes the limit
- **WHEN** a field accepts a value the platform reads as *no cap*
- **THEN** the user is told, where they enter it, that the limit is removed
- **AND** the wording does not describe a stop that would never fire

#### Scenario: A limit described by the wrong mechanism
- **WHEN** a limit is presented to the operator
- **THEN** the wording names the quantity the platform meters
- **AND** where the platform enforces it by sizing rather than by stopping, the
  wording says so rather than describing a ceiling
- **AND** where the enforcement produces no message of its own, the wording names
  what the operator would otherwise see instead
