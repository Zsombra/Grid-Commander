## ADDED Requirements

### Requirement: A Failed Read Reaches The Surface With Its Reason
Where a read fails and a surface must say so, the reason the read gave SHALL
travel with the failure. A query MUST NOT collapse a failure to its kind alone,
leaving the surface unable to say anything beyond that something went wrong.

The surface SHALL state the reason and the reassurance the product states
everywhere else: a read that did not answer says nothing about whether the work
still exists.

#### Scenario: The strategy could not be read
- **WHEN** the strategy behind the section editor cannot be read
- **THEN** the page names the reason the read gave
- **AND** says the failure does not mean the strategy is gone

#### Scenario: The vocabulary could not be read
- **WHEN** the vocabulary or its templates cannot be read
- **THEN** the page names the reason, the same way
- **AND** does not present it as the strategy having failed

### Requirement: A Value The Page Was Handed Is Checked Before It Is Sent
Where a surface takes a value from its own address and sends it to the platform,
it SHALL check that value first and refuse an unusable one by naming it.

An unusable value MUST NOT be forwarded for the platform to reject. The platform
refusing is a true answer to the wrong question — it says the request was
malformed, where the product already knew which value was malformed and could
have said so.

#### Scenario: An allocation that is not a number
- **WHEN** the address carries an allocation that cannot be read as a whole
  number
- **THEN** the page says so, naming the value it was given
- **AND** nothing is sent to the platform

#### Scenario: A composition that can be returned to
- **WHEN** a rule edit is refused for any reason
- **THEN** the way back leads to what was composed, not to an empty form
