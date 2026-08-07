# Architecture Review — nothing-records-what-the-signals-said

**Checklist source**: `docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md`
**Scope**: one new command, two new queries, one new store port + Drizzle
implementation, one port method + adapter implementation, one mapper, one CLI
entry, composition wiring, two MCP tool entries.

## Checklist matrix (to be filled with evidence by the executor)

| Component | Category | Rule under review | Evidence (file:line / test) | Status |
|-----------|----------|-------------------|------------------------------|--------|
| `capture-signals.command.ts` | Use Case / SRP | One purpose; delegates persistence to the store port; no query logic mixed in | — | PENDING |
| `capture-signals.command.ts` | Use Case / DIP | Ports only; no infrastructure imports; constructor injection, `private readonly` | — | PENDING |
| `capture-signals.command.ts` | Error handling | One coin's failure recorded and loop continues; nothing swallowed; failure in the type | — | PENDING |
| `read-signal-history.query.ts`, `read-record-coverage.query.ts` | CQRS | Queries separate from the command; readers return DTOs | — | PENDING |
| `src/ports/signal-record.ts` | Ports | Interface in the port layer; store is provably separate from anything reaching BattleGrid | — | PENDING |
| `drizzle-signal-record-store.ts` | Repository | Naming convention; builder-only queries; `userId` filter everywhere; writers return void/id | — | PENDING |
| `drizzle-signal-record-store.ts` | Mapper | Row→domain mapping defaults nothing; nullable stays nullable (`platform_version`) | — | PENDING |
| `signal-preview-mapper.ts` | Infrastructure adapter | Every observed field kept; loud on unexpected shape | — | PENDING |
| `market-adapter.ts` | Port implementation | Implements `coinSignalPreview` exactly; infra errors → domain `unreadable` before the boundary; fake exists | — | PENDING |
| `mcp-adapter.ts` | P6 One Way In | Version accessor only; MCP client still constructed nowhere else | — | PENDING |
| `composition.ts` | DI wiring | Store + use-cases wired only here; no circular refs | — | PENDING |
| `bin/grid-commander-record.ts` | P6 / boot | Reaches BattleGrid only through `app()`; refuses without authority naming what is missing | — | PENDING |
| capture path | P1 Scope | No code treats read scope as safe-by-itself; classification consulted | — | PENDING |
| capture path | P2 Discovery | No hard-coded tool list; interval enums come from operator/deployments, never compiled in | — | PENDING |
| capture path | P3 Audit | No BattleGrid write exists on the path (decision log DL-004); guards prove it | — | PENDING |
| `src/mcp/tools.ts` entries | MCP surface | Table-driven; use-cases only; `persists: false`; read-only guard green | — | PENDING |
| Logging | Standards | Structured logger with use-case context; never a token | — | PENDING |
| Quality gate | Gate | `npm run typecheck` · `lint` · `test` · `build` · `db:generate` diff clean · `test:db` | — | PENDING |

## Issues found

(none recorded — execution has not started)

Status: PENDING EXECUTION EVIDENCE
