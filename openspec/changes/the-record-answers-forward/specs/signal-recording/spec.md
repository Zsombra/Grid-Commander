## ADDED Requirements

### Requirement: Forward Returns Are Derived From The Record, With Their Sample Sizes

The product SHALL derive, at read time and never as a stored summary, the
forward return between consecutive recorded captures of a series — the price
change from one capture to the next, attributed to the states at the earlier
capture: each triggered signal, the dominant bias, and the
conflicting-signals flag — beside the unconditional baseline over the same
pairs. Every figure SHALL carry the sample size it is computed from, and no
ordering of the figures SHALL rank by the return itself — small samples must
not be promoted by sorting, the same rule the trading record applies to win
rates.

A pair of captures whose spacing the record's own coverage derivation calls
a gap SHALL NOT be paired — a return across a hole is not a return over one
cadence step — and the count of pairs excluded that way SHALL be stated
beside the figures. A failed capture carries no price and SHALL never be
paired. An account whose record holds too few valid pairs to compute
anything SHALL be told so as a fact about depth, distinctly from a record
that could not be read and from an account that never recorded.

#### Scenario: A figure never renders without its sample size

- **GIVEN** a record deep enough to pair
- **WHEN** the analysis renders
- **THEN** every per-signal, per-bias, per-conflict and baseline figure
  carries the number of pairs it is computed from
- **AND** the tables order by sample size, never by the return

#### Scenario: A gap is not a forward return

- **GIVEN** a series whose captures include a spacing the coverage
  derivation reports as a gap
- **WHEN** forward returns are derived
- **THEN** no pair spans that gap
- **AND** the analysis states how many pairs were excluded over gaps

#### Scenario: Too shallow is a fact, not an error

- **GIVEN** a record with fewer than two pairable captures in every series
- **WHEN** the analysis is read
- **THEN** it states that the record is not yet deep enough to pair, and how
  deep it is
- **AND** this is distinguishable from an unreadable record and from an
  account that never recorded

#### Scenario: Attribution is to the earlier capture

- **GIVEN** a pair of consecutive captures where a signal triggered at the
  earlier and not at the later
- **WHEN** forward returns are attributed
- **THEN** the pair's return counts toward that signal's figures
- **AND** a signal triggered only at the later capture gains nothing from
  the pair
