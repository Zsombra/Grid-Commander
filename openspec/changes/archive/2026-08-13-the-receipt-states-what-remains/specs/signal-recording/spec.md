## MODIFIED Requirements

### Requirement: The Record Is Trimmed By Run, With Ceremony, Stating What Becomes Unknowable
Grid-Commander SHALL offer an age-based trim of the signal record that removes
whole runs — every capture, failure and reading belonging to runs started
before a chosen moment — through the same describe→confirm→perform ceremony as
its other destructive acts. The description SHALL state what becomes
unknowable: how many runs, captures and failed attempts go, across which
coins, spanning which dates, and that nothing trimmed can ever be re-recorded.

The boundary is the run, not the row, because coverage derives gaps from runs:
rows deleted out from under a surviving run would leave the record claiming
attempts whose findings are invisible.

The trim SHALL be scoped to the acting account, and the confirmation SHALL be
bound to the boundary and the described extent, so agreement to one trim
cannot authorise a different one.

#### Scenario: The trim is described before it is offered
- **WHEN** an operator chooses a boundary date
- **THEN** the page states the runs, captures, failed attempts, coins and date
  span that would go
- **AND** states that the trimmed span re-widens every gap it covered and can
  never be re-recorded

#### Scenario: The perform requires the minted confirmation
- **WHEN** the trim is submitted without a confirmation, or with one minted
  for a different boundary or extent
- **THEN** nothing is deleted and the refusal says why

#### Scenario: Only the described span goes
- **WHEN** a confirmed trim runs
- **THEN** runs started before the boundary are removed with their captures,
  failures and readings
- **AND** every run started at or after the boundary survives untouched
- **AND** the trim returns to its caller what was removed — how many runs,
  captures, failed attempts and readings — which is a value the caller
  receives, not a claim any surface makes about the past

#### Scenario: Another account's record is out of reach
- **WHEN** a trim runs for one account
- **THEN** rows belonging to any other account are untouched, enforced in the
  query's own scope rather than checked afterwards

#### Scenario: A describe is never a perform
- **WHEN** the trim page renders its description
- **THEN** nothing is deleted, however many times it renders

## ADDED Requirements

### Requirement: The Trim Receipt States What The Record Now Holds
After a trim completes, Grid-Commander SHALL state what the signal record
**now holds** — where its surviving coverage begins and how much of it there
is — derived from the record when the receipt is rendered.

The receipt SHALL NOT assert what was removed, and SHALL NOT render any claim
about the trim taken from the request URL. A receipt for an irreversible act
must be checkable when it is read: the operator was already told what would go,
in the description they confirmed, so the receipt's job is to confirm the record
is now what they asked for.

#### Scenario: The receipt states surviving coverage
- **WHEN** a confirmed trim completes and the operator lands on the receipt
- **THEN** the page states that the record was trimmed
- **AND** states what the record now holds, read from the record at that moment

#### Scenario: A re-opened receipt is still true
- **WHEN** the receipt address is re-opened later, after further recording or
  a further trim
- **THEN** it states the record's coverage as it stands at that moment
- **AND** never restates a removal as though it had just happened

#### Scenario: An altered address cannot fabricate a removal
- **WHEN** the receipt address is opened carrying an altered or invented
  payload
- **THEN** no figure describing a removal is rendered from it

#### Scenario: The record cannot be read while the receipt renders
- **WHEN** the record does not answer as the receipt is rendered
- **THEN** the page states that the trim completed and that the record's
  coverage could not be read, naming the reason
- **AND** claims neither that the record is empty nor that any particular
  extent survives
