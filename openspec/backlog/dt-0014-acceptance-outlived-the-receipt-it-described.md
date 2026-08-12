---
id: dt-0014-acceptance-outlived-the-receipt-it-described
title: DT-0014's acceptance still asks for the trim receipt's counts, which an approved change deliberately removed
type: debt
status: open
priority: p3
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: signal-recording
github: "193"
blocked_by: []
tags: [design, tickets, drift, superseded]
---

# DT-0014's acceptance outlived the receipt it described

## What

`DT-0014` (restyle, `implemented`, `behavior_impact: none`) carries two
acceptance lines that the change `the-receipt-states-what-remains` has
deliberately made false:

```
"The receipt block renders on color.notice.subtle with a 1px
 color.notice.border border and keeps role=status with its counts intact"

"Zero copy changes anywhere on the page"
```

The receipt no longer states counts in that paragraph — that is the whole point
of the change (#168): figures carried in an editable address were a claim nobody
could check, on a receipt for a permanent act. The counts are gone from the URL
and the surviving coverage is derived from the record instead.

**The visual ruling DT-0014 actually made is intact.** The paragraph still wears
`role="status"` and `rounded-gc-2 border border-notice-border bg-notice-subtle`
(`app/(app)/recorder/trim/page.tsx:48`). What has expired is the *content*
half of its acceptance.

## Why it matters

p3, and it is a trap rather than a defect. Nothing renders wrong today.

The cost is that DT-0014 reads, to anyone who opens it, as an unmet ticket on an
implemented surface. A design round that took the acceptance at face value would
"restore the counts" and re-introduce exactly the defect #168 was filed for —
and it would do so believing it was fixing a regression.

"Zero copy changes anywhere on the page" is the sharper of the two, because it
was never meant as a permanent freeze. It was a constraint on *that restyle*:
this ticket changes no copy. Read later as a standing rule it forbids every
future behaviour change to the page.

## Evidence

- `openspec/design/tickets/DT-0014.json` — acceptance lines 3 and 6
- `app/(app)/recorder/trim/page.tsx:48` — the notice tokens and `role="status"`
  that DT-0014 did rule on, unchanged
- `openspec/changes/the-receipt-states-what-remains/` — the approved change,
  with the ADDED requirement that supersedes the content
- Found by the verifier on that change, 2026-08-13

## Notes

**What would settle it.** A note on DT-0014 recording that its receipt-content
acceptance was superseded on 2026-08-13 by an approved behaviour change, naming
the change — leaving the token ruling as the live part. That is bookkeeping, not
a design decision, and it does not need a design round.

**The wider question, worth one thought before repeating it.** An acceptance
line that pins *content* on a restyle ticket will expire the first time the
content legitimately changes, and no check will notice — the ticket stays
`implemented` and the words rot quietly. Design-contract §? may want the rule
that a restyle ticket's acceptance describes treatment and structure, and refers
to content only where the treatment depends on it. Related to the same family as
[[a-design-round-stales-the-manifests-it-designed-against]] and
[[the-re-pin-pins-to-the-commit-before-its-own-edits]]: the design layer's
records are pinned to a moment, and nothing tells them when the moment passed.
