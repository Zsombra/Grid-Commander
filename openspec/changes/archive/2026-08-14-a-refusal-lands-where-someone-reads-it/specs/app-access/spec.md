## MODIFIED Requirements

### Requirement: A Refused Confirmation Reaches The Person Who Spent It
When a confirmation is refused — already used, expired, mismatched, or
unrecognised — Grid-Commander SHALL tell the operator which of those happened,
on a surface they can act from. It MUST NOT surface the refusal as an
unhandled failure, because the most common cause is a second press whose
**first** press succeeded, and a page reporting a broken server to someone whose
change landed is worse than silence.

#### Scenario: A confirmation that was already spent
- **WHEN** a confirmation is presented that has already been consumed
- **THEN** the operator is told the confirmation was already used and that the
  change may have landed
- **AND** they are told to check its state rather than to retry

#### Scenario: The four causes are told apart
- **WHEN** a confirmation is refused
- **THEN** the reason distinguishes already-used, expired, mismatched and
  unrecognised
- **AND** each names the next step it earns, because they differ: an expired
  confirmation means review again and nothing is wrong, while a mismatched one
  means the values moved since the consequence was read

#### Scenario: The refusal lands where the operator was standing
- **WHEN** a refusal returns the operator to a surface
- **THEN** it is a surface that can act on it, carrying the reason
- **AND** the reason survives whichever state that surface now describes

#### Scenario: The landing surface is a checked property, not a remembered one
- **WHEN** any surface sends a refusal's reason onward as a `problem`
  parameter
- **THEN** a check that gates a change derives the destination from the
  redirect itself and fails unless the page serving it reads the parameter
  and renders it on every branch that page can take
- **AND** the check's derivation is exercised against a planted offender it
  must report, so the two roads this scenario was written for cannot go
  silently dark again by the check itself going blind
