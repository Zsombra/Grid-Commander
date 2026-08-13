## MODIFIED Requirements

### Requirement: A Remedy Named Must Exist In That Deployment
Where the product tells a user how to recover from a failure, it SHALL name a
remedy available in the deployment they are using, and MUST NOT name one that
exists only in another.

Diagnosis and remedy are different facts and travel differently. *What went
wrong* is the same everywhere — authority is no longer valid — and is stated in
one way for every cause, so nobody has to distinguish an expired token from a
forged cookie. *What to do about it* depends on how the deployment obtained its
authority in the first place, and there are only two answers.

Naming the wrong one is worse than naming none. A user who is told to reconnect
goes looking for a connect button; when there is none, the reasonable conclusion
is that the product is broken, not that the advice was written for a deployment
they are not running.

This is why a failure that carries a remedy is shown with the sentence it
carried, rather than being routed somewhere that composes its own. Sending an
operator whose write just failed to the page that begins an authorization is
correct on a deployment that can begin one, and on a deployment acting with a
configured credential it renders "there is nothing to connect" — a true fact
about the deployment, and an answer to a question they did not ask.

**Where the remedy is something the user can reach, the surface SHALL offer it
as a target and not only as a sentence.** A remedy stated in prose on a surface
with nothing to click leaves the user to find the route themselves, at the moment
they have least reason to trust the product. Where the remedy is not something a
control can perform — a credential the operator must replace and a process they
must restart — the surface SHALL state it and add nothing, because a control
that cannot perform the remedy is the same false affordance this requirement
exists to prevent.

Which of the two applies is a property of the **deployment**, decided once where
the deployment is assembled. A surface deciding it per failure is a second
answer to a settled question, and the two will disagree.

#### Scenario: A remedy the user can reach
- **GIVEN** a deployment whose authority can be obtained again
- **WHEN** a surface reports that authority is no longer valid
- **THEN** it offers a way to begin that, alongside the sentence the failure
  carried

#### Scenario: A remedy no control can perform
- **GIVEN** a deployment acting with a configured credential
- **WHEN** a surface reports that authority is no longer valid
- **THEN** it states the remedy and offers no control
- **AND** it does not offer to begin an authorization the deployment cannot make

#### Scenario: A configured credential is refused
- **GIVEN** a deployment acting with a configured credential
- **WHEN** its authority is refused
- **THEN** the remedy named is to replace that credential
- **AND** the user is not told to reconnect
