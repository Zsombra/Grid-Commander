## ADDED Requirements

### Requirement: The Build Gate Type-Checks The Route Types Next Generates
The `npm run build` quality gate SHALL type-check the per-route validation
files Next generates, and a route module that violates the framework's page
contract SHALL fail the build. The TypeScript configuration SHALL NOT exclude
a path that its own include list names — a check that is generated on every
build and discarded by configuration reports nothing, while the gate that runs
it reports green.

#### Scenario: A page exports a symbol the page contract does not allow
- **GIVEN** a page module exporting a function beside its `default` that
  Next's page contract does not name
- **WHEN** `npm run build` runs
- **THEN** the build fails
- **AND** the error names the offending route

#### Scenario: A page's props violate the generated PageProps contract
- **GIVEN** a page whose props type does not satisfy the `PageProps` shape
  Next generates for its route
- **WHEN** `npm run build` runs
- **THEN** the build fails naming that route

#### Scenario: The exclusion drifts back
- **GIVEN** a tsconfig change that makes an `exclude` entry swallow a path
  the `include` list names
- **WHEN** the test suite runs
- **THEN** an architecture guard fails, naming the include entry that was
  silently discarded

#### Scenario: A clean tree passes
- **GIVEN** route modules that satisfy the page contract
- **WHEN** `npm run build` runs
- **THEN** the generated route types are checked and the build passes
