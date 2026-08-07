# Tasks

- [x] 1.1 Map `modelDisplayName` on both agent reads (they agree on it), and
      carry it to the domain agent
- [x] 1.2 Map `last24hCostUsd` from the roster read only, with the comment at
      the mapping site naming the detail read's observed value and citing
      `the-cost-of-an-agent-reads-differently-from-two-tools`; the detail read
      and every write result leave it null rather than repeat the detail's zero
- [x] 1.3 Render the platform's name on the agent page's brain line, falling
      back to exactly what the line showed before; render no `provider`
- [x] 1.4 Render spend on `/agents/[id]/limits` — a sentence and the running
      total, no gauge, no cap; the figure rides the roster read the page
      already makes; an unreadable roster renders as unreadable with the
      shared explanation
- [x] 1.5 Tests: mapper (name carried, spend from the roster mapping only,
      absent-is-null-not-zero), adapter (list carries spend, detail does not),
      rendering (brain line both ways, spend section all branches)
- [x] 1.6 `npx tsc --noEmit`, targeted vitest, eslint on changed files
- [x] 1.7 Reconcile the two backlog items: the spend item closes against this
      change; the payload item stays open for the four fields still unmapped

## Notes from the build

- The spend needed no new plumbing. `/limits` already reads the roster for
  its heading, and the roster **is** the list read — so the figure rides a
  read the page was already making, and the detail's zero has no route in.
  `mapRosterAgent` is the only place the field is read; `mapAgent` (shared by
  the detail read and every write result) leaves it null with the divergence
  documented in place.
- The spend section fails independently of the gauges: the roster and the
  budget are different reads, and one being unreadable must not hide the
  other. The unreadable branch carries the shared `WhyNotLoaded` sentence.
- The brain line takes the platform's name over the flattened discriminator
  whenever one is reported, and asserts nothing about preset-vs-custom —
  that distinction is not readable back
  (`preset-custom-in-the-preset-branch-is-unestablished`, untouched).
- Rendered figures follow the platform's own precision: the one cost figure
  BattleGrid has ever printed itself carried four decimals, and two would
  show a $0.004 spend as "$0.00".
