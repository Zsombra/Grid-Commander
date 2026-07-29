# agent-understanding — delta

## ADDED Requirements

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

## MODIFIED Requirements

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
