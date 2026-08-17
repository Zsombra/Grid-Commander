## ADDED Requirements

### Requirement: A Deployment Says Why It Is Not Acting
Where the platform resolves a radar deployment and reports that it did not
qualify, Grid-Commander SHALL state that on the surfaces describing that
deployment, together with the block the platform named.

A deployment that is scanning and not qualifying looks identical to one that is
simply waiting. On 2026-08-13 fifteen of twenty deployments on this account were
not qualifying, each with a named block, and every one of them rendered as an
ordinary deployment. The platform's own resolution carries twenty-two fields and
two were read.

Where the platform reports a **cooldown** the deployment is sitting out, or the
**market regime** it was judged in, those SHALL be shown too. They are the
context that makes a block legible — a deployment blocked in one regime and
qualifying in another is a different fact from one that never qualifies.

Where the platform reports no resolution at all, nothing SHALL be claimed in
either direction, exactly as for a deployment whose agents' lifecycles were not
read.

#### Scenario: The platform named a block
- **GIVEN** a deployment the platform resolved as not qualified, with a block
- **WHEN** a surface describes that deployment
- **THEN** it states that it is not qualifying and names the block

#### Scenario: The deployment qualified
- **GIVEN** a deployment the platform resolved as qualified
- **WHEN** a surface describes it
- **THEN** it is not described as blocked

#### Scenario: A deployment sitting out a cooldown
- **GIVEN** a deployment carrying a cooldown that has not elapsed
- **WHEN** a surface describes it
- **THEN** the cooldown is stated

#### Scenario: The platform resolved nothing
- **GIVEN** a deployment whose payload carries no resolution
- **WHEN** a surface describes it
- **THEN** it is described as neither qualifying nor blocked
- **AND** the row is still shown

### Requirement: A Resolution State The Product Does Not Recognise Is Named, Never Interpreted
Where the platform reports a resolution state or block Grid-Commander does not
model, it SHALL be shown as the platform's own value and SHALL NOT be translated
into a product sentence or collapsed into a recognised one.

The observed vocabulary is two block values from twenty rows on a single
account, and the platform declares states this product has never seen — a
`BLOCKED` section among them, null on every row across two major versions. A
surface that rendered an unseen token as "not qualifying", or an unseen section
as idle, would be inventing a meaning for a value whose range is unknown.

This is what lets an unmodelled state arrive honestly rather than requiring the
product to have anticipated it.

#### Scenario: A block value the product has never seen
- **WHEN** the platform names a block Grid-Commander does not model
- **THEN** the surface shows the platform's own value
- **AND** does not substitute a sentence of its own

#### Scenario: A resolution state the product does not model
- **WHEN** the platform reports a section Grid-Commander does not model
- **THEN** the surface names it as an unrecognised state, showing the value
- **AND** does not present the deployment as scanning or idle on the strength of
  a state it could not interpret
