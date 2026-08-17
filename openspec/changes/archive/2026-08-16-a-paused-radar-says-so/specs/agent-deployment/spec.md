## ADDED Requirements

### Requirement: A Paused Radar Is Stated Wherever Standing Is Rendered
Where BattleGrid reports the radar as paused, Grid-Commander SHALL state it on
every surface that renders deployment standing, and SHALL NOT present any
deployment as scanning under it.

The radar's pause is reported once for the fleet, not per deployment: the
platform's per-deployment resolution carries no pause field. So a row's standing
cannot know it, and a surface that renders rows without the fleet fact asserts
activity the platform says is not happening. Live on the operator's account
across three sessions: `radarPaused: true` with every deployed coin
platform-paused, while the agent page read "On duty: scanning" for each.

The pause SHALL reach every consumer of standing, including the product's own
MCP surface. A model reading standing acts on it the same way a person does.

#### Scenario: A paused radar under a deployment reported as on duty
- **GIVEN** a deployment whose resolution names an ACTIVE agent as on duty
- **AND** the radar is reported as paused
- **WHEN** that deployment is rendered
- **THEN** the surface states that the radar is paused
- **AND** it does not claim the deployment is scanning

#### Scenario: The pause reaches the product's own MCP surface
- **WHEN** deployment standing is served over this product's MCP surface while
  the radar is paused
- **THEN** the pause is part of what is served

#### Scenario: A running radar says nothing
- **WHEN** the radar is reported as not paused
- **THEN** nothing about a pause is stated, and standing renders as before

### Requirement: The Radar's Pause And The Platform's Are Reported Apart
Grid-Commander SHALL distinguish the radar being paused from the platform having
paused individual deployments, and SHALL NOT reduce the two to one claim.

They are different facts with different remedies, and they are different shapes:
the radar's pause is a boolean about the whole radar, while the platform's is a
count of how many deployed coins it has paused. An operator told only "paused"
cannot tell whether their own radar is off or the platform has stopped some of
their coins, and therefore cannot tell whether anything on their side would
help.

Where the platform reports a count of paused deployments, the surface SHALL
state the count against the number deployed, so it is never read as a
proportion of an unstated whole.

#### Scenario: The radar itself is paused
- **WHEN** the radar is reported as paused
- **THEN** the surface says the radar is paused, as a fact about the radar

#### Scenario: The platform has paused some deployments
- **WHEN** the platform reports a non-zero count of paused deployments
- **THEN** the surface states that count against the number of coins deployed

#### Scenario: Both are true at once
- **WHEN** the radar is paused and the platform reports paused deployments
- **THEN** both are stated, and neither is presented as the cause of the other

### Requirement: An Unreadable Pause Is Not A Running Radar
Where BattleGrid's radar answer carries no pause report, or one whose shape the
product does not recognise, Grid-Commander SHALL treat the pause as unknown and
SHALL NOT report the radar as running.

A missing field is a read that did not answer. Mapping its absence to "not
paused" would state, on the product's authority, that automation is running —
the same substitution that turned platform silence into a confident `false` on
`regimeAutoDerive` at v19 and had to be corrected to `boolean | null`.

#### Scenario: A radar answer with no pause report
- **WHEN** the radar answer omits the pause
- **THEN** nothing is stated about a pause
- **AND** the surface does not report the radar as running

#### Scenario: A pause report of an unrecognised shape
- **WHEN** the pause is present but not the declared type
- **THEN** it is treated as unknown rather than coerced

## MODIFIED Requirements

### Requirement: An Agent's Standing Is Read Against Its Lifecycle, Not From The Radar Alone
Grid-Commander SHALL derive an agent's standing in a deployment from the radar's
report **and** the agent's lifecycle status together. An agent whose status is
not ACTIVE SHALL NOT be reported as on duty or as in the rotation; it SHALL be
reported as holding the slot without scanning.

The radar reports a slot identically whether the agent in it is active or
archived, so a derivation reading the radar alone answers a different question
from the one asked. Live 2026-08-06, second account: fifteen deployments held an
active agent and one, `SP500@15m`, held only `Volatilis` — archived — which this
product reported as on duty.

Standing is a claim about configuration, not about activity. It says which agent
the radar would resolve to, and it remains true while the radar is paused —
which is why the pause is stated alongside it rather than folded into it. A
standing rewritten from a fleet-level pause would say something about the row
the platform did not say.

The join SHALL be made once, where standing is computed, rather than at each
surface that renders it. Three surfaces render standing, and a check repeated at
each is three places to forget it once.

An open position the radar attributes to the agent SHALL still be reported
whatever the agent's lifecycle. That is a statement about money at stake now,
and a lifecycle status is not evidence that the position closed.

Whether BattleGrid intends an archived agent to keep its slot is not
established — whether archiving is meant to vacate the radar and does not, or
the slot is deliberately preserved so reactivation restores coverage.
Grid-Commander SHALL report the pair it was given and SHALL NOT assert either.

#### Scenario: An archived agent in a slot
- **GIVEN** a deployment whose slot names an agent that is not ACTIVE
- **WHEN** that agent's standing is computed
- **THEN** it is holding the slot and not scanning
- **AND** it is neither on duty nor in the rotation

#### Scenario: An active agent the radar resolves as on duty
- **GIVEN** a deployment naming an ACTIVE agent as on duty
- **WHEN** its standing is computed
- **THEN** it is on duty, exactly as before

#### Scenario: An archived agent the radar says holds the position
- **GIVEN** a deployment whose open position is attributed to an agent that is
  not ACTIVE
- **WHEN** its standing is computed
- **THEN** it is reported as holding that position
- **AND** the lifecycle does not suppress it

#### Scenario: No cause is asserted for the slot surviving the archive
- **WHEN** an archived agent's held slot is described
- **THEN** nothing is said about whether the platform meant to vacate it

#### Scenario: Standing under a paused radar
- **GIVEN** a deployment naming an ACTIVE agent as on duty
- **AND** the radar is paused
- **WHEN** its standing is computed
- **THEN** the standing is unchanged — it is what the radar reports about the row
- **AND** the pause is carried alongside it rather than rewriting it
