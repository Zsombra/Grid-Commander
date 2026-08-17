## Purpose

Watching BattleGrid's Market Grid arena: which sessions exist, their
schedule and coin pool, whether this account has entered, and results once
a session settles. Reads only — playing carries a real stake and is not
this capability.

## ADDED Requirements

### Requirement: The Arena Is Watchable Without Being Played
Grid-Commander SHALL show the Market Grid sessions the platform lists —
each with its name, status, lock and settle times, and coin pool — and,
per session, whether this account has submitted an entry. What cannot be
read SHALL render as unknown, never as an empty arena.

#### Scenario: Watching the arena
- **WHEN** a user opens the arena surface
- **THEN** the listed sessions render with name, status, lock/settle times
  and coin pool
- **AND** each shows whether this account has entered

#### Scenario: Results before settle
- **WHEN** a session has not settled
- **THEN** the surface says results arrive after settlement, as a state —
  the platform's refusal is not shown as an error

#### Scenario: The played state is read only from the submission check
- **WHEN** whether this account has played is rendered
- **THEN** the answer comes from the submission check alone — the
  player-grid read answers a server error for "not played" (established
  live 2026-08-01) and is never interpreted as an answer

#### Scenario: An arena that cannot be read
- **WHEN** the session list cannot be read
- **THEN** the surface says so with the reason, and claims nothing about
  what is or is not running
