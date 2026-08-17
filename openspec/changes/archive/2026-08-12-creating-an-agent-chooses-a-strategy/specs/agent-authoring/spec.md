# agent-authoring — delta

## ADDED Requirements

### Requirement: Creating An Agent Binds It To A Strategy The Operator Chose
Where the product creates an agent, it SHALL obtain the strategy that agent
will read from the operator, and MUST NOT choose one on their behalf.

A strategy is not a setting on an agent; it is the agent's reasoning. The
platform materializes its context modules, signal rules, prose and timeframe
onto the agent at creation, and every decision the agent later makes about the
operator's money follows from them. A default here would bind funds to a policy
nobody read.

The strategies offered SHALL be the ones the platform lists for that operator —
its own catalog and their private ones — because that is the set the platform
will accept a binding to.

Where no strategy can be offered, the form SHALL NOT be rendered. A creation
form whose submission is certain to be refused teaches an operator to distrust
the product's refusals, and this page already declines to render itself when
its other vocabulary is unreadable.

#### Scenario: Creating an agent
- **WHEN** an operator composes a new agent
- **THEN** they are asked which strategy it will read
- **AND** no strategy is selected for them

#### Scenario: The strategies on offer
- **WHEN** the form asks which strategy the agent will read
- **THEN** the choices are the strategies the platform lists for that operator,
  including the platform's own

#### Scenario: The platform lists no strategies at all
- **WHEN** the strategy list is readable and contains nothing
- **THEN** the creation form is not rendered
- **AND** the operator is told there is nothing to bind an agent to

#### Scenario: The strategy list cannot be read
- **WHEN** the strategy list cannot be read
- **THEN** the creation form is not rendered
- **AND** the operator is told why, distinguishing a refusal from an outage
- **AND** is not told their strategies are gone

## MODIFIED Requirements

### Requirement: A Field Offered Reaches The Operation It Configures
Where the interface renders a control for a value, submitting the form SHALL
carry that value to the operation. A control whose value the operation never
reads MUST NOT be rendered.

Offering a setting and discarding it is worse than not offering it: the user
leaves believing they configured something, and the agent behaves as though they
had not. Nothing on the screen distinguishes the two.

The converse binds equally. Where an operation requires a value, some control
SHALL supply it. A required field no control sends is not a gap in a form — it
is a write path that cannot be walked: the submission is refused before the
operation is reached, so the failure names a field rather than anything the
operator did, and no amount of care on the screen can produce a valid
submission. Both halves failed unseen in this product — a rebind confirmation
that sent four of the five fields its action read, and a creation form that
never asked for the strategy its action required — because the tests exercised
the use cases directly and no test walked a form.

#### Scenario: Setting a value the form offers
- **WHEN** a user sets a value using a control the interface renders and submits
- **THEN** that value reaches the operation the form performs

#### Scenario: A control the operation does not read
- **WHEN** a control is rendered whose value no operation reads
- **THEN** this fails a check that gates a change, rather than being found by a
  user whose agent was configured without it

#### Scenario: A value the operation requires and no control supplies
- **WHEN** an operation requires a field that the form bound to it never renders
- **THEN** this fails a check that gates a change, rather than being found by an
  operator whose submission was refused before it was performed

#### Scenario: A setting the product cannot yet carry
- **WHEN** the product cannot supply what an operation requires for a setting
- **THEN** the control for it is not rendered
- **AND** the user is not shown a configuration they cannot make

#### Scenario: A form that navigates rather than acting
- **WHEN** a form submits by navigating, putting its values in the query string
- **THEN** its controls are read from there
- **AND** this is not reported as a control that reaches nothing
