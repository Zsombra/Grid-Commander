---
id: the-trim-receipt-is-whatever-the-url-says
title: The trim receipt renders whatever ?trimmed= carries — a bookmarkable, forgeable sentence
type: question
status: done
priority: p3
created: 2026-08-12
updated: 2026-08-13
change: "the-receipt-states-what-remains"
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

## 2026-08-13 — decided, and it is a change now

Put to the operator. **Answer: derive it.** Not accepted-as-noise.

One correction on the way: this item proposed deriving "from the audit entry the
trim wrote". **There is no such entry.** `trim-record.command.ts` calls only
`store.trimPreview` and `store.trim`; there is no `AuditPort`, audit store, or
audit capability spec anywhere in `src/`. So the source is the record's own
current coverage, via the existing `readRecordCoverage`.

Also worth recording, because it changes what the defect *is*: the numbers were
never invented. `performTrim` builds the sentence from a real `TrimOutcome`. The
defect is the transport — real data in an editable URL becomes an unverifiable
past claim.

Now tracked by `the-receipt-states-what-remains` (standard). This item stops
here; the change folder carries the detail.

**Left unfiled deliberately, and named here so it is not lost:** the trim is a
permanent destructive write with **no audit trail**, against CLAUDE.md's "every
write this product makes on a user's behalf must be auditable". Out of scope for
the receipt fix and not yet its own item.
