# Master Plan — the-scorecard-is-tunable

Current phase: Execution complete

## Non-Negotiable Constraints (from config + checklists)
1. Domain never imports the MCP client; strategies stay behind the port.
2. Every write confirmed by a person against the exact described values;
   token minted by describe, spent by perform, target built only in
   `confirmation.ts` (edit-binding guard).
3. `expectedRevision` from a read someone made — never defaulted, never
   `?? 0` (concurrency guard).
4. Every write audited; refusals reach the surface acted from (`?problem=`).
5. No compiled-in tool knowledge beyond the adapter; the params offered
   come from the platform's own signal definition, read fresh.
6. Results of writes are read (write-results guard; here: the redirect's
   fresh strategy read).
7. Quality gates: all nine `./scripts/ci.sh` gates.

## File Inventory
See design.md File Changes (executor updates on drift).

## Requirement Coverage Matrix
| Requirement | Impl | Proof |
|---|---|---|
| A Signal Rule Is Retuned Only Through The Ceremony | retune-rule.command.ts + rules/[signalId] page + strategyRule target | tests (10 unit + 8 rendering): consequence names strategy/signal/values/blast radius + platform wording; tamper changes the recomputed target; non-member signal → no token; no-op → no token; refusal surfaces on ?problem=; success redirects to the fresh read. **Live (DL-5): walked end-to-end on a zero-bound fork, allocation 0→1, r1→r2 read back, account restored.** |

## Phase 2 Review Checklist
- [x] Architecture: port boundary, composition wiring, target built in confirmation.ts only
- [x] Data: wire shape vs the declared `{request:…}` schema; closed sets (allocation 0–3)
- [x] UI: refusals visible on the surface acted from; params prefilled from the rule

EXECUTION READY FOR PRODUCTION GATE
