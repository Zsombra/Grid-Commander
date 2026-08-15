## ADDED Requirements

### Requirement: The Record's Forward Analysis Is Readable By A Model

The MCP surface SHALL let a model read the product's own forward-returns
analysis of the signal record: the unconditional baseline over every valid
pair, the per-signal, per-bias and per-conflict figures derived beside it,
and the depth those figures stand on — the pair count, the series count, the
window, and the pairs excluded over gaps and over unusable prices. The
analysis is derived at read time from this product's own store, contacts
BattleGrid not at all, and mutates nothing.

Every figure SHALL cross the boundary carrying the sample size it is
computed from, and the figures SHALL arrive in the derivation's own order —
sample size descending, never ranked by the return. A record not yet deep
enough to pair, a record that has never been written, and a record that
could not be read SHALL each be answered as themselves, distinctly.

The tool's description SHALL state both disciplines the product enforces, so
a model paraphrasing the answer carries them rather than re-deriving without
them: that a pair spanning a recording gap is excluded and counted rather
than paired, and that nothing is ordered by the return.

#### Scenario: A model reads the analysis

- **GIVEN** a record deep enough to pair
- **WHEN** a model calls the forward-returns tool
- **THEN** it receives the baseline and the per-signal, per-bias and
  per-conflict figures, each with the number of pairs it stands on
- **AND** the answer carries the pair count, the series count, the recorded
  window, and how many pairs were excluded over gaps

#### Scenario: The figures are not ranked by the return

- **GIVEN** a record where the group with the fewest pairs has the highest
  mean forward return
- **WHEN** a model reads the analysis
- **THEN** the best-attested group is first and the small sample is last
- **AND** the order is by sample size, not by the return

#### Scenario: Too shallow, never recorded, and unreadable stay apart over MCP

- **GIVEN** a record with too few pairable captures, an account that has
  never recorded, and separately a store that will not answer
- **WHEN** a model asks each for the analysis
- **THEN** the first states how deep the record is and that it is not yet
  deep enough to pair
- **AND** the second states that recording has not started and how it starts
- **AND** the third states that the record could not be read, with its reason
- **AND** the three answers are distinguishable

#### Scenario: The disciplines are stated where a model reads them

- **WHEN** a model lists the surface's tools
- **THEN** the forward-returns tool's description says a pair spanning a
  recording gap is excluded rather than paired
- **AND** it says the figures are ordered by sample size and must not be
  re-ranked by the return
