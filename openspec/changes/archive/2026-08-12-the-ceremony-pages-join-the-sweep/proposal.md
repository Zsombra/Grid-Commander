# Proposal: The Ceremony Pages Join The Sweep

## Why

Backlog #166: the confirmation pages are the product's highest-stakes screens
and they still disagree about how a consequence looks. Every ruling they need
already exists — DT-0004 decided the roles, DT-0014 showed the per-surface
shape — so this round decides nothing new; it lands decided treatments on the
pages the sweeps missed.

Surveying for it turned up two things #166 did not know, because both arrived
after it was written:

- **The refusal banner has drifted into four spellings and two roles.**
  `CarriedProblem` was extracted a change ago and six pages use it; five more
  still hand-roll the paragraph. Of those, `pending/page.tsx` omits the
  semibold "Refused:" prefix every other copy carries, and
  `agents/[id]/page.tsx` renders it in the **consequence** role rather than
  danger — the one place the product calls a refusal something other than a
  refusal.
- **That last one is dead.** Nothing mints `/agents/[id]?problem=` any more.
  The rename form that did moved to `/agents/[id]/edit` (`6959707` put the
  redirect there), and the branch on the detail page was left behind. It reads
  a parameter no route produces, which is why its role never got corrected —
  nobody has seen it since the move.

## What Changes

- The consequence blocks on **deploy**, **undeploy** and **rebind-confirm**
  take the consequence role (`consequence.subtle` / `consequence.border`)
  instead of the anonymous `border-border-default` DT-0004 retired.
- The refusal reasons on **strategy archive / restore / fork** — currently
  bare `role="alert" className="text-sm"` — take the danger role.
- The four ceremony action rows gain the archive page's mobile treatment:
  stacked full-width under `tablet`, inline above it.
- **`CarriedProblem` becomes the only spelling.** The five remaining
  hand-rolled copies (reactivate, agent archive, recorder trim, pending queue,
  pending proposal) render the component instead, which also gives
  `pending/page.tsx` the "Refused:" prefix it was missing. `/connect`'s
  `declined` banner is deliberately excluded — it is a notice, not a refusal
  (DT-0005: the user chose; nothing failed).
- **The dead branch on `/agents/[id]` is removed**, not restyled. Restyling an
  unreachable branch would be deciding how something looks that nobody can
  see.

## Capabilities

**New**: none
**Modified**: none — `skip_specs: true`. Every item above is presentation or
the removal of an unreachable branch; no state, action, field or flow that a
user can reach changes. The design tickets carry the visual decisions and each
declares `behavior_impact: none`.

## Out of Scope

- **The role hierarchy itself.** DT-0004 decided it; this round applies it.
- **`/connect`'s declined banner** — a notice by ruling, not drift.
- **The twelve stale manifests** are refreshed as part of this round (#173),
  but no *new* surfaces are surveyed. `/agents/[id]` still has no manifest and
  does not get one here — removing a dead branch needs no design.
- **#162** (typed values lost on refusal paths) — a form round-trip concern,
  not a presentation one.

## Impact

- `app/(app)/agents/[id]/{deploy,undeploy/[coin],reactivate,archive}/page.tsx`
- `app/(app)/agents/[id]/page.tsx` — dead branch removed
- `src/presentation/components/rebind-confirm.tsx`
- `app/(app)/strategies/[id]/{archive,restore,fork}/page.tsx`
- `app/(app)/recorder/trim/page.tsx`, `app/(app)/pending/page.tsx`,
  `app/(app)/pending/[id]/page.tsx`
- `openspec/design/tickets/DT-00NN.json` — new
- `openspec/design/surfaces/*.json` — twelve refreshed (#173)
- Tests: the `CarriedProblem` guard extends to every page that carries a
  refusal, so a sixth hand-rolled copy cannot be written
