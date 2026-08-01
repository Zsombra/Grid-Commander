# Strategy Authoring — Delta

## ADDED Requirements

### Requirement: A Signal Rule Is Retuned Only Through The Ceremony

The product SHALL let a user change one signal rule on a strategy — its
allocation, its Required flag, and the signal's declared strict parameters —
only through describe-then-perform. The describe SHALL read the strategy
fresh, refuse a signal that is not among its rules and a change that
changes nothing, state the consequence with the strategy's bound-agent
count and the platform's own propagation wording, and mint a confirmation
bound to the strategy, the revision that was read, the signal, and the
exact proposed values. The perform SHALL send precisely the described
values with the revision the describe read, and MUST be refused when the
token does not match them. A platform refusal SHALL return to the surface
acted from with the platform's reason.

#### Scenario: Describing a retune names the blast radius
- **GIVEN** a strategy with three bound agents carrying `rsi_oversold`
- **WHEN** the user proposes allocation 3, required
- **THEN** the consequence names the strategy, the signal, the proposed
  values, and the three agents reconfigured immediately
- **AND** states that open positions do not block the edit

#### Scenario: The token binds the exact values
- **GIVEN** a confirmation minted for allocation 1
- **WHEN** the perform is submitted with allocation 3
- **THEN** the write is refused and nothing reaches the platform tool

#### Scenario: A signal the strategy does not carry is refused without a token
- **WHEN** the user opens a retune for a signal absent from the rules
- **THEN** the page says the strategy does not weigh that signal
- **AND** no confirmation is minted

#### Scenario: A change that changes nothing is refused without a token
- **WHEN** the proposed values equal the rule's current values
- **THEN** the describe refuses as a no-op and no confirmation is minted

#### Scenario: A stale revision is refused honestly
- **GIVEN** the strategy changed after the describe
- **WHEN** the perform runs
- **THEN** the platform's revision refusal is shown on the surface acted
  from, and the user is returned to a fresh describe

#### Scenario: The change is proven by the re-read
- **WHEN** a retune succeeds
- **THEN** the user lands on the strategy read fresh, showing the new value
