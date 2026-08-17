# Tasks: Whether The Credential Could Stake

- [x] 1. `ReadWagerAuthorityQuery` over `AccountStatePort`: the wager setting,
      `hasAccount`, or an unreadable with its cause. No new port — the read and
      its adapter exist.
- [x] 2. Wire it in `src/composition.ts` and in the rendering harness's
      composition root (`tests/rendering/support/fake-acting.ts`).
- [x] 3. Render the two-gate sentence on `/arena` beside the watch-only
      stance: the account's setting as read, the product's scope as copy.
      Unreadable → the shared `WhyNotLoaded` with a subject that completes the
      sentence; `hasAccount: false` → its own wording, not "disabled".
- [x] 4. Agent tests for the query's four outcomes; rendering tests for the
      four scenarios, including that a failed read keeps the sessions and
      rules on the page.
- [x] 5. Quality gates green (`./scripts/ci.sh`); `/verify`; archive.
- [x] 6. Correct #121: the slots half is already built
      (`CreateAffordance` + `capacity.test.ts`); the live agreement check was
      502-blocked (the #100 pattern) and stays open in the issue thread; the
      wager half closes with this change. Mark the backlog item done.
