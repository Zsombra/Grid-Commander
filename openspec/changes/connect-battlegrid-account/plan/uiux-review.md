# UI/UX Review: connect-battlegrid-account

**Checklist**: `docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md` v1.0.0
**Status**: PENDING EXECUTION EVIDENCE

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
| Server Component by default | both surfaces | _pending_ |
| No data fetching in a presentational component | `consent-summary.tsx`, audit list | _pending_ |
| No client-side derivation | audit list | _pending_ |
| **Consequence rule 9** — never "read-only" | `consent-summary.tsx` | _pending_ |
| No credential in client state | both | _pending_ |
| Accessibility — semantic elements, labels, focus | both | _pending_ |
| Contrast AA, colour not the sole signal | audit outcome badges | _pending_ |
| Loading / empty / error states | audit list | _pending_ |
| Responsive; no horizontal body scroll | both | _pending_ |

## Findings

_To be filled by the executor._

## Verdict

_Pending._
