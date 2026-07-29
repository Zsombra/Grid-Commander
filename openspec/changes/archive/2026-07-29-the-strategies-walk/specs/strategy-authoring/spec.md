# strategy-authoring — delta

## MODIFIED Requirements

### Requirement: A Private Copy Is How A Platform Strategy Is Changed
Where a strategy belongs to the platform rather than the user, Grid-Commander
SHALL offer to make a private copy rather than presenting it as editable.

**Where the copy cannot be made, it SHALL NOT be offered.** Telling a user they
are at capacity and then rendering the control twelve times on the same screen
is not a warning, it is a warning ignored by its own page. The platform refuses
the call — *"Strategy limit reached — you can have at most 25 active
strategies"* — so every one of those controls leads to a refusal the page could
have made unnecessary.

This is the rule the product already applies to a delete button it never built
and to a rename input it stopped rendering: a control that cannot work is not
offered, and its absence is explained where it would have been. Explaining the
absence is the half that matters — a control that simply vanishes reads as the
page forgetting rather than refusing.

#### Scenario: A platform strategy
- **WHEN** a user wants to change a strategy the platform owns
- **THEN** they are offered a private copy to change instead
- **AND** the original is not presented as editable

#### Scenario: Capacity for a new strategy
- **WHEN** a user has no room for another strategy
- **THEN** they are told before they begin, and what governs the limit

#### Scenario: The copy that cannot be made
- **WHEN** a user is at capacity
- **THEN** the control that would make a copy is not offered
- **AND** its absence is explained where it would have been

### Requirement: Retiring A Strategy Accounts For What Depends On It
Grid-Commander SHALL state, before a strategy is archived, what is bound to it.
Restoring MUST NOT be presented as guaranteed where the platform may refuse it.

**Declining SHALL return the user to what they were looking at.** Someone who
opens an archive confirmation and decides against it has not finished with the
strategy — sending them to the list loses their place and makes the safe choice
the more costly one.

#### Scenario: Archiving a strategy
- **WHEN** a user archives a strategy
- **THEN** they are first told how many agents are bound to it
- **AND** archiving is described as reversible

#### Scenario: Declining to archive
- **WHEN** a user decides not to archive
- **THEN** they are returned to the strategy rather than to the list

#### Scenario: Restoring is refused
- **WHEN** the platform will not restore a strategy as it stands
- **THEN** the user is told it needs rebuilding rather than being told it failed
- **AND** they are directed to the path that can rebuild it
