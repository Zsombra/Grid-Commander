# Decision Log: a-personal-key

| # | Decision | Rationale | Recorded |
|---|---|---|---|
| DL-1 | Personal controller, not multi-tenant | User's direction, 2026-07-29 | proposal |
| DL-2 | Add the path; do not remove OAuth | Removing audited work on one turn of direction, before the new path had run once | proposal |
| DL-3 | Two implementations at the composition root | A branch inside a use case is the runtime dual-path the review forbids | design |
| DL-4 | Scopes become a seam | `scopesFor` returned `[]` without a connection, which would refuse every call in personal mode | design |
| DL-5 | Declaration defaults to `mcp:read` | Defaulting wider acts with authority nobody asked for, on the strength of an unset variable | design |
| DL-6 | OAuth client not required in personal mode | Requiring a registration to avoid one makes the path unreachable by its own precondition | design |
| DL-7 | Disclose on every page, `consequence` tone | A property of the deployment, not an event; the only element describing what someone else could do | design |
| DL-8 | The remedy copy is wrong and was not fixed here | One message for all authority loss is design W-C; varying it by mode is a design decision, not a copy edit | executor |

## Executor phase

Built largest-risk-first: read `scopesFor` before writing anything, which is
where the guard-refuses-everything problem surfaced and why `HeldScopes` exists.

**Three existing test harnesses constructed `AdapterDeps` with `connections`**
and had to move to `heldScopes`. A regex edit mangled the imports in
`scope.test.ts`; repaired by hand. Regex on source is the wrong tool and this is
the second time this session it has cost a repair.

**Serving it in personal mode is what found the remedy defect** (DL-8) and
confirmed `/` redirects to `/agents` rather than `/connect`. Neither was
predictable from the diff.

**A route finally exercised the database.** `/audit` returned 500 mid-probe
because PostgreSQL had stopped — the only route to notice, because personal mode
has no session gate in front of it. First time a probe in this project has
touched the database.

## Audit phase

See `production-gate.md`.
