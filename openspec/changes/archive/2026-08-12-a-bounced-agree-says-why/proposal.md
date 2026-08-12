# Proposal: A bounced agree says why

## Why

The proposal pages mint three redirects nobody renders. A refused agree
redirects to `/pending/<id>?problem=<reason>` — and the proposal page reads
no searchParams, so the operator lands on a freshly re-described page with
no sign their click was refused. Worse: when the write **succeeded** but the
proposal was already closed (a double submit), the agree action redirects to
`/pending?problem=The change was made… Check the activity log` — the exact
message whose in-code comment says "the account moved, and an operator
seeing a silent redirect would not know it had" — and the list page drops
it. A declined already-resolved proposal's `?note=already-resolved` is
dropped the same way. Same defect class as `returned-with-an-explanation`,
found one surface later.

## What Changes

- `/pending/[id]` reads `problem` and renders it in the danger role with a
  semibold "Refused:" prefix (the archive page's treatment for the same
  param), on every branch — the redirect can land on a page that now
  describes a different state.
- `/pending` reads `problem` (danger, role=alert) and `note` (notice,
  role=status; the known value renders as "This proposal was already
  resolved — nothing was written to the account", unknown values verbatim).
- The mcp-control spec's agree requirement gains the two scenarios the
  redirects already implement half of: a refused agree returns with the
  reason, and a write that succeeded against an already-closed proposal is
  told to the operator.

## Capabilities

**New**: none
**Modified**: `mcp-control` — two scenarios added to *A Proposal Is Agreed
To Against The World As It Is Then*.

## Out of Scope

- Any change to the agree/decline server actions — the senders are correct;
  only the rendering was missing.
- The proposal queue and difference components — already tokened; the
  design-lane pass over `/pending` is separate (#108 gap 2).

## Impact

`app/(app)/pending/page.tsx`, `app/(app)/pending/[id]/page.tsx`,
`tests/rendering/pending.test.ts`.
