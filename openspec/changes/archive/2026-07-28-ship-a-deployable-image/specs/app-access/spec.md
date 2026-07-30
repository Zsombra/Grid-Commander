## ADDED Requirements

### Requirement: A Deployment Serves Only Against A Schema It Recognises
Before serving any request, a deployment SHALL confirm that the database it is
configured against has applied every migration this version of the product
carries. Where it has not, the deployment MUST refuse to serve and MUST say what
is missing.

The application already refuses to start without the configuration it was given.
This extends that to the database it was pointed at, and for the same reason: a
product that starts against a state it does not understand fails later, somewhere
else, in a way that reads as a defect rather than a missing step.

#### Scenario: The database is up to date
- **WHEN** a deployment starts against a database that has applied every
  migration the product carries
- **THEN** it serves

#### Scenario: A migration has not been applied
- **WHEN** a deployment starts against a database missing one or more of them
- **THEN** it refuses to serve
- **AND** it reports which migrations are missing
- **AND** it exits in a way the platform reports as a failed start

#### Scenario: The database has never been migrated
- **WHEN** a deployment starts against a database with no schema at all
- **THEN** it refuses to serve rather than reporting an error on first use

#### Scenario: A database ahead of the product
- **WHEN** a deployment starts against a database carrying migrations this
  version does not know about
- **THEN** it serves
- **AND** this is reported, because it means an older version is running against
  a newer schema

#### Scenario: Applying the migrations
- **WHEN** an operator needs to bring a database up to date
- **THEN** the deployable artifact can do it as its own operation
- **AND** that operation is separate from serving, so it can run once rather
  than once per replica

### Requirement: The Deployable Artifact Carries No Secret
An artifact built from this repository SHALL contain no credential, and no
configuration specific to one deployment.

#### Scenario: Building the artifact
- **WHEN** the deployable artifact is built
- **THEN** it contains no value from a `.env` file
- **AND** it contains no token, key, or client identifier

#### Scenario: Running it
- **WHEN** the artifact runs
- **THEN** every deployment-specific value is supplied to it at run time
- **AND** absent required configuration, it refuses to start, as it does anywhere
  else
