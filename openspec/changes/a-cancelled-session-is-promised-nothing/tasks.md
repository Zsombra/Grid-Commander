# Tasks

- [x] 1.1 The arena row's results sentence branches on status: `PENDING`
      promises results after settlement, `CANCELLED` says the session was
      cancelled and no results will be published, `SETTLED` repeats no
      promise, any other word renders as the platform's own with no claim
      attached, and a null status claims nothing either way
- [x] 1.2 Rendering tests for the cancelled, unknown-word, settled and
      no-status branches; asserted sentences are single template literals,
      because `rendered()` joins JSX text nodes with spaces
- [x] 1.3 `npx tsc --noEmit`, the arena/rendering/architecture suites, and
      `eslint` on the changed files

## What each status now says, in one place

| status | the row says |
|---|---|
| `PENDING` | Results arrive after settlement. |
| `CANCELLED` | This session was cancelled. It will not settle, and no results will be published. |
| `SETTLED` | nothing — what was promised has arrived; the opened session reads its state |
| anything else | the platform's own word, stated as the platform's word, no claim about results |
| `null` | `status not stated`, and no claim either way |

## Why only two states get bespoke prose

The declared enum is six values; the live arena has only ever shown two
(`PENDING` and `CANCELLED`, 2-and-48 of the 50 rows on 2026-08-06). `SETTLED`
gets a treatment because the results tool itself states what it means —
"results are published after the session settles" — and that treatment is
silence, since the promise's subject has arrived. `LIVE`, `RESOLVING` and
`SETTLEMENT_QUARANTINED` are declared and unobserved: prose for them would be
a guess, which is the mistake behind the dead paths `HANDOFF.md` records, so
they fall through to the platform's-own-word branch alongside any value a
future deployment adds.
