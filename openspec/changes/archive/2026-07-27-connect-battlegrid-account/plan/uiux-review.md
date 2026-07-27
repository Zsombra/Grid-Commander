# UI/UX Review: connect-battlegrid-account

**Checklist**: `docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md` v1.0.0
**Status**: EVIDENCE RECORDED

---

## Scope

**Limited, but not N/A.** Two surfaces:

1. **Consent summary** — describes what the user is granting. R4 makes its
   wording a spec requirement, not copy: it must state that the access can
   create and change agents and strategies, and must never call it read-only.
2. **Audit history** — a per-user list, newest first (R8).

No destructive action reaches the UI in this change. The Consequence &
Confirmation section therefore applies only partially, and rule 9 ("nothing
describes read scope as read-only") is the one that bites.

## Applicable Rules

| Rule | Applies to | Evidence |
|---|---|---|
| Server Component by default | both surfaces | both components are server components; no `'use client'` |
| No data fetching in a presentational component | `consent-summary.tsx`, audit list | both take props only |
| No client-side derivation | audit list | `unresolvedCount` and outcome labels come from the server |
| **Consequence rule 9** — never "read-only" | `consent-summary.tsx` | `consent.test.ts::never_says_read_only` — fails on read-only, view-only, just read, only read |
| No credential in client state | both | no token reaches a component; `boundaries.test.ts` |
| Accessibility — semantic elements, labels, focus | both | `<table>` with `<caption>`, `scope` on headers, `<time dateTime>`, `aria-labelledby`, `role="status"` |
| Contrast AA, colour not the sole signal | audit outcome badges | the destructive marker is the word "destructive", not a colour |
| Loading / empty / error states | audit list | empty state present and worded as a next step |
| Responsive; no horizontal body scroll | both | the table scrolls in its own `overflow-x-auto` container |

## Findings

**F-1 — the consent wording is enforced by a test, not by review.** Four
patterns are forbidden outright (`read-only`, `view-only`, `just read`,
`only read`), and the check runs against every scope description rather than
only the ones currently requested.

**F-2 — no loading state exists yet** because both surfaces render from server
components with the data already resolved. When the assistant arrives and
introduces streaming, this needs revisiting.

## Verdict

Compliant for the scope in this change. The Consequence & Confirmation section
is only partly exercised because no destructive action reaches the UI yet — that
arrives with `author-agents`, and the confirmation-token machinery it will need
is already built and tested.
