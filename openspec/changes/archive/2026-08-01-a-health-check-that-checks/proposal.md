# Proposal: A Health Check That Checks

## Why

`no-health-endpoint` (P3, filed by `ship-a-deployable-image`): nothing
answers "are you healthy?" for a load balancer. `/connect` serves without
touching the database, so a process whose database has gone away underneath
it looks green while every authenticated route returns 500. Taken now
because it needs no BattleGrid — built during the platform's third outage
of the day, which is itself the argument for it.

## What Changes

- **`GET /api/health`** — resolves no session, reads no cookie, does one
  trivial database round trip (`select 1`). Healthy → 200 `{status:"ok"}`;
  not → 503 `{status:"unavailable"}`. Nothing else in the body: no version,
  no schema state, no configuration — it is reachable unauthenticated by
  definition.
- The serving gate (`check-serving.sh`) probes it alongside the routes it
  already walks, so "the health check actually checks" is proven on every
  CI run.

## Capabilities

**Modified**: `app-access` — one ADDED requirement.
