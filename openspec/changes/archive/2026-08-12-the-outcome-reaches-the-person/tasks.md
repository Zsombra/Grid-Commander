# Tasks

## 1. The refusal arm (#164)
- [x] 1.1 `RebindAgentResult` gains `{ kind: 'refused'; reason: string }`;
      the `agents.rebindAgent` call in `RebindAgentCommand.execute` is
      wrapped in try/catch returning it — the same shape
      `deploy-agent.command.ts:158` uses
- [x] 1.2 `performRebind` in `app/(app)/agents/[id]/rebind/page.tsx` handles
      `refused` like `destination-moved`: redirect back to
      `/agents/[id]/rebind?to=…&problem=<reason>`

## 2. Carried problems on refused branches (#163)
- [x] 2.1 Rebind's refused-describe branch renders a carried `?problem=`
      (danger role, "Refused:" prefix) above the fresh reason, and gains a
      BUTTON_SECONDARY exit back to `/agents/[id]`
- [x] 2.2 Rebind's no-destination branch gains the same exit link
- [x] 2.3 Deploy's refused branch (`deploy/page.tsx` ~111-121) renders a
      carried `?problem=` above the fresh reason
- [x] 2.4 Undeploy's refused branch (`undeploy/[coin]/page.tsx` ~60-70)
      renders a carried `?problem=` above the fresh reason

## 3. Lifecycle actions explain non-performance (#165)
- [x] 3.1 `archiveStrategy` action: failed roster re-read or missing listing
      bounces to `/strategies/[id]/archive?problem=…` naming that nothing was
      attempted and why, instead of `redirect('/strategies')`
- [x] 3.2 Same for the restore action
- [x] 3.3 Same for the fork action
- [x] 3.4 The archive, restore and fork pages' terminal branches
      (unreadable / no-such / refused) render a carried `?problem=` so a
      bounce is never re-dropped

## 4. Verification
- [x] 4.1 Unit test: `RebindAgentCommand` returns `refused` with the thrown
      reason when the port throws (the live-confirmed CONFLICT case:
      "Agent was modified by another session. Please refresh and retry.")
- [x] 4.2 Rendering test: rebind page with both `?problem=` and a refused
      describe shows both reasons
- [x] 4.3 Rendering tests: deploy and undeploy refused branches show a
      carried `?problem=`
- [x] 4.4 Action tests: each lifecycle action redirects to its ceremony page
      with `?problem=` when the re-read is unreadable and when the listing
      is missing — invoked, not read from source
      (`tests/rendering/lifecycle-actions.test.ts`, a new pattern for this
      repo: `redirect()`'s thrown digest carries the destination). Verified
      by mutation: reverting the restore action to its silent
      `redirect('/strategies')` fails all three of its cases.
- [x] 4.5 Rendering test: a lifecycle ceremony page's unreadable branch shows
      a carried `?problem=`
- [x] 4.6 Full local gates: typecheck, lint, vitest (Windows baseline diff
      per #171), build

## 5. Review findings, fixed in place

The review found the change had fixed one branch per page and left the
others — the same defect it set out to close, one branch over.

- [x] 5.1 `CarriedProblem` extracted to
      `src/presentation/components/carried-problem.tsx` — the paragraph was
      hand-rolled fifteen times, the shape `WhyNotLoaded` already exists to
      prevent. Renders null when there is nothing to say, so every branch
      can mount it unconditionally.
- [x] 5.2 Every render branch on all six pages carries it: deploy's
      roster-unreadable / no-such-agent / chooser, undeploy's
      roster-unreadable / no-such-agent, restore's repair-required /
      not-archived, fork's at-capacity, rebind's no-destination.
- [x] 5.3 The guard was the real finding — it asked for "two or more"
      carried blocks, which passed while five branches dropped the reason. It
      now counts render branches (`<main`) and requires the carried count to
      equal it. Verified by mutation: removing one branch's component fails
      with "5 render branches, 4 carry the reason".
- [x] 5.4 A second guard forbids the inline `{problem ? (` spelling, so the
      shared component cannot be quietly re-hand-rolled.
