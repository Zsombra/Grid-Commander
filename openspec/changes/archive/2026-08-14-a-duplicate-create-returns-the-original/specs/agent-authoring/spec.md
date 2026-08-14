## ADDED Requirements

### Requirement: A Create Submitted Twice Is One Create
Where a create is submitted carrying the same idempotency key as an earlier
submission, Grid-Commander SHALL NOT create a second agent and SHALL NOT show a
framework error page. Only a create that **succeeded** dedupes: a failed
attempt's key is retryable, because the retry after a failure is the situation
the key exists to make safe.

What the operator is told depends on what the first attempt did, and the
distinction SHALL be carried by the outcome the product recorded, not inferred
from message text. The key SHALL also be sent to the platform in the field its
create operation declares, so the platform's own retry contract — *"a retry
with the same key returns the original result rather than repeating the
command"* — is offered to the platform rather than merely quoted. The
underlying operation (`create_intelligence_agent`) mutates without wager scope
and is not destructive, so no confirmation is sought; the key is the guard.

#### Scenario: A second press after a create that succeeded
- **WHEN** a create is submitted with a key under which a create already
  succeeded
- **THEN** no second agent is created and nothing is sent to the platform
- **AND** the operator is told, on the surface they acted from, that the agent
  was already created
- **AND** they are never shown a framework error page

#### Scenario: A retry after a create that failed
- **WHEN** a create is submitted with a key whose earlier attempt failed
- **THEN** a fresh attempt is made under that key
- **AND** the earlier failure remains on the record — retrying does not erase
  that it happened

#### Scenario: A second press while the outcome is unknown
- **WHEN** a create is submitted with a key under which an attempt has begun
  and has no recorded outcome
- **THEN** nothing is attempted
- **AND** the operator is told the earlier attempt may have landed and to check
  their roster before pressing again

#### Scenario: Two presses racing
- **WHEN** two submissions carrying the same key arrive concurrently
- **THEN** at most one attempt is made
- **AND** the other is refused with the same legible explanation, not a raw
  storage error

#### Scenario: A deliberate second agent
- **WHEN** the operator returns to a freshly rendered create form and submits
  it
- **THEN** the submission carries a new key and the create proceeds — the
  dedupe binds a form instance, not the operator

#### Scenario: The key reaches the platform
- **WHEN** a create carrying a key is sent to the platform
- **THEN** the key is present in the create operation's own declared argument,
  not only in this product's records
