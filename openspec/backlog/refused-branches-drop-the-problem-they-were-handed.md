---
id: refused-branches-drop-the-problem-they-were-handed
title: Deploy, undeploy and rebind's refused branches drop the ?problem= that rode along
type: debt
status: done
priority: p3
created: 2026-08-12
updated: 2026-08-12
change: "the-outcome-reaches-the-person"
capability: agent-deployment
github: "163"
blocked_by: []
tags: [ui, refusal, redirects]
---

# Refused branches drop the `?problem=` they were handed

## What

When a perform bounces back with `?problem=`, the page re-runs its describe.
If that re-describe *also* refuses, three pages render only the fresh refusal
and silently discard the bounce reason the redirect carried:

- **Deploy** — `performDeploy` redirects back with coin+timeframe+problem; the
  `result.kind !== 'proposal'` branch renders "Cannot deploy" with the new
  reason only.
- **Undeploy** — same pattern in its "Cannot undeploy" branch.
- **Rebind** — same, and worse: "Cannot rebind" is also a dead end (no link
  back to the agent).

This is the same defect class the 2026-08-12 session fixed twice on `/connect`
and `/pending` (`returned-with-an-explanation`, `a-bounced-agree-says-why`) —
that sweep concluded those were the only two dropped-redirect instances; these
three are a third shape of it (dropped only when describe-refused coincides).

## Why it matters

p3: it needs two refusals to line up — the perform bounced *and* the
re-describe refused — so the operator usually sees the problem banner. When it
does happen, the reason the write failed is the one thing the page was
carrying, and it vanishes.

## Evidence

- `app/(app)/agents/[id]/deploy/page.tsx:111-121`
- `app/(app)/agents/[id]/undeploy/[coin]/page.tsx:60-70`
- `app/(app)/agents/[id]/rebind/page.tsx:49-56` (also the missing way back)

Found by the 2026-08-12 ceremony survey; the `agent-deploy-confirm`,
`agent-undeploy-confirm` and `agent-rebind-confirm` manifests record the
refused states.

## Notes

The fix shape is decided precedent: render the carried problem in the danger
role above the refusal, as the archive page does when both are present. The
rebind dead-end needs its exit link too (see the manifest's constraints).
