---
id: the-trim-receipt-is-whatever-the-url-says
title: The trim receipt renders whatever ?trimmed= carries — a bookmarkable, forgeable sentence
type: question
status: open
priority: p3
created: 2026-08-12
updated: 2026-08-12
change: ""
capability: signal-recording
github: "168"
blocked_by: []
tags: [ui, integrity]
---

# The trim receipt is whatever the URL says

## What

`/recorder/trim`'s receipt state renders the `?trimmed=` query string verbatim
as "Record trimmed — Removed N runs: …". The sentence is not derived from any
record; edit the URL and the page attests to a removal that never happened, or
re-open a bookmark and it re-attests one long past.

## Why it matters

p3, and possibly fine: the receipt is presentational, the recorder page beside
it shows the real coverage, and nothing consumes the sentence. But this is the
only record of the removal the operator sees (the manifest's own words), and a
receipt that says whatever it is told sits oddly next to an audit capability.
The question: should the receipt be derived (e.g., from the audit entry the
trim wrote) rather than carried in the redirect?

## Evidence

`app/(app)/recorder/trim/page.tsx` — receipt branch renders the `trimmed`
searchParam. Found by the 2026-08-12 survey (`recorder-trim` manifest,
`receipt` component).

## Notes

Every other redirect-carried message in the product (?problem=, ?note=,
?declined=) reports a *refusal or note*, where verbatim-from-URL is the
decided pattern and forgery is harmless. A *receipt of a destructive act* may
deserve more. If the answer is "it's fine", record that and close.
