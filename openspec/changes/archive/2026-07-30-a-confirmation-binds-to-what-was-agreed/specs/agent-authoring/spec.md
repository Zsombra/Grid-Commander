# agent-authoring — delta

## MODIFIED Requirements

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

**And the change performed SHALL be the change described.** *When* the token is
spent was the first half; *what it authorises* is the second, and the two are
independent. An agreement carried across two requests, correctly, still authorised
any amount at all: the token bound to the agent, so a submission that named the
same agent consumed it whatever the numbers said. An edit that alters money is the
one place in this product where the difference between the described change and
the performed change is measured in the operator's own funds.

The values SHALL be those the platform will accept — the ones surviving the
partition that drops fields BattleGrid rejects — so that what was agreed to and
what reaches the wire are the same set, rather than the agreement covering fields
that are silently discarded on the way.

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

#### Scenario: An amount altered after it was agreed to
- **WHEN** an edit is submitted carrying a money value other than the one whose
  consequence was shown
- **THEN** the change is refused before any request is built
- **AND** the agent is unchanged

#### Scenario: Two agreements for one agent
- **WHEN** a user proposes one edit, then proposes a second, and submits the first
- **THEN** each agreement authorises only the change it described
