# platform-mapping — delta

## ADDED Requirements

### Requirement: The Record Describes Every Shape A Union Declares

Where the platform declares a path as a union of object shapes, the recorded
surface SHALL describe every one of those shapes, including shapes declared
inside a further union at that path.

The record SHALL NOT describe one branch of a union as though it were the whole
path. A record that closes an accepted set around a single branch reports every
other branch's own fields as violations — it invents a refusal the platform does
not make, which is the more damaging direction of error, because a guard that
fails against correct code gets switched off rather than repaired.

#### Scenario: A union nested inside a union

- **GIVEN** a path whose declared union holds one plain object and one further
  union of five more
- **WHEN** the surface record is derived
- **THEN** all six shapes are described at that path
- **AND** no shape's fields are recorded as outside the accepted set

#### Scenario: A path reachable only through a nested branch

- **GIVEN** an object declared only inside a branch of a nested union
- **WHEN** the surface record is derived
- **THEN** that object's own path is recorded, with what it accepts

#### Scenario: A shape that refers back to the union that holds it

- **GIVEN** a union whose member list refers back to the union itself
- **WHEN** the surface record is derived
- **THEN** the record terminates, describing the union at the first depth it is
  reachable and not repeating it without end

### Requirement: No Two Recorded Variants Match One Payload

Every variant the record describes at a path SHALL be distinguishable from every
other variant at that path, so that a payload identifies exactly one.

Where the values pinned to single constants cannot distinguish two branches, the
record SHALL use the values pinned to a fixed set of alternatives on a property
the branch demands. A constant is a set of one, and treating one as identifying
while the other is invisible is a distinction of how the declaration is written
rather than of what it permits.

Where nothing the declaration pins can distinguish two branches, the record SHALL
describe them as a single variant which accepts what either accepts, demands only
what both demand, and is treated as closed only if both are closed. Such a record
may fail to report a violation; it SHALL NOT report one the platform would not
make.

The record SHALL NOT describe a variant that a payload belonging to it cannot
match, and SHALL NOT rely on the order variants are written in to resolve which
one a payload belongs to.

#### Scenario: Branches sharing a discriminating value

- **GIVEN** four branches that all pin the same value on one property
- **AND** three of them pin a second property to a single value, while the fourth
  pins that property to a set of alternatives
- **WHEN** the surface record is derived
- **THEN** each of the four is described separately
- **AND** a payload belonging to any one of them matches only that one

#### Scenario: Branches nothing distinguishes

- **GIVEN** two branches that pin no value at all, differing only in which fields
  they demand
- **WHEN** the surface record is derived
- **THEN** they are described as one variant accepting the fields of both and
  demanding the fields of neither alone
- **AND** a payload belonging to either is not reported as violating the other

#### Scenario: A distinguishable union is left alone

- **GIVEN** a union whose branches are already told apart by their pinned
  constants
- **WHEN** the surface record is derived
- **THEN** each variant is identified by those constants and by nothing further

### Requirement: The Payload Sweep Holds Every Payload The Product Constructs

Every payload this product sends to BattleGrid SHALL be held against the recorded
surface, including both condition payloads: a strategy's own conditions travelling
to a report preview, and a condition drafted beside them.

No payload SHALL be exempted from the sweep by a note in the code that sends it.
An exemption is a claim about the code, and claims about the code belong in
checks — the one exemption this sweep ever carried is where the apply path's
missing required fields stayed invisible.

Where a recorded path is known to have been derived before a defect in the
derivation was repaired, the sweep MAY allow what that defect must report, on two
conditions: the allowance SHALL be derived from the record's own content rather
than from the text of a message, and it SHALL disappear on its own when the record
is regenerated. Everything the record says about the payload beyond that allowance
SHALL still be checked.

#### Scenario: A condition payload against a current record

- **GIVEN** a recorded surface describing every branch of the condition grammar
- **WHEN** a strategy's own conditions, or a drafted condition composed beside
  them, are held against it
- **THEN** no violation is reported

#### Scenario: A condition payload against a record derived before the repair

- **GIVEN** a recorded surface describing only one branch of the condition grammar
- **WHEN** a condition payload is held against it
- **THEN** the only violations allowed are the ones that record's own accepted set
  must produce
- **AND** a payload defect outside that allowance still fails

#### Scenario: The allowance ends without an edit

- **GIVEN** a recorded surface that describes every branch at those paths
- **WHEN** the same payloads are held against it
- **THEN** the allowance is empty and the payloads are checked in full
