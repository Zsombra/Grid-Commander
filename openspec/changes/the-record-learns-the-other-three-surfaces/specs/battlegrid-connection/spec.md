## ADDED Requirements

### Requirement: The Platform's Declared Request Budget Is Read

Where the platform's answer carries its declared request budget — the bank
ceiling, what is spendable now, and when the bank refills — the connection
SHALL retain the most recent declaration and expose it to the deployment.

A budget the platform did not declare SHALL be exposed as unstated. It SHALL
NOT be invented, defaulted, or carried forward as though a fresh answer had
declared it — a number the platform never sent is the same class of lie as a
version the handshake never yielded.

The snapshot is transport metadata. It SHALL hold no credential and SHALL NOT
be required for any operation to proceed; a deployment that never consults it
behaves exactly as before.

#### Scenario: An answer declares the budget

- **WHEN** the platform answers with its budget headers
- **THEN** the retained snapshot carries the ceiling, the remaining count, and
  the refill time from that answer

#### Scenario: An answer without budget headers

- **GIVEN** a retained snapshot from an earlier answer
- **WHEN** the platform answers without budget headers
- **THEN** the snapshot is exposed as unstated for that answer rather than
  repeating the earlier numbers as current

#### Scenario: Nothing has answered yet

- **WHEN** the budget is consulted before any platform answer
- **THEN** it is unstated
- **AND** no operation is blocked by consulting it

### Requirement: A Rate-Limited Request Names The Wait

Where the platform refuses a request because the deployment is over its
request budget, the failure the operator reads SHALL say that nothing on
their account changed, and — where the platform named one — the wait after
which the next attempt should succeed.

A wait the platform did not name SHALL NOT be invented; the failure then says
what it says today.

#### Scenario: The platform names the wait

- **WHEN** the platform rate-limits a request and names a retry delay
- **THEN** the failure states the delay in seconds
- **AND** states that nothing on the account changed

#### Scenario: The platform names no wait

- **WHEN** the platform rate-limits a request without naming a delay
- **THEN** the failure carries no invented number
- **AND** still states that the next attempt should succeed
