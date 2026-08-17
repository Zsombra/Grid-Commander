## ADDED Requirements

### Requirement: What An Edit Answers About Buildable Trades Is Read And Shown
Where BattleGrid returns a feasibility advisory alongside an agent update,
Grid-Commander SHALL read it and show it to the operator who performed the
edit. The advisory MUST NOT be discarded at the adapter boundary.

The advisory is the only place the platform answers which of an agent's armed
coins its strategy can currently build a stop for, and which dial is stopping
the rest. It is returned by one tool, on the response to a write, and by no
read. Discarding it means the answer exists and nobody can see it.

The platform states the answer per coin, as a band. The operator is shown it
aggregated, as counts: how many coins can construct, how many cannot, and how
many the platform could not evaluate. A surface MUST state the number of coins
each figure was computed over, so a count is never read as a proportion of an
unstated whole.

#### Scenario: An edit that returns an advisory
- **WHEN** an agent edit succeeds and BattleGrid returns a feasibility advisory
- **THEN** the operator is shown how many of the agent's armed coins can
  construct a stop under the current dials, out of how many were evaluated

#### Scenario: The dial that blocked a coin is named
- **WHEN** the advisory reports a coin that cannot construct and names the
  responsible bound
- **THEN** the surface names which dial stopped it, rather than reporting only
  that it failed

#### Scenario: The platform returns no advisory
- **WHEN** an agent edit succeeds and the response carries no feasibility
  advisory
- **THEN** nothing about feasibility is shown
- **AND** the surface MUST NOT state that zero coins can construct

#### Scenario: A coin whose volatility could not be read
- **WHEN** the advisory reports a coin as volatility-unavailable, which carries
  no numeric fields
- **THEN** that coin is counted and named as not evaluated
- **AND** it is NOT counted among the coins that cannot construct

#### Scenario: An advisory shaped unlike the declaration
- **WHEN** the response carries a feasibility advisory whose shape does not
  match what the platform declares
- **THEN** it is treated as absent rather than partially read, and nothing is
  invented for the fields that did not arrive

### Requirement: A Ceiling Is Shown Against The Opportunity It Costs
Where a feasibility advisory is shown, Grid-Commander SHALL state how the count
of constructible coins moves against a candidate stop-loss ceiling, and SHALL
state that a lower ceiling is what removes opportunity.

An operator reading a stop-loss ceiling has no way to tell from the number
alone whether it is costing them anything. A ceiling raised never blocks a
trade; a ceiling lowered can silently remove most of a fleet's tradeable
universe. Stating only the current count leaves the direction unlearnable.

Every such figure is derived by this product from the bands the platform
returned, and SHALL be presented as derived rather than as a platform claim.

#### Scenario: The count against a lower ceiling
- **WHEN** a feasibility advisory carries per-coin constructible bands
- **THEN** the surface states how many coins would still construct under at
  least one candidate ceiling below the current one

#### Scenario: The direction is stated
- **WHEN** a stop-loss ceiling is shown beside a feasibility count
- **THEN** the surface states that lowering the ceiling is what reduces the
  number of coins that can construct, and that raising it does not block trades

#### Scenario: A derived figure says it is derived
- **WHEN** the surface shows a count this product computed from the returned
  bands
- **THEN** it is distinguished from the counts BattleGrid itself returned

### Requirement: The Reply To A Write Survives The Redirect Without Becoming Forgeable
Where the outcome of a write must survive the redirect that follows it,
Grid-Commander SHALL carry it in a form the server attests to. A figure the
product presents as the platform's MUST NOT be readable from a value the
operator can author.

This product renders what it is given. A count of tradeable coins carried in a
query string is a count anyone can type, and a surface that renders it as
BattleGrid's answer is stating a platform claim the platform never made.

A carried reply MUST name the subject it was issued about and the moment it was
issued, and MUST NOT be shown against a different subject or after it has gone
stale.

#### Scenario: A carried reply that verifies
- **WHEN** a write's reply is carried across the redirect and its server
  attestation verifies for this agent, recently
- **THEN** it is shown

#### Scenario: A carried reply that was tampered with
- **WHEN** a carried reply fails its server attestation
- **THEN** nothing is shown, and no part of the unverified value is rendered

#### Scenario: A carried reply about a different agent
- **WHEN** a carried reply names an agent other than the one being viewed
- **THEN** it is not shown on that agent's surface

#### Scenario: A carried reply that has gone stale
- **WHEN** a carried reply is older than the window it was issued for
- **THEN** it is not shown, because live volatility has moved under it
