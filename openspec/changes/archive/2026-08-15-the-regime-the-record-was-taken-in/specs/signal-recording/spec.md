## ADDED Requirements

### Requirement: The Regime Around The Record Is Readable, Bounded To The Record's Window

For each recorded series (one coin at one interval), the product SHALL read
the platform's own per-bar regime classification live at render time and
present its composition — how many platform bars each regime label held —
bounded to that series' recorded window (first capture to last capture),
beside the platform's current regime snapshot for the same coin and
interval. Regime and conviction labels SHALL be carried verbatim as the
platform states them, never enumerated or translated in source, so a label
the platform introduces tomorrow renders the day it appears.

The look-back depth requested SHALL come from the tool's declared schema at
runtime, never from a compiled-in constant. When the platform's look-back
does not reach back to the series' first capture, the surface SHALL state
the span the composition actually covers — a composition quietly narrower
than the record's window is the lie this surface exists to prevent. The
current snapshot SHALL be presented as the state now, distinguishable from
the window the composition describes.

#### Scenario: Composition is bounded to the record's window

- **GIVEN** a recorded series and a platform regime history that extends
  both before the first capture and after the last
- **WHEN** the regime context renders
- **THEN** only bars within the series' recorded window count toward the
  composition
- **AND** each regime label shows the number of bars it held, never a
  share without its count

#### Scenario: A look-back that cannot reach the record's start is stated

- **GIVEN** a series whose first capture is older than the oldest point the
  platform returns
- **WHEN** the regime context renders
- **THEN** the surface states the span the composition covers, so the
  reader knows it is not the whole window

#### Scenario: An unseen regime label renders verbatim

- **GIVEN** a regime history containing a label this product has never seen
- **WHEN** the composition renders
- **THEN** the label appears exactly as the platform stated it, with its
  bar count

#### Scenario: Now is not the window

- **GIVEN** a series with a composition and a current snapshot
- **WHEN** the regime context renders
- **THEN** the snapshot is presented as the state now — regime, conviction,
  and how many bars it has held — distinguishable from the window
  composition

### Requirement: Each Series' Regime Reads Fail Alone, And Every Empty Answer Names Its Kind

One series' regime reads failing SHALL NOT prevent any other series from
rendering — the failed series states the platform's reason, with cause
distinguished (refused vs unreachable) by the shared explanation. A coin
the platform classifies no regime for, and a timeframe the platform holds
no points for, are answers, not failures, and SHALL each be stated in their
own terms, distinctly from a read that failed. An account that never
recorded SHALL be told how recording starts, in the same terms as the
record's other surfaces; a record store that could not be read SHALL be
distinguished from an empty record, in the store's own terms rather than
the shared BattleGrid sentence, because BattleGrid is not the cause.

#### Scenario: One coin fails, the rest render

- **GIVEN** three recorded series where the platform's regime read fails
  for one coin
- **WHEN** the regime context renders
- **THEN** the two other series render their compositions and snapshots
- **AND** the failed series carries the platform's reason and the shared
  cause-accurate explanation

#### Scenario: Unclassified is an answer

- **GIVEN** a coin for which the platform returns a null snapshot
- **WHEN** the regime context renders
- **THEN** the series states that the platform classifies no regime for it,
  as a fact rather than a failure

#### Scenario: No points is an answer

- **GIVEN** a series for which the platform returns zero regime points
- **WHEN** the regime context renders
- **THEN** the series states that the platform holds no regime history at
  that timeframe, as a fact rather than a failure

#### Scenario: The store failing is not an empty record

- **GIVEN** a record store that cannot be read
- **WHEN** the regime context is read
- **THEN** the surface says the record could not be read and that this says
  nothing about what is recorded, in the store's own terms
