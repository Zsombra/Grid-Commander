# Proposal: The Outcome Reaches The Person

## Why

The 2026-08-12 ceremony surveys (#157) found the last three ways a write's
outcome still fails to reach the person who asked: a platform refusal of the
rebind perform has no catch and surfaces as a framework error page (#164, p2 —
the one write path that crashes instead of explaining); the refused-describe
branches on deploy, undeploy and rebind silently discard a `?problem=` the
redirect carried (#163); and the strategy lifecycle actions redirect to
`/strategies` without a word when their pre-perform re-read fails (#165). All
three violate the spirit — and #164 the letter — of agent-authoring's "The
Outcome Of A Write Reaches The Person Who Asked For It".

## What Changes

- `RebindAgentResult` gains a `refused` arm; the port call is wrapped in the
  same try/catch `deploy-agent.command.ts` already uses. `performRebind`
  redirects a refusal back to the rebind page as `?problem=` instead of
  letting the throw escape.
- The refused-describe branches on **deploy**, **undeploy** and **rebind**
  render a carried `?problem=` (danger role, "Refused:" prefix) above the
  fresh refusal, instead of dropping it. Rebind's refused and
  no-destination branches — currently dead ends — gain their exit link back
  to the agent.
- The strategy **archive**, **restore** and **fork** actions bounce a failed
  pre-perform re-read (roster unreadable, listing gone) back to their
  ceremony page as `?problem=` naming what happened and that nothing was
  attempted, instead of silently redirecting to `/strategies`. Those pages'
  terminal branches (unreadable / no-such / refused) render a carried
  `?problem=` so the bounce is never re-dropped.
- The agent-authoring requirement's reach is stated explicitly: it binds
  every surface that performs an operation, a refusal that arrives as a
  thrown error included, and a reason a redirect carried included.

## Capabilities

**New**: none
**Modified**: `agent-authoring` — "The Outcome Of A Write Reaches The Person
Who Asked For It" gains the thrown-refusal, carried-reason, and
failed-re-read scenarios. (The deploy/undeploy pages live in
agent-deployment and the lifecycle pages in strategy-authoring, but the
requirement they now satisfy is this one; neither capability's own
requirements change shape.)

## Out of Scope

- **Fork's missing `expectedRevision`** — staleness there rides on the
  confirmationToken alone; changing the confirmation binding is its own
  decision. Recorded in #165's notes and the fork manifest.
- **Restore's `?outcome=repair-required` ordering quirk** (stale bookmark
  misdescribes state) — same pages, different defect family. Stays recorded
  in #165.
- **Preserving typed values across refusal bounces** (#162) — a form
  round-trip concern, not an outcome-reaching one.
- **The live probe forcing a stale-revision rebind** — #164's premise is
  type-derived; the probe needs the operator's key plus
  `BATTLEGRID_LIVE_WRITES=1` and is listed as a verification task the
  operator can run, not a blocker.

## Impact

- `src/application/use-cases/rebind-agent.command.ts` — result union + catch
- `app/(app)/agents/[id]/rebind/page.tsx` — perform handles `refused`;
  refused/no-destination branches render carried problem and gain exits
- `app/(app)/agents/[id]/deploy/page.tsx`,
  `app/(app)/agents/[id]/undeploy/[coin]/page.tsx` — refused branches render
  carried problem
- `app/(app)/strategies/[id]/{archive,restore,fork}/page.tsx` — actions
  bounce failed re-reads; terminal branches render carried problem
- `openspec/specs/agent-authoring/spec.md` — on archive
- Tests: unit coverage for the refused arm; rendering coverage for carried
  problems; the write-results ledger is untouched (the crash path is a
  throw, which the static guard cannot see — the new scenarios are the
  guard for it)
- Surface manifests for these pages gain states/notes on the next survey;
  no manifest edits in this change
