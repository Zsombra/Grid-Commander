# Architecture Review: author-agents

Against `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md`.

## Scope

Adds `src/domain/agent/` (6 files), `src/ports/agents.ts`, 7 use cases, 2
infrastructure files, 6 presentation files. Modifies `mcp-adapter.ts` and
`connection-repository.ts`.

## Component Checklist Matrix

| Rule | Components | Evidence |
|---|---|---|
| Dependency direction inward only | `src/domain/agent/**` | |
| BattleGrid reached only through a port | `agent-adapter.ts` | |
| One responsibility per file | use cases | |
| No dual runtime paths | create / update | |
| No hard-coded platform vocabulary | `catalog.ts` | |
| Domain errors at the boundary | `agent-adapter.ts` | |
| `canDelete` never read | `agent-mapper.ts` | |
| Every mutation carries a revision | all agent commands | |

## Findings

## Status

PENDING EXECUTION EVIDENCE
