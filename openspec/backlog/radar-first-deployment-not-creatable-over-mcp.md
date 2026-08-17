---
id: radar-first-deployment-not-creatable-over-mcp
title: A market's first radar deployment cannot be created through the MCP surface
type: risk
status: done
priority: p3
created: 2026-07-31
updated: 2026-07-31
change: deploy-and-undeploy-are-offered
capability: agent-deployment
blocked_by: []
tags: [battlegrid, radar, platform-mismatch]
---

# RESOLVED 2026-08-08 — the platform documented the answer in its own description

`upsert_radar_deployment`'s contract now reads: *"`request.expectedRevision`
is the revision you read — **pass null only for a first deploy**"* — and the
schema carries `anyOf: [integer > 0, null]`. Proven live four times in one
sitting (XRP, AVAX, xyz_jpy, xyz_gold, all `CREATED r1`), taking the
operator's radar to its 20/20 cap. The v13→v14 diff flagged no change on
this tool, so the fix landed somewhere in v3→v13 and sat unnoticed: the
probes only ever tried integers, and nobody re-read the tool's own words.
Found because the operator pushed back with "maybe the new update changed
something." The lesson is this repo's oldest one, pointed the other way —
a *capability* can appear in silence exactly like a break can.

Successor filed: `the-deploy-surface-cannot-create-first-deployments` —
the product's deploy flow still assumes replacement-only.


# A market's first radar deployment cannot be created through the MCP surface

## What

`upsert_radar_deployment` cannot create — only replace. Its schema requires
`expectedRevision > 0` (an exclusive minimum the recorded surface artifact
cannot carry), and a coin with no policy answers every positive value with
`{"code":"CONFLICT","message":"Radar deployment revision 1 is stale or the
policy was removed.","details":{"expectedRevision":1,"actualRevision":null}}`.
`get_radar_deployment` on such a coin returns `{"policy": null}` — there is
no revision to present, and no value that satisfies both checks.

So a user's *first* deployment on any coin must be made on battlegrid.trade
itself; Grid-Commander (and any third-party MCP client) can only replace or
remove existing deployments. This is the answer to "can the MCP do everything
a user can?" for the radar module: **no, not creation**.

## Why it matters

The product's deploy flow refuses unoccupied coins with an honest reason
(established in `deploy-and-undeploy-are-offered`, DL-3) — but a user with an
empty radar can deploy nothing at all through this product. If BattleGrid
ever fixes or intends otherwise, the restriction here should be lifted the
same day.

## Evidence

- Live probes 2026-07-31 on AAVE (never-deployed coin), verbatim payloads in
  the change's `plan/decision-log.md` DL-3.
- `tests/live/radar-probe.test.ts` pins the behavior: the create-refusal test
  FAILS the day the platform starts accepting creates — that failure is the
  signal to remove the describe-time refusal in
  `src/application/use-cases/deploy-agent.command.ts`.

## Notes

Sibling of `two-read-tools-do-not-answer` (platform-side mismatches). The
operator's three existing policies (FARTCOIN/HYPE/PURR) were created through
the BattleGrid web app, which evidently does not go through this MCP
constraint. `delete_radar_deployment` is composition-proven but not
live-walked for the same reason: the only deletable deployments are the
operator's real ones, and this surface could not recreate them (DL-4).
