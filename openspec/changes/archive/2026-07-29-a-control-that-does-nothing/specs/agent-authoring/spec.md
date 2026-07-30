## ADDED Requirements

### Requirement: A Field Offered Reaches The Operation It Configures
Where the interface renders a control for a value, submitting the form SHALL
carry that value to the operation. A control whose value the operation never
reads MUST NOT be rendered.

Offering a setting and discarding it is worse than not offering it: the user
leaves believing they configured something, and the agent behaves as though they
had not. Nothing on the screen distinguishes the two.

#### Scenario: Setting a value the form offers
- **WHEN** a user sets a value using a control the interface renders and submits
- **THEN** that value reaches the operation the form performs

#### Scenario: A control the operation does not read
- **WHEN** a control is rendered whose value no operation reads
- **THEN** this fails a check that gates a change, rather than being found by a
  user whose agent was configured without it

#### Scenario: A setting the product cannot yet carry
- **WHEN** the product cannot supply what an operation requires for a setting
- **THEN** the control for it is not rendered
- **AND** the user is not shown a configuration they cannot make

#### Scenario: A form that navigates rather than acting
- **WHEN** a form submits by navigating, putting its values in the query string
- **THEN** its controls are read from there
- **AND** this is not reported as a control that reaches nothing
