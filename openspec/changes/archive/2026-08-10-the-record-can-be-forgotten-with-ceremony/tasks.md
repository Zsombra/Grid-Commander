# Tasks: The Record Can Be Forgotten, With Ceremony

- [x] 1. Port: `trimPreview({userId, before})` and `trim({userId, before})` on
      `SignalRecordStore` — counts, coins and span for the describe; deleted
      counts from the perform. Run-boundary semantics on both.
- [x] 2. Drizzle store: both methods, the trim in one transaction (readings →
      captures → runs), account scope in every WHERE.
- [x] 3. In-memory fake: same semantics, so the agent and rendering suites
      exercise the real queries.
- [x] 4. Confirmation target `signalRecordTrim` binding the account, the
      boundary and the described run count.
- [x] 5. `DescribeTrimRecordQuery` (preview → consequence → minted token) and
      `TrimRecordCommand` (consume-or-refuse → trim → outcome). Wire both in
      `composition.ts` and the rendering harness.
- [x] 6. `/recorder/trim`: boundary form → description with consequence →
      confirmed perform via a server action. Linked from `/recorder`.
- [x] 7. Tests: db suite for both store methods (run boundary, account scope,
      readings go with captures); agent suite for the ceremony (binds values,
      refuses mismatched/absent, single use); rendering suite for the page
      (consequence wording, describe-is-not-perform, empty-preview refusal).
- [x] 8. `./scripts/ci.sh` green; archive; close #112 with what shipped and
      the two recorded declines; mark the backlog item done.
