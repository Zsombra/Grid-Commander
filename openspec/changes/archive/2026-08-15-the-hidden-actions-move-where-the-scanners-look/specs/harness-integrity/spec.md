## ADDED Requirements

### Requirement: A Server Action Is Declared Where The Action Scanners Look

Every Server Action in the interface SHALL be an exported function in a module
that declares `'use server'` at module level. A function-level `'use server'`
directive in interface source SHALL fail an architecture guard that names the
file and the function.

The action scanners enumerate what they check by exported declaration, and a
page module cannot export an action without violating the page contract the
build gate enforces — so an action declared inline in a page is invisible to
every check that exists to cover it, permanently. Three shipped that way and
were one refactor from the defect the form-field cross-check was written for,
with the scanners green throughout.

#### Scenario: An inline action regrows

- **GIVEN** an interface source file declaring a function whose body begins
  with a `'use server'` directive
- **WHEN** the architecture suite runs
- **THEN** the guard fails, naming the file and the function

#### Scenario: The product is clean

- **GIVEN** an interface whose every Server Action is exported from a
  module-level `'use server'` module
- **WHEN** the architecture suite runs
- **THEN** the guard passes
- **AND** the action scanners' discovered sets include every action the
  product runs

#### Scenario: The guard is proven without a live violation

- **GIVEN** a product containing no inline directive for the guard to find
- **WHEN** the guard's matcher proof runs
- **THEN** the same matcher the live scan uses is shown to catch the inline
  shape, fed as fixture text
- **AND** shown not to report a module-level directive or an ordinary function
