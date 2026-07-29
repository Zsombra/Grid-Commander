# agent-authoring — delta

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

## ADDED Requirements

### Requirement: A Destructive Change Is Agreed To By A Person
Where an operation requires a confirmation naming its consequence,
Grid-Commander SHALL obtain that agreement from a person between naming the
consequence and performing the operation.

**Proposing and performing in one request satisfies the guard and defeats it.**
A confirmation the product issues to itself moments before the call records that
the product intended to proceed, which was never in doubt. The token must be
issued in response to one request and spent in response to a later one that a
person initiated, or the consequence is computed, stored for the audit, and read
by nobody.

This has now been got wrong twice, in the same operation, one layer apart: first
inside the command, then inside the action that calls it. The property to hold is
not "a token exists" but "a human saw this sentence and then acted".

#### Scenario: Changing an agent
- **WHEN** a change to an agent is submitted
- **THEN** the consequence is shown and the change is not yet made
- **AND** it is made only on a further request the user initiated

#### Scenario: The consequence that was agreed to
- **WHEN** a confirmed change is recorded
- **THEN** the sentence recorded is the sentence the user was shown

#### Scenario: A change that changes nothing
- **WHEN** a submission would alter nothing
- **THEN** no confirmation is sought and the user is told why
