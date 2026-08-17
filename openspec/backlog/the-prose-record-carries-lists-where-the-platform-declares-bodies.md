---
id: the-prose-record-carries-lists-where-the-platform-declares-bodies
title: Prompt bodies and resource contents are unrecorded, instructions are recorded but rendered nowhere, and prose drift under an unchanged version is invisible
type: debt
status: done
priority: p3
created: 2026-08-15
updated: 2026-08-16
change: the-prose-record-carries-bodies
capability: platform-mapping
github: "294"
blocked_by: []
tags: [battlegrid, mcp, record, prose, freshness, pr-82-refile]
---

# The prose record carries lists where the platform declares bodies

Consolidated 2026-08-15 during the PR #82 reconciliation (issue #289). The
branch's `three-quarters-of-the-mcp-surface-is-unrecorded` (p2, 2026-08-11)
was **partially superseded** by work that landed on `main` independently:
`docs/battlegrid-mcp-capabilities.json` now carries the server instructions
verbatim (25,094 chars) plus prompt/resource/template *lists*, and the
version-agreement sweep (`platform-mapping` spec: "Every Committed Record
Of The Surface Names The Same Server") keeps the three records from
skewing. This item is what remains.

## What

Three residual gaps, verified on `main` 2026-08-15:

1. **Prompt bodies and resource contents are recorded nowhere.**
   `tools/capture_mcp_dump.py` fetches `prompts/list`, `resources/list`,
   `resources/templates/list` — lists only, never `prompts/get` or
   `resources/read` (`capture_mcp_dump.py:52-54`). The `author-strategy`
   prompt alone was 5,898 chars of binding authoring sequence when last
   observed; no copy exists in the repo.
2. **The instructions are recorded but rendered nowhere.**
   `tools/generate_mcp_reference.py:14` loads `init.get("instructions")`
   and no line writes it out. `docs/BATTLEGRID_MCP_REFERENCE.md` has
   `## Prompts` (names/args only) and `## Resources` (URI table) sections
   and no `## Instructions` — 25KB of platform-authored operating guidance
   is in the dump but unreadable in the reference.
3. **Prose drift under an unchanged version is invisible.**
   `tests/live/surface-freshness.test.ts` compares the surface version and
   the vocabulary values; nothing compares instructions, prompt bodies, or
   resource contents against the running server. A deployment that rewrites
   the authoring prompt while leaving the version string alone passes every
   gate green — the same class the vocabulary gate was built for (#92).

## Why it matters

The prose carries constraints no JSON schema can express — scope semantics,
copy-don't-construct rules, per-tool pagination, authoring deadlines — and
this repo has paid for each of those categories at least once. What blunts
the urgency to p3: prose changes that ride a version bump *are* caught
transitively (the live version gate fails, the re-probe refreshes all three
records under the agreement sweep). Only the unchanged-version drift class
escapes, and it has been observed for vocabulary values, not yet for prose.

## Evidence

- `tools/capture_mcp_dump.py:52-54` — the three list-only fetches.
- `tools/generate_mcp_reference.py:14` — instructions loaded, never
  emitted.
- `docs/BATTLEGRID_MCP_REFERENCE.md:2419,2457` — Prompts/Resources
  sections, no bodies, no Instructions section.
- `tests/live/surface-freshness.test.ts` — the two live comparisons
  (surface version, vocabulary values); no prose comparison.

## What would settle it

Extend the dump to fetch bodies (`prompts/get` per prompt, `resources/read`
per resource) with a named failure on any entry the server refuses; emit an
`## Instructions` section and the bodies in the reference; add a live
digest comparison for the prose surfaces, normalising the account-addressed
greeting before digesting (two operators holding the same record must not
see different verdicts because the platform greeted them differently).

Three declined delta-spec requirements from PR #82 describe this contract
in Requirement/Scenario form and are a usable starting point — on tag
`archive/claude/agent-creation-data-strategies-fw6av8` under
`openspec/changes/archive/2026-08-11-the-record-learns-the-other-three-surfaces/specs/platform-mapping/spec.md`
("The Record Carries Every Surface The Server Declares", "Prose Surface
Drift Fails The Live Freshness Guard", "The Reference Renders What The
Record Carries"). Declined only because the spec must not claim unbuilt
behavior. The branch also holds a probe-side implementation written for the
*old* single-record architecture (`probe_mcp_surface.py` extensions) — the
mechanism must be re-fit to `main`'s three-record + agreement-sweep
architecture rather than ported.

## Notes

- Related, out of scope: the live vocabulary gate compares three value
  classes (budgets, timeframes, transform ids) of the ~8 keys each
  category carries; `metrics`/`templates` drift under an unchanged version
  would pass. Main's spec scopes the gate with "at least" deliberately —
  noted here for the day the prose gate is built, since the same digest
  mechanism would close both.
- Requires `BATTLEGRID_API_KEY` for any re-capture; the artifact is
  currently also a deployment behind on other grounds
  ([[the-surface-record-is-a-deployment-behind]], #287) — whichever keyed
  session runs first should do both.
