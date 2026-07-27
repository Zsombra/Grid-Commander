# Architecture Review: author-agents

Against `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md`.

## Scope

Added `src/domain/agent/` (5 files), `src/ports/agents.ts`, 6 use cases, 2
infrastructure files, 4 presentation components. Modified `mcp-adapter.ts`
(scope debt) and `tests/architecture/boundaries.test.ts`.

## Component Checklist Matrix

| Rule | Components | Evidence |
|---|---|---|
| Dependency direction inward only | `src/domain/agent/**` | `tests/architecture/boundaries.test.ts` — the domain-import scan covers `src/domain/agent/` automatically; `agent.ts`, `brain.ts`, `catalog.ts`, `trading-config.ts`, `field-ownership.ts`, `rebind.ts` import only each other |
| BattleGrid reached only through a port | `agent-adapter.ts:236` | Every method routes through `this.battlegrid.callTool`; there is no `fetch` in the file |
| One responsibility per file | use cases | `list-agents.query.ts` reads, `create-agent.command.ts` creates, `update-agent.command.ts` edits, `rebind-agent.command.ts` proposes and performs, `lifecycle.command.ts` archives/reactivates, `read-agent-journal.query.ts` reads |
| No dual runtime paths | create / update | One create path; the update path branches on *what* is being changed, not on which implementation to use |
| No hard-coded platform vocabulary | `catalog.ts`, `agent-form.tsx` | `tests/architecture/boundaries.test.ts::AL-1` scans `src/` for model ids and position-management presets outside the adapter — PASS |
| Domain errors at the boundary | `agent-adapter.ts` | Inherits `toDomainError` via `callTool`; conflicts arrive as `RevisionConflictError` |
| `canDelete` never read | `agent-mapper.ts:80` | `tests/architecture/boundaries.test.ts::AL-2` — comment-stripped scan of `src/` and `app/`, PASS. `tests/agent/mapper.test.ts::drops canDelete entirely` asserts it never reaches the domain |
| Every mutation carries a revision | all agent commands | `tests/agent/concurrency.test.ts::structurally_impossible` reads `src/ports/agents.ts` and asserts `expectedRevision: number` is required, not optional, on all three mutating methods |
| No value substituted for an absent revision | `call-path.ts:105` | Same test file: every `expectedRevision ??` in `src/` must be followed by `null`, never a number |

## Findings

**F-1 — the domain models an agent that BattleGrid does not return.**
`mapAgent` drops `avatarUrl`, `last24hCostUsd`, `performance`, `activeGameCount`
and `userId`, keeping twelve fields of thirty. Asserted in
`tests/agent/mapper.test.ts::drops presentation and telemetry the rules never
consult`. Deliberate — design D-A. The cost is a mapping to maintain; the
benefit is that no rule appears to depend on telemetry.

**F-2 — `trading-config.ts` holds an opaque field map, not a typed struct.**
Unusual for a domain object. Justified: BattleGrid requires all twenty-five
fields whenever the object is present (findings-agents F-6), the set grows, and
no rule reasons about any individual limit — the rules are "validate against the
registry" and "never send a partial one". A typed struct would be a second
schema to keep in sync for no rule that needs it.

**F-3 — one declared exception to "no hard-coded platform vocabulary".**
`agent-adapter.ts:44` lists the ten brain presets. They are a closed enum in the
create tool's schema with no endpoint that lists them, so there is nothing to
read at runtime. Kept at the adapter boundary — next to the tool names — so a
schema surprise lands in one place. The AL-1 scan deliberately exempts
`infrastructure/battlegrid/` and would fail if the list moved inward.

**F-4 — routes were not wired, and this predates the change.**
Tasks 5.1–5.6 produced components; no `page.tsx` exists, because nothing can
construct them: the product has no session, so no request can supply
`{ userId, accessToken }`. `connect-battlegrid-account` has the same gap.
Filed as backlog `no-composition-root` at **P1** — it blocks the MVP, not this
change. Recorded as AL-9 rather than left to be discovered.

## Status

EVIDENCE RECORDED
