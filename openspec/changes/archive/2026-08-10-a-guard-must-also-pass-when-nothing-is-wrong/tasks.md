# Tasks: A Guard Must Also Pass When Nothing Is Wrong

Spec catch-up: the contract starts requiring what the guards already do. No code
is expected to change; every task is a measurement, and its evidence is recorded
here.

- [x] 1. Verify every architecture guard passes on the clean tree — the
      clean-pass scenario, exercised for real rather than assumed.
      **Measured 2026-08-10:** `vitest run tests/architecture/` → 283 passed,
      0 failed, 16 files.
- [x] 2. Verify each guard repaired by `a-guard-nobody-has-seen-fail` carries at
      least one input its matcher must NOT report, and name them.
      **Named:** boundaries `reports nothing for a file that imports nothing`;
      identifiers `permits the guarded form both mappers now use`; controls
      `finds no control in markup that has none`; failure-is-explained `accepts
      a subject that completes the sentence`; mcp-conformance `does not see one
      that is absent`; one-destination `leaves this product's actual
      dependencies alone`; proposals-are-inert `leaves an ordinary read alone`;
      plus live-writes `reports nothing for a probe that only reads` and
      no-population-constants `permits an ordinary constant` from earlier
      changes.
- [x] 3. Verify no quality gate reaches `mutate-guard`: `scripts/ci.sh`, the
      `package.json` scripts, and the workflow file must not invoke it.
      **Measured 2026-08-10:** `grep -rn mutate-guard scripts/ package.json
      .github/` → no matches.
- [x] 4. Validate and archive; mark the backlog item done and close #123.
