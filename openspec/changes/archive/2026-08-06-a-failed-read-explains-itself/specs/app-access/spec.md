# app-access — delta

## ADDED Requirements

### Requirement: A Failed Read Says What It Does Not Mean
Where a surface renders the outcome of a read that produced nothing,
Grid-Commander SHALL tell the user what the failure does *not* establish, and
SHALL name the cause the read carried out rather than one inferred from the
message.

A reason says what failed. It does not say that the user's work survived it, and
an operator looking at an empty panel where their agents should be has no way to
tell a transient outage from something that deleted them. The reassurance is the
whole point of the sentence, and it earns the right to be believed by naming a
cause that is obviously external and obviously not deletion.

**A refusal and an outage are opposite, and MUST be distinguished.** BattleGrid
answering *no* means waiting changes nothing and the authority is what needs
fixing; no answer at all means the authority may be perfectly good and waiting
may be exactly right. The distinction SHALL be carried from where the read
happened, with the error in hand, and MUST NOT be re-derived by matching on the
words of a message — a view that does that is a second, worse copy of a
judgement already made, and it starts lying the first time a message is
reworded.

**The reassurance SHALL name its subject.** "This does not mean your agents are
gone" is a different sentence from "this does not mean your strategies are
gone", and a surface that names neither has told the user only that something
went wrong. Each surface states what it was reading.

**This SHALL be enforced by a check that derives the surfaces from the source.**
A list of the surfaces that render a failed read is a list that passes while the
next one is written, and that is how thirty of thirty-six branches came to print
a reason and stop while a shared component for saying more sat unused. The check
SHALL ask what a branch renders, not what its file mentions.

**Where a surface should not carry the sentence, the exemption SHALL be stated
and checked.** A branch that says nothing and is caught by nothing is
indistinguishable from one that was forgotten. An exemption SHALL carry its
reason, SHALL fail when it names a branch that no longer exists, and SHALL fail
when the branch it names has since started carrying the sentence.

#### Scenario: A read that could not reach the platform
- **WHEN** a surface renders a read that produced nothing because no usable
  answer came back
- **THEN** it says the failure does not mean the thing it was reading is gone
- **AND** names being unable to reach BattleGrid as the cause

#### Scenario: A read the platform refused
- **GIVEN** BattleGrid was reached and declined the request
- **WHEN** the surface renders
- **THEN** it says the authority was refused rather than that the platform
  could not be reached
- **AND** the user is not told to wait out an outage that is not happening

#### Scenario: The subject of the reassurance
- **WHEN** a surface says a failure does not mean something is gone
- **THEN** it names what it was reading
- **AND** the sentence it forms is grammatical

#### Scenario: A new surface that renders a failed read
- **WHEN** a surface is written that renders a read producing nothing, and it
  says only what went wrong
- **THEN** this fails a check that gates a change, naming the branch

#### Scenario: A surface where the sentence would be untrue
- **GIVEN** a read that never involved BattleGrid, such as one of
  Grid-Commander's own records
- **WHEN** the surface renders its failure
- **THEN** it does not name BattleGrid as the cause
- **AND** the reason it carries no shared reassurance is recorded where the
  check can read it, rather than left to silence

#### Scenario: An exemption that has been overtaken
- **GIVEN** a recorded exemption whose branch has been removed, or which now
  renders the shared explanation
- **WHEN** the checks that gate a change run
- **THEN** they fail, naming the exemption to delete
