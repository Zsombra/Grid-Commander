# Tasks

## 1. The clock reaches the read, through the port

- [x] 1.1 `ReadExposureQuery` takes a `Clock` as a third constructor
      dependency — the shape `ReadProposalsQuery` already uses. Required, not
      defaulted: a default would be `systemClock` reappearing inside the
      application layer, which is the thing the port exists to prevent.
- [x] 1.2 The holding view carries `pricedAt`, computed against
      `clock.now()`: `aged` with an `ageMs`, `ahead-of-clock` when the
      platform's stamp is later than ours, `unstated` when the read carried no
      `generatedAtMs`. Three states, never one number that could be negative.
- [x] 1.3 `composition.ts` passes `systemClock`. It is the only place in the
      product that names a real clock.

## 2. The panel

- [x] 2.1 `Exposure` renders the age beside the stamp — *"Priced 4 minutes
      ago, at 2026-08-06T17:55:21.702Z"* — from the `ageMs` it is handed. The
      component reads no clock; the age is formatted, not measured.
- [x] 2.2 The two non-age states say what they are: no stamp from the platform,
      or a stamp this server's clock cannot reconcile. Both still say the
      figures are a snapshot — the disclaimer used to vanish with the line.
- [x] 2.3 A `Read these figures again` link back to `/agents/[id]`: plain `<a>`,
      full page load, no client component. `agents/[id]/page.tsx` passes the
      agent id so the component builds the href, which is what
      `tests/architecture/reachability.test.ts` can see.
- [x] 2.4 Nothing on the panel claims the page is live.

## 3. Verification

- [x] 3.1 `tests/agent/exposure.test.ts`: `pricedAt` against a `FakeClock` —
      an age in milliseconds, the platform-ahead state, and the unstated state.
- [x] 3.2 `tests/rendering/exposure.test.ts`: the rendered sentence at four
      minutes, at seconds, at hours; both non-age states; and the re-read link
      present in `links`. The suite's composition root takes an injectable
      clock so no assertion here depends on the wall clock.
- [x] 3.3 `tests/architecture/boundaries.test.ts`: nothing under
      `src/presentation/` or any `app/**/*.tsx` calls `Date.now()` or
      constructs a zero-argument `Date`. Non-vacuous: the scan must find files
      and the exposure read must still reach the clock through `@/ports/clock`.
- [x] 3.4 `npx tsc --noEmit -p tsconfig.json`, `npx eslint .`, and
      `npx vitest run tests/agent/ tests/rendering/ tests/architecture/` green.
- [x] 3.5 `a-priced-position-goes-stale-while-you-read-it` linked to this change
      and set `in-progress` — it becomes `done` when this archives.
