## ADDED Requirements

### Requirement: The Protection That Rests At The Venue Is Read, Not Assumed
For an agent's open position, Grid-Commander SHALL show the reduce-only orders
actually resting at the venue for that position's coin — each with its type,
trigger price, size and order id — and SHALL state plainly when no such order
rests, rather than leaving the platform's effective stop to imply one does.

The platform's effective levels and the venue's resting orders are different
claims: one is software's intention, the other is an order the exchange honours
on its own. They SHALL be shown as whose they are and SHALL NOT be reconciled
into a single figure.

The resting read is a snapshot of rows that churn within minutes, and the
surface SHALL present it as one. It SHALL fail independently: an unreadable
orders read costs this section alone and says why, and the positions beside it
still render.

#### Scenario: A position's resting legs render
- **GIVEN** an agent with an open position and reduce-only orders resting on
  its coin
- **WHEN** the agent's page renders
- **THEN** each resting order shows its type, trigger, size and order id

#### Scenario: A position with nothing resting is said plainly
- **GIVEN** an open position whose coin has no reduce-only order resting
- **WHEN** the page renders
- **THEN** it states that no protective order rests at the venue for this
  position

#### Scenario: The orders read fails and nothing else does
- **WHEN** the resting-orders read cannot be served
- **THEN** the section says why, using the shared explanation
- **AND** the position, its levels and the rest of the page still render

#### Scenario: A row the venue sent without an identity is dropped, not invented
- **WHEN** an order row arrives without a readable order id or symbol
- **THEN** it is omitted from the rendered legs
- **AND** no identifier is fabricated for it
