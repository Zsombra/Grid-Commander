# Design: An unanticipated failure has a floor

## Technical Approach

Two files, both client components because the boundary contract requires it:
`app/error.tsx` (the floor under everything below the root layout — nested
layouts' errors bubble up to it, and server-action throws from submitted forms
land here too) and `app/global-error.tsx` (the floor under the root layout,
rendering its own `<html>`/`<body>`). Both render the same honest copy; the
global one inlines its styles since the root layout that would supply them is
the thing that failed.

## Decisions

### Decision: one boundary at `app/`, not one per route group
Chosen because a boundary at `app/error.tsx` catches its child segments'
errors including the `(app)` group's layout, so one file covers every route,
while `app/(app)/error.tsx` (the item's sketch) would leave `/connect`, the
OAuth callback, and the group layout uncovered. Rejected: per-segment
boundaries — nothing here varies per segment, and N copies of an
unanticipated-failure page is N chances for the copy to drift (the
`CarriedProblem` lesson).

### Decision: no reset/retry control, stated as a scenario
Next hands the boundary a `reset()` callback; this design deliberately does
not render it. The operator's last action has an unknown outcome, and the one
wrong instruction is "try again" — the item names a retrying boundary as worse
than none. Rejected: rendering `reset()` for reads only — the boundary cannot
know whether the failed segment was a read.

### Decision: show the digest, never the message
`error.digest` is Next's opaque reference for server-side throws — safe to
show, useful in a report. The raw message is not rendered: an unanticipated
error's text was not written for the operator and is exactly where a leaked
internal (a connection string, a tool name, a stack fragment) would surface.
This is the same posture `AssistantUnavailableError` records for
model-provider errors.

### Decision: point at `/audit`, in `CarriedProblem`'s visual vocabulary but not via it
The page reuses the danger-toned copy treatment so a failure reads as a
failure, but does not mount `CarriedProblem` itself — that component renders a
*carried, product-authored* reason, and this page exists precisely for the
case where there is none. The link target is the activity log, which is the
one record that can answer "did my action land".

## Data Flow

1. Segment render or submitted action throws → Next unwinds to the nearest
   boundary → `app/error.tsx` renders (root layout still framing it).
2. Root layout throws → `app/global-error.tsx` renders standalone.
3. `redirect()` / refusal bounces throw control-flow errors Next handles
   before boundaries are consulted — the authored routes keep working.

## File Changes

- `app/error.tsx` (new) — the floor; client component
- `app/global-error.tsx` (new) — the root-layout floor; client component
- `tests/rendering/unanticipated-failure.test.ts` (new) — scenario coverage
