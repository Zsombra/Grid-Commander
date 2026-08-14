## ADDED Requirements

### Requirement: An Unanticipated Failure Lands On The Product's Own Page
Where a render or a submitted action fails in a way no handler anticipated,
Grid-Commander SHALL show the operator its own page, in its own words. It MUST
NOT surface a framework error page.

That page SHALL say what is actually known: that something failed which the
product did not anticipate, and that **nothing on the page can say whether the
operator's last action landed**. It SHALL point at the activity log as the
record that can answer, and MUST NOT advise retrying — a retry against an
unknown outcome is the one instruction known to be wrong. Where the platform
runtime supplies an opaque reference for the failure, it SHALL be shown so a
report can name it; the raw error text SHALL NOT be, because an unanticipated
error's message was not written for the operator.

The floor is a floor, not a route: failures that already have authored routes —
refusal bounces, redirects, carried reasons — SHALL keep reaching their own
surfaces, not this page.

#### Scenario: A page fails to render
- **WHEN** rendering a page throws something no handler anticipated
- **THEN** the operator sees the product's own page, not a framework error page
- **AND** it says the product did not anticipate this failure

#### Scenario: A submitted action fails unexpectedly
- **WHEN** a submitted action throws something no handler anticipated
- **THEN** the same product page renders
- **AND** it says nothing here can tell whether the action landed
- **AND** it points at the activity log as the record that can

#### Scenario: No retry is offered
- **WHEN** the unanticipated-failure page renders
- **THEN** it offers no control that retries or re-submits anything

#### Scenario: The failure can be named in a report
- **WHEN** the runtime supplies an opaque reference for the failure
- **THEN** the page shows it
- **AND** the raw error message is not shown

#### Scenario: The root layout itself fails
- **WHEN** the failure is in the outermost layout the product renders
- **THEN** the operator still sees the product's own words, with the same
  posture, rather than a blank or framework page

#### Scenario: Anticipated failures keep their routes
- **WHEN** a failure occurs that has an authored route — a refusal bounce, a
  redirect, a carried reason
- **THEN** it reaches its own surface as before
- **AND** the unanticipated-failure page does not intercept it
