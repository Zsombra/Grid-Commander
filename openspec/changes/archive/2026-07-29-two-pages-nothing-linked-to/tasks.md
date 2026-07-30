# Tasks

- [x] 1. The agent page offers `thinking` and `limits`, ungated — reading an
      agent is worth offering whatever its state.
- [x] 2. `reachability.test.ts` gains the mirror check: no servable route may be
      unoffered.
- [x] 3. Re-injected twice — unlinking the two pages names both by path;
      a fresh orphan route is caught too.
- [x] 4. 726 tests, `./scripts/check.sh`, typecheck, lint green.

## How this was found

Not by a test. By asking, before recommending more mapping, whether the last two
things built were reachable — and they were not.

The lesson is not "add a guard", which is now done. It is that **the check
written to close a gap closed it in one direction**. `close-the-reachability-gap`
fixed links pointing at nothing and left pages nothing points at, and the guard
inherited exactly that asymmetry. DL-106 was the same shape: a form bound to an
action, with no check that the controls inside it reached the payload.

Three times now the second direction was the one that mattered.
