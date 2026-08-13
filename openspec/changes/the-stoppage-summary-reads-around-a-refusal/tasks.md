# Tasks

- **R1** — A History That Refuses In Part Is Read Around, Not Abandoned
- **R2** — A Summary Assembled Around A Refusal Says What It Could Not Reach
- **R3** — A Block That Keeps Repeating Is Reported As A Condition *(modified)*

## 1. The adapter reads around

- [x] 1.1 **(R1)** `readGateBlocks` keeps its single call as the happy path. On
      refusal only, it pages with a smaller window and skips the pages that
      refuse.
- [x] 1.2 **(R1)** The paged read is bounded — a fixed number of windows, not the
      whole 5,483-row history. Thousands of calls against a rate-limited platform
      is not a fallback, it is a second outage.
- [x] 1.3 **(R1)** Every page refusing leaves the result `unreadable`, carrying
      the platform's own reason. Reading around a refusal is not inventing a
      summary from nothing.
- [x] 1.4 **(R1)** `readSignalLogs` and `readEntryDecisions` are untouched —
      neither refuses, and building for a fault they do not have is how a
      workaround becomes architecture.

## 2. The result carries the gap

- [x] 2.1 **(R2)** The stage result says how many windows refused and how many
      rows that covers, alongside the `total` it already carries.
- [x] 2.2 **(R2, R3)** The summary carries the **end** of the window it covers,
      not only its size — the refused rows are the newest, so a partial summary
      is biased toward the past.

## 3. The surface says it

- [x] 3.1 **(R2)** The stoppage surface states that part of the history could not
      be read, and when the summarised window ends.
- [x] 3.2 **(R3)** Counts read as counts over the readable history, never as the
      agent's total.
- [x] 3.3 A whole history claims nothing about unreadable rows — no empty clause
      on the healthy path.

## 4. Verification

- [x] 4.1 **(R1)** A fake whose first window refuses and whose later ones serve
      produces a summary, not `unreadable`.
- [x] 4.2 **(R1)** A fake that serves on the first call is read with **exactly
      one** call. Assert the call count, not just the result.
- [x] 4.3 **(R1)** A fake that refuses every window yields `unreadable` with the
      platform's reason.
- [x] 4.4 **(R2)** The partial summary states the gap and the window's end.
- [x] 4.5 **(R3)** A whole history renders no gap sentence.
- [x] 4.6 **Mutation check.** Make the fallback swallow the refusal silently and
      confirm 4.4 fails; make it page unconditionally and confirm 4.2 fails.
- [x] 4.7 **Live** — the account is currently in exactly this state. The
      stoppage probe reports `unreadable` for all three **active** agents today,
      while three archived ones summarise normally from 297, 970 and 27 blocks;
      after this it must summarise Undertow's `OPEN_POSITION_CONFLICT` history
      and say what it could not reach. The archived three are the control: they
      must still be read in exactly one call.
- [x] 4.8 Quality gates: `typecheck`, `lint`, `test`, `build`, drizzle check,
      `test:db` against `grid_commander_test`.
