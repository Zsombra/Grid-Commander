# agent-understanding — delta

## ADDED Requirements

### Requirement: A Limit Nobody Set Is Not A Limit Of Zero
Where BattleGrid reports a risk gauge as unconfigured, Grid-Commander SHALL
present it as having no ceiling, and MUST NOT render its `remaining` as a
quantity.

The platform reports an unconfigured gauge with `remaining: 0`. Shown as a
number that reads *no headroom left* — the exact inverse of the truth, which is
that nothing will stop the agent on that limit at all. On the account this was
built against, the two unconfigured gauges were **drawdown** and **daily loss**:
the two that govern how much can be lost.

Where a gauge has no ceiling, Grid-Commander SHALL say that no limit is set
rather than reporting a distance to one.

#### Scenario: A gauge with a ceiling
- **WHEN** a limit is configured
- **THEN** how much is used and how much remains are both shown

#### Scenario: A gauge with no ceiling
- **WHEN** a limit is not configured
- **THEN** the user is told no limit is set
- **AND** no remaining quantity is shown for it

#### Scenario: Usage without a ceiling
- **WHEN** an unconfigured gauge reports usage anyway
- **THEN** the usage is still shown
- **AND** it is not presented as progress toward anything

### Requirement: What Would Stop This Agent Is Stated, Including Nothing
Grid-Commander SHALL state which of an agent's limits could halt it, and which
could not because no ceiling was set.

An agent with every gauge unconfigured is not an agent operating safely within
its limits. It is an agent with no limits, and a surface that shows four calm
rows says the first when the truth is the second. Where the platform reports its
own warnings — an over-subscribed budget, a stop below a single trade's loss, a
stop that is effectively unbounded — those SHALL be carried as the platform
states them rather than recomputed.

#### Scenario: An agent with ceilings that bind
- **WHEN** an agent has configured limits
- **THEN** the user is told which ones would halt it

#### Scenario: An agent with nothing that would stop it
- **WHEN** no limit is configured
- **THEN** the user is told that nothing will halt this agent on those limits

#### Scenario: The platform raises its own warning
- **WHEN** BattleGrid reports the budget over-subscribed, the stop below a
  single trade's loss, or the stop effectively unbounded
- **THEN** that warning is shown as the platform stated it

#### Scenario: An agent the platform has already halted
- **WHEN** an agent is halted
- **THEN** that is shown before any gauge, with the reason the platform gave
