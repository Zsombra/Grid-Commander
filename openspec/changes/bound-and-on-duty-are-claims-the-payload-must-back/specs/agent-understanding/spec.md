# agent-understanding — delta

## ADDED Requirements

### Requirement: An Agent's Binding State Is Stated Wherever The Binding Is Described
Where Grid-Commander describes what an agent is bound to, it SHALL state the
binding state BattleGrid reported, and SHALL NOT describe a binding as intact
without having read that state.

BattleGrid declares two binding states on `list_intelligence_agents` — `BOUND`
and `ORPHANED`. The product mapped the field, carried it through the domain, and
rendered it nowhere, while the roster wrote the word *"Bound"* into its own
markup. Live 2026-08-06, second account: `Volatilis` came back `ORPHANED` and
rendered identically to a healthy agent — *"Bound to Volatilis — imported at
revision 7"* — which is precisely what was not true.

Where the state is `ORPHANED`, the surface SHALL say that the strategy the agent
was bound to can no longer be read, and SHALL name the strategy and the revision
the agent's configuration was materialized from.

Grid-Commander SHALL NOT state why a binding is orphaned, SHALL NOT state that
the agent is still running on what it materialized, and SHALL NOT offer any act
as the repair. None of the three is established. An `ORPHANED` binding SHALL NOT
carry the sentence that the agent's inherited configuration is changed by
editing that strategy, which directs the operator at something they cannot read.

Where BattleGrid reports a binding state this product has no reading of — or
where the payload carried no state at all — the surface SHALL show the word it
has and SHALL claim neither that the binding is intact nor that it is broken.

#### Scenario: An orphaned binding on the roster
- **GIVEN** an agent whose binding state is `ORPHANED`
- **WHEN** the roster renders
- **THEN** the row states the binding is orphaned and names the strategy
- **AND** says that strategy can no longer be read
- **AND** does not say the agent is bound to it

#### Scenario: An orphaned binding on the agent's own page
- **GIVEN** the same agent
- **WHEN** its page renders
- **THEN** it says the same thing the roster said
- **AND** names the revision the configuration was materialized from
- **AND** does not tell the operator to edit that strategy

#### Scenario: Nothing is asserted about why, or about the remedy
- **GIVEN** an orphaned binding
- **WHEN** either surface renders
- **THEN** no cause is stated for the state
- **AND** no act is offered as repairing it

#### Scenario: A binding the platform reports as intact
- **GIVEN** an agent whose binding state is `BOUND`
- **WHEN** either surface renders
- **THEN** it states the agent is bound to that strategy at that revision
- **AND** the inherited configuration is described as coming from there

#### Scenario: A binding state this product has no reading of
- **GIVEN** a binding whose state is neither `BOUND` nor `ORPHANED`, or absent
  from the payload
- **WHEN** either surface renders
- **THEN** the state is shown as the word the product holds
- **AND** the surface claims neither that the binding is intact nor broken

## MODIFIED Requirements

### Requirement: Whether An Agent Is Acting Is Stated Where The Agent Is Read
Where the platform can say which markets an agent is deployed to scan,
Grid-Commander SHALL state it on the agent's own page and on the roster: each
deployment's market and timeframe, and whether the agent is holding the
position, on duty, in the rotation, or holding a slot it is not scanning
through. An agent deployed nowhere SHALL be described as configured but not
acting, naming where deployment happens. Where the deployment state cannot be
read, the surface MUST say so rather than render either certainty, and the
roster MUST NOT make a per-agent claim it cannot back.

An agent's lifecycle status says "ACTIVE" while the platform's own radar
counts only deployed agents as active. Two agents on the operator's account
held that status with zero positions, absent from every slot — configured,
waiting, and nothing in this product would ever have said so.

**The converse is also true, and these surfaces stated it wrongly.** An agent
that is not ACTIVE SHALL NOT be described as on duty or as awaiting its turn,
whatever slot the radar still names it in: it SHALL be described as holding the
slot and not scanning. Live 2026-08-06, second account: `SP500@15m` held one
slot, `Volatilis`, archived — and this page read *"On duty: scanning SP500 on
the 15m radar."*

An agent that holds a slot without scanning it SHALL still be treated as
deployed rather than as deployed nowhere: the slot is held, and removing it is
still an act the operator can take.

#### Scenario: A deployed agent
- **WHEN** the platform lists the agent in a radar deployment
- **THEN** the agent's page shows the market and timeframe
- **AND** whether the agent is holding the position, on duty, or in the
  rotation awaiting its turn

#### Scenario: An agent that is not active, still named in a slot
- **GIVEN** an agent whose lifecycle status is not ACTIVE
- **AND** a radar deployment that names it
- **WHEN** its page or its roster row renders
- **THEN** it says the agent holds that slot and is not scanning it
- **AND** it is not described as on duty, nor as awaiting its turn
- **AND** it is not described as deployed nowhere

#### Scenario: An agent deployed nowhere
- **WHEN** the platform lists the agent in no radar deployment
- **THEN** the agent's page says plainly that it is configured but not
  scanning any market
- **AND** names where deployment happens

#### Scenario: The radar cannot be read
- **WHEN** the deployment state cannot be read
- **THEN** the page says the deployment state is unknown, with the cause
- **AND** does not claim the agent is deployed, nor that it is not

#### Scenario: The roster, at a glance
- **WHEN** the roster lists agents and the deployment state is readable
- **THEN** each row states its agent's deployments or that it is not deployed
- **AND** when the state is unreadable, one notice covers the list and no row
  claims either
