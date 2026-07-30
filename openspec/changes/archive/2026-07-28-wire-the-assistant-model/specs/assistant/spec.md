## ADDED Requirements

### Requirement: An Assistant That Cannot Answer Says So
Where the assistant cannot produce an answer at all — because no model is
configured for the deployment, or because the configured one could not be
reached — the product SHALL say so plainly and remain usable. It MUST NOT
present the failure as an answer, and MUST NOT invent one.

The distinction this protects is the one the capability is built on: an answer
that was not produced and an answer that was produced from nothing are the same
text to a user, and only one of them is honest.

#### Scenario: No model is configured for the deployment
- **WHEN** a user asks a question and the deployment has no model behind the
  assistant
- **THEN** they are told that the assistant is unavailable on this deployment
- **AND** they are told where the same information can be read directly
- **AND** the answer is not presented as a statement about their account

#### Scenario: The model could not be reached
- **WHEN** a model is configured and answering fails before an answer exists
- **THEN** the user is told the assistant could not answer, rather than shown an
  error page
- **AND** nothing that was read on the way is presented as a partial answer

#### Scenario: The assistant stops before it has finished
- **WHEN** answering reaches the limit of what one question is allowed to
  consume
- **THEN** the answer says it is incomplete
- **AND** what was read is still identified

#### Scenario: Asking is possible either way
- **WHEN** the assistant is unavailable for any reason
- **THEN** the page still renders and the question can still be asked
