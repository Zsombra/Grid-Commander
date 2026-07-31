## ADDED Requirements

### Requirement: The Record Carries What Each Operation Requires And Accepts, At Every Depth
The record of the platform's surface SHALL carry, for every operation, each
required parameter as a full path from the argument root — not the top level
only — and, for every object the platform closes to an enumerated property
set, that path's accepted property names and the fact that it is closed. Where
an object path is a union of alternatives, each alternative SHALL be recorded
distinguishably, so a check can hold a payload against the alternative it
actually uses rather than against a merge that demands too much or accepts too
little.

A record that stops at the top level checks that a slot is filled and can never
check what fills it. A payload can satisfy every top-level requirement and omit
a required field three levels down; an object closed to twenty keys rejects a
whole payload for one unaccepted twenty-first — and the record could not say
so, which is how an edit path shipped that could never succeed.

#### Scenario: A required field below the top level
- **WHEN** an operation's declaration requires a field nested inside an object
  or an array
- **THEN** the record carries that requirement as a full path
- **AND** a check can ask whether a payload satisfies it without reading the
  declaration itself

#### Scenario: An object closed to enumerated properties
- **WHEN** an operation's declaration closes an object to an enumerated
  property set
- **THEN** the record carries, at that path, the accepted names and the fact
  that the object is closed

#### Scenario: An object that is a union of alternatives
- **WHEN** an object path is declared as a union of alternative shapes
- **THEN** each alternative's required paths and accepted set are recorded
  distinguishably
- **AND** a check can select the alternative a payload uses by the value that
  discriminates them

#### Scenario: The declared record is refreshed without a live call
- **WHEN** the declared portions of the record are regenerated from the
  committed record of what the server declares
- **THEN** every observed response in the record is left exactly as it was
- **AND** nothing is recorded as observed for an operation that was never
  called

### Requirement: A Constructed Payload Is Checked Against Required Paths And Accepted Sets
For every payload Grid-Commander constructs for a platform operation, a check
that gates a change SHALL verify that every required path in the operation's
declaration is present and that no key appears, at any path the declaration
closes, outside that path's accepted set. Where a payload carries an object the
platform itself supplied and Grid-Commander passes through unaltered, the check
SHALL exempt that object's internals explicitly — named as pass-through in the
check — rather than by silently skipping it.

#### Scenario: A required field is missing below the top level
- **WHEN** a constructed payload satisfies every top-level requirement and
  omits a required field nested deeper
- **THEN** the gating check fails
- **AND** it names the missing path

#### Scenario: A key outside a closed accepted set
- **WHEN** a constructed payload carries a key an enclosing closed object does
  not accept
- **THEN** the gating check fails and names the path
- **AND** the failure states that the platform rejects the whole payload for
  it, not just the key

#### Scenario: A server-round-tripped object
- **WHEN** a payload includes an object handed back from the platform rather
  than built by Grid-Commander
- **THEN** the check does not demand Grid-Commander supply that object's
  internals
- **AND** the exemption is visible in the check as a named pass-through, so
  removing it is a decision rather than an accident
