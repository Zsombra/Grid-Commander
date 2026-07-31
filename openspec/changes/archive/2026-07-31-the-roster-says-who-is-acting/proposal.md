# Proposal: The Roster Says Who Is Acting

## Why

The agent detail page now states whether an agent is acting; the roster — the
first place a user looks — still shows five identical "ACTIVE" badges for
three scanning agents and two idle ones. The glanceable half of
`the-app-authors-agents-it-cannot-deploy` step 1.

## What Changes

- `ReadDeploymentsQuery.summary` answers for the whole roster at once
  (`deploymentsByAgent` in the domain); the roster page fetches it and each
  row carries its deployment line — market/timeframe/standing, or "not
  deployed — scanning nothing". An unreadable radar is one note above the
  list and no per-row claim, matching the detail page's honesty rule.
- Delta: the existing requirement's statement extends to the roster, with a
  roster scenario (MODIFIED).

## Out of Scope

The guarded deploy/undeploy writes — step 2 on the item, unchanged.

## Impact

deployment.ts, read-deployments.query.ts, agents/page.tsx, agent-roster.tsx,
tests, agent-roster surface manifest.
