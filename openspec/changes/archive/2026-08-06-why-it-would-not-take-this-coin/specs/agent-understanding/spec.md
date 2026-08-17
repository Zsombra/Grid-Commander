# agent-understanding — delta

## ADDED Requirements

### Requirement: Whether An Agent Would Take A Coin Is Answerable Before It Trades
Grid-Commander SHALL be able to state, for one of the user's own agents and a
named set of coins, whether that agent's gates would admit a trade right now —
and where they would not, which gate stops it and by how much.

Every other reading of an agent in this product is retrospective: what it
decided, what it blocked, what it closed. An operator tuning an agent is asking
the opposite question — *would it act, and what is holding it back* — and until
now the only way to find out was to wait for a cycle to run and read the
wreckage afterwards.

For each coin the product SHALL show the platform's overall verdict, and for
each gate the platform reports — the aggregate score, the required-signal count,
and the ATR volatility floor — the **measured value beside the threshold it is
measured against**. A verdict word alone is not an answer: an operator who is
told a coin is `FAILING` cannot tell whether the setting is one point away or
forty, and the whole reason to ask this question is to decide what to change.

Grid-Commander SHALL keep the long and short verdicts apart. A coin can qualify
one way and not the other, and a single collapsed answer would hide which
direction is available.

Where the platform names the first gate that failed, Grid-Commander SHALL show
it as the platform ordered it, rather than deriving its own order from the gate
readings. The platform evaluates gates in a live sequence and a gate after the
first failure may never have been measured.

#### Scenario: A coin the agent would take
- **GIVEN** an agent and a coin whose gates all clear
- **WHEN** the user asks whether it would take it
- **THEN** the coin is shown as qualifying
- **AND** each gate's measurement is still shown against its threshold

#### Scenario: A coin stopped by one gate
- **GIVEN** a coin whose aggregate score is below the agent's minimum
- **WHEN** the qualification is read
- **THEN** the coin is shown as not qualifying
- **AND** the score and the minimum are both shown as numbers
- **AND** the gate the platform names as the first to fail is identified

#### Scenario: Long and short disagree
- **GIVEN** a coin that qualifies long and not short
- **WHEN** the qualification is read
- **THEN** both directions are shown with their own verdicts
- **AND** the direction that does not qualify carries its own reason

#### Scenario: A gate that was not measured
- **GIVEN** a gate the platform reports as unmeasurable or not enforced
- **WHEN** the qualification is read
- **THEN** that state is shown as the platform stated it
- **AND** it is not rendered as a measurement of zero or as a failure

### Requirement: Which Coins Were Screened Is Stated, Not Assumed
Where Grid-Commander chooses which coins to screen rather than being told,
it SHALL say where the list came from.

The question "would your agent take these" means something different when the
agent's owner picked the coins and when the product picked them. An agent that
qualifies nothing from a list it never watches is not an agent that is stuck;
it is a screening of the wrong markets.

The product SHALL prefer the coins the agent is actually deployed on, and where
it has no deployments MAY fall back to a list the platform ranks — stating which
of the two it used in either case. Where neither can be read, it SHALL say the
coins could not be chosen rather than screening none and reporting that nothing
qualifies.

#### Scenario: An agent with deployments
- **GIVEN** an agent deployed on three coins
- **WHEN** the qualification is read without a coin list
- **THEN** those three coins are screened
- **AND** the surface says the coins are the agent's own deployments

#### Scenario: An agent deployed nowhere
- **GIVEN** an agent with no deployments
- **WHEN** the qualification is read without a coin list
- **THEN** coins from the platform's ranked list are screened
- **AND** the surface says the product chose them and that the agent is
  deployed nowhere

#### Scenario: The coins could not be chosen
- **GIVEN** neither the agent's deployments nor a ranked list can be read
- **WHEN** the qualification is read
- **THEN** the surface says which coins to ask about could not be determined
- **AND** does not report that no coin qualifies

#### Scenario: A qualification that cannot be read
- **GIVEN** the platform does not answer the qualification call
- **WHEN** the surface renders
- **THEN** it says the qualification could not be read and why
- **AND** does not render an empty verdict list
