# Tasks

## 1. The reason reaches the surface (#170)

- [x] 1.1 `ReadSectionOptionsResult`'s `strategy-unreadable` and
      `vocabulary-unreadable` arms carry `reason` and `cause`
      (`ports/strategies.ts:672`).
- [x] 1.2 The query passes them through rather than collapsing to the kind
      (`read-section-options.query.ts:31-56`). The two vocabulary reads are
      checked separately: both are "the vocabulary" to the page, but only the
      one that failed has a reason to give — and folding them lost TypeScript's
      narrowing as well as the reason.
- [x] 1.3 Both branches on the edit page render the reason and `WhyNotLoaded`.

## 2. The value is checked before it is sent (#169)

- [x] 2.1 `allocation` is parsed and an unusable one renders a rejected-input
      state naming it, in `/recorder/trim`'s decided shape.
- [x] 2.2 `edit=1` added as an explicit "show the composer" signal. Needed:
      `a` being absent was the only signal, so a link carrying values back
      skipped the form and re-ran the describe that had just refused.
- [x] 2.3 The composer prefers query values over the stored rule, so a return
      holds what was composed.
- [x] 2.4 `composeAgain()` extracted — both refusing branches build the same
      address. The allocation branch deletes `a` deliberately: returning the
      value that could not be read would re-fill the field with the thing to fix.

## 3. The edit keeps what was typed (#162)

- [x] 3.1 `AgentEditForm` and `PositionManagement` take `composed` and prefer it
      over the agent's stored values.
- [x] 3.2 All three refusing sites pass it.
- [x] 3.3 `performEdit`'s bounce carries every submitted field except
      `agentId`, `confirmationToken` and `expectedRevision` — the binding is
      re-minted by the describe, and replaying a stale pair is what it exists to
      prevent.

## 4. Tests

- [x] 4.1 The query carries reason and cause on an unreadable strategy read.
- [x] 4.2 The allocation branch names the value and describes nothing.
- [x] 4.3 The way back keeps the rest of the composition and drops the bad value.
- [x] 4.4 A whole number still describes.
- [x] 4.5 `edit=1` re-opens the composer rather than re-describing.
- [x] 4.6 A refused edit keeps the typed name, and a first visit still prefills
      from the agent.

## 5. Gates

- [x] 5.1 `npm run typecheck` — 0
- [x] 5.2 `npm run lint` — 0
- [x] 5.3 `npm test` — 171 files / **2239**
- [x] 5.4 `npm run build` — exit 0
- [x] 5.5 `npm run db:generate` + drizzle clean
- [x] 5.6 `npm run test:db` — 85, against `grid_commander_test`

## Execution record — 2026-08-13

**The harness could not see the thing #162 is about.** `rendered()` collects
text, and a `defaultValue` is a prop — so the first version of the test passed
against a form re-rendered from *stored* values, proving nothing. It also meant
the "first visit prefills" case passed only because the name appears in the
heading.

The resolver now collects `values` — `defaultValue`, `value`, and `checked` —
for exactly the reason it already collected `href`: *"an assertion on text for a
URL the harness never emits passes while proving nothing."* The same sentence,
one field over. The test asserts the typed name **is** in `values` and the
stored one is **not**.

This is the second half of #194 arriving by a different route. Key collisions
are still invisible — those need reconciliation, not a prop — but form state is
now assertable, and #162 could not have been verified without it.

**A transient build failure, chased rather than assumed.** `npm run build` once
reported `Failed to collect page data for /api/auth/battlegrid/callback`. It was
`next build` racing the running dev server over `.next`; re-run gives exit 0.
Recorded because "it passed the second time" is the shape of a real defect being
waved through, and the reason it was not one here is specific.
