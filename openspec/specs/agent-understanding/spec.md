# Agent Understanding Specification

## Purpose

Show what an agent thought, and why it did or did not act.

Grid-Commander is a workbench for building, tuning and **understanding**
BattleGrid agents. The first two are about changing an agent; this capability is
about reading one — its decision cycles, the market it saw, the reasoning it
wrote, the confidence it had against the bar it set itself, and what followed.

It is a read-only capability by construction. Nothing under it mutates anything,
which is what makes it safe to grow quickly: 28 of BattleGrid's tools carry an
agent's internals and none of them can change one.

The standard it holds itself to is that a decision the agent declined to act on
is as visible as one it acted on. A log of only the trades placed describes half
the behaviour, and hides the half an operator most often needs explained.

## Requirements

### Requirement: An Agent's Decisions Are Readable, Including The Ones It Declined
Grid-Commander SHALL show an agent's decision cycles — what it saw, what it
concluded, and what followed — including the cycles in which it decided to do
nothing.

A log of only the trades an agent placed describes half its behaviour. An agent
that evaluated a setup and declined it made a decision, and it is the decision an
operator most often wants explained: the platform records it as
`SKIPPED_LOW_CONFIDENCE`, and until this existed the product could not show that
it had happened.

#### Scenario: Reading an agent's decisions
- **WHEN** a user opens an agent's reasoning
- **THEN** its decision cycles are shown, newest first
- **AND** each carries what the agent saw and the reasoning it wrote

#### Scenario: A cycle in which the agent acted on nothing
- **WHEN** a cycle ended without action
- **THEN** it is shown alongside the others rather than omitted
- **AND** the reason it ended that way is stated

#### Scenario: An agent that has not reasoned yet
- **WHEN** an agent has no recorded decisions
- **THEN** the user is told there are none
- **AND** this is distinguished from the log being unreadable

### Requirement: Confidence Is Shown Against The Bar It Had To Clear
Where a decision carries a confidence and the threshold it was measured against,
Grid-Commander SHALL show both, and SHALL state whether the bar was cleared.

A confidence of 0.35 means nothing alone. Against a threshold of 0.35 it means
the agent only just acted; against 0.7 it means the agent stood down and was
right to. Showing the number without the bar invites the reader to invent one.

#### Scenario: A decision with a threshold
- **WHEN** a decision records both a confidence and a threshold
- **THEN** both are shown
- **AND** whether the confidence cleared the threshold is stated rather than
  left to be worked out

#### Scenario: A decision with no threshold recorded
- **WHEN** no threshold was recorded
- **THEN** the confidence is shown without one
- **AND** no bar is implied or invented

### Requirement: An Outcome The Platform Adds Is Shown, Not Dropped
Where BattleGrid names something this product has no copy for, Grid-Commander
SHALL show the platform's own name rather than omitting the entry or
substituting a fallback that asserts something untrue.

There is no tool that enumerates outcomes or event kinds, so any list held here
is a snapshot of one account on one afternoon. This has been demonstrated twice:
a second, older account produced eight names the first account was too young to
contain, and every one reached the surface readable because nothing was narrowed
to a union.

**A sentence the platform wrote SHALL be found wherever it puts it.** The key
carrying an explanation is not fixed — a cost limit reports under `error` where a
skipped round reports under `reason` — and a reader looking in one place will
silently miss the other. What is at stake is the single line explaining why an
agent stopped.

**Detail that identifies the thing being read SHALL NOT be printed back at the
reader.** Identifiers for the agent, session or record already in view carry no
information on that surface, and a list of them buries the sentence beside it.

#### Scenario: An unrecognised name
- **WHEN** BattleGrid reports an outcome or event kind this product has no copy for
- **THEN** it is shown under the platform's own name

#### Scenario: An explanation under an unexpected key
- **WHEN** the platform explains an event under a key other than the usual one
- **THEN** the explanation is still shown as prose

#### Scenario: Detail that is only identifiers
- **WHEN** an event's detail is identifiers for what the reader is already looking at
- **THEN** none of it is shown

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

### Requirement: How An Agent Has Done Is Shown From What The Platform Already Sent
Grid-Commander SHALL show an agent's record — how many games it played, how
often it won, how accurate it was, what it earned, and how its trades went —
where BattleGrid reports them.

**A figure the product already receives SHALL NOT be discarded.** The agent
payload carries a performance block on every read, and the product parsed it and
threw it away for its whole life. A field excluded from a domain type because it
governs no rule is not thereby excluded from the interface; understanding is a
purpose of this product, not a side effect of authoring.

**Where a tool's name and its contents disagree, the contents decide.** The tool
called `get_agent_performance` returned no populated figure on any agent
observed, while the roster read carries the full record. Nothing is presented
from a source that has only ever answered with zeros.

**A number the platform sends twice SHALL be kept once.** A rate arrives as both
a fraction and a whole-number percent; the product keeps one and derives
nothing, so the two can never disagree on a surface.

#### Scenario: An agent that has played
- **WHEN** a user opens an agent BattleGrid has a record for
- **THEN** they see what it played, how it did, and what it earned

#### Scenario: An agent that has never played
- **WHEN** BattleGrid reports no games and no trades for an agent
- **THEN** the surface says so
- **AND** does not present zeroes as a result

#### Scenario: A record that could not be read
- **WHEN** the agent's record is absent from the response
- **THEN** that is distinguished from an agent that has done nothing

#### Scenario: Games and trades are not merged
- **WHEN** an agent has both a game record and a trade record
- **THEN** each is shown as its own, and no combined figure is invented

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

### Requirement: An Agent's Trading Record Is Readable

The product SHALL show, for one agent, the trades it has closed — newest
first — each with its market, direction, net profit or loss, the fees and
slippage it paid, the leverage and conviction it acted on, why and by whom
it was closed, and how long it was open. Alongside them the product SHALL
show a summary **derived from the trades shown** — how many closed, how
many won, the net total, the fees paid, and the spread of close reasons —
and SHALL label that summary as computed from those trades rather than
published by the platform. An agent with no closed trades SHALL say so; a
record that cannot be read SHALL say that instead.

#### Scenario: The record of a trading agent
- **GIVEN** an agent with closed trades
- **WHEN** the user opens its trading record
- **THEN** each trade shows its market, direction, net P&L, fees,
  slippage, leverage, conviction, close reason, and duration
- **AND** a summary derived from those trades states the count, the wins,
  the net total, and the fees paid
- **AND** the summary is marked as computed from the trades shown

#### Scenario: An agent that has never closed a trade
- **WHEN** the user opens the record of an agent with no closed trades
- **THEN** the page says it has closed none, and does not show a summary
  of zeros as if it were a result

#### Scenario: More trades than one page
- **GIVEN** the platform reports more closed trades than the page holds
- **WHEN** the record renders
- **THEN** the user is told how many there are in total and can reach the
  next page

#### Scenario: A record that cannot be read
- **GIVEN** the platform does not answer
- **WHEN** the user opens the record
- **THEN** the page says the record could not be read and why
- **AND** does not render an empty record

### Requirement: Why An Agent Did Not Trade Is Readable

The product SHALL show, for one agent, the three stages at which a trade
candidate can end: candidates blocked before signal evaluation — with the
stage, the platform's reason code, and the quantified detail behind it;
evaluations that ran — with the aggregate score against the threshold in
force, the dominant bias, and the terminal status; and decisions the agent
reached — with its direction, conviction, the reasoning it wrote, and
**the per-signal checklist that reasoning was drawn from**. Each stage
SHALL be able to be empty or unreadable on its own without hiding the
others, and an empty stage SHALL say what its emptiness means rather than
render as blank.

Each checklist entry SHALL carry the platform's own verdict — `CONFIRM`,
`WARN`, `REJECT` or any other value it sends — without collapsing it to a
two-state pass/fail, and SHALL carry that signal's written interpretation
unparaphrased. A decision SHALL also show what it would have staked
(position size and preset), the horizon and volatility it was sized
against, and, where the platform gives them, the exchange order ids that
link the decision to what was actually placed.

#### Scenario: A silent agent explained
- **GIVEN** an agent whose candidates were blocked before evaluation
- **WHEN** the user opens why it did not trade
- **THEN** each block shows its stage, the platform's reason code, and the
  numbers behind it
- **AND** the agent's own reasoning is shown for any decision it reached

#### Scenario: An evaluation that was skipped
- **GIVEN** a signal evaluation whose terminal status is not an entry
- **WHEN** the pipeline renders
- **THEN** its aggregate score is shown against the threshold in force
- **AND** the dominant bias and whether signals conflicted are shown

#### Scenario: One stage empty, the others not
- **GIVEN** an agent with evaluations but no gate blocks
- **WHEN** the pipeline renders
- **THEN** the blocks stage says nothing was blocked
- **AND** the evaluations are still shown

#### Scenario: One stage unreadable, the others not
- **GIVEN** the platform fails to answer one stage
- **WHEN** the pipeline renders
- **THEN** that stage says it could not be read and why
- **AND** the stages that answered are still shown

#### Scenario: The evidence behind a decision
- **GIVEN** a decision whose checklist holds signals that confirmed and
  signals that rejected
- **WHEN** the decision renders
- **THEN** each signal is shown with its own verdict and the platform's
  written interpretation of it
- **AND** a verdict that is neither confirm nor reject is shown as the
  platform stated it, not folded into either

#### Scenario: A decision that carries no checklist
- **GIVEN** a decision the platform sent without checklist entries
- **WHEN** the decision renders
- **THEN** the decision is still shown with its reasoning
- **AND** no empty evidence list is rendered

### Requirement: An Unanswerable Trading Mode Says So

Where the product offers a trading mode whose decisions require a human
answer that Grid-Commander cannot yet give, the surface offering it SHALL
say so at the point of choosing. It SHALL NOT present the option as
complete while the accept and cancel actions are unbuilt.

#### Scenario: Choosing approval-required
- **GIVEN** the trading mode selector
- **WHEN** the user reads the approval-required option
- **THEN** it states that Grid-Commander cannot yet accept or cancel what
  the agent proposes
- **AND** names where answering still happens

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

### Requirement: A Block That Keeps Repeating Is Reported As A Condition
Where the same reason has stopped an agent more than once, Grid-Commander
SHALL report it as a standing condition — with how many times it occurred, the
window it occurred over, and when it last happened — rather than as a list of
individual events.

An agent stopped ninety-eight times by one reason over a week is not having a
run of bad luck. It is in a state, and the state is what its owner needs to
act on. A list of the ten most recent blocks makes the ninety-eighth look
exactly like the first, which is how an agent can sit unable to trade for a
week while every surface reports normally.

The summary SHALL be derived from the blocks the platform actually returned,
never from a table of which reasons this product believes are permanent. Where
the platform reports more blocks than were read, Grid-Commander SHALL state the
size of the window it summarised and that more exist.

#### Scenario: One reason, many times
- **GIVEN** an agent whose blocks are dominated by a single reason
- **WHEN** the user reads what is stopping it
- **THEN** that reason is shown with its count, its window and its most
  recent occurrence
- **AND** it is presented as an ongoing condition rather than as one event

#### Scenario: A reason that happened once
- **GIVEN** a reason that appears a single time in the history read
- **WHEN** the summary renders
- **THEN** it is shown as a single occurrence
- **AND** is not described as a standing condition

#### Scenario: More blocks than were read
- **GIVEN** the platform reports more blocks than the page returned
- **WHEN** the summary renders
- **THEN** the surface states how many were summarised and how many exist
- **AND** does not present the summary as the agent's whole history

#### Scenario: An agent nothing has stopped
- **GIVEN** an agent with no gate blocks
- **WHEN** the summary renders
- **THEN** the user is told nothing has stopped this agent
- **AND** that is distinguished from a history that could not be read

### Requirement: A Platform Reason Is Shown With Its Own Numbers And Never Reworded
Grid-Commander SHALL render each blocking reason using the quantities the
platform attached to it, and SHALL NOT substitute an explanation of its own for
a reason code it does not recognise.

The platform declares nineteen reason codes and attaches a typed detail to
many of them. `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` carries the equity, the
minimum equity that would clear it, the size preset and the leverage — the
whole arithmetic, computed by the platform. A product that re-derived that
from a balance and a preset would be recomputing an answer it was already
given, and would be wrong the moment the platform changed how it sizes.

Where a detail carries figures, they SHALL be shown as a statement an operator
can act on rather than as raw field names. Where a reason arrives with no
detail at all, it SHALL still be shown with its count and window — a reason the
platform declines to explain is not a reason to hide.

#### Scenario: A reason carrying the arithmetic
- **GIVEN** a block whose detail names the equity and the equity that would
  clear it
- **WHEN** it renders
- **THEN** both figures are shown
- **AND** the figure that would resolve it is identified as such

#### Scenario: A reason carrying nothing
- **GIVEN** a block whose detail is empty
- **WHEN** it renders
- **THEN** the reason and its count are still shown
- **AND** the surface says the platform gave no detail for it

#### Scenario: A reason this product does not recognise
- **GIVEN** a reason code the product has no wording for
- **WHEN** it renders
- **THEN** the platform's code is shown as it was sent
- **AND** any detail that came with it is shown
- **AND** no meaning is asserted for it

#### Scenario: The blocks cannot be read
- **GIVEN** the platform does not answer the block history
- **WHEN** the surface renders
- **THEN** it says what is stopping the agent could not be read
- **AND** does not report that nothing is stopping it

### Requirement: What An Agent Is Holding Right Now Is Shown Where The Agent Is Read
Grid-Commander SHALL show, for an agent with an open position, what it is
holding — the market, the direction, what was staked and what the position is
worth now — on the surface where that agent is read.

Every money surface in this product looks backwards. `/trades` reports closed
trades and `/pipeline` reports decisions already made. An agent can be holding
live capital, at leverage, with a stop that has moved since it was opened, and
no surface says so. It is the first thing an operator would look for.

Every figure SHALL come from the platform. Mark price, unrealized P&L, return
on equity, margin and liquidation price are all published, and a product that
recomputed any of them from an entry price would disagree with the exchange the
moment the platform changed how it marks.

Where the platform reports a position it could not price, the unpriced figures
SHALL be shown as unknown and SHALL NOT be rendered as zero. The platform
counts these separately; a position whose value could not be read is not a
position worth nothing.

The position's **effective** stop and target SHALL be shown as the current
ones, and labelled so. Position management moves them after the decision that
opened the trade, so a surface presenting the decided values as current
understates the protection in force.

Where the decision that opened a position can be found, the stop and target
**as that decision set them** SHALL be shown beside the effective ones, and
each SHALL be labelled with the moment it belongs to. The effective stop alone
answers *where is my protection* and hides *has anything moved it* — which is
the question an operator who has configured position management actually has,
and the only evidence on any surface that those settings ever act. The
decision is matched to the position by the identifier the position already
carries; no figure here is derived from any other.

Where the effective stop differs from the decided one, the product SHALL state
which way it moved — whether the position is now protected more than the
decision asked for, or less. A pair of numbers without that reading is a
puzzle, and read backwards it is the opposite of the truth on the surface where
that matters most: a long is protected by a stop that rises and a short by one
that falls. Where the platform reports a side the product cannot read a
direction from, both values SHALL still be shown and no direction SHALL be
claimed.

Grid-Commander SHALL NOT claim a direction for a target that moved. A
take-profit in a new place is a different exit, not more or less protection,
and naming it either would be this product's reading rather than the
platform's.

Where the decision behind a position cannot be found — because the decision
read did not answer, or because the decision has aged out of the window read —
the decided values SHALL be stated as unknown and the position SHALL NOT be
presented as one whose stop has not moved. The reads SHALL remain independent:
a decision list that could not be read SHALL cost every position its decided
values and SHALL NOT blank a position that answered.

The time the position was priced SHALL be stated, and **how long ago that was**
SHALL be stated with it. The platform declares how often a client should
re-read; a rendered page is a snapshot and SHALL NOT present itself as live. A
timestamp alone leaves the reader to do the arithmetic that turns it into
staleness, so a page held open for four minutes on a leveraged position reads
exactly like one opened a second ago.

Where the platform states no priced-at time, the surface SHALL still say the
figures are a snapshot rather than fall silent — a read that cannot say when it
was taken is more of a snapshot, not less. Where the priced-at time is later
than this product's own clock reads, the surface SHALL state the time and
SHALL NOT claim an age for it: two machines keep two clocks, and a negative age
rendered as a number would be this product's arithmetic presented as the
platform's fact.

The surface SHALL offer a way to read the figures again, and that way SHALL NOT
imply the page updates itself. A page that states its own staleness and offers
nothing to do about it reports a problem it does not let the reader solve.

#### Scenario: An agent holding a position
- **GIVEN** an agent with one open position
- **WHEN** the user reads that agent
- **THEN** the market, direction, notional, leverage and margin are shown
- **AND** the unrealized result is shown as the platform reported it
- **AND** the time it was priced is stated
- **AND** how long ago that was is stated with it

#### Scenario: A page read four minutes after it was priced
- **GIVEN** an agent holding a position priced four minutes before the page renders
- **WHEN** the surface renders
- **THEN** it states how long ago the figures were priced
- **AND** it still states the priced-at time itself
- **AND** it offers a way to read the figures again
- **AND** it does not present itself as live

#### Scenario: A priced-at time the platform did not state
- **GIVEN** an open position whose read carries no priced-at time
- **WHEN** the surface renders
- **THEN** the surface says the platform did not say when it was priced
- **AND** it still says the figures are a snapshot rather than a live reading

#### Scenario: A priced-at time later than this product's clock
- **GIVEN** a priced-at time ahead of the clock this product renders against
- **WHEN** the surface renders
- **THEN** the priced-at time is stated
- **AND** no age is claimed for it

#### Scenario: A position the platform could not price
- **GIVEN** an open position with no mark price
- **WHEN** it renders
- **THEN** its unrealized result is shown as unknown
- **AND** is not shown as zero

#### Scenario: A stop that has moved since the decision
- **GIVEN** a position whose effective stop differs from the one decided
- **WHEN** it renders
- **THEN** the effective stop is shown as the current one
- **AND** it is labelled as current rather than as the decided value

#### Scenario: The stop the decision set, beside the stop now
- **GIVEN** an open position whose entry decision can be found
- **AND** whose effective stop differs from the stop that decision recorded
- **WHEN** it renders
- **THEN** both values are shown, each labelled as decided or as current
- **AND** the move is stated as protecting more of the position, or less,
  according to the side of the trade

#### Scenario: A stop that has not moved
- **GIVEN** an open position whose effective stop equals the one its decision
  recorded
- **WHEN** it renders
- **THEN** no drift is reported for it

#### Scenario: The decision behind a position cannot be found
- **GIVEN** an open position whose entry decision is not among those read
- **WHEN** it renders
- **THEN** the decided stop is stated as unknown
- **AND** the position is not presented as one whose stop has not moved

#### Scenario: The decision list cannot be read while the position answers
- **GIVEN** the platform does not answer the entry-decision read
- **AND** the position read answered
- **WHEN** the surface renders
- **THEN** the position is still shown with every figure the platform sent
- **AND** the decided values are stated as unknown

#### Scenario: An agent holding nothing
- **GIVEN** an agent with no open position
- **WHEN** the user reads it
- **THEN** the surface says it is holding nothing
- **AND** that is distinguished from positions that could not be read

#### Scenario: Positions that cannot be read
- **GIVEN** the platform does not answer the position read
- **WHEN** the surface renders
- **THEN** it says what the agent is holding could not be read
- **AND** does not report that it is holding nothing

### Requirement: Entries That Never Became An Order Are Stated As A Finding
Where an agent's decisions to enter did not result in orders, Grid-Commander
SHALL state how many of them failed, against how many were decided, on the
surface where the agent is read.

The counts are already read — the funnel carries executed, failed and expired
against the entries decided — and already rendered as a row of statistics. A
row of statistics is where 28 looks like a number. An agent that decided sixty
entries, ran a model call for each, and saw twenty-eight of them never reach
the exchange is not having a quiet week; it is failing at the last step, and
the figure only means something when it is stated against the total.

Where more entries failed than succeeded, the product SHALL say so plainly.
That comparison is the platform's own two counts set against each other, not a
threshold this product chose.

Grid-Commander SHALL NOT state a reason for an individual failed entry. The
platform sends none — a failed decision carries an execution time and no order
id, and that absence is the whole of the evidence.

Where the product shows a fill rate the platform computed, it SHALL be
attributed to the platform and SHALL NOT be presented as the same figure as the
counts, which are computed differently.

#### Scenario: Entries that failed
- **GIVEN** an agent whose decisions include failed entries
- **WHEN** the user reads the agent
- **THEN** how many failed is shown against how many were decided

#### Scenario: More failed than succeeded
- **GIVEN** an agent with more failed entries than executed ones
- **WHEN** the surface renders
- **THEN** it states that failing is the more common outcome

#### Scenario: An agent whose entries all became orders
- **GIVEN** an agent with no failed entries
- **WHEN** the surface renders
- **THEN** no failure finding is stated

#### Scenario: A failure with no reason attached
- **GIVEN** a failed entry the platform sent without any explanation
- **WHEN** the failures are described
- **THEN** no cause is asserted for it

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

### Requirement: The Brain Is Shown Under The Platform's Human Name For It
Where BattleGrid reports a human-readable name for an agent's brain,
Grid-Commander SHALL show that name where the brain is described. Where it
reports none, the surface SHALL fall back to what it showed before — the
platform's own discriminator or model id — and SHALL NOT invent a name.

The read-back flattens the request's two-branch brain union into one field:
every agent observed on both accounts reads back `brainPreset: "CUSTOM"`,
each with a distinct real model beneath it. On read, that word cannot say
whether the brain is a preset or a named model, so the surface SHALL NOT
claim either — it states the name the platform reports and nothing more. The
`provider` field has only ever been observed null and SHALL NOT be rendered.

#### Scenario: A brain the platform names
- **GIVEN** an agent whose payload carries a human-readable model name
- **WHEN** the agent's page describes its brain
- **THEN** that name is shown
- **AND** the surface does not assert that the brain is a preset or a custom
  model

#### Scenario: A brain the platform does not name
- **GIVEN** an agent whose payload carries no human-readable model name
- **WHEN** the agent's page describes its brain
- **THEN** the surface shows what it showed before this change
- **AND** no name is invented for it

### Requirement: What An Agent Has Spent Is Shown Where Stoppage Is Explained, Without A Ceiling
Grid-Commander SHALL state, on the surface that explains what would stop an
agent, that spend is a further way BattleGrid can stop it, and SHALL show the
running 24-hour spend the platform reports. It SHALL NOT present a spend
ceiling, a gauge, or any proximity to being stopped — BattleGrid publishes no
spend cap on any read, and the only cap ever observed arrived inside a breach
message as prose, which SHALL NOT be parsed into a figure.

The figure SHALL be read from the roster read (`list_intelligence_agents`)
and never from the agent detail read: the two disagree stably for the same
agent at the same moment — list `0.09022839`, detail `0` — and the detail's
zero would show an agent that is spending money as one that is not
(`the-cost-of-an-agent-reads-differently-from-two-tools`).

#### Scenario: An agent with reported spend
- **GIVEN** an agent whose roster row carries a running 24-hour spend
- **WHEN** the user reads what would stop it
- **THEN** the total is shown, sourced from the roster row
- **AND** it is presented without a ceiling or a gauge
- **AND** the surface says no spend cap is published to read it against

#### Scenario: An agent whose roster row carries no spend figure
- **GIVEN** an agent whose roster row reports no spend
- **WHEN** the user reads what would stop it
- **THEN** the surface says no figure was reported
- **AND** does not show zero in its place

#### Scenario: The roster cannot be read
- **GIVEN** the roster read fails
- **WHEN** the user reads what would stop the agent
- **THEN** the surface says what it has spent could not be read, with the
  shared explanation
- **AND** does not report the agent as having spent nothing
