# agent-authoring — delta

## ADDED Requirements

### Requirement: Every Value The Product Sends Is One The Platform Accepts
Where Grid-Commander supplies a value the operator did not choose — a
discriminator, a structural literal, or a completion that makes a required
object whole — that value SHALL be one the platform's own schema permits, and
SHALL be checked against the platform's declared constants rather than against
what this product remembers.

A value nobody was asked for is still a value on the wire. The rule that choices
must come from the platform has always covered what is *offered*; this extends it
to what is *filled in*. The difference is invisible to a user and total to a
server: `create_intelligence_agent` could never succeed, for the life of this
product, because two literals nobody had ever looked at were wrong.

Where the platform declares no default for such a value, Grid-Commander MUST NOT
present its choice as a lookup. The value is named, with what it is and why it is
safe, in one place.

#### Scenario: A value the operator never chose
- **WHEN** the product sends a value the operator was not asked for
- **THEN** that value is one the platform's schema permits

#### Scenario: A value outside the platform's constants
- **WHEN** a value the product sends is not one the platform's schema permits
- **THEN** this fails a check that gates a change, rather than being found by an
  operator whose agent could not be created

#### Scenario: The platform declares no default
- **WHEN** the platform declares no default for a value the product must supply
- **THEN** the product's own choice is stated as its own, with the reason
- **AND** it is not written as a fallback behind a lookup that always misses

#### Scenario: The record of what the platform permits
- **WHEN** the platform's permitted values are recorded for checking against
- **THEN** the record carries the permitted values themselves, not only the
  names of the fields that carry them
