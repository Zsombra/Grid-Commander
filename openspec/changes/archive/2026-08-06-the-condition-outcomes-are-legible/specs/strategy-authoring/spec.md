# strategy-authoring (delta)

## MODIFIED Requirements

### Requirement: A Composition Can Be Previewed As The Agent Reads It

The product SHALL let a user preview a strategy's current composition
without saving or changing anything: the rendered report text per section
as an agent would receive it over a bounded live coin selection the user
chooses, budget usage as used-against-cap for every gauge the platform
declares — **the estimated token count among them, since v9.0.0 publishes it
that way** — with the counting model named, and — derived from the same
composition — which signals the report can feed, with the platform's default
allocation for each, and which it cannot. The preview reads the strategy fresh;
a platform refusal SHALL be shown in the platform's words, and an unreadable
strategy SHALL never render as an empty preview.

**A cost SHALL be shown against its ceiling.** A bare figure cannot answer the
question an author actually has, which is not "how large is this" but "how much
room is left". Grid-Commander SHALL NOT reconstruct a figure the platform has
stopped publishing, nor report as unavailable a figure it is displaying
elsewhere on the same surface.

**The preview SHALL also show how the strategy's conditions resolve**, per coin,
where the platform resolves them. The preview is the one surface holding live
market state, so it is the only place the question *would this rule fire right
now* can be answered at all. The product SHALL send the conditions the strategy
defines so that they can be resolved, and SHALL distinguish a strategy that
defines no conditions from one whose conditions the platform returned no outcome
for.

#### Scenario: The agent's-eye report
- **GIVEN** a strategy with sections composed
- **WHEN** the user previews it over the top ranked coins
- **THEN** each section renders its title and the platform's actual report
  text
- **AND** each budget gauge shows used against its cap, the token estimate
  included
- **AND** the model that did the counting is named as a note on the measurement

#### Scenario: A figure the platform no longer publishes
- **WHEN** the platform stops returning a figure it once returned separately
- **THEN** no surface claims that figure is unavailable while showing it in
  another form
- **AND** it is not reconstructed from the form that replaced it

#### Scenario: Which signals the composition feeds
- **WHEN** the preview renders
- **THEN** the signals the report can feed are listed with their platform
  default allocations
- **AND** the count of signals the composition cannot feed is stated

#### Scenario: How the conditions resolve on each coin
- **GIVEN** a strategy that defines conditions
- **WHEN** the user previews it over a coin selection
- **THEN** each coin is named, with the platform's outcome for each condition
  on it
- **AND** the outcome shown is the platform's own, never one derived here

#### Scenario: A strategy that defines no conditions
- **WHEN** a strategy with no conditions is previewed
- **THEN** the preview says direction is decided by its signals alone
- **AND** this is distinguished from a strategy whose conditions the platform
  returned no outcome for

#### Scenario: Nothing is written
- **WHEN** a preview runs
- **THEN** no write reaches the platform and the strategy is unchanged

#### Scenario: A refused preview teaches
- **GIVEN** the platform refuses the composed draft
- **WHEN** the preview runs
- **THEN** the refusal is shown in the platform's words on the same page

## ADDED Requirements

### Requirement: A Condition Outcome Shows The Evidence That Decided It

Where the platform explains a condition's outcome clause by clause, the product
SHALL show that explanation: the column read, what was observed, what was
required, and the platform's outcome for that clause. An outcome SHALL NOT be
shown as a bare verdict when the platform supplied its reason.

The observed value against the required one is the whole answer to *why did this
rule not fire*, which is the question the surface exists to answer. A verdict
alone tells an author their rule failed and leaves them to guess at which part.

An evidence entry in a form this product does not model SHALL be reported as not
understood rather than dropped, so a grammar the platform extends shows up as a
named gap rather than as a shorter explanation than the one that was given.

#### Scenario: A clause that did not hold
- **GIVEN** a condition the platform resolved with clause-level evidence
- **WHEN** the outcome is shown
- **THEN** the column the clause reads is named
- **AND** the value observed and the value required are both shown, as the
  platform sent them

#### Scenario: An evidence form the product does not model
- **GIVEN** an evidence entry whose form this product does not model
- **WHEN** the outcome is shown
- **THEN** the outcome still renders
- **AND** the unmodelled entry is reported as not understood rather than omitted

### Requirement: A Provisional Outcome Is Never Shown As Settled

Where the platform marks an outcome provisional — the bar is not closed and the
answer can still change — the product SHALL show it as provisional wherever that
outcome appears, and SHALL NOT present it in a form that could be read as a
settled result.

A provisional outcome and a settled one are different claims about the market. A
surface that renders them identically tells an author a rule has failed when the
platform said only that it has not held yet, which is the same defect as showing
a simulated score as what happened.

#### Scenario: A provisional outcome
- **GIVEN** an outcome the platform marked provisional
- **WHEN** it is shown
- **THEN** it is marked as still able to change, on the outcome itself
- **AND** it is distinguishable from an outcome the platform did not mark

#### Scenario: Counting what is settled
- **WHEN** outcomes are summarised for a coin
- **THEN** the provisional ones are stated as provisional
- **AND** they are not counted as settled results

### Requirement: An Unresolved Member Is Never Counted As False

Where the platform reports counts for a threshold group, the product SHALL show
the number of members that held, the number that could not be resolved, and the
total, each as the platform sent it. It SHALL NOT sum the unresolved into the
false, and SHALL NOT derive a false count of its own.

Unresolved is a third state: a member the platform could not answer for, usually
because the report does not carry the column it reads. Folding it into "did not
hold" reports a rule as failing where the platform reported that it could not
tell — and the distinction is invisible in the declared schema, so nothing but
this requirement protects it.

#### Scenario: A threshold group with unresolved members
- **GIVEN** a group whose counts carry an unresolved count
- **WHEN** the counts are shown
- **THEN** held, unresolved, and total are each shown as sent
- **AND** no count of members that did not hold is computed here

#### Scenario: A condition that is not a threshold group
- **GIVEN** a condition for which the platform sent no counts
- **WHEN** it is shown
- **THEN** no counts are shown for it
- **AND** the absence is not rendered as zero of zero
