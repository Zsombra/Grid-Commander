# app-access — delta

## MODIFIED Requirements

### Requirement: Every Affordance The Interface Offers Resolves
Grid-Commander SHALL render no link to a route it does not serve, and SHALL
serve no route the interface never offers.

Both directions, because only one was ever checked. Five rendered links returned
404 through three production gates; the check written to catch that compared
offered paths against servable routes and stopped there. A route built and
linked from nowhere passed every gate afterwards — and two did, in the same
afternoon they were written.

A page nobody can navigate to is capability the operator does not have. It is
the same failure as a link to nothing, seen from the other side.

#### Scenario: A link to a route that is not served
- **WHEN** the interface renders a link to a path no route serves
- **THEN** this fails a check that gates a change

#### Scenario: A route nothing links to
- **WHEN** the application serves a route the interface never offers
- **THEN** this fails a check that gates a change, naming the route

#### Scenario: Reading an agent whatever its state
- **WHEN** an agent cannot be edited, rebound or archived
- **THEN** what it decided and what would stop it are still offered
