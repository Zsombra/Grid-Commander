## ADDED Requirements

### Requirement: A History That Refuses In Part Is Read Around, Not Abandoned
Where the platform refuses part of an agent's block history but serves the rest,
Grid-Commander SHALL summarise what it can read rather than reporting the whole
history as unreadable.

A single refused row currently darkens the entire summary, because the history is
requested in one call. On 2026-08-13 that left all three active agents on
the operator's account reporting `unreadable` while the platform was serving
hundreds of blocks one page away — including the condition the surface exists to
name. Three archived agents on the same account summarised normally, because the
refusals track the newest rows.

The fallback SHALL engage **only when the ordinary read refuses**. A platform
that answers costs exactly one call, and the workaround retires itself when the
refusals stop rather than remaining as permanent machinery.

Where nothing at all can be read, the result SHALL remain unreadable. Reading
around a refusal is not the same as inventing a summary from nothing.

#### Scenario: Part of the history refuses
- **GIVEN** a history whose first page refuses and whose later pages serve
- **WHEN** the stoppage summary is read
- **THEN** it summarises the blocks that were served
- **AND** it is not reported as unreadable

#### Scenario: The platform answers normally
- **GIVEN** a history the platform serves in one call
- **WHEN** the summary is read
- **THEN** exactly one call is made

#### Scenario: Every page refuses
- **GIVEN** a history where no page can be read
- **WHEN** the summary is read
- **THEN** the result is unreadable, with the platform's reason
- **AND** no summary is presented

### Requirement: A Summary Assembled Around A Refusal Says What It Could Not Reach
Where a stoppage summary was assembled from a history that refused in part,
Grid-Commander SHALL state that some of it could not be read, and SHALL state
when the summarised window ends.

**The refused rows are the most recent ones.** The platform's refusals cluster at
the head of the history, so a summary built from what survives is biased toward
the past — and this surface answers *what is stopping this agent now*. A
condition counted over a window that ends hours ago, presented without that
window, reads as current and may not be.

A summary that omitted refused rows silently would be worse than the outage it
worked around, because an outage is visibly nothing and a partial summary looks
like everything.

#### Scenario: The summary is partial
- **GIVEN** a summary assembled from a history that refused in part
- **WHEN** it renders
- **THEN** it states that part of the history could not be read
- **AND** it states when the window it summarised ends

#### Scenario: The summary is whole
- **GIVEN** a history that served completely
- **WHEN** the summary renders
- **THEN** nothing is claimed about unreadable rows

## MODIFIED Requirements

### Requirement: A Block That Keeps Repeating Is Reported As A Condition
Where the same reason has stopped an agent more than once, Grid-Commander
SHALL report it as a standing condition — with how many times it occurred, the
window it occurred over, and when it last happened — rather than as a list of
individual events.

An agent stopped ninety-eight times by one reason over a week is not having a
run of bad luck. It is in a state, and the state is what its owner needs to
act on. A list of the ten most recent blocks makes the ninety-eighth look
exactly like the first, which is how an agent can sit unable to trade for a
week while every surface reports normally.

The summary SHALL be derived from the blocks the platform actually returned,
never from a table of which reasons this product believes are permanent. Where
the platform reports more blocks than were read, Grid-Commander SHALL state the
size of the window it summarised and that more exist.

**A block the platform refused to serve is not a block that did not happen.**
Where part of the history could not be read, the count SHALL be presented as a
count over what was readable, and SHALL NOT be presented as the agent's total.

#### Scenario: One reason, many times
- **GIVEN** an agent whose blocks are dominated by a single reason
- **WHEN** the user reads what is stopping it
- **THEN** that reason is shown with its count, its window and its most
  recent occurrence
- **AND** it is presented as an ongoing condition rather than as one event

#### Scenario: A reason that happened once
- **GIVEN** a reason that appears a single time in the history read
- **WHEN** the summary renders
- **THEN** it is shown as a single occurrence
- **AND** is not described as a standing condition

#### Scenario: More blocks than were read
- **GIVEN** the platform reports more blocks than the page returned
- **WHEN** the summary renders
- **THEN** the surface states how many were summarised and how many exist
- **AND** does not present the summary as the agent's whole history

#### Scenario: Blocks the platform refused
- **GIVEN** a history where some rows were refused rather than merely unread
- **WHEN** the summary renders
- **THEN** the counts are presented as counts over the readable history
- **AND** are not presented as the agent's total

#### Scenario: An agent nothing has stopped
- **GIVEN** an agent with no gate blocks
- **WHEN** the summary renders
- **THEN** the user is told nothing has stopped this agent
- **AND** that is distinguished from a history that could not be read
