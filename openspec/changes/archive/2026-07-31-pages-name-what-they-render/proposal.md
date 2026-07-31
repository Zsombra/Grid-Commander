# Proposal: Pages Name What They Render

## Why

`naming-an-entity-is-held-by-the-walk-only` (P2 debt). `app-access` requires
a page scoped to an entity to name which one — and that property is held by
hand-walking the product, because every static form of the check is either
vacuous or wrong (the item enumerates three). The failures it exists for
were real: `/agents/[id]/limits` said "Nothing will stop this agent" naming
no agent; "Cannot archive" named nothing. The property is about **what
renders, per branch**, and the project has no layer that renders anything.

## What Changes (no spec delta — this enforces an existing requirement)

- `tests/rendering/support/render.ts`: a resolver that takes what an awaited
  server component returns and produces the rendered text — expanding
  arrays, fragments, intrinsic elements, and nested components (called with
  their props, awaited when async). A component it cannot expand fails
  loudly with its name; nothing is silently skipped, because a walker that
  skips is the vacuity the item warns about. `headings()` collects h1/h2
  text for the per-branch assertions.
- `tests/rendering/support/fake-acting.ts`: the `{ app, user }` shape
  `acting()` returns, assembled from the real use-case classes over the
  existing fakes (`FakeAgentsPort`, `FakeStrategiesPort`, a radar fake,
  `FakeConfirmationStore`) — a mini composition root for tests, so pages
  exercise the same query/command code paths production wires.
- `tests/rendering/pages-name-their-entity.test.ts`: `vi.mock` on
  `@/presentation/session.js`, then for each covered page, each branch is
  rendered and its heading asserted to carry the entity's name — including
  the anonymous-legitimate branches, asserted for their reason instead.
  Covered: agent detail, limits (the historical failure), archive,
  reactivate, deploy, undeploy/[coin]; strategy detail, archive, restore.

## Out of Scope

- Edit/journal/thinking/fork/rebind pages — the layer is built to make
  adding them one describe-block each; coverage grows with the next touch
  of each page rather than all at once here.
- DOM/browser rendering — the assertions are about composed output, which
  the element tree carries; a DOM adds fidelity nothing here asserts on.
