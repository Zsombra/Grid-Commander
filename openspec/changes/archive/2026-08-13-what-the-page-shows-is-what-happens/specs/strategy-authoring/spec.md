## ADDED Requirements

### Requirement: A Fork Is Taken At The Revision The Page Named
Where the product names the revision a copy will start from, the copy SHALL be
taken from that revision — the one the user was shown and agreed to — and not
from whatever is current when they click.

The revision SHALL travel with the request rather than being read again at
perform time. `fork_strategy` takes `sourceRevision` as a parameter, so a
revision that is no longer current is an ordinary request the platform serves,
not a conflict the product must invent a refusal for.

The product SHALL NOT state which revision a fork came from once it exists: the
platform returns no such field, and a lineage claim it cannot back is a claim
the product does not make.

#### Scenario: The parent moves between reading and clicking
- **GIVEN** a user is shown that a copy will start from a named revision
- **WHEN** the parent strategy is edited before they make the copy
- **THEN** the copy is still taken from the revision they were shown
- **AND** the copy is not taken from the newer revision they never saw

#### Scenario: The parent is gone by the time they click
- **WHEN** the strategy is no longer in the user's listing at perform time
- **THEN** nothing is copied, and the user is returned to the form with the
  reason and the name they typed

### Requirement: A Stale Address Does Not Describe A Current State
Where a page can be reached by an address carrying a past outcome, the product
SHALL consult the entity's current state before it describes that outcome. A
message about what the platform once refused MUST NOT be shown about a strategy
whose state has since moved on.

#### Scenario: A bookmark outlives the state it described
- **GIVEN** an address saying a strategy needed rebuilding
- **WHEN** it is opened after that strategy has been restored
- **THEN** the page describes the strategy as it now is
- **AND** does not say it needs rebuilding

### Requirement: A Listing Shows Every Entry It Was Given
Where the product lists entries, every entry it was given SHALL render. Two
entries that happen to display the same text are two entries, and the list MUST
NOT collapse them into one.

This binds the condition listings in particular, where an entry may carry no key
of its own and a reason may repeat across entries — the cases where display text
is least able to tell two things apart.

#### Scenario: Two entries with no key of their own
- **GIVEN** a submitted list containing more than one entry with no key
- **WHEN** the page lists what it was given
- **THEN** every one of them is shown

#### Scenario: Two entries refused for the same reason
- **GIVEN** two entries the platform refused with identical wording
- **WHEN** the reasons are listed
- **THEN** both are shown, not one
