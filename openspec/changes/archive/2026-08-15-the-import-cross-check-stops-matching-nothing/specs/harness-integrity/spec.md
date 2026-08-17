## ADDED Requirements

### Requirement: The Surface Import Cross-Check Resolves The Project's Import Conventions
The check that verifies a surface manifest's source list against the code
SHALL resolve imports the way the project's own toolchain does: path aliases
SHALL be read from the TypeScript configuration's `paths` mapping, and
extension-rewritten specifiers (a `.js` specifier naming a `.ts` or `.tsx`
file) SHALL resolve to the file the toolchain would load. The conventions
SHALL be read from the project's configuration, never compiled into the
check.

#### Scenario: An alias import is missing from the source list
- **GIVEN** a listed source file importing a UI file through a configured
  path alias
- **WHEN** validation runs and the imported file is not in `source_files`
- **THEN** the incomplete-sources diagnostic fires, naming the file

#### Scenario: An extension-rewritten specifier resolves
- **GIVEN** a listed source file importing a UI file with a `.js` specifier
  that names a `.ts` or `.tsx` file on disk
- **WHEN** validation runs and the imported file is not in `source_files`
- **THEN** the incomplete-sources diagnostic fires, naming the file

#### Scenario: The conventions cannot be read
- **GIVEN** a project with no readable TypeScript configuration or no
  `paths` mapping
- **WHEN** validation runs
- **THEN** relative imports are still resolved and checked
- **AND** the check degrades rather than disappearing

#### Scenario: Bare package imports stay outside the surface
- **WHEN** a listed source file imports from a package specifier no alias
  covers
- **THEN** no diagnostic fires for it

### Requirement: Routes Without A Surface Manifest Are Named
Validation SHALL report the routes the application serves that no surface
manifest's `route` field covers, as a single informational diagnostic
carrying the count, and the design overview SHALL list the uncovered routes
individually. A route nobody surveyed is invisible to staleness detection,
and naming it is the only mechanism that can say so — a diagnostic can only
attach to a manifest that exists.

#### Scenario: A route has no manifest
- **GIVEN** an application route whose path no manifest's `route` covers
- **WHEN** validation runs
- **THEN** the informational diagnostic reports it, with the total count

#### Scenario: A new route appears
- **WHEN** a page is added at a route no manifest covers
- **THEN** the reported count and route set change on the next run

#### Scenario: Coverage is complete
- **GIVEN** every application route covered by a manifest
- **WHEN** validation runs
- **THEN** the diagnostic does not fire
