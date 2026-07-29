# battlegrid-connection — delta

## ADDED Requirements

### Requirement: What The Platform Returns Is Observed Wherever It Can Be
Where a read tool's required arguments can be satisfied from what the platform
has already returned, Grid-Commander's surface probe SHALL call it and record
the response shape. Where they cannot, it SHALL record which argument was
missing rather than reporting the tool as merely skipped.

A declared schema is what a server says; an observed response is what it does.
Every defect this product has found came from the second, and the tools that
could only be modelled from the first are where the next one is waiting. A probe
that reaches a fifth of the surface leaves four fifths to be built on
declarations.

The probe SHALL call only tools the server annotates as read-only, and that
filter MUST be applied in code before a request is built rather than by the
care of whoever runs it. Supplying arguments widens what can be observed; it
MUST NOT widen what can be called.

#### Scenario: A read whose arguments can be discovered
- **WHEN** a read tool requires an argument the probe can take from a response
  it already holds
- **THEN** the tool is called and its observed shape recorded

#### Scenario: A read whose arguments cannot be discovered
- **WHEN** a required argument cannot be satisfied from what the platform
  returned
- **THEN** the tool is not called
- **AND** the record names the argument that was missing

#### Scenario: A tool that changes things
- **WHEN** a tool is not annotated read-only
- **THEN** it is never called, whatever arguments could be supplied
- **AND** this holds as a property of the code rather than of the operator
