# Proposal: Read A Whole Strategy

## Why

The product has never fetched a strategy.

`list_strategies` returns a summary, and `get_strategy` — which returns the
whole thing — is one of the 74 tools the surface map found unused. So the
roster row is everything Grid-Commander knows, and the roster row carries
`sectionCount: 4`: a *number*, not the sections.

That is why the strategy editor edits the tagline and nothing else. It is not a
missing form. There is no data behind a bigger form.

What a strategy actually is, read from the live platform:

| | |
|---|---|
| identity | `name`, `tagline`, `description`, `scope`, `revision` |
| what it reads | **4 sections** — `{ kind, sectionKey }`, e.g. `includeMovingAverages` |
| how it reasons | `marketReadText` — prose, the actual instruction to the model |
| when it acts | `minAggregateScore`, `minRequiredCount`, `minAtrPct` |
| what it weighs | **82 signal rules** — `{ signalId, allocation, required, params }` |
| cost of change | `boundAgentCount`, `openPositionCount` |

Eighty-two signal rules and a page of prose, and the product could show you a
name and a tagline.

Agents already have a detail page. Strategies have `edit`, `fork`, `archive` and
`restore` — four things you can *do* to a strategy, and nowhere to *look* at one.

## What Changes

- **`readStrategy` on the strategies port**, implemented with `get_strategy`,
  with `includeInactive` set so an archived private strategy can still be read
  — the platform hides it otherwise, and an archived strategy is exactly the one
  a user is deciding whether to restore.

- **The domain gains what a strategy is made of.** `StrategyDetail` carries the
  sections, the signal rules, the thresholds and the market read alongside the
  summary `Strategy` the roster already uses. The existing type is untouched:
  the roster does not need 82 rules to draw a row, and widening it would make
  every list read pay for a detail page.

- **`/strategies/[id]`** — the page that was missing. Identity, what it reads,
  how it reasons, when it acts, what it weighs, and what changing it would cost.

- **The roster links to it.** Every row currently offers only actions.

## What this deliberately does not do

**It does not add editing.** Reading comes first, and this project has an
expensive lesson about acting on a shape nobody has looked at: every read in the
product returned an empty object for its whole life, and two strategy writes
could never have succeeded, both invisible until something real was called.

Eighty-two signal rules with `allocation`, `required` and per-signal `params` is
a real editing surface, and it should be designed against a rendered page rather
than against a schema. That is the next change, not this one.

## Capabilities

- `strategy-authoring` — ADDED: a strategy can be read in full.

## Out of Scope

- **Editing sections, rules or thresholds.** Next change.
- **`list_strategy_signals` / `get_strategy_signal_definition`.** A signal rule
  carries a `signalId`; what that signal *means* is a second read, and the page
  can name the id honestly until it is wired.
- **The other 73 unused tools.** The map says what is there; this change takes
  the one with the most behind it.
