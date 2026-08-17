# The roster says when residue grew

## Why

`a-probe-agent-is-archived-on-the-first-account` (#201) weighs four options and
names one as the only one that would have caught the recurrence it was re-filed
for: **a live test that reads the roster and fails when residue exceeds a
threshold.** The other three prevent creates that pass through them, and the
creates that actually happened did not pass through anything.

That last point is now settled rather than suspected. The newest residue,
`Probe 238 Dedupe`, was traced today to `openspec/JOURNAL.md` — an
operator-authorized **hand walk** for the #238 dedupe probe, which archived
Vanguard to free a slot, created the agent, and archived it again. Like
`GC probe shape II` before it, it reached `create_intelligence_agent` through
the adapter without touching `tests/support/probe-agent.ts`. So the item's open
question — *"'widen the fixture' must name that path before it can be claimed
as sufficient"* — has an answer: **there is no such path in code.** Options 1
and 2 cannot be made sufficient, and option 3 is what is left.

## What Changes

- A new live probe, `tests/live/residue-probe.test.ts`, reads the roster with
  the same argument the product uses and fails when the count of agents that
  are not the operator's own exceeds a recorded threshold.
- **Classification is by exclusion, not by prefix.** The nine residue agents
  known before today share the prefixes `GC probe` and `Grid-Commander probe`;
  the tenth is called `Probe 238 Dedupe` and shares neither. A prefix match
  would have missed **exactly the create this item was re-filed for**, which is
  this repository's characteristic defect — matching how a thing is spelled
  rather than what it reaches. The probe instead holds a small allowlist of the
  operator's own agents and treats every other row as residue.
- The threshold and the allowlist are stated with the date they were measured,
  so a green run means "unchanged since then" rather than "fine".

## Capabilities

**New**: none
**Modified**: none — this adds a probe, no product behavior changes.

## Out of Scope

- **Cleaning any of it up.** No tool on the 114 deletes an agent;
  `archive_intelligence_agent` is the whole of cleanup and all ten are already
  archived. The probe reports and cannot remedy, which #201 states plainly.
- **Preventing the next hand walk.** Nothing in this repository can reach one.
  This is a tripwire, and is proposed as one.
- **Widening `probe-agent.ts` to more callers.** It would not have caught either
  of the two creates that happened; see Why.

## Impact

- `tests/live/residue-probe.test.ts` — new, opt-in behind `BATTLEGRID_API_KEY`
  like the other 31 probes, read-only, names no mutating tool.
- No `src/` or `app/` change. No spec delta.
- `openspec/backlog/a-probe-agent-is-archived-on-the-first-account.md` — option 3
  taken; the item stays open as the standing record of the residue itself.
