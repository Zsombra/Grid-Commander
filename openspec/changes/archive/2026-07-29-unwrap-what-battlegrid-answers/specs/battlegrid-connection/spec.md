## ADDED Requirements

### Requirement: A Tool Result Is Read From Its Envelope, Or Refused
Grid-Commander SHALL extract the payload a tool returned from the transport
envelope that carries it, and MUST NOT treat an envelope it cannot read as an
empty result.

An envelope and a payload are different things. Handing the envelope to code
expecting the payload does not fail — every field it looks for is simply absent,
and absent reads as *nothing there*. That turns a broken integration into a
confident, wrong statement about the user's account: no agents, no strategies,
no capacity. It is the same class of error as reporting an unread roster as an
empty one, one layer further down, and the type system cannot see it because
both are objects.

#### Scenario: A tool returns a payload
- **WHEN** a tool call succeeds
- **THEN** the caller receives what the tool returned, not the envelope around it

#### Scenario: The envelope carries the payload in more than one encoding
- **WHEN** a result offers the payload both as structured data and as text
- **THEN** either may be read
- **AND** the caller cannot tell which was used

#### Scenario: The envelope cannot be read
- **WHEN** a result carries no payload in any encoding the product understands
- **THEN** the call fails
- **AND** it MUST NOT be reported as a successful call that returned nothing
- **AND** the user is told the platform could not be reached, rather than that
  they own nothing

### Requirement: A Refused Tool Call Is A Failure
Where the platform accepts a request and reports that the tool itself refused,
Grid-Commander SHALL treat that as a failed operation.

A tool that rejects its arguments answers over a healthy transport: the response
is well-formed and the status is success. Reading only the transport makes every
such refusal look like an operation that ran and changed nothing — which is
indistinguishable, in the record, from one that ran and did nothing.

#### Scenario: The platform reports a tool error
- **WHEN** a result is marked as an error by the platform
- **THEN** the call fails rather than returning a payload
- **AND** the failure carries what the platform said about it

#### Scenario: The record of a refused call
- **WHEN** a modifying operation is refused by the tool
- **THEN** the audit record for it shows that it failed
- **AND** does not show it as succeeded
