# Tasks: Read A Whole Strategy

## Domain

- [x] 1. `StrategyDetail` — sections, signal rules, thresholds, market read,
      alongside the summary `Strategy`. Leave `Strategy` alone.
- [x] 2. Refuse a detail with no id or revision, as `mapStrategy` already does.

## Port and adapter

- [x] 3. `readStrategy` on `StrategiesPort`, returning a result type that
      distinguishes read failure from not-found.
- [x] 4. `get_strategy` with `includeInactive: true`, and a mapper for sections
      and signal rules.

## Use case and surface

- [x] 5. `ReadStrategyQuery`.
- [x] 6. `/strategies/[id]` — the six things a strategy is.
- [x] 7. The roster row links to it.

## Tests

- [x] 8. A real `get_strategy` payload maps to a full detail — 4 sections, 82
      rules, thresholds, market read.
- [x] 9. An archived private strategy is readable and shown as inactive.
- [x] 10. Unreadable is distinguished from not-found.
- [x] 11. `includeInactive` is actually sent — the platform hides archived
      strategies without it.
- [x] 12. The roster still uses the summary; listing does not fetch details.
- [x] 13. The new route is reachable by walking from `/`.

## Gates

- [x] 14. `npm run typecheck`, `npm run lint`, `npm test`
- [x] 15. `next build`
- [x] 16. **Render it against the live account** and read the page.
- [x] 17. Mutation sweep.
- [x] 18. `python3 .claude/tools/openspec.py validate read-a-whole-strategy --strict`
