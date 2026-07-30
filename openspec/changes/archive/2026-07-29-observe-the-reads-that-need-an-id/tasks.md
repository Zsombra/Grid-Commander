# Tasks

## Reach further

- [x] 1. `ID_SOURCES` maps an argument to the tool and array field answering it.
- [x] 2. `harvest` takes ids from responses already collected; `arguments_for`
      resolves a call or names the argument it could not supply.
- [x] 3. A second pass calls reads whose requirements are satisfiable, repeated
      until it stops yielding — `list_entry_decisions` needs an `agentId`, so
      the `decisionId` it returns cannot exist until a round that had one.
- [x] 4. Each entry records `arguments_from`, so the artifact distinguishes
      observed, observable-but-unreached, and not observable.

## Do not widen what can be called

- [x] 5. The classification filter is unchanged and applies first, in both
      passes.
- [x] 6. Guards on both: the artifact carries no non-read that was called, and
      the source still filters before any request is built.

## Prove it

- [x] 7. Re-probed live: **21 → 49** of 83 read tools observed. Zero non-reads
      called or attempted.
- [x] 8. Re-injected four defects, each caught.
- [x] 9. `./scripts/check.sh`, `npm test`, `typecheck`, `lint` green.

## What this shook out

**My own id table was three-fifths wrong, and nothing said so.** It was written
from assumption: `list_entry_decisions` returns `entries`, not `decisions`;
`list_signal_logs` returns `entries`, not `logs`; the argument is `logId`, not
`signalLogId`. The lookups returned nothing, the tools stayed uncalled, and the
artifact reported them as needing an argument the account plainly had.

That is the exact failure this probe exists to remove from the product,
reproduced inside the probe, by me, in a change about not guessing. It is why
`test_every_id_source_field_exists_and_carries_an_id` exists — it fails when a
row stops resolving, rather than the row quietly yielding nothing.

`list_market_grid_sessions` is deliberately absent from the table: its rows
carry no `id` at all, so a `sessionId` cannot be taken from them. Recorded
rather than left as a silently empty lookup.

**A guard that only holds after a live run is not a guard.** The safety check
asserted against the artifact, so deleting the classification filter and not
re-probing failed nothing — found by re-injecting exactly that. There is now a
source-level assertion too: both passes filter on classification, and `attempt`
is the only thing that issues a `tools/call`.
