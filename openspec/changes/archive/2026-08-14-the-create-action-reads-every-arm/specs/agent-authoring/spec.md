## ADDED Requirements

### Requirement: A Refused Create Keeps What Was Composed
Where a submitted create is refused before anything is created — the values
invalid, the account at capacity, the catalog or roster unreadable — the
operator SHALL be told on the surface they acted from, with the reason the
operation returned, and the values they composed SHALL travel with the refusal
rather than being discarded.

The three refusals are reachable mostly by race: the page refuses to render
the form at capacity or without a catalog, so the state has to move between
render and submit — a slot filled from another tab, the catalog moving under a
long-open form, HTML validation bypassed. Rare is not silent: a press that
does nothing teaches the operator the product ignores them.

Where the refusal's branch renders no form (at capacity, no catalog), the
composition still travels with the refusal, so the form next rendered from
that surface still holds what was typed. Carrying the composition is not
carrying the dedupe key: a resubmission of the re-rendered form is a new
command under "A Create Submitted Twice Is One Create", not a retry of the
refused one.

#### Scenario: A value the command refuses
- **WHEN** a submitted create is refused because a value is invalid
- **THEN** the reasons are shown on the surface acted from, each naming its
  field
- **AND** the form still holds what was entered

#### Scenario: Capacity moved between render and submit
- **WHEN** a create is submitted and the account is at capacity by the time
  the command checks
- **THEN** the operator is told on the surface they acted from, with the
  platform's explanation
- **AND** what was composed travels with the refusal, so the form next
  rendered from that surface still holds it

#### Scenario: The catalog cannot be consulted at submit
- **WHEN** the catalog or roster the create must consult cannot be read at
  submit time
- **THEN** the operator is told why, on the surface they acted from
- **AND** nothing is created
- **AND** what was composed travels with the refusal

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

Reading the result once is not reading the outcome. A result union read
partially — some arms branched on, the rest falling off the end of the action —
is the same discard wearing a compliant spelling, and it hides from any check
that asks only whether the result was read: the create action read one arm of
five for as long as the union existed and passed every gate. A surface that
reads a result MUST read it exhaustively, and a partial read MUST fail a check
that gates a change, the same as a result never read at all.

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

#### Scenario: A result read partially, not fully
- **WHEN** a surface branches on some arms of a write's result and lets the
  remaining arms fall through unhandled
- **THEN** this fails a check that gates a change, rather than being found by
  an operator whose refused press looked like a page reload
