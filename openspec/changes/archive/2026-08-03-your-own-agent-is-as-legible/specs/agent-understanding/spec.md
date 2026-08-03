# agent-understanding (delta)

## ADDED Requirements

### Requirement: An Owned Agent's Evaluation Is At Least As Legible As A Stranger's

For an agent the user owns, the product SHALL show, for one evaluation,
every signal the agent consulted — not only those that fired — with its
module, whether it triggered, its score, bias and direction, whether it was
primary or required, the platform's own written description, and the
indicator readings behind it; how the aggregate score was attributed; and
the chain the candidate followed from gate through attempt, decision,
execution and outcome.

Nothing shown about a public agent SHALL be withheld about the user's own.

#### Scenario: An owned evaluation is opened
- **GIVEN** an evaluation belonging to one of the user's agents
- **WHEN** the user opens it from the agent's pipeline
- **THEN** every consulted signal is shown with the platform's description
- **AND** the signals that did not fire are shown alongside those that did

#### Scenario: No detail is published
- **GIVEN** an evaluation for which the platform returns no detail
- **WHEN** the user opens it
- **THEN** the page says no detail is published
- **AND** does not report it as unreadable

### Requirement: What A Decision Cost Is Shown

Where the platform reports the model, the price and the time taken for an
evaluation, the product SHALL show them. A cost the platform did not report
SHALL be said to be unreported rather than shown as zero.

#### Scenario: A decision with a reported cost
- **GIVEN** an evaluation whose platform reports a model and a cost
- **WHEN** it renders
- **THEN** the model, the cost and the time taken are shown

#### Scenario: A decision with no reported cost
- **GIVEN** an evaluation whose platform reports no cost
- **WHEN** it renders
- **THEN** the cost is not shown as zero

### Requirement: An Owned Agent's Funnel Is Readable

The product SHALL show, for an agent the user owns, how much it evaluated
against how much it acted on: its evaluation and decision counts, its
entries split by outcome, its average score and conviction, its fill rate,
and its realized result.

#### Scenario: The funnel answers
- **GIVEN** an agent that has evaluated candidates
- **WHEN** the user opens why it did or didn't trade
- **THEN** its evaluation count and decision count are shown
- **AND** its entries are broken down by what became of them

#### Scenario: An agent that has evaluated nothing
- **GIVEN** an agent with no evaluation record
- **WHEN** the pipeline renders
- **THEN** the page says so rather than showing a funnel of zeros
