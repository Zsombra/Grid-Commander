# Tasks: Name What An Agent May Spend

- [x] 1. `Catalog.defaults`, mapped from `tradingDefaults.defaults`.
- [x] 2. `undefaultableFields` derives the questions from the catalog.
- [x] 3. `TRADING_CONFIG_FIELDS` — all twenty, because the object is all-or-nothing.
- [x] 4. `buildTradingConfig` — complete or refused, with the missing named.
- [x] 5. `MoneyLimits` asks the six; `OFF` first and default; nothing pre-filled.
- [x] 6. The command assembles the config; the route passes answers only.
- [x] 7. Fixtures model the live catalog's real defaults, absences included.
- [x] 8. Tests: derivation, completeness, refusal, empty-vs-zero, OFF-first.
- [x] 9. `npm run typecheck`, `npm run lint`, `npm test`
- [x] 10. `next build`
- [x] 11. Render the form against the live catalog.
- [x] 12. Mutation sweep — seven injected, seven caught.
- [x] 13. `python3 .claude/tools/openspec.py validate name-what-an-agent-may-spend --strict`
