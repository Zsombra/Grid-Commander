# agent-authoring — delta

## MODIFIED Requirements

### Requirement: The Outcome Of A Write Reaches The Person Who Asked For It
Where a user performs an operation that can be refused, Grid-Commander SHALL
read the outcome and show it. A surface MUST NOT discard the result of a write
and present the page as though nothing had been attempted.

A refusal the operator cannot see is worse than a failure they can. The page
reloads, the value is unchanged, and the only available reading is that the
product ignored them. Renaming an agent did exactly this: the action awaited the
result, discarded it, and redirected, so a refusal — including one the product
itself raised — was indistinguishable from success.

Where the operation was refused, the reason given SHALL be the one the operation
returned, rather than a generic failure.

This binds however the outcome arrives. A refusal the platform delivers as a
thrown error is still an outcome — confirmed live 2026-08-12, when a
stale-revision rebind was refused as `CONFLICT` at the client layer — and an
action that decides not to attempt the operation at all (its pre-perform
re-read failed, the entity was gone) has an outcome too: that nothing was
attempted, and why. A reason already being carried back to a surface (a
`?problem=` from an earlier bounce) is part of the outcome the person is owed,
and re-rendering the surface MUST NOT discard it, whatever branch renders.

#### Scenario: A write that succeeds
- **WHEN** a user performs a write that succeeds
- **THEN** they are shown its effect

#### Scenario: A write that is refused
- **WHEN** a write is refused
- **THEN** the user is told, on the surface they acted from
- **AND** the reason given is the one the operation returned

#### Scenario: A refusal that arrives as a thrown error
- **WHEN** the platform refuses a perform by raising an error rather than
  returning a readable result
- **THEN** the user is told on the surface they acted from, with the raised
  reason, never a framework error page

#### Scenario: An action that could not attempt the operation
- **WHEN** an action's pre-perform re-read fails, or no longer finds what was
  to be acted on
- **THEN** the user is told nothing was attempted, and why, on the page they
  acted from — never silently landed elsewhere

#### Scenario: A carried reason survives whatever branch renders
- **WHEN** a surface is re-rendered carrying a refusal reason from an earlier
  attempt
- **AND** the re-render itself takes a refusal or failure branch
- **THEN** both the carried reason and the fresh one are shown

#### Scenario: A result the surface never reads
- **WHEN** a surface performs a write and does not read its outcome
- **THEN** this fails a check that gates a change, rather than being found by an
  operator whose action silently did nothing
