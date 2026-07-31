---
id: market-grid-is-an-unmodelled-module
title: The Market Grid prediction game is a whole module the app does not model
type: feature
status: open
priority: p3
created: 2026-07-31
updated: 2026-07-31
change: ""
capability: ""
blocked_by: []
tags: [battlegrid, market-grid, product-model]
---

# The Market Grid prediction game is a whole module the app does not model

## What

The operator (2026-07-31, `docs/BATTLEGRID_PRODUCT_MODEL.md`): a prediction
game, separate from radar — each session assigns nine coins, and the user
deploys an already-configured agent to play; the agent chooses the coins
itself. Ten tools serve it (sessions, player grids, results, submission
checks, three submit variants plus agent-grid generation, game presets), plus
`get_leaderboard`. Grid-Commander uses none of them.

## Why P3

It reuses agents the app already authors, so the entry point exists; but it is
a self-contained game loop, not a gap in the current authoring promise. Worth
modelling after the radar question (`does-an-agent-act-without-a-radar-deployment`)
settles the deployment story.

## First step when taken

Read-only: sessions list + results + leaderboard as an "arena" surface —
watching before playing, the same read-first pattern every other capability
followed. The submit tools are writes and one
(`random_submit_market_grid`) smells like a stake; classification and
consequence wording before any of them is offered.
