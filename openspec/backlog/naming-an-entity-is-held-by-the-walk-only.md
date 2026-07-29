---
id: naming-an-entity-is-held-by-the-walk-only
type: debt
status: open
priority: P2
capability: app-access
created: 2026-07-29
---

# "The page names it" has no automated check

`app-access` requires that a page scoped to an entity **names which one** and
**offers a way back to it**. `the-strategies-walk` built a guard for the second
clause. The first is held by walking the product and nothing else.

## Why it was not closed in that change

Every static form of the check is either weak enough to be misleading or wrong.

- *"The render set interpolates something matching `name`."* Passes on any file
  with `{x.name}` anywhere, including one whose heading is a constant string and
  whose name appears in a `aria-label` three sections down. A guard that green-lights
  the exact defect it is named for is worse than no guard: it makes the gap look
  closed.
- *"Every `<h1>` contains an interpolation."* Wrong. `No such strategy` and
  `Cannot edit right now` legitimately have no entity to name.
- *"At least one `<h1>` interpolates."* Satisfied by the main branch while every
  error branch stays anonymous — and the error branches are where this broke:
  `/agents/[id]/limits` read *"Nothing will stop this agent"* on an account with
  eleven, and `Cannot archive` named nothing until this change.

The property is about **what renders**, per branch, which needs the pages actually
rendered. This project has no component-rendering test layer — the suite is unit
tests over the domain and application, filesystem-level architecture guards, and
live walks against the platform.

## How to close it

Add a rendering layer and assert per branch. The shape that fits what is here:
render each scoped page's component tree against `FakeStrategiesPort` /
`FakeAgentsPort`, once per branch the page can take, and assert the entity's name
appears in the heading. That is new infrastructure and its own change — the
decision belongs with whoever wants route-level tests generally, not smuggled in
beside a navigation fix.

Until then the honest statement is that naming is verified by walking. It was
walked on 2026-07-29 for all five strategy routes and all eight agent routes, and
every one named its subject.
