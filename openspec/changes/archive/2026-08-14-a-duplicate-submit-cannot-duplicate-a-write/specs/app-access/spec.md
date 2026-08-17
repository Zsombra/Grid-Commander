## ADDED Requirements

### Requirement: A Confirmation Pressed Twice Writes Once
Pressing a perform submit more than once SHALL NOT produce more than one write.
Grid-Commander MAY achieve this by any means that holds — a single-use
confirmation, an idempotency key under which a repeat cannot create a second
object and is answered with the original outcome, an operation that is
naturally idempotent, or the platform's own refusal of the duplicate. It MUST
NOT rely on the control becoming unpressable, because a control cannot be
unpressable in a second tab, on a replayed POST, or before the page has
hydrated. Where the key is the means, the guarantee claimed is the one that is
measured: the product's own ledger dedupes today, and the key is also offered
to the platform, whose honouring of it is untested (#238).

Stated as an outcome rather than a mechanism because the mechanism differs per
surface and each one is separately checkable. `docs/checklists/` states the same
property as an engineering standard; this is the behaviour it exists to secure.

#### Scenario: A confirmation is presented a second time
- **WHEN** a submit spending a single-use confirmation is pressed twice
- **THEN** exactly one write is attempted against BattleGrid
- **AND** the second press changes nothing further

#### Scenario: A write with no confirmation to spend
- **WHEN** a submit performs a write that mints no confirmation — creating an
  agent, forking a strategy
- **THEN** a duplicate submission still cannot produce a duplicate object
- **AND** the protection is a property of the request rather than of the button,
  so it holds for a resubmitted form and a replayed POST

#### Scenario: The control stays pressable while the write is in flight
- **WHEN** a perform submit is working
- **THEN** it says so, and remains focusable and operable
- **AND** its accessible name still carries the state, so the change is
  announced to someone who is standing on the control

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
