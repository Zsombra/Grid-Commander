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

**The copy MAY be given a name of the user's own.** The name is optional: left
blank, the platform names the copy `<parent> (fork)`, and the form says so
before the copy is made. Why naming matters is stated no wider than the truth
supports — a name of your own tells your copies apart — and the product SHALL
NOT promise that naming avoids any platform behaviour it has not established. A
chosen name is sent to the platform only when one was given, and the control
accepts no more than the platform's declared bound on it, so the bound is met
by construction rather than discovered by refusal.

**A refused copy returns to the form it was asked from.** The platform's
answer, whatever its code, SHALL reach the user in the platform's own words,
with what they typed preserved — not as a crashed page, and not re-diagnosed
into a cause the platform did not state. The copy is made by `fork_strategy`, a
write that runs on `mcp:read` alone and is not flagged destructive by the
platform.

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

#### Scenario: Naming the copy
- **WHEN** a user gives the copy a name of their own and makes the copy
- **THEN** the copy is requested from the platform under that name
- **AND** the control accepts no more than the platform's declared length bound

#### Scenario: Leaving the name blank
- **WHEN** a user leaves the name blank and makes the copy
- **THEN** no name is sent, and the platform names the copy as it always has
- **AND** the form said which name that would be before they chose

#### Scenario: The platform refuses the copy
- **WHEN** BattleGrid answers the fork with a refusal, whatever its code
- **THEN** the reason is shown in the platform's words, on the form acted from
- **AND** the name the user typed is still in the form
- **AND** no cause the platform did not state is offered
