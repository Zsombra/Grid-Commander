# Proposal: The Connection Is Never Called Read-Only

## Why

`wager-authority.tsx` tells the operator "it connects read-only" — in the one
surface a cautious operator visits to ask how much authority they have handed
over. The claim is false: `mcp:read` is write-capable (eleven mutating tools,
six destructive), this product archives agents and forks strategies on it,
and CLAUDE.md's first domain fact is *never treat scope alone as a safety
boundary*. The spec already forbids the sentence — requirement
"Configuration Authority Is Described Honestly" says the access MUST NOT be
described as read-only — but its scenario covers only the grant-presentation
flow, and the guard that enforces it (`tests/connection/consent.test.ts`)
scans only `DescribeGrantQuery` and `describeScope`. A hand-written sentence
on any other surface is invisible to both, which is how this one shipped
(#234).

## What Changes

- **The sentence is rewritten** to say what is true and load-bearing: no
  wager scope is ever requested, so no wager can be placed — and the access
  that *is* held can create and change agents and strategies, with each
  change confirmed first. Scope is not offered as the boundary.
- **The requirement grows a scenario** covering any surface that describes
  the standing connection's authority, not only the moment of granting —
  MODIFIED delta on `battlegrid-connection`.
- **A new architecture guard scans the UI**, not just the grant text:
  no rendered copy under `app/` or `src/presentation/` may call the
  connection or its access read-only/view-only. Negated uses stay legal
  (`consent-summary.tsx` says "This is not view-only access", which is the
  requirement's own voice). Proven per the guard-proof requirement — shared
  matcher, planted offender, clean-pass inputs, mutation-checked.

## Capabilities

**New**: none
**Modified**: `battlegrid-connection` — MODIFIED requirement "Configuration
Authority Is Described Honestly" (statement widened to any surface, one
scenario added, existing scenario kept verbatim)

## Out of Scope

- **The consent/grant flow.** Already correct and already guarded; untouched.
- **The other `WagerAuthority` branches.** "This product holds no wager
  scope either way" is true and offers no false boundary; only the
  `accountAllowsMcpWagers` branch carries the defect.
- **`docs/` prose.** The scan covers rendered UI; documentation phrasing is
  not operator-facing copy and auditing it wholesale is not this item's
  size. Nothing found in a spot-check; deliberately not filed.

## Impact

- `src/presentation/components/wager-authority.tsx` — one branch's sentence
- `openspec/specs/battlegrid-connection/spec.md` — via archive merge
- `tests/architecture/access-is-described-honestly.test.ts` — new guard
- Surface manifest: `wager-authority` has no manifest of its own; the
  component is listed by none (it renders on `/arena`) — checked at
  execution and re-pinned if a manifest names it.
