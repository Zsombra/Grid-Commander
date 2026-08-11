---
id: the-probe-failure-path-is-untested
title: the probe's prompt/resource fetch-failure path has no automated exercise
type: debt
status: open
priority: p3
created: 2026-08-11
updated: 2026-08-11
change: ""
capability: platform-mapping
blocked_by: []
tags: [probe, tooling, tests]
---

# The failure path nobody has watched fail

From the verifier on `the-record-learns-the-other-three-surfaces`.

`fetch_prompts` / `fetch_resources` in `tools/probe_mcp_surface.py` record a
named `fetch_failed` on an entry when `prompts/get` / `resources/read`
refuses — the delta spec's "a body the server would not return" scenario.
The offline guard enforces the half that matters for the repo (a committed
record carrying `fetch_failed` fails, naming the re-probe command), but the
probe-side path itself has only ever run against a server that answered.

Consistent with the repo's pattern — tools/*.py are guarded by their output
— so this is debt, not a defect. If a python test harness ever grows around
the probe (it exists for `.claude/tools/openspec.py`), a fake-transport test
of the failure path belongs in it.
