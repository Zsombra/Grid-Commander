# harness-integrity — delta

## ADDED Requirements

### Requirement: A Live Probe Reuses Its Throwaway Subject Rather Than Minting One
A check that needs a disposable BattleGrid agent to write to SHALL look for the
one it left behind on a previous run and reuse it, and SHALL create a new one
only when no such agent exists.

Creating one per run left eight archived agents on the operator's second account
across a handful of sessions, on a roster of eleven. The MCP surface has no
delete tool — archiving is the end of the road — so nothing this product does
can remove them, and the only available fix is to stop adding to them.

The search SHALL cover archived agents as well as active ones, because a run
that cleans up after itself leaves its subject archived and an agent that cannot
be seen is an agent that will be created again. Where the roster cannot be read,
the check SHALL NOT create an agent and SHALL report itself as not run: a check
that cannot see the roster cannot know whether its subject already exists, and
creating on that ignorance is what produced the litter.

Reactivating an archived agent runs on `mcp:read` and is not destructive by
BattleGrid's classification, so it requires no confirmation. Creating one is
also `mcp:read` and not destructive. Archiving it at the end is destructive and
carries a confirmation naming the agent, exactly as any archive does.

#### Scenario: A throwaway from an earlier run is still there
- **GIVEN** a disposable agent this check left behind and archived
- **WHEN** the check runs again
- **THEN** that agent is reactivated and used
- **AND** no new agent is created

#### Scenario: No throwaway exists yet
- **GIVEN** an account carrying no disposable agent for this check
- **WHEN** the check runs
- **THEN** exactly one is created
- **AND** it is created unable to trade

#### Scenario: The roster cannot be read
- **GIVEN** the platform does not answer the roster read
- **WHEN** the check runs
- **THEN** no agent is created
- **AND** the check reports that it did not run, and why

#### Scenario: The run ends
- **GIVEN** a check that has finished with its disposable agent
- **WHEN** it cleans up
- **THEN** the agent is left archived and still unable to trade
- **AND** the next run finds it rather than creating another

#### Scenario: Two checks that each need one
- **GIVEN** two checks that both write to a disposable agent
- **WHEN** they run at the same time
- **THEN** each uses its own agent
- **AND** neither can select the other's

### Requirement: A Probe Never Selects An Agent Its Owner Runs
Selecting an agent for a check to write to SHALL require **both** that the agent
carries the naming convention this repository gives its disposable agents **and**
that the platform reports it in `tradingMode: OFF`. An agent satisfying only one
SHALL NOT be selected.

The two conditions answer different questions and neither answers both. A
display name is a string anyone can type, so a name alone would let an operator
who renamed something be handed a live trader. `OFF` alone would match an agent
its owner has merely paused. Every agent the operator actually runs on these
accounts is in `FULL_EXECUTION`, and a check reactivates, edits and archives what
it selects — so a wrong selection stops somebody's trading agent, which is a
worse outcome than any litter.

An agent whose trading configuration did not arrive SHALL NOT be selected: a
mode that could not be read is not a mode known to be off.

The conditions SHALL be re-checked against a fresh read of the chosen agent
before it is written to, because a roster row is a snapshot and the decision to
write to an account belongs to what that account holds now.

#### Scenario: The operator's own agents are on the roster
- **GIVEN** a roster carrying agents in `FULL_EXECUTION`
- **WHEN** a check selects its subject
- **THEN** none of them is selected, whatever they are called

#### Scenario: An agent wearing the convention's name that can trade
- **GIVEN** an agent named as a disposable agent but not in `tradingMode: OFF`
- **WHEN** a check selects its subject
- **THEN** it is not selected
- **AND** the check proceeds as though no disposable agent exists

#### Scenario: An agent that is off but was never named by this repository
- **GIVEN** an agent in `tradingMode: OFF` that the convention does not name
- **WHEN** a check selects its subject
- **THEN** it is not selected

#### Scenario: An agent whose configuration could not be read
- **GIVEN** a candidate whose trading configuration is absent
- **WHEN** the conditions are evaluated
- **THEN** it is refused rather than assumed to be off

#### Scenario: The agent changed between the roster read and the write
- **GIVEN** a candidate that no longer satisfies both conditions when re-read
- **WHEN** the check is about to write to it
- **THEN** nothing is written to it
- **AND** the check reports that it did not run, and why
