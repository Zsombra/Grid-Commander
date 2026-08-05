## ADDED Requirements

### Requirement: A Failure Says What Happened, In The Operator's Terms
Where a read or an operation fails, the reason Grid-Commander shows SHALL be a
statement of what happened, not the protocol artefact that carried it.

A status line, a method name, or a tool identifier is diagnostic material. It
may accompany the reason and SHALL NOT be the whole of it — the person reading
it has to be able to tell whether the fault is theirs, their credential's, or
the platform's, and act accordingly.

Where the distinction is available, the reason SHALL distinguish a platform that
did not answer from one that answered and refused, because the two have
different remedies and one of them is "wait".

#### Scenario: The platform is unreachable
- **WHEN** the platform answers with a gateway failure
- **THEN** the reason states that the platform is not answering
- **AND** states that this is not a fault in the operator's account or credential
- **AND** carries the status alongside, rather than instead

#### Scenario: The platform refuses the request
- **WHEN** the platform answers with a client error other than a withdrawal of authority
- **THEN** the reason states that the platform refused the request
- **AND** is distinguishable from the platform being unreachable

#### Scenario: An operation is refused because its classification is unknown
- **WHEN** an operation cannot be performed because Grid-Commander could not
  establish what it does
- **THEN** the reason states that it could not be confirmed and so was not performed
- **AND** does not assert what kind of operation it was
