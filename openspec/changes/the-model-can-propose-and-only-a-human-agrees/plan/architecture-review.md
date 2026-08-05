# Architecture Review

Against `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md`. Scaffolded before
execution; the executor fills the verdicts and the auditor checks them.

## Layer placement

| piece | layer | rule it must not break |
|---|---|---|
| `Proposal`, `ProposalStatus`, staleness | `src/domain/proposal/` | imports nothing from infrastructure; knows no BattleGrid tool name |
| `ProposalStore` | `src/ports/` | a port, so the domain never sees Drizzle |
| Drizzle repository | `src/infrastructure/db/` | the only file that writes SQL for this table |
| `RecordProposalCommand`, `ReadProposalsQuery`, `ResolveProposalQuery` | `src/application/use-cases/` | one use-case per question |
| `propose_*` entries | `src/mcp/tools.ts` | data in the existing table; no new serialisation path |
| `/pending`, `/pending/[id]` | `app/(app)/` | route reaches use-cases through the port, never an adapter |

- [ ] The domain imports no MCP client and no Drizzle
- [ ] The proposal vocabulary names **product operations**, not BattleGrid
      tools — a tool name in the domain or in a migration is a failure
- [ ] `src/mcp/` still builds no URL and imports no port (the P6 counterweight
      from `grid-commander-is-an-mcp-server` still holds)
- [ ] `boundaries.test.ts` passes unchanged, or its widening is justified in the
      decision log rather than in a commit message

## CQRS and use-case shape

- [ ] Recording is a Command; reading proposals is a Query; resolving one to a
      describe is a Query
- [ ] `RecordProposalCommand` touches no port that reaches BattleGrid — asserted
      by test, since the whole claim of the change is that recording contacts
      nothing
- [ ] Constructor injection only; no service locator; no singleton store

## Idempotency and concurrency

- [ ] Recording the same proposal twice creates two rows rather than mutating
      one — a proposal is immutable (spec), so "update" is not a state
- [ ] Resolving a proposal concurrently in two tabs cannot perform twice; the
      existing single-use confirmation is what enforces this, and the route must
      not add a second path around it
- [ ] Status transitions are one-way: open → agreed | declined | stale

## Error handling and refusal discipline

- [ ] An operation the product does not offer is refused **by name**, stores
      nothing, and says where that change is made (apply, per DL-1)
- [ ] "No proposals" and "proposals could not be read" are distinct states on
      `/pending` — the product's standing distinction, and the one most likely
      to be collapsed by a `?? []`
- [ ] A target that has moved produces a described difference, never a merge
- [ ] A target that is gone produces a refusal, never an empty confirmation

## The guard rewrite

- [ ] Derived from what a use-case can reach, not from a name prefix or a list
- [ ] Counterweight test: a tool wired to `updateAgent` under an innocent name
      fails the new guard
- [ ] Guards itself: if the derivation yields an empty mutating set, the test
      fails rather than passing vacuously

**Verdict:** _(executor, then auditor)_
