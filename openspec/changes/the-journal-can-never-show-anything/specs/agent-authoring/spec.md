# agent-authoring — delta

## MODIFIED Requirements

### Requirement: An Agent's Reasoning Is Readable
Grid-Commander SHALL let a user read what an agent thought and did, separately
from the record of what Grid-Commander did to their account.

**What the platform records SHALL be read from what the platform sends.** A
mapper that looks for a key the response does not carry finds nothing, and
"found nothing" is indistinguishable from "the agent did nothing" — so the
product asserts silence about an agent that has been busy. Where a reading is
empty, that MUST be because the platform sent an empty collection, not because
a lookup missed.

**An agent's record has three parts and SHALL show all three.** BattleGrid keeps
what an agent *did* separately from what it *thought* and from how a submission
*scored*. The first is the one a user comes for — an agent that is quiet is quiet
for a reason, and the platform states the reason in that record.

**A shape that varies SHALL NOT be narrowed to the case that was seen first.**
Event detail differs per event type, and one type was observed carrying two
different shapes. An unrecognised detail is shown as the platform sent it rather
than dropped, on the same grounds as an unrecognised outcome.

#### Scenario: Reading an agent's journal
- **WHEN** a user opens an agent's journal
- **THEN** they see that agent's thoughts, activity and decisions as BattleGrid
  records them

#### Scenario: An agent that has done something
- **WHEN** BattleGrid holds activity for an agent
- **THEN** the journal shows it
- **AND** does not report that the agent has recorded nothing

#### Scenario: An agent that is not trading
- **WHEN** the platform recorded why an agent declined or could not act
- **THEN** that reason is shown in the agent's own words from the platform

#### Scenario: An event kind this product has no copy for
- **WHEN** BattleGrid records an event kind Grid-Commander does not recognise
- **THEN** it is shown named as the platform named it
- **AND** its detail is shown rather than dropped

#### Scenario: A submission that has not settled
- **WHEN** a recorded submission has no score yet
- **THEN** it is shown as not yet settled
- **AND** not as a score of zero

#### Scenario: Telling the two records apart
- **WHEN** a user is looking at either record
- **THEN** it is clear whether they are reading what the agent did or what
  Grid-Commander did on their behalf
