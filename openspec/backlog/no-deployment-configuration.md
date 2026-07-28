---
id: no-deployment-configuration
title: There is no way to deploy this
type: chore
status: done
priority: p1
created: 2026-07-28
updated: 2026-07-28
change: ship-a-deployable-image
capability: ""
blocked_by: []
tags: [deployment, launch]
---

# There is no way to deploy this

## What

The repository contains no deployment configuration of any kind. No
`Dockerfile`, no `docker-compose.yml`, no `vercel.json`, no `fly.toml`, no
`Procfile`, no target of any sort.

`README.md` explains the pipeline and the spec layer. It does not say how to run
this anywhere but a laptop.

## Why it matters

Everything else is ready. The product builds, serves, and — since
`build-the-front-door` — can be used by a person who knows only its address. The
gap between that and a launch is entirely this item.

Two things make it more than "add a Dockerfile":

**Migrations have no owner.** `npm run db:migrate` is run by CI against an empty
database and by a developer by hand. Nothing runs it on deploy, so a first
deployment starts against a database with no tables and every route fails on the
first query. Tracked separately as `apply-migrations-on-deploy`, and the two
should be resolved together — the answer to one determines the answer to the
other.

**The redirect URI is registered out of band.** `BATTLEGRID_REDIRECT_URI` must
exactly match a value on the BattleGrid client registration, with no wildcards
(`.env.example`, DL-4). A deployment at a new hostname needs its URI registered
*before* it can complete a single connection, and nothing in the repository says
so outside a comment in the example file.

## Fix

Not one decision. In the order they need answering:

1. **Where.** A container target and a platform-native target need different
   things, and this determines the rest.
2. **How migrations run.** A release step, an init container, or a documented
   manual gate — but named, and gated, because "someone will remember" is how
   the schema-drift check came to exist.
3. **What the operator must do out of band.** Register the redirect URI, mint
   `TOKEN_ENCRYPTION_KEY` and `SESSION_SECRET`, decide whether to set
   `ANTHROPIC_API_KEY`. Three of the five variables in `.env.example` cannot be
   defaulted, and one of them changes what the product tells users about their
   data.
4. **A first-deployment check.** `scripts/check-serving.sh` proves the app boots
   from what `.env.example` documents. Nothing proves a *deployment* does, and
   this project's whole history says the difference is where defects live.

P1 because it is the last thing between this product and being usable by anyone
who is not running it locally.
